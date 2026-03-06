import {
  query,
  mutation,
  internalMutation,
  internalQuery,
  action,
} from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import {
  getMovieDetails,
  getTVDetails,
  extractStreamingProviders,
} from "../lib/tmdb";
import { mergeStreamingProvidersWithAffiliates } from "../lib/streamingProviders";
import {
  assertCategoryRatings,
  assertConfidence,
  sanitizeCategoryEvidence,
  sanitizeEpisodeFlags,
} from "./lib/ratingValidation";
import { isSeedTitle } from "./lib/seedData";

// ── Slug utilities ──────────────────────────────────────

export function generateSlug(title: string, year: number): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `${base || "untitled"}-${year}`;
}

export function isLegacyUnknownYearSlug(slug: string, title: string): boolean {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "untitled";
  const unknownYearPrefix = `${base}-0`;
  return slug === unknownYearPrefix || slug.startsWith(`${unknownYearPrefix}-`);
}

export const getTitleBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const title = await ctx.db
      .query("titles")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    if (!title) return null;

    // Same episode aggregation logic as getTitle
    if (!(title.type === "tv" && title.hasEpisodeRatings)) {
      return title;
    }

    const episodes = await ctx.db
      .query("episodes")
      .withIndex("by_titleId", (q) => q.eq("titleId", title._id))
      .collect();

    const ratedEpisodes = episodes.filter((ep) => ep.status === "rated" && ep.ratings);
    if (ratedEpisodes.length === 0) {
      return {
        ...title,
        episodeCompositeScore: undefined as number | undefined,
      };
    }

    const avgEpisodeComposite =
      ratedEpisodes.reduce(
        (sum, ep) => sum + calculateDefaultCompositeFromRatings(ep.ratings!),
        0
      ) / ratedEpisodes.length;

    return {
      ...title,
      episodeCompositeScore: Math.round(avgEpisodeComposite * 10) / 10,
    };
  },
});

export const backfillSlugs = mutation({
  args: {},
  handler: async (ctx) => {
    const titles = await ctx.db
      .query("titles")
      .collect();

    let updated = 0;
    for (const title of titles) {
      const shouldRefreshUnknownYearSlug =
        title.year > 0 &&
        !!title.slug &&
        isLegacyUnknownYearSlug(title.slug, title.title);
      if (title.slug && !shouldRefreshUnknownYearSlug) continue;

      let slug = generateSlug(title.title, title.year > 0 ? title.year : 0);

      // Check for collisions
      const existing = await ctx.db
        .query("titles")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .first();

      if (existing && existing._id !== title._id) {
        // Append suffix to make unique
        let suffix = 2;
        while (true) {
          const candidate = `${slug}-${suffix}`;
          const check = await ctx.db
            .query("titles")
            .withIndex("by_slug", (q) => q.eq("slug", candidate))
            .first();
          if (!check) {
            slug = candidate;
            break;
          }
          suffix++;
        }
      }

      if (slug !== title.slug) {
        await ctx.db.patch(title._id, { slug });
        updated++;
      }
    }

    return { updated };
  },
});

function calculateDefaultCompositeFromRatings(ratings: {
  lgbtq: number;
  climate: number;
  racialIdentity: number;
  genderRoles: number;
  antiAuthority: number;
  religious: number;
  political: number;
  sexuality: number;
  overstimulation?: number;
}): number {
  const values = [
    ratings.lgbtq,
    ratings.climate,
    ratings.racialIdentity,
    ratings.genderRoles,
    ratings.antiAuthority,
    ratings.religious,
    ratings.political,
    ratings.sexuality,
    ...(ratings.overstimulation === undefined ? [] : [ratings.overstimulation]),
  ];

  // Default weights are all 5, so weighted score per category is severity * 0.5.
  const weightedScores = values.map((value) => value * 0.5);
  const peak = Math.max(...weightedScores);
  const avg =
    weightedScores.reduce((sum, value) => sum + value, 0) / weightedScores.length;
  const raw = peak * 0.6 + avg * 0.4;

  return Math.min(4, Math.max(0, Math.round(raw * 10) / 10));
}

function getEpisodeDenominator(
  title: { seasonData?: Array<{ episodeCount: number }> },
  indexedEpisodeCount: number
): number {
  const seasonEpisodeCount = (title.seasonData ?? []).reduce((sum, season) => {
    const count = Number.isFinite(season.episodeCount) ? season.episodeCount : 0;
    return sum + Math.max(0, count);
  }, 0);

  if (seasonEpisodeCount <= 0) {
    return indexedEpisodeCount;
  }

  return Math.max(indexedEpisodeCount, seasonEpisodeCount);
}

function isLowAdvisoryTitle(
  title: {
    ratings?: {
      lgbtq: number;
      climate: number;
      racialIdentity: number;
      genderRoles: number;
      antiAuthority: number;
      religious: number;
      political: number;
      sexuality: number;
      overstimulation?: number;
    };
  },
  maxComposite: number,
  maxCategorySeverity: number
): boolean {
  if (!title.ratings) return false;

  const categoryValues = [
    title.ratings.lgbtq,
    title.ratings.climate,
    title.ratings.racialIdentity,
    title.ratings.genderRoles,
    title.ratings.antiAuthority,
    title.ratings.religious,
    title.ratings.political,
    title.ratings.sexuality,
    ...(title.ratings.overstimulation === undefined
      ? []
      : [title.ratings.overstimulation]),
  ];

  const maxCategory = Math.max(...categoryValues);
  if (maxCategory > maxCategorySeverity) return false;

  const composite = calculateDefaultCompositeFromRatings(title.ratings);
  return composite <= maxComposite;
}

export const getTitle = query({
  args: { titleId: v.id("titles") },
  handler: async (ctx, args) => {
    const title = await ctx.db.get(args.titleId);
    if (!title) return null;

    if (!(title.type === "tv" && title.hasEpisodeRatings)) {
      return title;
    }

    const episodes = await ctx.db
      .query("episodes")
      .withIndex("by_titleId", (q) => q.eq("titleId", args.titleId))
      .collect();

    const ratedEpisodes = episodes.filter((ep) => ep.status === "rated" && ep.ratings);
    if (ratedEpisodes.length === 0) {
      return {
        ...title,
        episodeCompositeScore: undefined as number | undefined,
      };
    }

    const avgEpisodeComposite =
      ratedEpisodes.reduce(
        (sum, ep) => sum + calculateDefaultCompositeFromRatings(ep.ratings!),
        0
      ) / ratedEpisodes.length;

    return {
      ...title,
      episodeCompositeScore: Math.round(avgEpisodeComposite * 10) / 10,
    };
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
    const results = await ctx.db
      .query("titles")
      .withIndex("by_status", (q) =>
        q.eq("status", (args.status as "rated") ?? "rated")
      )
      .collect();

    const filtered = results
      .filter((title) => {
        if (isSeedTitle(title)) return false;
        if (args.type && title.type !== args.type) return false;
        if (args.ageRating && title.ageRating !== args.ageRating) return false;
        if (args.noFlagsOnly) {
          if (!title.ratings) return false;
          if (!Object.values(title.ratings).every((v) => v === 0)) return false;
        }
        return true;
      });

    if (typeof args.limit === "number") {
      return filtered.slice(0, args.limit);
    }

    return filtered;
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
        if (isSeedTitle(title)) return false;
        if (!title.ratings) return false;
        if (args.type && title.type !== args.type) return false;
        return Object.values(title.ratings).every((v) => v === 0);
      })
      .slice(0, args.limit ?? 50);
  },
});

export const browseLowScores = query({
  args: {
    type: v.optional(
      v.union(v.literal("movie"), v.literal("tv"), v.literal("youtube"))
    ),
    maxComposite: v.optional(v.number()),
    maxCategorySeverity: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const maxComposite = Math.min(Math.max(args.maxComposite ?? 1, 0), 4);
    const maxCategorySeverity = Math.min(
      Math.max(Math.floor(args.maxCategorySeverity ?? 1), 0),
      4
    );

    const results = await ctx.db
      .query("titles")
      .withIndex("by_status", (q) => q.eq("status", "rated"))
      .collect();

    return results
      .filter((title) => {
        if (isSeedTitle(title)) return false;
        if (!title.ratings) return false;
        if (args.type && title.type !== args.type) return false;
        return isLowAdvisoryTitle(title, maxComposite, maxCategorySeverity);
      })
      .sort((a, b) => (b.ratedAt ?? b._creationTime) - (a.ratedAt ?? a._creationTime))
      .slice(0, args.limit ?? 50);
  },
});

export const getFeaturedRatedTitles = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const results = await ctx.db
      .query("titles")
      .withIndex("by_status", (q) => q.eq("status", "rated"))
      .collect();

    return results
      .filter((title) => !isSeedTitle(title) && !!title.ratings && !!title.ratingNotes)
      .sort((a, b) => (b.ratedAt ?? b._creationTime) - (a.ratedAt ?? a._creationTime))
      .slice(0, args.limit ?? 3);
  },
});

export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const results = await ctx.db
      .query("titles")
      .withIndex("by_status", (q) => q.eq("status", "rated"))
      .collect();

    const ratedCount = results.filter((t) => !isSeedTitle(t)).length;

    const users = await ctx.db.query("users").collect();
    const userCount = users.length;

    return { ratedCount, userCount };
  },
});

export const getNoFlagsPreview = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const results = await ctx.db
      .query("titles")
      .withIndex("by_status", (q) => q.eq("status", "rated"))
      .collect();

    return results
      .filter((title) => {
        if (isSeedTitle(title)) return false;
        if (!title.ratings) return false;
        return Object.values(title.ratings).every((value) => value === 0);
      })
      .sort((a, b) => (b.ratedAt ?? b._creationTime) - (a.ratedAt ?? a._creationTime))
      .slice(0, args.limit ?? 4);
  },
});

export const getLowAdvisoryPreview = query({
  args: {
    limit: v.optional(v.number()),
    maxComposite: v.optional(v.number()),
    maxCategorySeverity: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const maxComposite = Math.min(Math.max(args.maxComposite ?? 1, 0), 4);
    const maxCategorySeverity = Math.min(
      Math.max(Math.floor(args.maxCategorySeverity ?? 1), 0),
      4
    );

    const results = await ctx.db
      .query("titles")
      .withIndex("by_status", (q) => q.eq("status", "rated"))
      .collect();

    return results
      .filter((title) => {
        if (isSeedTitle(title)) return false;
        if (!title.ratings) return false;
        return isLowAdvisoryTitle(title, maxComposite, maxCategorySeverity);
      })
      .sort((a, b) => (b.ratedAt ?? b._creationTime) - (a.ratedAt ?? a._creationTime))
      .slice(0, args.limit ?? 8);
  },
});

export const getSimilarTitles = query({
  args: {
    titleId: v.id("titles"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const title = await ctx.db.get(args.titleId);
    if (!title) return [];

    const results = await ctx.db
      .query("titles")
      .withIndex("by_status", (q) => q.eq("status", "rated"))
      .collect();

    return results
      .filter((t) => {
        if (t._id === args.titleId) return false;
        if (isSeedTitle(t)) return false;
        if (t.type !== title.type) return false;
        return true;
      })
      .sort((a, b) => (b.ratedAt ?? b._creationTime) - (a.ratedAt ?? a._creationTime))
      .slice(0, args.limit ?? 6);
  },
});

export const saveRating = internalMutation({
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
    const title = await ctx.db
      .query("titles")
      .withIndex("by_tmdbId", (q) => q.eq("tmdbId", args.tmdbId))
      .first();

    if (!title) throw new Error("Title not found");
    assertCategoryRatings(args.ratings, "title ratings");
    assertConfidence(args.confidence, "title confidence");

    const categoryEvidence = sanitizeCategoryEvidence(
      args.categoryEvidence,
      args.ratings
    );
    const episodeFlags =
      title.type === "tv" ? sanitizeEpisodeFlags(args.episodeFlags) : undefined;

    // Generate slug if missing. Year can be 0 for unknown dates; keep slug anyway
    // so URLs stay stable and SEO-friendly.
    let slug = title.slug;
    if (!slug) {
      slug = generateSlug(title.title, title.year > 0 ? title.year : 0);
      const existing = await ctx.db
        .query("titles")
        .withIndex("by_slug", (q) => q.eq("slug", slug!))
        .first();
      if (existing && existing._id !== title._id) {
        let suffix = 2;
        while (true) {
          const candidate = `${slug}-${suffix}`;
          const check = await ctx.db
            .query("titles")
            .withIndex("by_slug", (q) => q.eq("slug", candidate))
            .first();
          if (!check) {
            slug = candidate;
            break;
          }
          suffix++;
        }
      }
    }

    await ctx.db.patch(title._id, {
      ratings: { ...args.ratings, overstimulation: title.ratings?.overstimulation },
      ratingConfidence: args.confidence,
      ratingNotes: args.notes,
      categoryEvidence,
      ratingModel: args.model,
      ratedAt: Date.now(),
      status: "rated",
      episodeFlags,
      subtitleInfo: args.subtitleInfo,
      ...(slug && !title.slug ? { slug } : {}),
    });
  },
});

export const updateStatus = internalMutation({
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

/** Aggregate show-level ratings from all rated episodes (average per category). */
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

    // Compute average per category across rated episodes.
    const totals = {
      lgbtq: 0,
      climate: 0,
      racialIdentity: 0,
      genderRoles: 0,
      antiAuthority: 0,
      religious: 0,
      political: 0,
      sexuality: 0,
    };
    let overstimulationTotal = 0;
    let overstimulationCount = 0;

    let totalConfidence = 0;

    for (const ep of ratedEpisodes) {
      const r = ep.ratings!;
      totals.lgbtq += r.lgbtq;
      totals.climate += r.climate;
      totals.racialIdentity += r.racialIdentity;
      totals.genderRoles += r.genderRoles;
      totals.antiAuthority += r.antiAuthority;
      totals.religious += r.religious;
      totals.political += r.political;
      totals.sexuality += r.sexuality;
      if (r.overstimulation !== undefined) {
        overstimulationTotal += r.overstimulation;
        overstimulationCount++;
      }
      totalConfidence += ep.ratingConfidence ?? 0;
    }

    const count = ratedEpisodes.length;
    const aggregated = {
      lgbtq: Math.round((totals.lgbtq / count) * 10) / 10,
      climate: Math.round((totals.climate / count) * 10) / 10,
      racialIdentity: Math.round((totals.racialIdentity / count) * 10) / 10,
      genderRoles: Math.round((totals.genderRoles / count) * 10) / 10,
      antiAuthority: Math.round((totals.antiAuthority / count) * 10) / 10,
      religious: Math.round((totals.religious / count) * 10) / 10,
      political: Math.round((totals.political / count) * 10) / 10,
      sexuality: Math.round((totals.sexuality / count) * 10) / 10,
      overstimulation:
        overstimulationCount > 0
          ? Math.round((overstimulationTotal / overstimulationCount) * 10) / 10
          : undefined,
    };

    const avgConfidence = totalConfidence / ratedEpisodes.length;
    const totalEpisodeCount = getEpisodeDenominator(title, allEpisodes.length);
    const notes = `Based on ${ratedEpisodes.length} of ${totalEpisodeCount} episodes. Average severity per category across rated episodes.`;
    const nonSeedEpisodeModels = Array.from(
      new Set(
        ratedEpisodes
          .map((ep) => ep.ratingModel)
          .filter((model): model is string => Boolean(model) && model !== "seed-data")
      )
    );
    const aggregateRatingModel =
      nonSeedEpisodeModels.length === 0
        ? title.ratingModel
        : nonSeedEpisodeModels.length === 1
          ? `episode-aggregate:${nonSeedEpisodeModels[0]}`
          : "episode-aggregate:mixed";

    await ctx.db.patch(args.titleId, {
      ratings: aggregated,
      ratingConfidence: Math.round(avgConfidence * 100) / 100,
      ratingNotes: notes,
      ratingModel: aggregateRatingModel,
      ratedAt: Date.now(),
      status: "rated",
      ratedEpisodeCount: ratedEpisodes.length,
      hasEpisodeRatings: true,
    });
  },
});

/** Refresh episode-based rating note/count after episode indexing changes. */
export const refreshEpisodeRatingNotes = internalMutation({
  args: { titleId: v.id("titles") },
  handler: async (ctx, args) => {
    const title = await ctx.db.get(args.titleId);
    if (!title || title.type !== "tv") return;

    const allEpisodes = await ctx.db
      .query("episodes")
      .withIndex("by_titleId", (q) => q.eq("titleId", args.titleId))
      .collect();

    if (allEpisodes.length === 0) return;

    const ratedEpisodeCount = allEpisodes.filter(
      (ep) => ep.status === "rated" && ep.ratings
    ).length;

    if (ratedEpisodeCount === 0) return;

    const totalEpisodeCount = getEpisodeDenominator(title, allEpisodes.length);
    const notes = `Based on ${ratedEpisodeCount} of ${totalEpisodeCount} episodes. Average severity per category across rated episodes.`;

    await ctx.db.patch(args.titleId, {
      ratedEpisodeCount,
      hasEpisodeRatings: true,
      ratingNotes: notes,
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
    const title = await ctx.db.get(args.titleId);
    if (!title) throw new Error("Title not found");

    const mergedProviders = mergeStreamingProvidersWithAffiliates(
      args.streamingProviders,
      title.streamingProviders
    );

    await ctx.db.patch(args.titleId, {
      streamingProviders: mergedProviders,
    });
  },
});
