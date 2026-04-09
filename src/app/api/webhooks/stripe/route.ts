import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/server/db";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

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
      const plan     = session.metadata?.plan as "STARTER" | "PRO" | "ENTERPRISE";
      if (tenantId && plan) {
        await db.tenant.update({
          where: { id: tenantId },
          data:  {
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
