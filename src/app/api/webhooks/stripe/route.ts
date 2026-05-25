import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/server/db";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Authoritative mapping: Stripe price IDs → internal plan names (set via env vars)
const PRICE_PLAN_MAP: Record<string, "STARTER" | "PRO" | "ENTERPRISE"> = {
  ...(process.env.STRIPE_PRICE_STARTER   ? { [process.env.STRIPE_PRICE_STARTER]:   "STARTER"    } : {}),
  ...(process.env.STRIPE_PRICE_PRO       ? { [process.env.STRIPE_PRICE_PRO]:       "PRO"        } : {}),
  ...(process.env.STRIPE_PRICE_ENTERPRISE? { [process.env.STRIPE_PRICE_ENTERPRISE]: "ENTERPRISE" } : {}),
};

async function resolvePlanFromSubscription(
  subscriptionId: string,
  metadataPlan: string | undefined
): Promise<"STARTER" | "PRO" | "ENTERPRISE" | null> {
  const validPlans = new Set(["STARTER", "PRO", "ENTERPRISE"]);
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const priceId = subscription.items.data[0]?.price.id ?? "";
    if (PRICE_PLAN_MAP[priceId]) return PRICE_PLAN_MAP[priceId];
  } catch (err) {
    console.error("[stripe-webhook] Could not retrieve subscription for plan resolution:", err);
  }
  // Fall back to metadata only if value is a known plan
  if (metadataPlan && validPlans.has(metadataPlan)) {
    console.warn("[stripe-webhook] Falling back to metadata plan — configure STRIPE_PRICE_* env vars to avoid this.");
    return metadataPlan as "STARTER" | "PRO" | "ENTERPRISE";
  }
  return null;
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
      const session = event.data.object as Stripe.Checkout.Session;
      const tenantId = session.metadata?.tenantId;
      if (tenantId && session.subscription) {
        const plan = await resolvePlanFromSubscription(
          session.subscription as string,
          session.metadata?.plan
        );
        if (!plan) {
          console.error("[stripe-webhook] Could not resolve plan for tenant", tenantId);
          break;
        }
        await db.tenant.update({
          where: { id: tenantId },
          data: {
            stripeCustomerId: session.customer as string,
            stripeSubId:      session.subscription as string,
            plan,
            status: "ACTIVE",
          },
        });
      }
      break;
    }

    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      const tenant  = await db.tenant.findFirst({ where: { stripeCustomerId: invoice.customer as string } });
      if (tenant) {
        await db.subscription.create({
          data: {
            tenantId:       tenant.id,
            plan:           tenant.plan,
            stripeInvoiceId: invoice.id,
            amount:         invoice.amount_paid,
            currency:       invoice.currency,
            status:         "paid",
            periodStart:    new Date((invoice.period_start) * 1000),
            periodEnd:      new Date((invoice.period_end)   * 1000),
          },
        });
        await db.tenant.update({
          where: { id: tenant.id },
          data:  { status: "ACTIVE", currentPeriodEnd: new Date(invoice.period_end * 1000) },
        });
      }
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const tenant  = await db.tenant.findFirst({ where: { stripeCustomerId: invoice.customer as string } });
      if (tenant) {
        await db.tenant.update({
          where: { id: tenant.id },
          data:  { status: "SUSPENDED" },
        });
      }
      break;
    }

    case "customer.subscription.deleted": {
      const sub    = event.data.object as Stripe.Subscription;
      const tenant = await db.tenant.findFirst({ where: { stripeSubId: sub.id } });
      if (tenant) {
        await db.tenant.update({
          where: { id: tenant.id },
          data:  { status: "CANCELLED", stripeSubId: null },
        });
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
