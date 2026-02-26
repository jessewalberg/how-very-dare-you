import {
  query,
  mutation,
  internalMutation,
  internalQuery,
  action,
} from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";

// ── Queries ──────────────────────────────────────────────

export const getEpisodesByTitleAndSeason = query({
  args: {
    titleId: v.id("titles"),
    seasonNumber: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("episodes")
      .withIndex("by_titleId_season", (q) =>
        q.eq("titleId", args.titleId).eq("seasonNumber", args.seasonNumber)
      )
      .collect();
  },
});

export const getEpisode = query({
  args: { episodeId: v.id("episodes") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.episodeId);
  },
});

export const getEpisodeInternal = internalQuery({
  args: { episodeId: v.id("episodes") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.episodeId);
  },
});

export const getRatedEpisodesByTitle = internalQuery({
  args: { titleId: v.id("titles") },
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query("episodes")
      .withIndex("by_titleId", (q) => q.eq("titleId", args.titleId))
      .collect();
    return all.filter((ep) => ep.status === "rated" && ep.ratings);
  },
});

// ── Mutations ────────────────────────────────────────────

export const createEpisodesFromTMDB = internalMutation({
  args: {
    titleId: v.id("titles"),
    tmdbShowId: v.number(),
    seasonNumber: v.number(),
    episodes: v.array(
      v.object({
        episodeNumber: v.number(),
        name: v.optional(v.string()),
        overview: v.optional(v.string()),
        airDate: v.optional(v.string()),
        stillPath: v.optional(v.string()),
        runtime: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    for (const ep of args.episodes) {
      // Check if episode already exists
      const existing = await ctx.db
        .query("episodes")
        .withIndex("by_tmdbShowId_season_episode", (q) =>
          q
            .eq("tmdbShowId", args.tmdbShowId)
            .eq("seasonNumber", args.seasonNumber)
            .eq("episodeNumber", ep.episodeNumber)
        )
        .first();

      if (!existing) {
        await ctx.db.insert("episodes", {
          titleId: args.titleId,
          tmdbShowId: args.tmdbShowId,
          seasonNumber: args.seasonNumber,
          episodeNumber: ep.episodeNumber,
          name: ep.name,
          overview: ep.overview,
          airDate: ep.airDate,
          stillPath: ep.stillPath,
          runtime: ep.runtime,
          status: "unrated",
        });
      }
    }
  },
});

export const saveEpisodeRating = internalMutation({
  args: {
    episodeId: v.id("episodes"),
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
    model: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.episodeId, {
      ratings: args.ratings,
      ratingConfidence: args.confidence,
      ratingNotes: args.notes,
      ratingModel: args.model,
      ratedAt: Date.now(),
      status: "rated",
    });
  },
});

export const setEpisodeStatus = internalMutation({
  args: {
    episodeId: v.id("episodes"),
    status: v.union(
      v.literal("unrated"),
      v.literal("rating"),
      v.literal("rated"),
      v.literal("failed")
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.episodeId, { status: args.status });
  },
});

/** Public mutation: request an on-demand episode rating. */
export const requestEpisodeRating = mutation({
  args: { episodeId: v.id("episodes") },
  handler: async (ctx, args) => {
    const episode = await ctx.db.get(args.episodeId);
    if (!episode) throw new Error("Episode not found");

    // Already rated or in progress
    if (episode.status === "rated" || episode.status === "rating") {
      return episode._id;
    }

    const title = await ctx.db.get(episode.titleId);
    if (!title) throw new Error("Parent title not found");

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

    // Mark episode as rating
    await ctx.db.patch(args.episodeId, { status: "rating" });

    // Add to rating queue
    const queueItemId = await ctx.db.insert("ratingQueue", {
      tmdbId: episode.tmdbShowId,
      title: `${title.title} S${episode.seasonNumber}E${episode.episodeNumber}`,
      type: "episode",
      priority: 10,
      source: "user_request",
      status: "queued",
      createdAt: Date.now(),
      episodeId: args.episodeId,
      seasonNumber: episode.seasonNumber,
      episodeNumber: episode.episodeNumber,
    });

    // Schedule processing immediately
    await ctx.scheduler.runAfter(0, api.ratings.processQueueItem, {
      queueItemId,
    });

    return episode._id;
  },
});

// ── Actions ──────────────────────────────────────────────

/** Fetch season episodes from TMDB and create episode records if they don't exist. */
export const fetchSeasonEpisodes = action({
  args: {
    titleId: v.id("titles"),
    tmdbShowId: v.number(),
    seasonNumber: v.number(),
  },
  handler: async (ctx, args): Promise<void> => {
    const { getTVSeason } = await import("../lib/tmdb");
    const tmdbKey = process.env.TMDB_API_KEY!;

    const season = await getTVSeason(args.tmdbShowId, args.seasonNumber, tmdbKey);

    // Create episode records
    await ctx.runMutation(internal.episodes.createEpisodesFromTMDB, {
      titleId: args.titleId,
      tmdbShowId: args.tmdbShowId,
      seasonNumber: args.seasonNumber,
      episodes: season.episodes.map((ep) => ({
        episodeNumber: ep.episode_number,
        name: ep.name || undefined,
        overview: ep.overview || undefined,
        airDate: ep.air_date || undefined,
        stillPath: ep.still_path || undefined,
        runtime: ep.runtime || undefined,
      })),
    });
  },
});
