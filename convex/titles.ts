import { query, mutation, internalMutation, internalQuery, action } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
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
      ratings: { ...args.ratings, overstimulation: title.ratings?.overstimulation },
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

/** Aggregate show-level ratings from all rated episodes (max per category). */
export const aggregateShowRatings = internalMutation({
  args: { titleId: v.id("titles") },
  handler: async (ctx, args) => {
    const title = await ctx.db.get(args.titleId);
    if (!title) throw new Error("Title not found");

    // Get all rated episodes
    const allEpisodes = await ctx.db
      .query("episodes")
      .withIndex("by_titleId", (q) => q.eq("titleId", args.titleId))
      .collect();

    const ratedEpisodes = allEpisodes.filter(
      (ep) => ep.status === "rated" && ep.ratings
    );

    if (ratedEpisodes.length === 0) return;

    // Compute max per category
    const aggregated = {
      lgbtq: 0,
      climate: 0,
      racialIdentity: 0,
      genderRoles: 0,
      antiAuthority: 0,
      religious: 0,
      political: 0,
      sexuality: 0,
    };

    let totalConfidence = 0;

    for (const ep of ratedEpisodes) {
      const r = ep.ratings!;
      aggregated.lgbtq = Math.max(aggregated.lgbtq, r.lgbtq);
      aggregated.climate = Math.max(aggregated.climate, r.climate);
      aggregated.racialIdentity = Math.max(aggregated.racialIdentity, r.racialIdentity);
      aggregated.genderRoles = Math.max(aggregated.genderRoles, r.genderRoles);
      aggregated.antiAuthority = Math.max(aggregated.antiAuthority, r.antiAuthority);
      aggregated.religious = Math.max(aggregated.religious, r.religious);
      aggregated.political = Math.max(aggregated.political, r.political);
      aggregated.sexuality = Math.max(aggregated.sexuality, r.sexuality);
      totalConfidence += ep.ratingConfidence ?? 0;
    }

    const avgConfidence = totalConfidence / ratedEpisodes.length;
    const totalEpisodeCount = allEpisodes.length;
    const notes = `Based on ${ratedEpisodes.length} of ${totalEpisodeCount} episodes. Max severity per category across rated episodes.`;

    await ctx.db.patch(args.titleId, {
      ratings: {
        ...aggregated,
        overstimulation: title.ratings?.overstimulation,
      },
      ratingConfidence: Math.round(avgConfidence * 100) / 100,
      ratingNotes: notes,
      ratedAt: Date.now(),
      status: "rated",
      ratedEpisodeCount: ratedEpisodes.length,
      hasEpisodeRatings: true,
    });
  },
});

export const getSeasonList = query({
  args: { titleId: v.id("titles") },
  handler: async (ctx, args) => {
    const title = await ctx.db.get(args.titleId);
    if (!title) return null;
    return {
      numberOfSeasons: title.numberOfSeasons,
      seasonData: title.seasonData,
      hasEpisodeRatings: title.hasEpisodeRatings,
      ratedEpisodeCount: title.ratedEpisodeCount,
    };
  },
});

/** Fetch and populate season metadata for a TV show from TMDB. */
export const populateSeasonData = action({
  args: { titleId: v.id("titles") },
  handler: async (ctx, args) => {
    const title = await ctx.runQuery(api.titles.getTitle, { titleId: args.titleId });
    if (!title || title.type !== "tv") return;
    if (title.seasonData && title.seasonData.length > 0) return; // Already populated

    const { getTVDetails } = await import("../lib/tmdb");
    const tmdbKey = process.env.TMDB_API_KEY!;
    const tmdb = await getTVDetails(title.tmdbId, tmdbKey);

    const seasonData = tmdb.seasons?.map((s) => ({
      seasonNumber: s.season_number,
      episodeCount: s.episode_count,
      name: s.name || undefined,
      overview: s.overview || undefined,
      posterPath: s.poster_path || undefined,
      airDate: s.air_date || undefined,
    }));

    await ctx.runMutation(internal.titles.patchSeasonData, {
      titleId: args.titleId,
      numberOfSeasons: tmdb.number_of_seasons,
      seasonData: seasonData ?? [],
    });
  },
});

export const patchSeasonData = internalMutation({
  args: {
    titleId: v.id("titles"),
    numberOfSeasons: v.number(),
    seasonData: v.array(
      v.object({
        seasonNumber: v.number(),
        episodeCount: v.number(),
        name: v.optional(v.string()),
        overview: v.optional(v.string()),
        posterPath: v.optional(v.string()),
        airDate: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.titleId, {
      numberOfSeasons: args.numberOfSeasons,
      seasonData: args.seasonData,
    });
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
