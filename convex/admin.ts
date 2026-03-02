import { query, mutation, action, internalQuery, internalMutation } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { requireAdmin } from "./lib/adminAuth";
import { extractSupportedCatalogModels } from "../lib/openrouterModels";
import { assessRatingQuality, type QualitySeverity } from "../lib/ratingQuality";
import { downloadTextFromR2, isR2Configured, uploadTextToR2 } from "../lib/r2";

const DEFAULT_OPENROUTER_RATING_MODEL = "anthropic/claude-sonnet-4";
const RATING_MODEL_CONFIG_KEY = "openrouter_rating_model";

function slugForKey(input: string): string {
  const slug = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const capped = slug.slice(0, 80);
  return capped || "untitled";
}

function buildManualTitleTranscriptKey(args: {
  tmdbId: number;
  type: "movie" | "tv" | "youtube";
  title: string;
}): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `manual/titles/${args.type}/${args.tmdbId}/${stamp}-${slugForKey(args.title)}.txt`;
}

function buildManualEpisodeTranscriptKey(args: {
  tmdbShowId: number;
  seasonNumber: number;
  episodeNumber: number;
  showTitle: string;
}): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const code = `s${String(args.seasonNumber).padStart(2, "0")}e${String(args.episodeNumber).padStart(2, "0")}`;
  return `manual/episodes/${args.tmdbShowId}/${code}/${stamp}-${slugForKey(args.showTitle)}.txt`;
}

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

    const allOverstimQueue = await ctx.db.query("overstimulationQueue").collect();
    const overstimQueueStats = {
      total: allOverstimQueue.length,
      queued: allOverstimQueue.filter((q) => q.status === "queued").length,
      processing: allOverstimQueue.filter((q) => q.status === "processing").length,
      completed: allOverstimQueue.filter((q) => q.status === "completed").length,
      failed: allOverstimQueue.filter((q) => q.status === "failed").length,
    };

    const titleQuality = allTitles.reduce(
      (acc, title) => {
        if (!title.ratings) return acc;
        const assessment = assessRatingQuality({
          confidence: title.ratingConfidence,
          subtitleInfo: title.subtitleInfo,
        });
        if (!assessment.needsReview) return acc;
        acc.needsReview += 1;
        if (assessment.severity === "critical") acc.critical += 1;
        return acc;
      },
      { needsReview: 0, critical: 0 }
    );

    const allEpisodes = await ctx.db.query("episodes").collect();
    const episodeQuality = allEpisodes.reduce(
      (acc, episode) => {
        if (!episode.ratings) return acc;
        const assessment = assessRatingQuality({
          confidence: episode.ratingConfidence,
          subtitleInfo: episode.subtitleInfo,
        });
        if (!assessment.needsReview) return acc;
        acc.needsReview += 1;
        if (assessment.severity === "critical") acc.critical += 1;
        return acc;
      },
      { needsReview: 0, critical: 0 }
    );

    return {
      titleStats,
      userStats,
      correctionStats,
      queueStats,
      overstimQueueStats,
      qualityStats: {
        titleNeedsReview: titleQuality.needsReview,
        titleCritical: titleQuality.critical,
        episodeNeedsReview: episodeQuality.needsReview,
        episodeCritical: episodeQuality.critical,
      },
    };
  },
});

export const getQualityReviewItems = query({
  args: {
    severity: v.optional(v.union(v.literal("warning"), v.literal("critical"))),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const titles = await ctx.db.query("titles").collect();
    const episodes = await ctx.db.query("episodes").collect();
    const titleById = new Map(titles.map((title) => [title._id, title] as const));

    const items: {
      key: string;
      scope: "title" | "episode";
      severity: Exclude<QualitySeverity, "none">;
      reasons: string[];
      confidence?: number;
      subtitleStatus?: string;
      ratedAt?: number;
      titleId?: string;
      episodeId?: string;
      tmdbId?: number;
      displayTitle: string;
    }[] = [];

    for (const title of titles) {
      if (!title.ratings) continue;
      const assessment = assessRatingQuality({
        confidence: title.ratingConfidence,
        subtitleInfo: title.subtitleInfo,
      });
      if (!assessment.needsReview) continue;
      if (args.severity && assessment.severity !== args.severity) continue;
      const severity = assessment.severity === "critical" ? "critical" : "warning";

      items.push({
        key: `title:${title._id}`,
        scope: "title",
        severity,
        reasons: assessment.reasons,
        confidence: title.ratingConfidence,
        subtitleStatus: title.subtitleInfo?.status,
        ratedAt: title.ratedAt,
        titleId: title._id,
        tmdbId: title.tmdbId,
        displayTitle: `${title.title}${title.year > 0 ? ` (${title.year})` : ""}`,
      });
    }

    for (const episode of episodes) {
      if (!episode.ratings) continue;
      const assessment = assessRatingQuality({
        confidence: episode.ratingConfidence,
        subtitleInfo: episode.subtitleInfo,
      });
      if (!assessment.needsReview) continue;
      if (args.severity && assessment.severity !== args.severity) continue;
      const severity = assessment.severity === "critical" ? "critical" : "warning";

      const parentTitle = titleById.get(episode.titleId);
      const showName = parentTitle?.title ?? "Unknown Show";
      const label =
        episode.name?.trim() || `Episode ${episode.episodeNumber}`;
      const displayTitle = `${showName} S${episode.seasonNumber}E${episode.episodeNumber}: ${label}`;

      items.push({
        key: `episode:${episode._id}`,
        scope: "episode",
        severity,
        reasons: assessment.reasons,
        confidence: episode.ratingConfidence,
        subtitleStatus: episode.subtitleInfo?.status,
        ratedAt: episode.ratedAt,
        titleId: episode.titleId,
        episodeId: episode._id,
        tmdbId: parentTitle?.tmdbId,
        displayTitle,
      });
    }

    const severityRank = { critical: 2, warning: 1 };
    items.sort((a, b) => {
      const severityDelta = severityRank[b.severity] - severityRank[a.severity];
      if (severityDelta !== 0) return severityDelta;
      return (b.ratedAt ?? 0) - (a.ratedAt ?? 0);
    });

    return items.slice(0, 200);
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

    const queueItems = args.status
      ? await ctx.db
        .query("ratingQueue")
        .withIndex("by_status_priority", (q) => q.eq("status", args.status!))
        .order("desc")
        .take(200)
      : await ctx.db.query("ratingQueue").order("desc").take(200);

    const titleByTmdbType = new Map<string, Doc<"titles"> | null>();
    const episodeTitleIdByEpisodeId = new Map<string, Doc<"titles">["_id"] | null>();
    const enriched: Array<(typeof queueItems)[number] & { titleId?: Doc<"titles">["_id"] }> = [];

    for (const item of queueItems) {
      let resolvedTitleId = item.titleId;

      // Episode rows should always open the parent title. Resolve through episodeId first.
      if (!resolvedTitleId && item.type === "episode" && item.episodeId) {
        const cacheKey = String(item.episodeId);
        if (!episodeTitleIdByEpisodeId.has(cacheKey)) {
          const episode = await ctx.db.get(item.episodeId);
          episodeTitleIdByEpisodeId.set(cacheKey, episode?.titleId ?? null);
        }
        resolvedTitleId = episodeTitleIdByEpisodeId.get(cacheKey) ?? undefined;
      }

      // Backfill for legacy queue rows without titleId by matching tmdbId + type.
      if (!resolvedTitleId) {
        const matchType = item.type === "episode" ? "tv" : item.type;
        const cacheKey = `${matchType}:${item.tmdbId}`;
        if (!titleByTmdbType.has(cacheKey)) {
          const candidates = await ctx.db
            .query("titles")
            .withIndex("by_tmdbId", (q) => q.eq("tmdbId", item.tmdbId))
            .collect();
          const exact = candidates.find((candidate) => candidate.type === matchType) ?? null;
          titleByTmdbType.set(cacheKey, exact);
        }
        resolvedTitleId = titleByTmdbType.get(cacheKey)?._id;
      }

      enriched.push({
        ...item,
        titleId: resolvedTitleId,
      });
    }

    return enriched;
  },
});

export const getOverstimulationJobs = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("queued"),
        v.literal("processing"),
        v.literal("completed"),
        v.literal("failed")
      )
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const limit = Math.min(Math.max(args.limit ?? 100, 1), 500);
    const jobs = args.status
      ? await ctx.db
        .query("overstimulationQueue")
        .withIndex("by_status_createdAt", (q) => q.eq("status", args.status!))
        .order("desc")
        .take(limit)
      : await ctx.db.query("overstimulationQueue").order("desc").take(limit);

    const titleCache = new Map<string, Doc<"titles"> | null>();

    return await Promise.all(
      jobs.map(async (job) => {
        const titleKey = String(job.titleId);
        if (!titleCache.has(titleKey)) {
          const title = await ctx.db.get(job.titleId);
          titleCache.set(titleKey, title ?? null);
        }
        const title = titleCache.get(titleKey);
        return {
          ...job,
          titleName: title?.title ?? "Unknown title",
          titleYear: title?.year ?? undefined,
          tmdbId: title?.tmdbId ?? undefined,
        };
      })
    );
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
      status: "unrated",
    });

    return episode;
  },
});

const manualSubtitleTargetValidator = v.union(
  v.object({
    scope: v.literal("title"),
    titleId: v.id("titles"),
  }),
  v.object({
    scope: v.literal("episode"),
    episodeId: v.id("episodes"),
  })
);

export const attachManualSubtitleArchive = internalMutation({
  args: {
    target: manualSubtitleTargetValidator,
    subtitleInfo: v.object({
      status: v.literal("success"),
      source: v.string(),
      language: v.optional(v.string()),
      dialogueLines: v.optional(v.number()),
      transcriptStorage: v.object({
        provider: v.literal("r2"),
        bucket: v.string(),
        key: v.string(),
        bytes: v.number(),
        sha256: v.string(),
        uploadedAt: v.number(),
      }),
    }),
  },
  handler: async (ctx, args) => {
    if (args.target.scope === "title") {
      const title = await ctx.db.get(args.target.titleId);
      if (!title) throw new Error("Title not found");
      await ctx.db.patch(args.target.titleId, {
        subtitleInfo: args.subtitleInfo,
      });
      return;
    }

    const episode = await ctx.db.get(args.target.episodeId);
    if (!episode) throw new Error("Episode not found");
    await ctx.db.patch(args.target.episodeId, {
      subtitleInfo: args.subtitleInfo,
    });
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
      titleId: args.titleId,
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
      titleId: episode.titleId,
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

export const getSubtitleArchive = action({
  args: {
    target: manualSubtitleTargetValidator,
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    found: boolean;
    message?: string;
    subtitleStatus?: string;
    source?: string;
    language?: string;
    dialogueLines?: number;
    storageKey?: string;
    storageBucket?: string;
    storageBytes?: number;
    uploadedAt?: number;
    transcript?: string;
  }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    await ctx.runQuery(internal.admin.getAdminUser, {
      clerkId: identity.subject,
    });

    const record = await (args.target.scope === "title"
      ? ctx.runQuery(api.titles.getTitle, {
          titleId: args.target.titleId,
        })
      : ctx.runQuery(api.episodes.getEpisode, {
          episodeId: args.target.episodeId,
        }));
    if (!record) {
      throw new Error(args.target.scope === "title" ? "Title not found" : "Episode not found");
    }

    const subtitleInfo = record.subtitleInfo as
      | {
          status?: string;
          source?: string;
          language?: string;
          dialogueLines?: number;
          transcriptStorage?: {
            key: string;
            bucket: string;
            bytes: number;
            uploadedAt: number;
          };
        }
      | undefined;
    const storage = subtitleInfo?.transcriptStorage;
    if (!storage) {
      return {
        found: false,
        message: "No archived subtitle transcript exists for this record yet.",
        subtitleStatus: subtitleInfo?.status,
        source: subtitleInfo?.source,
        language: subtitleInfo?.language,
        dialogueLines: subtitleInfo?.dialogueLines,
      };
    }

    if (!isR2Configured()) {
      return {
        found: false,
        message:
          "R2 is not configured for reads in this environment. Set R2 env vars to view archived subtitles.",
        subtitleStatus: subtitleInfo?.status,
        source: subtitleInfo?.source,
        language: subtitleInfo?.language,
        dialogueLines: subtitleInfo?.dialogueLines,
        storageKey: storage.key,
      };
    }

    const transcript = await downloadTextFromR2({
      key: storage.key,
      bucket: storage.bucket,
    });
    if (!transcript || transcript.trim().length === 0) {
      return {
        found: false,
        message:
          "Subtitle archive metadata exists, but the transcript text could not be loaded.",
        subtitleStatus: subtitleInfo?.status,
        source: subtitleInfo?.source,
        language: subtitleInfo?.language,
        dialogueLines: subtitleInfo?.dialogueLines,
        storageKey: storage.key,
        storageBucket: storage.bucket,
      };
    }

    return {
      found: true,
      subtitleStatus: subtitleInfo?.status,
      source: subtitleInfo?.source,
      language: subtitleInfo?.language,
      dialogueLines: subtitleInfo?.dialogueLines,
      storageKey: storage.key,
      storageBucket: storage.bucket,
      storageBytes: storage.bytes,
      uploadedAt: storage.uploadedAt,
      transcript,
    };
  },
});

export const addManualSubtitleArchive = action({
  args: {
    target: manualSubtitleTargetValidator,
    transcript: v.string(),
    rerate: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    await ctx.runQuery(internal.admin.getAdminUser, {
      clerkId: identity.subject,
    });

    const transcript = args.transcript.trim();
    if (transcript.length < 20) {
      throw new Error("Transcript text is too short");
    }

    const dialogueLines = transcript
      .split("\n")
      .filter((line) => line.trim().length > 0).length;

    if (args.target.scope === "title") {
      const title = await ctx.runQuery(api.titles.getTitle, {
        titleId: args.target.titleId,
      });
      if (!title) throw new Error("Title not found");

      const key = buildManualTitleTranscriptKey({
        tmdbId: title.tmdbId,
        type: title.type,
        title: title.title,
      });
      const stored = await uploadTextToR2({ key, text: transcript });
      if (!stored) {
        throw new Error(
          "R2 upload failed or is not configured. Set R2 env vars first."
        );
      }

      await ctx.runMutation(internal.admin.attachManualSubtitleArchive, {
        target: args.target,
        subtitleInfo: {
          status: "success",
          source: "admin_manual",
          language: "en",
          dialogueLines,
          transcriptStorage: stored,
        },
      });

      if (args.rerate) {
        await ctx.runAction(api.admin.reRateTitle, { titleId: args.target.titleId });
      }

      return {
        success: true,
        scope: "title" as const,
        key: stored.key,
        bytes: stored.bytes,
      };
    }

    const episode = await ctx.runQuery(api.episodes.getEpisode, {
      episodeId: args.target.episodeId,
    });
    if (!episode) throw new Error("Episode not found");
    const parentTitle = await ctx.runQuery(api.titles.getTitle, {
      titleId: episode.titleId,
    });
    if (!parentTitle) throw new Error("Parent title not found");

    const key = buildManualEpisodeTranscriptKey({
      tmdbShowId: episode.tmdbShowId,
      seasonNumber: episode.seasonNumber,
      episodeNumber: episode.episodeNumber,
      showTitle: parentTitle.title,
    });
    const stored = await uploadTextToR2({ key, text: transcript });
    if (!stored) {
      throw new Error(
        "R2 upload failed or is not configured. Set R2 env vars first."
      );
    }

    await ctx.runMutation(internal.admin.attachManualSubtitleArchive, {
      target: args.target,
      subtitleInfo: {
        status: "success",
        source: "admin_manual",
        language: "en",
        dialogueLines,
        transcriptStorage: stored,
      },
    });

    if (args.rerate) {
      await ctx.runAction(api.admin.reRateEpisode, {
        episodeId: args.target.episodeId,
      });
    }

    return {
      success: true,
      scope: "episode" as const,
      key: stored.key,
      bytes: stored.bytes,
    };
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
    titleId: v.optional(v.id("titles")),
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
      titleId: args.titleId,
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

export const retryOverstimulationJob = action({
  args: { jobId: v.id("overstimulationQueue") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    await ctx.runQuery(internal.admin.getAdminUser, { clerkId: identity.subject });

    const job = await ctx.runQuery(internal.admin.getOverstimulationJobById, {
      jobId: args.jobId,
    });
    if (!job) throw new Error("Overstimulation job not found");

    await ctx.runMutation(internal.admin.resetOverstimulationJobToQueued, {
      jobId: args.jobId,
    });

    await ctx.scheduler.runAfter(0, api.healthRatings.processOverstimulationJob, {
      jobId: args.jobId,
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

export const getOverstimulationJobById = internalQuery({
  args: { jobId: v.id("overstimulationQueue") },
  handler: async (ctx, args) => await ctx.db.get(args.jobId),
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

export const resetOverstimulationJobToQueued = internalMutation({
  args: { jobId: v.id("overstimulationQueue") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      status: "queued",
      attempts: 0,
      lastError: undefined,
      startedAt: undefined,
      completedAt: undefined,
      updatedAt: Date.now(),
    });
  },
});
