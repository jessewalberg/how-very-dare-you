import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./lib/adminAuth";
import type { Doc, Id } from "./_generated/dataModel";
import {
  ADVISORY_FEEDBACK_REASON_LABELS,
  normalizeAdvisoryFeedbackComment,
  normalizeAdvisoryFeedbackReasonTag,
  normalizeAdvisoryFeedbackSurface,
} from "../lib/advisoryFeedback";

const reasonTagValidator = v.optional(
  v.union(
    v.literal("unclear"),
    v.literal("too_strict"),
    v.literal("too_lenient"),
    v.literal("missing_context")
  )
);

const surfaceValidator = v.optional(
  v.union(v.literal("title_detail"), v.literal("title_card"))
);

export const submitTitleFeedback = mutation({
  args: {
    titleId: v.id("titles"),
    helpful: v.boolean(),
    reasonTag: reasonTagValidator,
    comment: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    surface: surfaceValidator,
  },
  handler: async (ctx, args) => {
    const title = await ctx.db.get(args.titleId);
    if (!title) throw new Error("Title not found");

    let userId: Id<"users"> | undefined;
    const identity = await ctx.auth.getUserIdentity();
    if (identity) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
        .first();
      userId = user?._id;
    }

    const reasonTag = normalizeAdvisoryFeedbackReasonTag(args.reasonTag);
    if (!args.helpful && !reasonTag) {
      throw new Error("reasonTag is required when helpful is false");
    }

    const comment = normalizeAdvisoryFeedbackComment(args.comment);
    const sessionId = args.sessionId?.trim().slice(0, 120) || undefined;
    const surface = normalizeAdvisoryFeedbackSurface(args.surface);

    return await ctx.db.insert("titleFeedback", {
      titleId: args.titleId,
      userId,
      sessionId,
      helpful: args.helpful,
      reasonTag,
      comment,
      surface,
      createdAt: Date.now(),
    });
  },
});

export const listRecent = query({
  args: {
    limit: v.optional(v.number()),
    helpful: v.optional(v.boolean()),
    reasonTag: reasonTagValidator,
    titleId: v.optional(v.id("titles")),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const limit = Math.max(1, Math.min(args.limit ?? 100, 500));
    const days =
      args.days === undefined
        ? undefined
        : Math.min(Math.max(Math.floor(args.days), 1), 365);
    const since = days ? Date.now() - days * 24 * 60 * 60 * 1000 : undefined;
    const allFeedback = await ctx.db.query("titleFeedback").collect();

    const filtered = allFeedback
      .filter((item) => {
        if (args.titleId && item.titleId !== args.titleId) return false;
        if (args.helpful !== undefined && item.helpful !== args.helpful) {
          return false;
        }
        if (args.reasonTag && item.reasonTag !== args.reasonTag) return false;
        if (since !== undefined && item.createdAt < since) {
          return false;
        }
        return true;
      })
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);

    const titleCache = new Map<string, Doc<"titles"> | null>();
    const userCache = new Map<string, Doc<"users"> | null>();

    for (const item of filtered) {
      const titleKey = String(item.titleId);
      if (!titleCache.has(titleKey)) {
        titleCache.set(titleKey, await ctx.db.get(item.titleId));
      }
      if (item.userId) {
        const userKey = String(item.userId);
        if (!userCache.has(userKey)) {
          userCache.set(userKey, await ctx.db.get(item.userId));
        }
      }
    }

    return filtered.map((item) => {
      const title = titleCache.get(String(item.titleId));
      const user = item.userId ? userCache.get(String(item.userId)) : undefined;
      return {
        ...item,
        titleName: title?.title ?? "Unknown title",
        titleType: title?.type ?? "movie",
        titleYear: title?.year,
        titleSlug: title?.slug,
        userName: user?.name,
        userEmail: user?.email,
      };
    });
  },
});

export const aggregateByReason = query({
  args: {
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const days = Math.min(Math.max(Math.floor(args.days ?? 30), 1), 365);
    const since = Date.now() - days * 24 * 60 * 60 * 1000;

    const allFeedback = await ctx.db.query("titleFeedback").collect();
    const recent = allFeedback.filter((item) => item.createdAt >= since);

    const total = recent.length;
    const helpfulCount = recent.filter((item) => item.helpful).length;
    const notHelpfulCount = total - helpfulCount;
    const helpfulRate = total > 0 ? helpfulCount / total : 0;
    const commentedCount = recent.filter((item) => Boolean(item.comment)).length;

    const reasonCounts = new Map<string, number>();
    const titleIssueCounts = new Map<string, { titleId: string; count: number }>();
    for (const item of recent) {
      if (item.helpful) continue;

      if (item.reasonTag) {
        reasonCounts.set(item.reasonTag, (reasonCounts.get(item.reasonTag) ?? 0) + 1);
      }

      const titleKey = String(item.titleId);
      titleIssueCounts.set(titleKey, {
        titleId: titleKey,
        count: (titleIssueCounts.get(titleKey)?.count ?? 0) + 1,
      });
    }

    const topReasons = Array.from(reasonCounts.entries())
      .map(([reasonTag, count]) => ({
        reasonTag,
        count,
        label:
          ADVISORY_FEEDBACK_REASON_LABELS[
            reasonTag as keyof typeof ADVISORY_FEEDBACK_REASON_LABELS
          ] ?? reasonTag,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const topTitleCounts = Array.from(titleIssueCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    const topTitles = await Promise.all(
      topTitleCounts.map(async (entry) => {
        const title = await ctx.db.get(entry.titleId as Id<"titles">);
        return {
          titleId: entry.titleId,
          titleName: title?.title ?? "Unknown title",
          titleYear: title?.year,
          titleSlug: title?.slug,
          count: entry.count,
        };
      })
    );

    return {
      days,
      total,
      helpfulCount,
      notHelpfulCount,
      helpfulRate,
      commentedCount,
      topReasons,
      topTitles,
    };
  },
});
