import {
  query,
  mutation,
  internalMutation,
  internalQuery,
  action,
} from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { isSeedTitle } from "./lib/seedData";
import { getTVSeason } from "../lib/tmdb";
import { getSeasonByImdbId, getByImdbId } from "../lib/omdb";
import {
  assertCategoryRatings,
  assertConfidence,
  assertSeverityScore,
  sanitizeCategoryEvidence,
} from "./lib/ratingValidation";

function isGenericEpisodeName(name?: string): boolean {
  if (!name) return false;
  return /^episode\s+\d+$/i.test(name.trim());
}

function normalizeOmdbDate(date?: string): string | undefined {
  if (!date || date === "N/A") return undefined;
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString().slice(0, 10);
}

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

export const getEpisodeByTitleSeasonEpisode = query({
  args: {
    titleId: v.id("titles"),
    seasonNumber: v.number(),
    episodeNumber: v.number(),
  },
  handler: async (ctx, args) => {
    const seasonEpisodes = await ctx.db
      .query("episodes")
      .withIndex("by_titleId_season", (q) =>
        q.eq("titleId", args.titleId).eq("seasonNumber", args.seasonNumber)
      )
      .collect();

    return (
      seasonEpisodes.find((episode) => episode.episodeNumber === args.episodeNumber) ??
      null
    );
  },
});

export const listRatedForSeo = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const allEpisodes = await ctx.db.query("episodes").collect();
    const ratedEpisodes = allEpisodes
      .filter((episode) => episode.status === "rated")
      .sort(
        (a, b) => (b.ratedAt ?? b._creationTime) - (a.ratedAt ?? a._creationTime)
      );

    const titleCache = new Map<
      string,
      {
        _id: string;
        slug?: string;
        title: string;
        year: number;
        type: "movie" | "tv" | "youtube";
      } | null
    >();

    const rows: Array<{
      episodeId: string;
      titleId: string;
      titleSlug?: string;
      titleName: string;
      titleYear: number;
      seasonNumber: number;
      episodeNumber: number;
      ratedAt?: number;
    }> = [];

    for (const episode of ratedEpisodes) {
      const titleKey = String(episode.titleId);
      if (!titleCache.has(titleKey)) {
        const title = await ctx.db.get(episode.titleId);
        if (!title || title.type !== "tv" || title.status !== "rated" || isSeedTitle(title)) {
          titleCache.set(titleKey, null);
        } else {
          titleCache.set(titleKey, {
            _id: String(title._id),
            slug: title.slug,
            title: title.title,
            year: title.year,
            type: title.type,
          });
        }
      }

      const title = titleCache.get(titleKey);
      if (!title) continue;

      rows.push({
        episodeId: String(episode._id),
        titleId: title._id,
        titleSlug: title.slug,
        titleName: title.title,
        titleYear: title.year,
        seasonNumber: episode.seasonNumber,
        episodeNumber: episode.episodeNumber,
        ratedAt: episode.ratedAt,
      });
    }

    if (typeof args.limit === "number") {
      return rows.slice(0, args.limit);
    }
    return rows;
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
        continue;
      }

      // Refresh existing records with better metadata when we get it.
      const patch: {
        name?: string;
        overview?: string;
        airDate?: string;
        stillPath?: string;
        runtime?: number;
      } = {};

      if (
        ep.name &&
        (!existing.name ||
          (isGenericEpisodeName(existing.name) && !isGenericEpisodeName(ep.name)))
      ) {
        patch.name = ep.name;
      }
      if (ep.overview && !existing.overview) patch.overview = ep.overview;
      if (ep.airDate && !existing.airDate) patch.airDate = ep.airDate;
      if (ep.stillPath && !existing.stillPath) patch.stillPath = ep.stillPath;
      if (ep.runtime && !existing.runtime) patch.runtime = ep.runtime;

      if (Object.keys(patch).length > 0) {
        await ctx.db.patch(existing._id, patch);
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
    subtitleInfo: v.optional(v.object({
      status: v.union(v.literal("success"), v.literal("failed"), v.literal("skipped"), v.literal("timeout")),
      source: v.optional(v.string()),
      sourceVideoId: v.optional(v.string()),
      language: v.optional(v.string()),
      dialogueLines: v.optional(v.number()),
      transcriptStorage: v.optional(v.object({
        provider: v.literal("r2"),
        bucket: v.string(),
        key: v.string(),
        bytes: v.number(),
        sha256: v.string(),
        uploadedAt: v.number(),
      })),
    })),
    categoryEvidence: v.optional(v.object({
      lgbtq: v.optional(v.object({ explanation: v.string(), quote: v.optional(v.string()) })),
      climate: v.optional(v.object({ explanation: v.string(), quote: v.optional(v.string()) })),
      racialIdentity: v.optional(v.object({ explanation: v.string(), quote: v.optional(v.string()) })),
      genderRoles: v.optional(v.object({ explanation: v.string(), quote: v.optional(v.string()) })),
      antiAuthority: v.optional(v.object({ explanation: v.string(), quote: v.optional(v.string()) })),
      religious: v.optional(v.object({ explanation: v.string(), quote: v.optional(v.string()) })),
      political: v.optional(v.object({ explanation: v.string(), quote: v.optional(v.string()) })),
      sexuality: v.optional(v.object({ explanation: v.string(), quote: v.optional(v.string()) })),
    })),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.episodeId);
    if (!existing) throw new Error("Episode not found");
    assertCategoryRatings(args.ratings, "episode ratings");
    assertConfidence(args.confidence, "episode confidence");

    const categoryEvidence = sanitizeCategoryEvidence(
      args.categoryEvidence,
      args.ratings
    );

    await ctx.db.patch(args.episodeId, {
      ratings: {
        ...args.ratings,
        overstimulation: existing?.ratings?.overstimulation,
      },
      ratingConfidence: args.confidence,
      ratingNotes: args.notes,
      categoryEvidence,
      ratingModel: args.model,
      subtitleInfo: args.subtitleInfo,
      ratedAt: Date.now(),
      status: "rated",
    });
  },
});

export const saveEpisodeOverstimulation = internalMutation({
  args: {
    episodeId: v.id("episodes"),
    overstimulation: v.number(),
    analysis: v.optional(v.object({
      methodVersion: v.string(),
      videoId: v.string(),
      analyzedAt: v.number(),
      metrics: v.object({
        cutsPerMinute: v.number(),
        avgCutDuration: v.number(),
        avgSaturation: v.number(),
        avgBrightness: v.number(),
        brightnessVariance: v.number(),
        flashCount: v.number(),
      }),
      ai: v.object({
        severity: v.number(),
        confidence: v.number(),
        note: v.string(),
        model: v.string(),
      }),
    })),
  },
  handler: async (ctx, args) => {
    const episode = await ctx.db.get(args.episodeId);
    if (!episode) throw new Error("Episode not found");
    if (!episode.ratings) return;
    assertSeverityScore(args.overstimulation, "episode overstimulation");
    if (args.analysis) {
      assertSeverityScore(
        args.analysis.ai.severity,
        "episode overstimulation analysis severity"
      );
      assertConfidence(
        args.analysis.ai.confidence,
        "episode overstimulation analysis confidence"
      );
    }

    await ctx.db.patch(args.episodeId, {
      ratings: {
        ...episode.ratings,
        overstimulation: args.overstimulation,
      },
      overstimulationAnalysis: args.analysis,
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
    if (!identity) throw new Error("Sign in required");
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) throw new Error("User not found");

    const today = new Date().toISOString().split("T")[0];
    const tier = user.tier;
    const limit = tier === "paid" ? 10 : 3;
    const used =
      user.onDemandRatingsDate === today
        ? user.onDemandRatingsToday ?? 0
        : 0;

    const isAdmin = user.isAdmin === true;
    if (!isAdmin && used >= limit) {
      throw new Error("Daily on-demand rating limit reached");
    }

    // Update rate limit counter (skip for admins)
    if (!isAdmin) {
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
      titleId: episode.titleId,
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
    const tmdbKey = process.env.TMDB_API_KEY!;
    const omdbKey = process.env.OMDB_API_KEY;

    const title = await ctx.runQuery(api.titles.getTitle, { titleId: args.titleId });
    if (!title || title.type !== "tv") {
      throw new Error("Parent TV title not found");
    }

    const season = await getTVSeason(args.tmdbShowId, args.seasonNumber, tmdbKey);

    // Optional OMDB enrichment to improve naming/date completeness.
    const omdbByEpisode = new Map<number, { title?: string; released?: string }>();
    let omdbPoster: string | undefined;
    if (omdbKey && title.imdbId) {
      try {
        const omdbSeries = await getByImdbId(title.imdbId, omdbKey);
        if (omdbSeries?.Poster && omdbSeries.Poster !== "N/A") {
          omdbPoster = omdbSeries.Poster;
        }

        const omdbSeason = await getSeasonByImdbId(
          title.imdbId,
          args.seasonNumber,
          omdbKey
        );
        for (const ep of omdbSeason?.Episodes ?? []) {
          const episodeNumber = parseInt(ep.Episode, 10);
          if (Number.isNaN(episodeNumber)) continue;
          omdbByEpisode.set(episodeNumber, {
            title: ep.Title && ep.Title !== "N/A" ? ep.Title : undefined,
            released: normalizeOmdbDate(ep.Released),
          });
        }
      } catch (e) {
        console.error("OMDB season fetch failed (non-fatal):", e);
      }
    }

    // Merge episode rows from TMDB and OMDB by episode number.
    const tmdbByEpisode = new Map(
      season.episodes.map((ep) => [ep.episode_number, ep] as const)
    );
    const episodeNumbers = new Set<number>([
      ...tmdbByEpisode.keys(),
      ...omdbByEpisode.keys(),
    ]);
    const mergedEpisodes = Array.from(episodeNumbers)
      .sort((a, b) => a - b)
      .map((episodeNumber) => {
        const tmdbEp = tmdbByEpisode.get(episodeNumber);
        const omdbEp = omdbByEpisode.get(episodeNumber);

        const tmdbName = tmdbEp?.name || undefined;
        const preferredName =
          !tmdbName || isGenericEpisodeName(tmdbName)
            ? omdbEp?.title || tmdbName
            : tmdbName;

        return {
          episodeNumber,
          name: preferredName,
          overview: tmdbEp?.overview || undefined,
          airDate: tmdbEp?.air_date || omdbEp?.released || undefined,
          // TMDB stills are best; fallback to OMDB series poster, then show poster.
          stillPath:
            tmdbEp?.still_path || omdbPoster || title.posterPath || undefined,
          runtime: tmdbEp?.runtime || undefined,
        };
      });

    // Create or update episode records.
    await ctx.runMutation(internal.episodes.createEpisodesFromTMDB, {
      titleId: args.titleId,
      tmdbShowId: args.tmdbShowId,
      seasonNumber: args.seasonNumber,
      episodes: mergedEpisodes,
    });

    // Keep show-level episode-count note in sync as seasons/episodes are refreshed.
    await ctx.runMutation(internal.titles.refreshEpisodeRatingNotes, {
      titleId: args.titleId,
    });
  },
});
