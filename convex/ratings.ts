import { action, mutation } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

export const requestOnDemandRating = mutation({
  args: { tmdbId: v.number(), title: v.string(), type: v.union(v.literal("movie"), v.literal("tv")) },
  handler: async (ctx, args) => {
    // Check if title already exists
    const existing = await ctx.db
      .query("titles")
      .withIndex("by_tmdbId", (q) => q.eq("tmdbId", args.tmdbId))
      .first();

    if (existing) return existing._id;

    // Check rate limits
    const identity = await ctx.auth.getUserIdentity();
    let user = null;
    if (identity) {
      user = await ctx.db
        .query("users")
        .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
        .first();
    }

    const today = new Date().toISOString().split("T")[0];
    const tier = user?.tier ?? "free";
    const limit = tier === "paid" ? 10 : 3;
    const used =
      user?.onDemandRatingsDate === today
        ? user?.onDemandRatingsToday ?? 0
        : 0;

    if (used >= limit) {
      throw new Error("Daily on-demand rating limit reached");
    }

    // Update rate limit counter
    if (user) {
      await ctx.db.patch(user._id, {
        onDemandRatingsToday: used + 1,
        onDemandRatingsDate: today,
      });
    }

    // Create pending title
    const titleId = await ctx.db.insert("titles", {
      tmdbId: args.tmdbId,
      title: args.title,
      type: args.type,
      year: 0, // Will be populated by the rating action
      status: "pending",
    });

    // Add to rating queue
    await ctx.db.insert("ratingQueue", {
      tmdbId: args.tmdbId,
      title: args.title,
      type: args.type,
      priority: 10, // User requests get high priority
      source: "user_request",
      status: "queued",
      createdAt: Date.now(),
    });

    return titleId;
  },
});
