import { query } from "./_generated/server";
import { v } from "convex/values";

export const getTitle = query({
  args: { titleId: v.id("titles") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.titleId);
  },
});

export const getTitleByTmdbId = query({
  args: { tmdbId: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("titles")
      .withIndex("by_tmdbId", (q) => q.eq("tmdbId", args.tmdbId))
      .first();
  },
});

export const browse = query({
  args: {
    type: v.optional(
      v.union(v.literal("movie"), v.literal("tv"), v.literal("youtube"))
    ),
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    let results = await ctx.db
      .query("titles")
      .withIndex("by_status", (q) =>
        q.eq("status", (args.status as "rated") ?? "rated")
      )
      .collect();

    if (args.type) {
      results = results.filter((t) => t.type === args.type);
    }

    return results.slice(0, limit);
  },
});

export const browseNoFlags = query({
  args: {
    type: v.optional(
      v.union(v.literal("movie"), v.literal("tv"), v.literal("youtube"))
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const results = await ctx.db
      .query("titles")
      .withIndex("by_status", (q) => q.eq("status", "rated"))
      .collect();

    return results
      .filter((title) => {
        if (!title.ratings) return false;
        if (args.type && title.type !== args.type) return false;
        return Object.values(title.ratings).every((v) => v === 0);
      })
      .slice(0, args.limit ?? 50);
  },
});
