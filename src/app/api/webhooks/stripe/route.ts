import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/server/db";
import { isDowngrade, PLAN_LABELS } from "@/lib/plan-limits";
import { notificationService } from "@/server/services/notifications/notification.service";
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

  switch (event.type) {

    case "checkout.session.completed": {
      const session  = event.data.object as Stripe.Checkout.Session;
      const tenantId = session.metadata?.tenantId;
      if (!tenantId || !session.subscription) break;

      const plan = await resolvePlanFromSubscription(session.subscription as string);
      if (!plan) { console.error("[stripe-webhook] Plan no resuelto para tenant", tenantId); break; }

      await db.tenant.update({
        where: { id: tenantId },
        data: {
          stripeCustomerId: session.customer as string,
          stripeSubId:      session.subscription as string,
          plan,
          status:           "ACTIVE",
          pendingPlan:      null,
          pendingPlanAt:    null,
        },
      });
      break;
    }

    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      const tenant  = await db.tenant.findFirst({ where: { stripeCustomerId: invoice.customer as string } });
      if (!tenant) break;

      // Si había un downgrade pendiente que ya entró en vigor, aplicarlo
      const newPlan = tenant.pendingPlan && tenant.pendingPlanAt && tenant.pendingPlanAt <= new Date()
        ? tenant.pendingPlan
        : tenant.plan;

      await Promise.all([
        db.subscription.create({
          data: {
            tenantId:        tenant.id,
            plan:            newPlan,
            stripeInvoiceId: invoice.id,
            amount:          invoice.amount_paid,
            currency:        invoice.currency,
            status:          "paid",
            periodStart:     new Date(invoice.period_start * 1000),
            periodEnd:       new Date(invoice.period_end   * 1000),
          },
        }),
        db.tenant.update({
          where: { id: tenant.id },
          data: {
            plan:            newPlan,
            status:          "ACTIVE",
            currentPeriodEnd: new Date(invoice.period_end * 1000),
            pendingPlan:     null,
            pendingPlanAt:   null,
          },
        }),
      ]);
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
      const sub    = event.data.object as Stripe.Subscription;
      const tenant = await db.tenant.findFirst({ where: { stripeSubId: sub.id } });
      if (!tenant) break;

      const newPlan = PRICE_PLAN_MAP[sub.items.data[0]?.price.id ?? ""];
      if (!newPlan || newPlan === tenant.plan) break;

      const adminEmail = await getTenantAdminEmail(tenant.id);

      if (isDowngrade(tenant.plan, newPlan)) {
        // Programar el downgrade para el fin del período (plan B)
        const effectiveDate = new Date(sub.current_period_end * 1000);
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
        // Upgrade — aplica de inmediato
        await db.tenant.update({
          where: { id: tenant.id },
          data: { plan: newPlan, pendingPlan: null, pendingPlanAt: null },
        });
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
      break;
    }
  }

  return NextResponse.json({ received: true });
}
