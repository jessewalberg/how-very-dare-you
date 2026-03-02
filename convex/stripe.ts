import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import Stripe from "stripe";
import { isPaidSubscriptionStatus } from "../lib/subscription";

function getStripe(): Stripe {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

type SyncSubscriptionResult = {
  tier: "free" | "paid";
  subscriptionStatus?: string;
  stripeSubscriptionId?: string;
};

export const createCheckoutSession = action({
  args: {},
  returns: v.string(),
  handler: async (ctx): Promise<string> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.runQuery(api.users.getMyProfile);
    if (!user) throw new Error("User not found");

    const stripe = getStripe();

    // Create or reuse Stripe customer
    let customerId: string | undefined = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { clerkId: identity.subject },
      });
      customerId = customer.id;
      await ctx.runMutation(api.users.setStripeCustomerId, {
        stripeCustomerId: customerId,
      });
    }

    const session: Stripe.Checkout.Session =
      await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "subscription",
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: "How Very Dare You Premium",
                description:
                  "Personalized weights, advanced filters, watchlist, 10 on-demand ratings/day",
              },
              unit_amount: 499,
              recurring: { interval: "month" },
            },
            quantity: 1,
          },
        ],
        success_url: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/settings?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/settings?checkout=cancelled`,
      });

    return session.url!;
  },
});

export const createPortalSession = action({
  args: {},
  returns: v.string(),
  handler: async (ctx): Promise<string> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.runQuery(api.users.getMyProfile);
    if (!user) throw new Error("User not found");
    if (!user.stripeCustomerId) throw new Error("No Stripe customer");

    const stripe = getStripe();

    const session: Stripe.BillingPortal.Session =
      await stripe.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/settings`,
      });

    return session.url;
  },
});

export const syncMySubscriptionStatus = action({
  args: {},
  returns: v.object({
    tier: v.union(v.literal("free"), v.literal("paid")),
    subscriptionStatus: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
  }),
  handler: async (ctx): Promise<SyncSubscriptionResult> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.runQuery(api.users.getMyProfile);
    if (!user || !user.stripeCustomerId) {
      return {
        tier: "free" as const,
        subscriptionStatus: undefined,
        stripeSubscriptionId: undefined,
      };
    }

    const stripe = getStripe();
    const subscriptions: Stripe.ApiList<Stripe.Subscription> =
      await stripe.subscriptions.list({
      customer: user.stripeCustomerId,
      status: "all",
      limit: 10,
    });

    const paidSubscription: Stripe.Subscription | null =
      subscriptions.data.find((s) => isPaidSubscriptionStatus(s.status)) ??
      null;
    const latestSubscription: Stripe.Subscription | null =
      subscriptions.data[0] ?? null;
    const selected: Stripe.Subscription | null =
      paidSubscription ?? latestSubscription;

    const tier: "free" | "paid" =
      selected && isPaidSubscriptionStatus(selected.status) ? "paid" : "free";
    const periodEnd = selected?.items?.data?.[0]?.current_period_end;

    await ctx.runMutation(api.users.updateSubscription, {
      stripeCustomerId: user.stripeCustomerId,
      stripeSubscriptionId: tier === "paid" ? selected?.id : undefined,
      tier,
      subscriptionExpiresAt: tier === "paid" && periodEnd ? periodEnd * 1000 : undefined,
    });

    return {
      tier,
      subscriptionStatus: selected?.status,
      stripeSubscriptionId: tier === "paid" ? selected?.id : undefined,
    };
  },
});
