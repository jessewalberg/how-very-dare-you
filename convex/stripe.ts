import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import Stripe from "stripe";

function getStripe(): Stripe {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

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
        success_url: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/settings?checkout=success`,
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
