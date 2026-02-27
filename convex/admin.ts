import { query, mutation, action, internalQuery, internalMutation } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { v } from "convex/values";
import { requireAdmin } from "./lib/adminAuth";

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

// ── Internal helpers ────────────────────────────────────

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
        status: "pending",
      });
    } else {
      await ctx.db.patch(args.titleId, { status: "pending" });
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
