# Convex Patterns — Project-Specific Skill

## Overview

This is a **project-specific** skill file, NOT official Convex documentation. It contains patterns tailored to this content advisory platform.

**When in doubt, always defer to the official docs:**
- Convex docs: https://docs.convex.dev
- Convex + Next.js App Router: https://docs.convex.dev/client/nextjs/app-router
- Convex server rendering: https://docs.convex.dev/client/nextjs/app-router/server-rendering
- Convex schema: https://docs.convex.dev/database/schemas
- Convex actions (external APIs): https://docs.convex.dev/functions/actions
- Convex cron jobs: https://docs.convex.dev/scheduling/cron-jobs
- Convex + Clerk auth: https://docs.convex.dev/auth/clerk
- Convex environment variables: https://docs.convex.dev/production/environment-variables

If a pattern in this file conflicts with the official docs, the official docs win.

---

## Core Concepts

### Query vs Mutation vs Action

- **Query**: Read-only, deterministic, cached, real-time subscriptions. Use for all data reads.
- **Mutation**: Read-write, deterministic, transactional. Use for database writes.
- **Action**: Non-deterministic, can call external APIs. Use for TMDB, OMDB, OpenRouter calls. Actions can call mutations internally.

### File Organization

```
convex/
├── schema.ts          # Database schema (single source of truth)
├── _generated/        # Auto-generated (don't edit)
├── titles.ts          # Title-related queries and mutations
├── users.ts           # User-related queries and mutations
├── corrections.ts     # Correction submissions
├── search.ts          # Search functionality
├── ratings.ts         # AI rating pipeline (actions)
├── stripe.ts          # Stripe webhook handling
├── crons.ts           # Scheduled jobs
└── http.ts            # HTTP endpoints
```

---

## Patterns

### Query Pattern (Real-Time Data)

```typescript
import { query } from "./_generated/server";
import { v } from "convex/values";

// Simple query with arguments
export const getTitle = query({
  args: { titleId: v.id("titles") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.titleId);
  },
});

// Query with index
export const getTitleByTmdbId = query({
  args: { tmdbId: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("titles")
      .withIndex("by_tmdbId", (q) => q.eq("tmdbId", args.tmdbId))
      .first();
  },
});

// Search query
export const searchTitles = query({
  args: { searchTerm: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("titles")
      .withSearchIndex("search_title", (q) =>
        q.search("title", args.searchTerm).eq("status", "rated")
      )
      .take(20);
  },
});

// Complex filtered query
export const browseNoFlags = query({
  args: {
    type: v.optional(v.union(v.literal("movie"), v.literal("tv"))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("titles")
      .withIndex("by_status", (q) => q.eq("status", "rated"));

    const results = await query.collect();

    // Filter for No Flags (all categories = 0)
    return results.filter((title) => {
      if (!title.ratings) return false;
      if (args.type && title.type !== args.type) return false;
      return Object.values(title.ratings).every((v) => v === 0);
    }).slice(0, args.limit ?? 50);
  },
});
```

### Mutation Pattern (Database Writes)

```typescript
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const updateUserWeights = mutation({
  args: {
    clerkId: v.string(),
    weights: v.object({
      lgbtq: v.number(),
      climate: v.number(),
      racialIdentity: v.number(),
      genderRoles: v.number(),
      antiAuthority: v.number(),
      religious: v.number(),
      political: v.number(),
      sexuality: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) throw new Error("User not found");
    if (user.tier !== "paid") throw new Error("Premium feature");

    await ctx.db.patch(user._id, { categoryWeights: args.weights });
  },
});
```

### Action Pattern (External API Calls)

```typescript
import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

export const rateTitle = action({
  args: { tmdbId: v.number() },
  handler: async (ctx, args) => {
    // 1. Fetch from TMDB
    const tmdbData = await fetch(
      `https://api.themoviedb.org/3/movie/${args.tmdbId}?api_key=${process.env.TMDB_API_KEY}`
    ).then((r) => r.json());

    // 2. Fetch from OMDB
    const omdbData = await fetch(
      `https://www.omdbapi.com/?i=${tmdbData.imdb_id}&apikey=${process.env.OMDB_API_KEY}`
    ).then((r) => r.json());

    // 3. Construct prompt and call OpenRouter
    const prompt = constructRatingPrompt({ /* ... */ });
    const aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "anthropic/claude-sonnet-4-20250514",
        messages: [
          { role: "system", content: RATING_SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
      }),
    });

    const result = await aiResponse.json();
    const ratings = parseRatingResponse(result.choices[0].message.content);

    // 4. Write to database via mutation
    await ctx.runMutation(api.titles.saveRating, {
      tmdbId: args.tmdbId,
      ratings: ratings.ratings,
      confidence: ratings.confidence,
      notes: ratings.notes,
      episodeFlags: ratings.episodeFlags || [],
    });
  },
});
```

### Cron Job Pattern

```typescript
// convex/crons.ts
import { cronJobs } from "convex/server";
import { api } from "./_generated/api";

const crons = cronJobs();

// Nightly batch rating at 2 AM UTC
crons.daily(
  "nightly-rating-batch",
  { hourUTC: 2, minuteUTC: 0 },
  api.ratings.runNightlyBatch
);

// Reset daily rate limits at midnight UTC
crons.daily(
  "reset-rate-limits",
  { hourUTC: 0, minuteUTC: 0 },
  api.users.resetDailyRateLimits
);

export default crons;
```

---

## Auth Pattern (Clerk + Convex)

### ConvexClientProvider

```typescript
// components/layout/ConvexClientProvider.tsx
"use client";

import { ConvexReactClient } from "convex/react";
import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ReactNode } from "react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
```

### Auth-Protected Queries

```typescript
// In Convex functions, get the authenticated user:
export const getMyProfile = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
  },
});
```

---

## Environment Variables

```bash
# .env.local (Next.js)
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Convex Dashboard → Settings → Environment Variables
TMDB_API_KEY=your_tmdb_key
OMDB_API_KEY=your_omdb_key
OPENROUTER_API_KEY=your_openrouter_key
OPENSUBTITLES_API_KEY=your_opensubtitles_key
STRIPE_SECRET_KEY=sk_...
```

---

## Performance Tips

1. **Use indexes for all filtered queries.** Never use `.filter()` on large collections — define an index in the schema.
2. **Paginate large result sets.** Use `.paginate()` instead of `.collect()` for browse pages.
3. **Keep queries lightweight.** Don't compute composite scores in queries — compute them client-side from raw ratings + user weights.
4. **Use `preloadQuery` for SEO pages.** Title detail pages should preload data in Server Components.
5. **Rate limit in mutations, not queries.** Check and decrement rate limits inside the mutation that triggers on-demand rating.
