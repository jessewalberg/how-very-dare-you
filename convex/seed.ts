import { mutation, query, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./lib/adminAuth";
import { getSeedTitleReasons, isDemoUser, isSeedTitle } from "./lib/seedData";

const SEED_DISABLED_ERROR =
  "Seeding is disabled. This project now relies on live rating data only.";

/**
 * Disabled intentionally: seed data should never be inserted in any environment.
 */
export const seedTitles = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    throw new Error(SEED_DISABLED_ERROR);
  },
});

/**
 * Disabled intentionally: demo users should never be inserted in any environment.
 */
export const seedDemoUsers = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    throw new Error(SEED_DISABLED_ERROR);
  },
});

/**
 * One-time cleanup utility to remove legacy seed/demo records.
 */
export const clearSeedData = mutation({
  args: { dryRun: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const dryRun = args.dryRun ?? false;

    const titles = await ctx.db.query("titles").collect();
    let deletedTitles = 0;
    for (const title of titles) {
      if (isSeedTitle(title)) {
        if (!dryRun) {
          await ctx.db.delete(title._id);
        }
        deletedTitles++;
      }
    }

    const users = await ctx.db.query("users").collect();
    let deletedUsers = 0;
    for (const user of users) {
      if (isDemoUser(user)) {
        if (!dryRun) {
          await ctx.db.delete(user._id);
        }
        deletedUsers++;
      }
    }

    return {
      success: true,
      dryRun,
      deletedTitles,
      deletedUsers,
    };
  },
});

export const getSeedCleanupPreview = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const titles = await ctx.db.query("titles").collect();
    const seedTitles = titles
      .map((title) => ({
        titleId: title._id,
        tmdbId: title.tmdbId,
        title: title.title,
        year: title.year,
        reasons: getSeedTitleReasons(title),
      }))
      .filter((item) => item.reasons.length > 0);

    const users = await ctx.db.query("users").collect();
    const demoUsers = users
      .filter((user) => isDemoUser(user))
      .map((user) => ({
        userId: user._id,
        clerkId: user.clerkId,
        email: user.email,
      }));

    return {
      seedTitleCount: seedTitles.length,
      demoUserCount: demoUsers.length,
      seedTitles,
      demoUsers,
    };
  },
});

function getLiveRatingSignals(
  title: {
    type: "movie" | "tv" | "youtube";
    hasEpisodeRatings?: boolean;
    ratedEpisodeCount?: number;
    subtitleInfo?: { status?: string };
    videoAnalysis?: { youtubeVideoId?: string };
    ratingHistory?: Array<{ ratingModel?: string }>;
    requestCount?: number;
  },
  ratedEpisodeCount: number,
  hasNonSeedEpisodeModel: boolean,
): string[] {
  const signals: string[] = [];

  if (title.hasEpisodeRatings && (title.ratedEpisodeCount ?? 0) > 0) {
    signals.push("title_has_episode_ratings");
  }
  if (ratedEpisodeCount > 0) {
    signals.push(`rated_episodes_${ratedEpisodeCount}`);
  }
  if (hasNonSeedEpisodeModel) {
    signals.push("episode_model_non_seed");
  }

  if (title.subtitleInfo?.status && title.subtitleInfo.status !== "skipped") {
    signals.push(`subtitle_${title.subtitleInfo.status}`);
  }

  if (
    title.videoAnalysis?.youtubeVideoId &&
    !title.videoAnalysis.youtubeVideoId.startsWith("seed-")
  ) {
    signals.push("video_analysis_non_seed");
  }

  if (
    title.ratingHistory?.some(
      (entry) => entry.ratingModel && entry.ratingModel !== "seed-data"
    )
  ) {
    signals.push("rating_history_non_seed");
  }

  if ((title.requestCount ?? 0) > 0) {
    signals.push(`request_count_${title.requestCount}`);
  }

  return signals;
}

export const previewLiveRatedSeedTitles = internalQuery({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const allTitles = await ctx.db.query("titles").collect();
    const candidates = allTitles.filter(
      (title) =>
        isSeedTitle(title) &&
        (title.status === "rated" ||
          title.status === "reviewed" ||
          title.status === "disputed")
    );

    const results: Array<{
      titleId: string;
      tmdbId: number;
      title: string;
      year: number;
      status: string;
      seedReasons: string[];
      liveSignals: string[];
      ratingModel?: string;
    }> = [];

    for (const title of candidates) {
      let ratedEpisodeCount = 0;
      let hasNonSeedEpisodeModel = false;

      if (title.type === "tv") {
        const episodes = await ctx.db
          .query("episodes")
          .withIndex("by_titleId", (q) => q.eq("titleId", title._id))
          .collect();
        const ratedEpisodes = episodes.filter((ep) => ep.status === "rated");
        ratedEpisodeCount = ratedEpisodes.length;
        hasNonSeedEpisodeModel = ratedEpisodes.some(
          (ep) => ep.ratingModel && ep.ratingModel !== "seed-data"
        );
      }

      const liveSignals = getLiveRatingSignals(
        title,
        ratedEpisodeCount,
        hasNonSeedEpisodeModel
      );
      if (liveSignals.length === 0) continue;

      results.push({
        titleId: String(title._id),
        tmdbId: title.tmdbId,
        title: title.title,
        year: title.year,
        status: title.status,
        seedReasons: getSeedTitleReasons(title),
        liveSignals,
        ratingModel: title.ratingModel,
      });
    }

    const limit = args.limit ?? results.length;
    return {
      totalCandidates: candidates.length,
      cleanupCandidates: results.length,
      titles: results.slice(0, limit),
    };
  },
});

export const clearLiveRatedSeedDesignations = internalMutation({
  args: { dryRun: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const dryRun = args.dryRun ?? true;
    const allTitles = await ctx.db.query("titles").collect();
    const candidates = allTitles.filter(
      (title) =>
        isSeedTitle(title) &&
        (title.status === "rated" ||
          title.status === "reviewed" ||
          title.status === "disputed")
    );

    const cleaned: Array<{
      titleId: string;
      tmdbId: number;
      title: string;
      year: number;
      liveSignals: string[];
      removedRatingModelSeed: boolean;
      removedSeedVideoAnalysis: boolean;
    }> = [];

    for (const title of candidates) {
      let ratedEpisodeCount = 0;
      let hasNonSeedEpisodeModel = false;

      if (title.type === "tv") {
        const episodes = await ctx.db
          .query("episodes")
          .withIndex("by_titleId", (q) => q.eq("titleId", title._id))
          .collect();
        const ratedEpisodes = episodes.filter((ep) => ep.status === "rated");
        ratedEpisodeCount = ratedEpisodes.length;
        hasNonSeedEpisodeModel = ratedEpisodes.some(
          (ep) => ep.ratingModel && ep.ratingModel !== "seed-data"
        );
      }

      const liveSignals = getLiveRatingSignals(
        title,
        ratedEpisodeCount,
        hasNonSeedEpisodeModel
      );
      if (liveSignals.length === 0) continue;

      const removedRatingModelSeed = title.ratingModel === "seed-data";
      const removedSeedVideoAnalysis = Boolean(
        title.videoAnalysis?.youtubeVideoId?.startsWith("seed-")
      );

      if (!dryRun) {
        await ctx.db.patch(title._id, {
          ratingModel: removedRatingModelSeed ? undefined : title.ratingModel,
          videoAnalysis: removedSeedVideoAnalysis ? undefined : title.videoAnalysis,
        });
      }

      cleaned.push({
        titleId: String(title._id),
        tmdbId: title.tmdbId,
        title: title.title,
        year: title.year,
        liveSignals,
        removedRatingModelSeed,
        removedSeedVideoAnalysis,
      });
    }

    return {
      dryRun,
      scannedCandidates: candidates.length,
      cleanedCount: cleaned.length,
      cleaned,
    };
  },
});
