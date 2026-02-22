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
