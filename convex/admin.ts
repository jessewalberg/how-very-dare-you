import { query, mutation, action, internalQuery, internalMutation } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { requireAdmin } from "./lib/adminAuth";
import { extractSupportedCatalogModels } from "../lib/openrouterModels";

const DEFAULT_OPENROUTER_RATING_MODEL = "anthropic/claude-sonnet-4";
const RATING_MODEL_CONFIG_KEY = "openrouter_rating_model";

function resolveFallbackRatingModel(): string {
  return (
    process.env.OPENROUTER_RATING_MODEL ??
    process.env.OPENROUTER_MODEL ??
    DEFAULT_OPENROUTER_RATING_MODEL
  );
}

// ── Queries ──────────────────────────────────────────────

export const isCurrentUserAdmin = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return false;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();

    return user?.isAdmin === true;
  },
});


export const getDashboardStats = query({
  handler: async (ctx) => {
    await requireAdmin(ctx);

    // Title counts by status
    const allTitles = await ctx.db.query("titles").collect();
    const titleStats = {
      total: allTitles.length,
      pending: allTitles.filter((t) => t.status === "pending").length,
      rating: allTitles.filter((t) => t.status === "rating").length,
      rated: allTitles.filter((t) => t.status === "rated").length,
      reviewed: allTitles.filter((t) => t.status === "reviewed").length,
      disputed: allTitles.filter((t) => t.status === "disputed").length,
    };

    // User counts by tier
    const allUsers = await ctx.db.query("users").collect();
    const userStats = {
      total: allUsers.length,
      free: allUsers.filter((u) => u.tier === "free").length,
      paid: allUsers.filter((u) => u.tier === "paid").length,
    };

    // Correction counts by status
    const allCorrections = await ctx.db.query("corrections").collect();
    const correctionStats = {
      total: allCorrections.length,
      pending: allCorrections.filter((c) => c.status === "pending").length,
      accepted: allCorrections.filter((c) => c.status === "accepted").length,
      rejected: allCorrections.filter((c) => c.status === "rejected").length,
    };

    // Queue counts by status
    const allQueue = await ctx.db.query("ratingQueue").collect();
    const queueStats = {
      total: allQueue.length,
      queued: allQueue.filter((q) => q.status === "queued").length,
      processing: allQueue.filter((q) => q.status === "processing").length,
      completed: allQueue.filter((q) => q.status === "completed").length,
      failed: allQueue.filter((q) => q.status === "failed").length,
    };

    return { titleStats, userStats, correctionStats, queueStats };
  },
});

export const listTitles = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("rating"),
        v.literal("rated"),
        v.literal("reviewed"),
        v.literal("disputed")
      )
    ),
    type: v.optional(
      v.union(v.literal("movie"), v.literal("tv"), v.literal("youtube"))
    ),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    if (args.status) {
      const results = await ctx.db
        .query("titles")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .take(200);

      if (args.type) {
        return results.filter((t) => t.type === args.type);
      }
      return results;
    }

    const results = await ctx.db.query("titles").order("desc").take(200);
    if (args.type) {
      return results.filter((t) => t.type === args.type);
    }
    return results;
  },
});

export const getEpisodesForTitle = query({
  args: { titleId: v.id("titles") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    return await ctx.db
      .query("episodes")
      .withIndex("by_titleId", (q) => q.eq("titleId", args.titleId))
      .collect();
  },
});

export const getEpisodesForTitleInternal = internalQuery({
  args: { titleId: v.id("titles") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("episodes")
      .withIndex("by_titleId", (q) => q.eq("titleId", args.titleId))
      .collect();
  },
});

export const getTitleRatingCost = query({
  args: { tmdbId: v.number() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    // Get the most recent completed queue item for this tmdbId
    const queueItems = await ctx.db
      .query("ratingQueue")
      .withIndex("by_tmdbId", (q) => q.eq("tmdbId", args.tmdbId))
      .collect();

    // Find most recent completed item
    const completed = queueItems
      .filter((q) => q.status === "completed" && q.estimatedCostCents)
      .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));

    if (completed.length === 0) return null;

    const latest = completed[0];
    return {
      estimatedCostCents: latest.estimatedCostCents,
      durationMs: latest.durationMs,
      tokenUsage: latest.tokenUsage,
      completedAt: latest.completedAt,
    };
  },
});

export const getEpisodeRatingCostsForTitle = query({
  args: { titleId: v.id("titles") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const episodes = await ctx.db
      .query("episodes")
      .withIndex("by_titleId", (q) => q.eq("titleId", args.titleId))
      .collect();
    const episodeIds = new Set(episodes.map((ep) => ep._id));

    if (episodes.length === 0) {
      return {
        totalCostCents: 0,
        episodesWithCost: 0,
        episodeLatestCostCents: {} as Record<string, number>,
      };
    }

    const tmdbIds = new Set(episodes.map((ep) => ep.tmdbShowId));
    const queueItems: Doc<"ratingQueue">[] = [];
    for (const tmdbId of tmdbIds) {
      const items = await ctx.db
        .query("ratingQueue")
        .withIndex("by_tmdbId", (q) => q.eq("tmdbId", tmdbId))
        .collect();
      queueItems.push(...items);
    }

    const latestByEpisode = new Map<string, Doc<"ratingQueue">>();
    for (const item of queueItems) {
      if (
        item.type !== "episode" ||
        item.status !== "completed" ||
        !item.episodeId ||
        !episodeIds.has(item.episodeId) ||
        item.estimatedCostCents == null
      ) {
        continue;
      }
      const key = item.episodeId;
      const existing = latestByEpisode.get(key);
      const itemCompletedAt = item.completedAt ?? 0;
      const existingCompletedAt = existing?.completedAt ?? 0;
      if (!existing || itemCompletedAt >= existingCompletedAt) {
        latestByEpisode.set(key, item);
      }
    }

    const episodeLatestCostCents: Record<string, number> = {};
    let totalCostCents = 0;
    for (const [episodeId, item] of latestByEpisode.entries()) {
      const cents = item.estimatedCostCents ?? 0;
      episodeLatestCostCents[episodeId] = cents;
      totalCostCents += cents;
    }

    return {
      totalCostCents,
      episodesWithCost: Object.keys(episodeLatestCostCents).length,
      episodeLatestCostCents,
    };
  },
});

export const getQueueItems = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("queued"),
        v.literal("processing"),
        v.literal("completed"),
        v.literal("failed")
      )
    ),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    if (args.status) {
      return await ctx.db
        .query("ratingQueue")
        .withIndex("by_status_priority", (q) => q.eq("status", args.status!))
        .order("desc")
        .take(200);
    }

    return await ctx.db.query("ratingQueue").order("desc").take(200);
  },
});

export const listOpenRouterModels = action({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    await ctx.runQuery(internal.admin.getAdminUser, {
      clerkId: identity.subject,
    });

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    const openRouterKey = process.env.OPENROUTER_API_KEY;
    if (openRouterKey) {
      headers.Authorization = `Bearer ${openRouterKey}`;
    }

    const res = await fetch("https://openrouter.ai/api/v1/models", {
      method: "GET",
      headers,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(
        `Failed to load OpenRouter models (${res.status}): ${body || res.statusText}`
      );
    }

    const payload = (await res.json()) as unknown;
    return {
      models: extractSupportedCatalogModels(payload),
      fetchedAt: Date.now(),
    };
  },
});

export const getRatingModelConfig = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const configured = await ctx.db
      .query("adminConfig")
      .withIndex("by_key", (q) => q.eq("key", RATING_MODEL_CONFIG_KEY))
      .first();

    if (configured) {
      return {
        model: configured.value,
        source: "admin" as const,
        updatedAt: configured.updatedAt,
        updatedBy: configured.updatedBy,
        fallbackModel: resolveFallbackRatingModel(),
      };
    }

    const envModel =
      process.env.OPENROUTER_RATING_MODEL ?? process.env.OPENROUTER_MODEL;

    return {
      model: resolveFallbackRatingModel(),
      source: (envModel ? "env" : "default") as "env" | "default",
      updatedAt: undefined,
      updatedBy: undefined,
      fallbackModel: resolveFallbackRatingModel(),
    };
  },
});

export const setRatingModelConfig = mutation({
  args: { model: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const identity = await ctx.auth.getUserIdentity();
    const model = args.model.trim();
    if (!model) throw new Error("Model cannot be empty");
    if (model.length > 120) throw new Error("Model is too long");
    if (!/^[a-zA-Z0-9._:/-]+$/.test(model)) {
      throw new Error(
        "Invalid model format. Use provider/model style, e.g. anthropic/claude-sonnet-4"
      );
    }

    const existing = await ctx.db
      .query("adminConfig")
      .withIndex("by_key", (q) => q.eq("key", RATING_MODEL_CONFIG_KEY))
      .first();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        value: model,
        updatedAt: now,
        updatedBy: identity?.subject,
      });
    } else {
      await ctx.db.insert("adminConfig", {
        key: RATING_MODEL_CONFIG_KEY,
        value: model,
        updatedAt: now,
        updatedBy: identity?.subject,
      });
    }

    return { success: true, model };
  },
});

// ── Internal helpers ────────────────────────────────────

export const getConfiguredRatingModelInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    const configured = await ctx.db
      .query("adminConfig")
      .withIndex("by_key", (q) => q.eq("key", RATING_MODEL_CONFIG_KEY))
      .first();
    return configured?.value ?? resolveFallbackRatingModel();
  },
});

export const getAdminUser = internalQuery({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user || !user.isAdmin) throw new Error("Admin access required");
    return user;
  },
});

export const archiveAndResetTitle = internalMutation({
  args: {
    titleId: v.id("titles"),
    adminClerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const title = await ctx.db.get(args.titleId);
    if (!title) throw new Error("Title not found");

    // Snapshot current ratings into history
    if (title.ratings && title.ratedAt) {
      const historyEntry = {
        ratings: title.ratings,
        ratingConfidence: title.ratingConfidence,
        ratingNotes: title.ratingNotes,
        ratingModel: title.ratingModel,
        ratedAt: title.ratedAt,
        archivedAt: Date.now(),
        archivedBy: args.adminClerkId,
      };

      const existingHistory = title.ratingHistory ?? [];

      await ctx.db.patch(args.titleId, {
        ratingHistory: [...existingHistory, historyEntry],
        ratings: undefined,
        ratingConfidence: undefined,
        ratingNotes: undefined,
        categoryEvidence: undefined,
        ratingModel: undefined,
        ratedAt: undefined,
        subtitleInfo: undefined,
        videoAnalysis: undefined,
        status: "pending",
      });
    } else {
      await ctx.db.patch(args.titleId, { status: "pending", videoAnalysis: undefined });
    }
  },
});

export const resetEpisode = internalMutation({
  args: { episodeId: v.id("episodes") },
  handler: async (ctx, args) => {
    const episode = await ctx.db.get(args.episodeId);
    if (!episode) throw new Error("Episode not found");

    await ctx.db.patch(args.episodeId, {
      ratings: undefined,
      ratingConfidence: undefined,
      ratingNotes: undefined,
      categoryEvidence: undefined,
      ratingModel: undefined,
      ratedAt: undefined,
      subtitleInfo: undefined,
      status: "unrated",
    });

    return episode;
  },
});

// ── Actions ──────────────────────────────────────────────

export const reRateTitle = action({
  args: { titleId: v.id("titles") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Verify admin
    await ctx.runQuery(internal.admin.getAdminUser, {
      clerkId: identity.subject,
    });

    // Get title info for queue item
    const title = await ctx.runQuery(internal.admin.getTitleForReRate, {
      titleId: args.titleId,
    });

    // Archive current ratings and reset status
    await ctx.runMutation(internal.admin.archiveAndResetTitle, {
      titleId: args.titleId,
      adminClerkId: identity.subject,
    });

    // Insert queue item
    const queueItemId = await ctx.runMutation(internal.admin.insertQueueItem, {
      tmdbId: title.tmdbId,
      title: title.title,
      type: title.type as "movie" | "tv",
      source: "admin_rerate",
    });

    // Schedule immediate processing
    await ctx.scheduler.runAfter(0, api.ratings.processQueueItem, {
      queueItemId,
    });
    // Re-rate must refresh overstimulation even if prior analysis exists.
    await ctx.scheduler.runAfter(0, api.healthRatings.analyzeOverstimulation, {
      titleId: args.titleId,
      force: true,
    });

    return { success: true };
  },
});

export const reRateEpisode = action({
  args: { episodeId: v.id("episodes") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Verify admin
    await ctx.runQuery(internal.admin.getAdminUser, {
      clerkId: identity.subject,
    });

    // Reset the episode
    const episode = await ctx.runMutation(internal.admin.resetEpisode, {
      episodeId: args.episodeId,
    });

    // Get title info for queue
    const title = await ctx.runQuery(internal.admin.getTitleForReRate, {
      titleId: episode.titleId,
    });

    // Insert queue item
    const queueItemId = await ctx.runMutation(internal.admin.insertQueueItem, {
      tmdbId: episode.tmdbShowId,
      title: `${title.title} S${episode.seasonNumber}E${episode.episodeNumber}`,
      type: "episode",
      source: "admin_rerate",
      episodeId: args.episodeId,
      seasonNumber: episode.seasonNumber,
      episodeNumber: episode.episodeNumber,
    });

    // Schedule immediate processing
    await ctx.scheduler.runAfter(0, api.ratings.processQueueItem, {
      queueItemId,
    });

    return { success: true };
  },
});

export const refreshAllSeasonsForTitle = action({
  args: { titleId: v.id("titles") },
  handler: async (
    ctx,
    args
  ): Promise<{
    success: boolean;
    seasonCount: number;
    seasonsRefreshed: number;
    seasonsFailed: number;
    failedSeasons: number[];
    episodeCount: number;
  }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Verify admin
    await ctx.runQuery(internal.admin.getAdminUser, {
      clerkId: identity.subject,
    });

    const title = await ctx.runQuery(api.titles.getTitle, { titleId: args.titleId });
    if (!title) throw new Error("Title not found");
    if (title.type !== "tv") throw new Error("Season refresh is only available for TV titles");

    const { getTVDetails } = await import("../lib/tmdb");
    const tmdbKey = process.env.TMDB_API_KEY!;
    const tmdb = await getTVDetails(title.tmdbId, tmdbKey);

    const seasonData = (tmdb.seasons ?? []).map((s) => ({
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
      seasonData,
    });

    let seasonsRefreshed = 0;
    const failedSeasons: number[] = [];

    for (const season of seasonData) {
      try {
        await ctx.runAction(api.episodes.fetchSeasonEpisodes, {
          titleId: args.titleId,
          tmdbShowId: title.tmdbId,
          seasonNumber: season.seasonNumber,
        });
        seasonsRefreshed++;
      } catch (e) {
        failedSeasons.push(season.seasonNumber);
        console.error(
          `Failed refreshing ${title.title} season ${season.seasonNumber}:`,
          e
        );
      }
    }

    const episodes: Doc<"episodes">[] = await ctx.runQuery(
      internal.admin.getEpisodesForTitleInternal,
      {
      titleId: args.titleId,
      }
    );

    return {
      success: true,
      seasonCount: seasonData.length,
      seasonsRefreshed,
      seasonsFailed: failedSeasons.length,
      failedSeasons,
      episodeCount: episodes.length,
    };
  },
});

// ── Internal helpers for actions ────────────────────────

export const getTitleForReRate = internalQuery({
  args: { titleId: v.id("titles") },
  handler: async (ctx, args) => {
    const title = await ctx.db.get(args.titleId);
    if (!title) throw new Error("Title not found");
    return { tmdbId: title.tmdbId, title: title.title, type: title.type };
  },
});

export const insertQueueItem = internalMutation({
  args: {
    tmdbId: v.number(),
    title: v.string(),
    type: v.union(v.literal("movie"), v.literal("tv"), v.literal("episode")),
    source: v.literal("admin_rerate"),
    episodeId: v.optional(v.id("episodes")),
    seasonNumber: v.optional(v.number()),
    episodeNumber: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("ratingQueue", {
      tmdbId: args.tmdbId,
      title: args.title,
      type: args.type,
      priority: 100,
      source: args.source,
      status: "queued",
      createdAt: Date.now(),
      episodeId: args.episodeId,
      seasonNumber: args.seasonNumber,
      episodeNumber: args.episodeNumber,
    });
  },
});

// ── Queue management mutations ──────────────────────────

export const forceCompleteQueueItem = mutation({
  args: { queueItemId: v.id("ratingQueue") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const item = await ctx.db.get(args.queueItemId);
    if (!item) throw new Error("Queue item not found");
    await ctx.db.patch(args.queueItemId, {
      status: "completed",
      completedAt: Date.now(),
    });
  },
});

export const retryQueueItem = action({
  args: { queueItemId: v.id("ratingQueue") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    await ctx.runQuery(internal.admin.getAdminUser, { clerkId: identity.subject });

    // Reset to queued
    await ctx.runMutation(internal.admin.resetQueueItemToQueued, {
      queueItemId: args.queueItemId,
    });

    // Schedule processing
    await ctx.scheduler.runAfter(0, api.ratings.processQueueItem, {
      queueItemId: args.queueItemId,
    });

    return { success: true };
  },
});

export const deleteQueueItem = mutation({
  args: { queueItemId: v.id("ratingQueue") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const item = await ctx.db.get(args.queueItemId);
    if (!item) throw new Error("Queue item not found");
    await ctx.db.delete(args.queueItemId);
  },
});

export const resetQueueItemToQueued = internalMutation({
  args: { queueItemId: v.id("ratingQueue") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.queueItemId, {
      status: "queued",
      lastError: undefined,
      attempts: 0,
    });
  },
});
