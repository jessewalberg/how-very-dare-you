import { query } from "./_generated/server";
import { v } from "convex/values";
import { isSeedTitle } from "./lib/seedData";

export const searchTitles = query({
  args: { searchTerm: v.string() },
  handler: async (ctx, args) => {
    const results = await ctx.db
      .query("titles")
      .withSearchIndex("search_title", (q) =>
        q.search("title", args.searchTerm)
      )
      .take(20);

    return results.filter((title) => !isSeedTitle(title));
  },
});
