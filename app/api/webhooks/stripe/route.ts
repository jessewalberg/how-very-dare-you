import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
});

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id;

      // Period end is on items in newer Stripe API versions
      const periodEnd = subscription.items?.data?.[0]?.current_period_end;

      await convex.mutation(api.users.updateSubscription, {
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscription.id,
        tier:
          subscription.status === "active" ||
          subscription.status === "trialing"
            ? "paid"
            : "free",
        subscriptionExpiresAt: periodEnd ? periodEnd * 1000 : undefined,
      });
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id;

      await convex.mutation(api.users.updateSubscription, {
        stripeCustomerId: customerId,
        stripeSubscriptionId: undefined,
        tier: "free",
        subscriptionExpiresAt: undefined,
      });
      break;
    }
  }

  return NextResponse.json({ received: true });
}
