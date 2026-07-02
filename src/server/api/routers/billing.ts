import { z } from "zod";
import Stripe from "stripe";
import { createTRPCRouter, tenantProcedure, adminProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { PLAN_LIMITS, PLAN_LABELS, PLAN_PRICES, STRIPE_PRICE_IDS, PRICE_TO_PLAN } from "@/lib/plan-limits";
import { applyPlanChange, syncChildTenants, revertPendingDowngrade } from "@/server/services/subscription.service";
import type { SubscriptionPlan } from "@prisma/client";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const APP    = process.env.NEXT_PUBLIC_APP_URL ?? "https://klassi.io";

// Configuración del Customer Portal que permite cambiar de plan (no solo cancelar).
// Se crea una vez y se reutiliza (identificada por metadata.klassi_managed).
let portalConfigurationId: string | null = null;

async function getPortalConfigurationId(): Promise<string> {
  if (portalConfigurationId) return portalConfigurationId;

  const existing = await stripe.billingPortal.configurations.list({ limit: 100 });
  const found = existing.data.find(c => c.metadata?.klassi_managed === "true" && c.active);
  if (found) {
    portalConfigurationId = found.id;
    return found.id;
  }

  const priceIds = Object.values(STRIPE_PRICE_IDS).filter(Boolean);
  const prices = await Promise.all(priceIds.map(id => stripe.prices.retrieve(id)));
  const products = prices.map(p => ({
    product: typeof p.product === "string" ? p.product : p.product.id,
    prices:  [p.id],
  }));

  const config = await stripe.billingPortal.configurations.create({
    business_profile: { headline: "Klassi - Gestiona tu suscripción" },
    features: {
      subscription_update: {
        enabled: true,
        default_allowed_updates: ["price"],
        proration_behavior: "create_prorations",
        products,
      },
      subscription_cancel:   { enabled: true, mode: "at_period_end" },
      payment_method_update: { enabled: true },
      invoice_history:       { enabled: true },
    },
    metadata: { klassi_managed: "true" },
  });

  portalConfigurationId = config.id;
  return config.id;
}

export const billingRouter = createTRPCRouter({

  getSubscription: tenantProcedure
    .query(async ({ ctx }) => {
      const select = {
        id: true,
        plan: true, status: true,
        trialEndsAt: true, currentPeriodEnd: true,
        pendingPlan: true, pendingPlanAt: true,
        stripeCustomerId: true, stripeSubId: true,
      } as const;

      let tenant = await ctx.db.tenant.findUnique({ where: { id: ctx.tenantId }, select });
      if (!tenant) throw new TRPCError({ code: "NOT_FOUND" });

      // Reconciliación: si Stripe quedó con un plan o status distinto al de la
      // BD (p. ej. por un webhook que no llegó), sincronizamos al consultar,
      // usando la misma lógica que los webhooks (incluye escuelas hijas).
      // No tocamos `plan` si coincide con un downgrade ya programado (pendingPlan),
      // ya que ese cambio se aplica intencionalmente hasta el fin del período.
      if (tenant.stripeSubId && (tenant.status === "ACTIVE" || tenant.status === "SUSPENDED")) {
        try {
          const sub      = await stripe.subscriptions.retrieve(tenant.stripeSubId);
          const livePlan = PRICE_TO_PLAN[sub.items.data[0]?.price.id ?? ""];

          if (sub.status === "canceled") {
            // Se perdió el webhook subscription.deleted
            await ctx.db.tenant.update({
              where: { id: tenant.id },
              data:  { status: "CANCELLED", stripeSubId: null, pendingPlan: null, pendingPlanAt: null },
            });
            await syncChildTenants(ctx.db, tenant.id, "STARTER", {
              reason: "La suscripción de la escuela principal fue cancelada. Las escuelas adicionales solo están disponibles en Enterprise.",
            });
          } else {
            if (livePlan && livePlan !== tenant.plan && livePlan !== tenant.pendingPlan) {
              // Se perdió un webhook de cambio de plan
              await applyPlanChange(ctx.db, tenant.id, livePlan);
            } else if (livePlan && livePlan === tenant.plan && tenant.pendingPlan) {
              // El cliente revirtió el downgrade en Stripe y el webhook se perdió
              await revertPendingDowngrade(ctx.db, tenant.id, tenant.plan);
            }

            const liveStatus =
              sub.status === "past_due" || sub.status === "unpaid" ? "SUSPENDED" :
              sub.status === "active"                              ? "ACTIVE"    : null;
            if (liveStatus && liveStatus !== tenant.status) {
              await ctx.db.tenant.update({ where: { id: tenant.id }, data: { status: liveStatus } });
            }
          }

          const refreshed = await ctx.db.tenant.findUnique({ where: { id: tenant.id }, select });
          if (refreshed) tenant = refreshed;
        } catch (err) {
          console.error("[billing] Reconciliación con Stripe falló:", err);
        }
      }

      return {
        ...tenant,
        planLabel:    PLAN_LABELS[tenant.plan],
        planPrice:    PLAN_PRICES[tenant.plan],
        limits:       PLAN_LIMITS[tenant.plan],
        pendingLabel: tenant.pendingPlan ? PLAN_LABELS[tenant.pendingPlan] : null,
      };
    }),

  getPlanUsage: tenantProcedure
    .query(async ({ ctx }) => {
      const [tenant, students, groups, instructors] = await Promise.all([
        ctx.db.tenant.findUnique({ where: { id: ctx.tenantId }, select: { plan: true } }),
        ctx.db.student.count({ where: { tenantId: ctx.tenantId, status: "ACTIVE" } }),
        ctx.db.group.count({ where: { tenantId: ctx.tenantId, isActive: true } }),
        ctx.db.instructor.count({ where: { tenantId: ctx.tenantId, isActive: true } }),
      ]);
      if (!tenant) throw new TRPCError({ code: "NOT_FOUND" });

      const limits = PLAN_LIMITS[tenant.plan];
      return {
        plan: tenant.plan,
        students:    { used: students,    limit: limits.students    },
        groups:      { used: groups,      limit: limits.groups      },
        instructors: { used: instructors, limit: limits.instructors },
      };
    }),

  createCheckoutSession: adminProcedure
    .input(z.object({ plan: z.enum(["STARTER", "PRO", "ENTERPRISE"]) }))
    .mutation(async ({ ctx, input }) => {
      const tenant = await ctx.db.tenant.findUnique({
        where:  { id: ctx.tenantId },
        select: { stripeCustomerId: true, email: true, name: true, plan: true, status: true },
      });
      if (!tenant) throw new TRPCError({ code: "NOT_FOUND" });

      const priceId = STRIPE_PRICE_IDS[input.plan as SubscriptionPlan];
      if (!priceId) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Plan no disponible" });

      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        mode:                "subscription",
        payment_method_types: ["card"],
        line_items:          [{ price: priceId, quantity: 1 }],
        success_url:         `${APP}/dashboard/billing?success=1`,
        cancel_url:          `${APP}/dashboard/billing?canceled=1`,
        metadata:            { tenantId: ctx.tenantId, plan: input.plan },
        subscription_data:   {
          metadata: { tenantId: ctx.tenantId, plan: input.plan },
          // 30 días de trial para cuentas nuevas sin suscripción activa
          ...(tenant.status === "TRIAL" && !tenant.stripeCustomerId
            ? { trial_period_days: 30 }
            : {}),
        },
      };

      if (tenant.stripeCustomerId) {
        sessionParams.customer = tenant.stripeCustomerId;
      } else if (tenant.email) {
        sessionParams.customer_email = tenant.email;
      }

      const session = await stripe.checkout.sessions.create(sessionParams);
      return { url: session.url };
    }),

  getPortalUrl: adminProcedure
    .mutation(async ({ ctx }) => {
      const tenant = await ctx.db.tenant.findUnique({
        where:  { id: ctx.tenantId },
        select: { stripeCustomerId: true },
      });
      if (!tenant?.stripeCustomerId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No tienes una suscripción activa" });
      }

      const session = await stripe.billingPortal.sessions.create({
        customer:      tenant.stripeCustomerId,
        return_url:    `${APP}/dashboard/billing`,
        configuration: await getPortalConfigurationId(),
      });
      return { url: session.url };
    }),

  getPlans: tenantProcedure
    .query(() => {
      return (["STARTER", "PRO", "ENTERPRISE"] as SubscriptionPlan[]).map(plan => ({
        plan,
        label:  PLAN_LABELS[plan],
        price:  PLAN_PRICES[plan],
        limits: PLAN_LIMITS[plan],
      }));
    }),
});
