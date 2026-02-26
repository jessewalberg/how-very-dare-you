import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./lib/adminAuth";

export const submit = mutation({
  args: {
    titleId: v.id("titles"),
    category: v.string(),
    currentSeverity: v.number(),
    suggestedSeverity: v.number(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    const title = await ctx.db.get(args.titleId);
    if (!title) throw new Error("Title not found");

    return await ctx.db.insert("corrections", {
      titleId: args.titleId,
      userId: user._id,
      category: args.category,
      currentSeverity: args.currentSeverity,
      suggestedSeverity: args.suggestedSeverity,
      reason: args.reason,
      status: "pending",
      createdAt: Date.now(),
    });
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
