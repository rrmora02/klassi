import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/server/db";
import { isDowngrade, PLAN_LABELS } from "@/lib/plan-limits";
import { notificationService } from "@/server/services/notifications/notification.service";
import { applyPlanChange, syncChildTenants, revertPendingDowngrade } from "@/server/services/subscription.service";
import type { SubscriptionPlan } from "@prisma/client";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const APP    = process.env.NEXT_PUBLIC_APP_URL ?? "https://klassi.io";

const PRICE_PLAN_MAP: Record<string, SubscriptionPlan> = {
  ...(process.env.STRIPE_PRICE_STARTER    ? { [process.env.STRIPE_PRICE_STARTER]:    "STARTER"    } : {}),
  ...(process.env.STRIPE_PRICE_PRO        ? { [process.env.STRIPE_PRICE_PRO]:        "PRO"        } : {}),
  ...(process.env.STRIPE_PRICE_ENTERPRISE ? { [process.env.STRIPE_PRICE_ENTERPRISE]: "ENTERPRISE" } : {}),
};

async function resolvePlanFromSubscription(subscriptionId: string): Promise<SubscriptionPlan | null> {
  try {
    const sub    = await stripe.subscriptions.retrieve(subscriptionId);
    const priceId = sub.items.data[0]?.price.id ?? "";
    return PRICE_PLAN_MAP[priceId] ?? null;
  } catch (err) {
    console.error("[stripe-webhook] Could not retrieve subscription:", err);
    return null;
  }
}

async function getTenantAdminEmail(tenantId: string): Promise<string | null> {
  const admin = await db.tenantUser.findFirst({
    where:   { tenantId, role: "ADMIN" },
    include: { user: { select: { email: true } } },
    orderBy: { createdAt: "asc" },
  });
  return admin?.user.email ?? null;
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig  = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Idempotencia: reclamar el evento antes de procesar. Si ya existe
  // (retry de Stripe o entrega duplicada), responder 200 sin reprocesar.
  try {
    await db.stripeEvent.create({ data: { id: event.id, type: event.type } });
  } catch {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    await handleEvent(event);
  } catch (err) {
    // Liberar el claim para que el retry de Stripe pueda reprocesar.
    await db.stripeEvent.delete({ where: { id: event.id } }).catch(() => {});
    console.error(`[stripe-webhook] Error procesando ${event.type} (${event.id}):`, err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handleEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {

    case "checkout.session.completed": {
      const session  = event.data.object as Stripe.Checkout.Session;
      const tenantId = session.metadata?.tenantId;
      if (!tenantId || !session.subscription) break;

      const plan = await resolvePlanFromSubscription(session.subscription as string);
      if (!plan) { console.error("[stripe-webhook] Plan no resuelto para tenant", tenantId); break; }

      // applyPlanChange también sincroniza las escuelas hijas: si el padre
      // re-contrata Enterprise por checkout, las hijas se desbloquean aquí.
      await applyPlanChange(db, tenantId, plan, {
        stripeCustomerId: session.customer as string,
        stripeSubId:      session.subscription as string,
        status:           "ACTIVE",
      });
      break;
    }

    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      let tenant = await db.tenant.findFirst({
        where: { stripeCustomerId: invoice.customer as string },
      });

      // Fallback: si este evento llegó antes que checkout.session.completed,
      // el tenant aún no tiene stripeCustomerId. Resolver por el metadata
      // que se adjunta a la suscripción en el checkout y persistir los IDs.
      if (!tenant) {
        const metaTenantId = invoice.subscription_details?.metadata?.tenantId;
        if (metaTenantId) {
          tenant = await db.tenant.findUnique({ where: { id: metaTenantId } });
          if (tenant) {
            tenant = await db.tenant.update({
              where: { id: tenant.id },
              data: {
                stripeCustomerId: (invoice.customer as string) ?? tenant.stripeCustomerId,
                ...(invoice.subscription ? { stripeSubId: invoice.subscription as string } : {}),
              },
            });
          }
        }
      }
      if (!tenant) break;

      // El periodo de la suscripción viene en la línea del invoice; el
      // period_start/end del invoice raíz es el periodo de facturación del
      // documento (en el primer cobro equivale al instante de creación).
      const line        = invoice.lines?.data?.[0];
      const periodStart = new Date((line?.period?.start ?? invoice.period_start) * 1000);
      const periodEnd   = new Date((line?.period?.end   ?? invoice.period_end)   * 1000);

      // Solo tocar `plan` si hay un downgrade pendiente cuyo período ya terminó.
      // Para altas/renovaciones normales NO se reescribe `plan` aquí: ese campo
      // ya lo mantiene actualizado el webhook customer.subscription.updated, y
      // releerlo de la BD en este handler puede generar una condición de carrera
      // (este evento e invoice.paid llegan casi al mismo tiempo).
      //
      // Verificación cruzada: el precio cobrado en este invoice debe coincidir
      // con el pendingPlan. Si el cliente revirtió el downgrade en el portal
      // (el invoice cobra el plan original), NO se aplica el pendingPlan viejo.
      const invoicePlan = PRICE_PLAN_MAP[line?.price?.id ?? ""] ?? null;
      const pendingDowngradeDue = !!(
        tenant.pendingPlan &&
        tenant.pendingPlanAt &&
        tenant.pendingPlanAt <= new Date() &&
        (!invoicePlan || invoicePlan === tenant.pendingPlan)
      );
      const recordPlan = pendingDowngradeDue ? tenant.pendingPlan! : (invoicePlan ?? tenant.plan);

      await Promise.all([
        db.subscription.create({
          data: {
            tenantId:        tenant.id,
            plan:            recordPlan,
            stripeInvoiceId: invoice.id,
            amount:          invoice.amount_paid,
            currency:        invoice.currency,
            status:          "paid",
            periodStart,
            periodEnd,
          },
        }),
        db.tenant.update({
          where: { id: tenant.id },
          data: {
            ...(pendingDowngradeDue ? { plan: tenant.pendingPlan!, pendingPlan: null, pendingPlanAt: null } : {}),
            status:           "ACTIVE",
            currentPeriodEnd: periodEnd,
          },
        }),
      ]);

      if (pendingDowngradeDue) {
        // Downgrade aplicado: bloquear/sincronizar escuelas hijas.
        await syncChildTenants(db, tenant.id, tenant.pendingPlan!);
      } else if (invoicePlan && tenant.pendingPlan && invoicePlan !== tenant.pendingPlan) {
        // El invoice cobró un plan distinto al downgrade programado: el cliente
        // lo revirtió en Stripe. Limpiar pendingPlan y desbloquear hijas.
        await revertPendingDowngrade(db, tenant.id, invoicePlan);
      }
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const tenant  = await db.tenant.findFirst({ where: { stripeCustomerId: invoice.customer as string } });
      if (!tenant) break;

      await db.tenant.update({ where: { id: tenant.id }, data: { status: "SUSPENDED" } });

      const adminEmail = await getTenantAdminEmail(tenant.id);
      if (adminEmail) {
        notificationService.sendPaymentFailed({
          to:         adminEmail,
          schoolName: tenant.name,
          billingUrl: `${APP}/dashboard/billing`,
        }).catch(err => console.error("[stripe-webhook] Notification failed:", err));
      }
      break;
    }

    case "customer.subscription.updated": {
      const sub  = event.data.object as Stripe.Subscription;
      let tenant = await db.tenant.findFirst({ where: { stripeSubId: sub.id } });

      // Fallback: evento llegó antes que checkout.session.completed.
      // Resolver por el metadata de la suscripción y persistir los IDs.
      if (!tenant && sub.metadata?.tenantId) {
        tenant = await db.tenant.findUnique({ where: { id: sub.metadata.tenantId } });
        if (tenant) {
          tenant = await db.tenant.update({
            where: { id: tenant.id },
            data:  { stripeSubId: sub.id, stripeCustomerId: (sub.customer as string) ?? tenant.stripeCustomerId },
          });
        }
      }
      if (!tenant) break;

      const newPlan = PRICE_PLAN_MAP[sub.items.data[0]?.price.id ?? ""];
      if (!newPlan) break;

      if (newPlan === tenant.plan) {
        // El precio en Stripe coincide con el plan actual. Si había un
        // downgrade programado, el cliente lo revirtió en el portal:
        // limpiarlo y desbloquear las escuelas hijas.
        if (tenant.pendingPlan) {
          await revertPendingDowngrade(db, tenant.id, tenant.plan);
        }
        break;
      }

      const adminEmail = await getTenantAdminEmail(tenant.id);

      if (isDowngrade(tenant.plan, newPlan)) {
        // Programar el downgrade para el fin del período (plan B)
        const effectiveDate = new Date(sub.current_period_end * 1000);

        // Si el nuevo plan < ENTERPRISE, bloquear las hijas inmediatamente
        if (newPlan !== "ENTERPRISE") {
          await syncChildTenants(db, tenant.id, newPlan, {
            reason: `Plan de escuela principal bajará a ${PLAN_LABELS[newPlan]} el ${effectiveDate.toLocaleDateString("es-MX")}. Las escuelas adicionales solo están disponibles en Enterprise.`,
          });
        }

        await db.tenant.update({
          where: { id: tenant.id },
          data: { pendingPlan: newPlan, pendingPlanAt: effectiveDate },
        });
        if (adminEmail) {
          notificationService.sendDowngradeScheduled({
            to:           adminEmail,
            schoolName:   tenant.name,
            newPlan:      PLAN_LABELS[newPlan],
            effectiveDate: effectiveDate.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" }),
            billingUrl:   `${APP}/dashboard/billing`,
          }).catch(err => console.error("[stripe-webhook] Notification failed:", err));
        }
      } else {
        // Upgrade — aplica de inmediato y sincroniza/desbloquea hijas
        await applyPlanChange(db, tenant.id, newPlan);
        if (adminEmail) {
          notificationService.sendSubscriptionUpdated({
            to:         adminEmail,
            schoolName: tenant.name,
            newPlan:    PLAN_LABELS[newPlan],
            billingUrl: `${APP}/dashboard/billing`,
          }).catch(err => console.error("[stripe-webhook] Notification failed:", err));
        }
      }
      break;
    }

    case "customer.subscription.trial_will_end": {
      const sub    = event.data.object as Stripe.Subscription;
      const tenant = await db.tenant.findFirst({ where: { stripeSubId: sub.id } });
      if (!tenant) break;

      const adminEmail = await getTenantAdminEmail(tenant.id);
      if (adminEmail) {
        const daysLeft = Math.ceil((sub.trial_end! * 1000 - Date.now()) / 86_400_000);
        notificationService.sendTrialEnding({
          to:         adminEmail,
          schoolName: tenant.name,
          daysLeft,
          billingUrl: `${APP}/dashboard/billing`,
        }).catch(err => console.error("[stripe-webhook] Notification failed:", err));
      }
      break;
    }

    case "customer.subscription.deleted": {
      const sub    = event.data.object as Stripe.Subscription;
      const tenant = await db.tenant.findFirst({ where: { stripeSubId: sub.id } });
      if (!tenant) break;

      await db.tenant.update({
        where: { id: tenant.id },
        data: { status: "CANCELLED", stripeSubId: null, pendingPlan: null, pendingPlanAt: null },
      });

      // Sin suscripción activa las escuelas hijas no tienen plan que las
      // respalde: bloquearlas hasta que el padre vuelva a contratar Enterprise.
      await syncChildTenants(db, tenant.id, "STARTER", {
        reason: "La suscripción de la escuela principal fue cancelada. Las escuelas adicionales solo están disponibles en Enterprise.",
      });
      break;
    }
  }
}
