import { query, mutation, internalMutation, internalQuery, action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import {
  getMovieDetails,
  getTVDetails,
  extractStreamingProviders,
} from "../lib/tmdb";

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
    ageRating: v.optional(v.string()),
    noFlagsOnly: v.optional(v.boolean()),
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    const results = await ctx.db
      .query("titles")
      .withIndex("by_status", (q) =>
        q.eq("status", (args.status as "rated") ?? "rated")
      )
      .collect();

    return results
      .filter((title) => {
        if (args.type && title.type !== args.type) return false;
        if (args.ageRating && title.ageRating !== args.ageRating) return false;
        if (args.noFlagsOnly) {
          if (!title.ratings) return false;
          if (!Object.values(title.ratings).every((v) => v === 0)) return false;
        }
        return true;
      })
      .slice(0, limit);
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

export const saveRating = mutation({
  args: {
    tmdbId: v.number(),
    ratings: v.object({
      lgbtq: v.number(),
      climate: v.number(),
      racialIdentity: v.number(),
      genderRoles: v.number(),
      antiAuthority: v.number(),
      religious: v.number(),
      political: v.number(),
      sexuality: v.number(),
    }),
    confidence: v.number(),
    notes: v.string(),
    model: v.optional(v.string()),
    episodeFlags: v.optional(
      v.array(
        v.object({
          season: v.number(),
          episode: v.number(),
          episodeTitle: v.optional(v.string()),
          category: v.string(),
          severity: v.number(),
          note: v.string(),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    const title = await ctx.db
      .query("titles")
      .withIndex("by_tmdbId", (q) => q.eq("tmdbId", args.tmdbId))
      .first();

    if (!title) throw new Error("Title not found");

    await ctx.db.patch(title._id, {
      ratings: args.ratings,
      ratingConfidence: args.confidence,
      ratingNotes: args.notes,
      ratingModel: args.model,
      ratedAt: Date.now(),
      status: "rated",
      episodeFlags:
        args.episodeFlags && args.episodeFlags.length > 0
          ? args.episodeFlags
          : undefined,
    });
  },
});

export const updateStatus = mutation({
  args: {
    titleId: v.id("titles"),
    status: v.union(
      v.literal("pending"),
      v.literal("rating"),
      v.literal("rated"),
      v.literal("reviewed"),
      v.literal("disputed")
    ),
  },
  handler: async (ctx, args) => {
    const title = await ctx.db.get(args.titleId);
    if (!title) throw new Error("Title not found");
    await ctx.db.patch(args.titleId, { status: args.status });
  },
});

// ── Streaming Refresh ────────────────────────────────────

/** Weekly job: refresh streaming provider data for all rated titles. */
export const refreshStreamingAvailability = action({
  args: {},
  handler: async (ctx): Promise<void> => {
    const tmdbKey = process.env.TMDB_API_KEY!;
    const titles = await ctx.runQuery(internal.titles.getAllRatedTitles, {});

    let updated = 0;
    let failed = 0;

    for (const title of titles) {
      try {
        let providers: { name: string; logoPath?: string }[] = [];

        if (title.type === "movie") {
          const details = await getMovieDetails(title.tmdbId, tmdbKey);
          providers = extractStreamingProviders(details["watch/providers"]);
        } else if (title.type === "tv") {
          const details = await getTVDetails(title.tmdbId, tmdbKey);
          providers = extractStreamingProviders(details["watch/providers"]);
        }

        await ctx.runMutation(internal.titles.patchStreamingProviders, {
          titleId: title._id,
          streamingProviders: providers.map((p) => ({
            name: p.name,
            logoPath: p.logoPath,
          })),
        });
        updated++;
      } catch (e) {
        failed++;
        console.error(
          `[StreamingRefresh] Failed for "${title.title}" (${title.tmdbId}):`,
          e
        );
      }

      // Small delay to avoid TMDB rate limits (40 req/10s)
      await new Promise((r) => setTimeout(r, 300));
    }

    console.log(
      `[StreamingRefresh] Done. Updated: ${updated}, Failed: ${failed}`
    );
  },
});

export const getAllRatedTitles = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("titles")
      .withIndex("by_status", (q) => q.eq("status", "rated"))
      .collect();
  },
});

export const patchStreamingProviders = internalMutation({
  args: {
    titleId: v.id("titles"),
    streamingProviders: v.array(
      v.object({
        name: v.string(),
        logoPath: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.titleId, {
      streamingProviders: args.streamingProviders,
    });
  },
});
