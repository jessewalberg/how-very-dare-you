import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./lib/adminAuth";
import { resolveTitlePath } from "../lib/titlePaths";

export const submit = mutation({
  args: {
    titleId: v.id("titles"),
    category: v.string(),
    currentSeverity: v.number(),
    suggestedSeverity: v.number(),
    reason: v.string(),
    contactEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const user = identity
      ? await ctx.db
          .query("users")
          .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
          .first()
      : null;

    const title = await ctx.db.get(args.titleId);
    if (!title) throw new Error("Title not found");

    return await ctx.db.insert("corrections", {
      titleId: args.titleId,
      userId: user?._id,
      contactEmail: args.contactEmail?.trim() || undefined,
      category: args.category,
      currentSeverity: args.currentSeverity,
      suggestedSeverity: args.suggestedSeverity,
      reason: args.reason,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});

export const listPublic = query({
  args: {},
  handler: async (ctx) => {
    const corrections = await ctx.db.query("corrections").collect();
    const reviewedCorrections = corrections
      .filter((correction) => correction.status !== "pending")
      .sort(
        (a, b) => (b.reviewedAt ?? b.createdAt) - (a.reviewedAt ?? a.createdAt)
      );

    return await Promise.all(
      reviewedCorrections.map(async (correction) => {
        const title = await ctx.db.get(correction.titleId);

        return {
          ...correction,
          titleName: title?.title ?? "Unknown title",
          titleYear: title?.year ?? null,
          titlePath: title
            ? resolveTitlePath(
                correction.titleId,
                title.slug,
                title.title,
                title.year
              )
            : String(correction.titleId),
        };
      })
    );
  },
});

export const listForTitle = query({
  args: { titleId: v.id("titles") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("corrections")
      .withIndex("by_titleId", (q) => q.eq("titleId", args.titleId))
      .collect();
  },
});

export const listAll = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("accepted"),
        v.literal("rejected")
      )
    ),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    if (args.status) {
      return await ctx.db
        .query("corrections")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .collect();
    }
    return await ctx.db.query("corrections").collect();
  },
});

export const updateStatus = mutation({
  args: {
    correctionId: v.id("corrections"),
    status: v.union(v.literal("accepted"), v.literal("rejected")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const correction = await ctx.db.get(args.correctionId);
    if (!correction) throw new Error("Correction not found");

    await ctx.db.patch(args.correctionId, {
      status: args.status,
      reviewedAt: Date.now(),
    });

    // If accepted, update the title's rating for that category
    if (args.status === "accepted") {
      const title = await ctx.db.get(correction.titleId);
      if (title?.ratings) {
        const updatedRatings = {
          ...title.ratings,
          [correction.category]: correction.suggestedSeverity,
        };
        await ctx.db.patch(correction.titleId, {
          ratings: updatedRatings,
          status: "reviewed",
        });
      }
    }
  },
});
