import { mutation, query } from "./_generated/server";
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
