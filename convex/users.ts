import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getMyProfile = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
  },
});

export const getRateLimitStatus = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { tier: "free" as const, used: 0, limit: 3 };
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      return { tier: "free" as const, used: 0, limit: 3 };
    }

    const today = new Date().toISOString().split("T")[0];
    const used =
      user.onDemandRatingsDate === today
        ? user.onDemandRatingsToday ?? 0
        : 0;
    const limit = user.tier === "paid" ? 10 : 3;

    return { tier: user.tier, used, limit };
  },
});

export const updateCategoryWeights = mutation({
  args: {
    weights: v.object({
      lgbtq: v.number(),
      climate: v.number(),
      racialIdentity: v.number(),
      genderRoles: v.number(),
      antiAuthority: v.number(),
      religious: v.number(),
      political: v.number(),
      sexuality: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");
    if (user.tier !== "paid") throw new Error("Premium feature");

    await ctx.db.patch(user._id, { categoryWeights: args.weights });
  },
});

export const updateSubscription = mutation({
  args: {
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.optional(v.string()),
    tier: v.union(v.literal("free"), v.literal("paid")),
    subscriptionExpiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_stripeCustomerId", (q) =>
        q.eq("stripeCustomerId", args.stripeCustomerId)
      )
      .first();

    if (!user) return;

    await ctx.db.patch(user._id, {
      tier: args.tier,
      stripeSubscriptionId: args.stripeSubscriptionId,
      subscriptionExpiresAt: args.subscriptionExpiresAt,
    });
  },
});

export const setStripeCustomerId = mutation({
  args: {
    stripeCustomerId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    await ctx.db.patch(user._id, {
      stripeCustomerId: args.stripeCustomerId,
    });
  },
});

export const resetDailyRateLimits = mutation({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    for (const user of users) {
      if (user.onDemandRatingsToday && user.onDemandRatingsToday > 0) {
        await ctx.db.patch(user._id, {
          onDemandRatingsToday: 0,
          onDemandRatingsDate: new Date().toISOString().split("T")[0],
        });
      }
    }
  },
});
