import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { isPaidSubscriptionStatus } from "@/lib/subscription";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
});

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

async function syncCustomerSubscription(
  customerId: string,
  preferredSubscriptionId?: string
) {
  let subscription: Stripe.Subscription | null = null;

  if (preferredSubscriptionId) {
    try {
      subscription = await stripe.subscriptions.retrieve(preferredSubscriptionId);
    } catch {
      subscription = null;
    }
  }

  if (!subscription) {
    const list = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 1,
    });
    subscription = list.data[0] ?? null;
  }

  const tier =
    subscription && isPaidSubscriptionStatus(subscription.status)
      ? "paid"
      : "free";
  const periodEnd = subscription?.items?.data?.[0]?.current_period_end;

  await convex.mutation(api.users.updateSubscription, {
    stripeCustomerId: customerId,
    stripeSubscriptionId: tier === "paid" ? subscription?.id : undefined,
    tier,
    subscriptionExpiresAt: tier === "paid" && periodEnd ? periodEnd * 1000 : undefined,
  });
}

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
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode !== "subscription" || !session.customer) break;

      const customerId =
        typeof session.customer === "string"
          ? session.customer
          : session.customer.id;
      const subscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id;

      await syncCustomerSubscription(customerId, subscriptionId);
      break;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id;
      await syncCustomerSubscription(customerId, subscription.id);
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
