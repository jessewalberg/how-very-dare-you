import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  titles: defineTable({
    // External IDs
    tmdbId: v.number(),
    imdbId: v.optional(v.string()),

    // Core metadata
    title: v.string(),
    type: v.union(v.literal("movie"), v.literal("tv"), v.literal("youtube")),
    year: v.number(),
    ageRating: v.optional(v.string()),
    genre: v.optional(v.string()),
    overview: v.optional(v.string()),
    posterPath: v.optional(v.string()),
    runtime: v.optional(v.number()),

    // Streaming availability
    streamingProviders: v.optional(
      v.array(
        v.object({
          name: v.string(),
          logoPath: v.optional(v.string()),
          affiliateUrl: v.optional(v.string()),
        })
      )
    ),

    // AI Rating Results (raw, unweighted)
    ratings: v.optional(
      v.object({
        lgbtq: v.number(),
        climate: v.number(),
        racialIdentity: v.number(),
        genderRoles: v.number(),
        antiAuthority: v.number(),
        religious: v.number(),
        political: v.number(),
        sexuality: v.number(),
        // V2: Developmental health
        overstimulation: v.optional(v.number()),
      })
    ),

    // V2: Video analysis metadata
    videoAnalysis: v.optional(
      v.object({
        youtubeVideoId: v.string(),
        analyzedAt: v.number(),
        cutsPerMinute: v.number(),
        avgCutDuration: v.number(),
        avgSaturation: v.number(),
        avgBrightness: v.number(),
        brightnessVariance: v.number(),
        flashCount: v.number(),
        trailerBiasCorrected: v.boolean(),
      })
    ),

    // AI rating metadata
    ratingConfidence: v.optional(v.number()),
    ratingNotes: v.optional(v.string()),
    ratingModel: v.optional(v.string()),
    ratedAt: v.optional(v.number()),

    // Episode flags (TV shows only — legacy holistic ratings)
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

    // Per-episode rating system (TV shows)
    numberOfSeasons: v.optional(v.number()),
    seasonData: v.optional(
      v.array(
        v.object({
          seasonNumber: v.number(),
          episodeCount: v.number(),
          name: v.optional(v.string()),
          overview: v.optional(v.string()),
          posterPath: v.optional(v.string()),
          airDate: v.optional(v.string()),
        })
      )
    ),
    ratedEpisodeCount: v.optional(v.number()),
    hasEpisodeRatings: v.optional(v.boolean()),

    // Status
    status: v.union(
      v.literal("pending"),
      v.literal("rating"),
      v.literal("rated"),
      v.literal("reviewed"),
      v.literal("disputed")
    ),

    // User request tracking
    requestCount: v.optional(v.number()),
  })
    .index("by_tmdbId", ["tmdbId"])
    .index("by_imdbId", ["imdbId"])
    .index("by_status", ["status"])
    .index("by_type_and_year", ["type", "year"])
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["type", "status"],
    }),

  users: defineTable({
    clerkId: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),

    // Subscription
    tier: v.union(v.literal("free"), v.literal("paid")),
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    subscriptionExpiresAt: v.optional(v.number()),

    // Personalized weights (paid feature)
    categoryWeights: v.optional(
      v.object({
        lgbtq: v.number(),
        climate: v.number(),
        racialIdentity: v.number(),
        genderRoles: v.number(),
        antiAuthority: v.number(),
        religious: v.number(),
        political: v.number(),
        sexuality: v.number(),
        // V2: Developmental health
        overstimulation: v.optional(v.number()),
      })
    ),

    // Rate limiting
    onDemandRatingsToday: v.optional(v.number()),
    onDemandRatingsDate: v.optional(v.string()),

    // Watchlist (paid feature)
    watchlist: v.optional(v.array(v.id("titles"))),
  })
    .index("by_clerkId", ["clerkId"])
    .index("by_stripeCustomerId", ["stripeCustomerId"]),

  corrections: defineTable({
    titleId: v.id("titles"),
    userId: v.id("users"),
    category: v.string(),
    currentSeverity: v.number(),
    suggestedSeverity: v.number(),
    reason: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("rejected")
    ),
    createdAt: v.number(),
    reviewedAt: v.optional(v.number()),
  })
    .index("by_titleId", ["titleId"])
    .index("by_status", ["status"])
    .index("by_userId", ["userId"]),

  ratingQueue: defineTable({
    tmdbId: v.number(),
    title: v.string(),
    type: v.union(v.literal("movie"), v.literal("tv"), v.literal("episode")),
    priority: v.number(),
    source: v.union(v.literal("batch"), v.literal("user_request")),
    status: v.union(
      v.literal("queued"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    attempts: v.optional(v.number()),
    lastError: v.optional(v.string()),
    createdAt: v.number(),
    // Episode-specific fields
    episodeId: v.optional(v.id("episodes")),
    seasonNumber: v.optional(v.number()),
    episodeNumber: v.optional(v.number()),
  })
    .index("by_status_priority", ["status", "priority"])
    .index("by_tmdbId", ["tmdbId"]),

  episodes: defineTable({
    titleId: v.id("titles"),
    tmdbShowId: v.number(),
    seasonNumber: v.number(),
    episodeNumber: v.number(),

    // Episode metadata from TMDB
    name: v.optional(v.string()),
    overview: v.optional(v.string()),
    airDate: v.optional(v.string()),
    stillPath: v.optional(v.string()),
    runtime: v.optional(v.number()),

    // AI Rating Results (same 8-category shape as titles)
    ratings: v.optional(
      v.object({
        lgbtq: v.number(),
        climate: v.number(),
        racialIdentity: v.number(),
        genderRoles: v.number(),
        antiAuthority: v.number(),
        religious: v.number(),
        political: v.number(),
        sexuality: v.number(),
      })
    ),
    ratingConfidence: v.optional(v.number()),
    ratingNotes: v.optional(v.string()),
    ratingModel: v.optional(v.string()),
    ratedAt: v.optional(v.number()),

    // Status
    status: v.union(
      v.literal("unrated"),
      v.literal("rating"),
      v.literal("rated"),
      v.literal("failed")
    ),
  })
    .index("by_titleId", ["titleId"])
    .index("by_titleId_season", ["titleId", "seasonNumber"])
    .index("by_tmdbShowId_season_episode", [
      "tmdbShowId",
      "seasonNumber",
      "episodeNumber",
    ]),
});
