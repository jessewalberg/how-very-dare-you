# Content Advisory Platform — Technical Specification

## Product Vision

A public web application that rates movies, TV shows, and YouTube kids content across 8 cultural/ideological theme categories, giving parents a personalized, at-a-glance content advisory score. Parents can customize which categories matter to them, browse "No Flags" content, and filter by age range, streaming service, and category thresholds.

---

## Decisions Log

### Rating Categories (8)

| # | Category | Description |
|---|----------|-------------|
| 1 | **LGBT Themes** | Same-sex relationships, gender identity, transition storylines |
| 2 | **Environmental / Climate Messaging** | Climate activism, anti-industry messaging, "save the planet" storylines |
| 3 | **Racial Identity / Social Justice** | Race-focused narratives, privilege themes, revisionist takes |
| 4 | **Gender Role Commentary** | Mocking traditional roles, "girl boss" tropes, "dads are dumb" |
| 5 | **Anti-Authority / Anti-Tradition** | Parents portrayed negatively, institutions mocked, rebellion glorified |
| 6 | **Religious Sensitivity** | Faith mocked, anti-religious messaging, occult/new-age normalized |
| 7 | **Political Messaging** | Overt left/right political themes, activist storylines |
| 8 | **Sexuality / Age-Inappropriate Content** | Sexualization, poorly-handled puberty themes, mature romantic content for young audiences |

### Severity Scale (0–4)

| Value | Label | Description |
|-------|-------|-------------|
| 0 | **None** | Theme not present |
| 1 | **Brief** | Blink-and-you-miss-it — a background detail, one throwaway line |
| 2 | **Notable** | Noticeable but not a focus — a scene or subplot, not the main story |
| 3 | **Significant** | A major subplot or recurring theme throughout |
| 4 | **Core Theme** | This is what the movie/show is *about* |

### Composite Score Formula

```
composite = peak_weighted_score * 0.6 + average_weighted_scores * 0.4
```

- Each user sets weights (0–10) per category (default all 5)
- Categories weighted to 0 are excluded from both peak and average calculations
- Score is normalized to 0–4 scale to match the severity labels
- "No Flags" badge: awarded when ALL 8 raw (unweighted) category scores are 0

### TV Show Handling

- Shows receive a **show-level overall rating** across all 8 categories
- Individual episodes with notable deviations are flagged with **episode-specific exceptions**
- Format: "Show overall: [ratings]. Exceptions: S3E17 — LGBT: Brief (background same-sex couple in one scene)"
- AI batch process rates the show holistically; episode flags are added via spot-checking or user-submitted corrections

### Content Scope (Phased)

- **Phase 1 (Launch):** Theatrical movies + major streaming service originals + major kids TV shows
- **Phase 2:** Curated YouTube channels (Cocomelon, Ryan's World, etc.)
- **Phase 3:** Open YouTube coverage

### Unrated Title Handling

- User searches for a title not in the database
- TMDB/OMDB metadata loads instantly (poster, description, age rating)
- Real-time AI rating is triggered via OpenRouter → Claude
- Loading UX shows poster + metadata immediately, ratings animate in when ready (10–30 sec)
- Rating is saved permanently — every future user gets it instantly
- Rate limits: **3 on-demand lookups/day (free)**, **10/day (paid)**

---

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| **Package Manager** | Bun | Used for all installs and CLI commands (bunx for tools) |
| **Frontend** | Next.js 16.1 (App Router) | Deployed on Vercel (free tier) |
| **UI** | shadcn/ui + Tailwind CSS | Component library for consistent, beautiful UI |
| **Backend / DB** | Convex | Real-time database, server functions, cron jobs |
| **Auth** | Clerk | Free tier (10k users), best Convex integration |
| **Payments** | Stripe | $4.99/mo subscription |
| **AI Ratings** | OpenRouter → Claude | Multi-signal analysis pipeline |
| **Data Sources** | TMDB + OMDB + OpenSubtitles | Movie/show metadata + subtitles for AI analysis |
| **React Hooks** | Convex native + better-convex-query | TanStack-style DX without the overhead |

### Key Dependencies

```json
{
  "dependencies": {
    "next": "^16.1.0",
    "react": "^19.2.0",
    "convex": "latest",
    "better-convex-query": "latest",
    "@clerk/nextjs": "latest",
    "@stripe/stripe-js": "latest",
    "stripe": "latest"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "@types/react": "latest",
    "tailwindcss": "^4.0.0",
    "postcss": "latest"
  }
}
```

---

## Monetization

### Freemium Model

**Free Tier:**
- Search by title → see full 8-category breakdown + composite score
- Browse "No Flags" content
- Filter by age range
- 3 on-demand (unrated title) lookups per day

**Paid Tier ($4.99/mo via Stripe):**
- Personalized category weights (custom composite score)
- Advanced filters: streaming service, category threshold ("show me nothing above Brief for LGBT")
- Save to watchlist
- 10 on-demand lookups per day

**Affiliate Links:**
- Streaming availability links (Amazon, Apple TV, etc.) use affiliate tracking
- Passive revenue, no UX degradation

---

## MVP Feature List (Launch)

1. Search by title → 8-category breakdown + composite score
2. "No Flags" browse page (all-zeros titles)
3. Filter by age range
4. Filter by streaming service (using TMDB watch providers)
5. On-demand AI rating for unrated titles (rate-limited)
6. Nightly batch processing of new/popular releases
7. User accounts via Clerk (free to browse, account for personalization)
8. Paid tier: personalized weights, advanced filters, watchlist
9. Stripe integration for $4.99/mo subscription
10. Affiliate links on streaming availability
11. User-submitted corrections/disputes on ratings
12. Show-level ratings with episode-specific flags

### V2 Features (Post-Launch)

- Email/push alerts ("New No Flags movie added")
- YouTube channel coverage
- Native mobile app (React Native or Expo)
- Community features (user reviews, "parent verified" badges)
- Tiered AI model approach (Haiku for screening, Sonnet for detailed ratings)

---

## Convex Database Schema

### Tables

#### `titles`
Primary content table — one record per movie or TV show.

```typescript
// convex/schema.ts
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
    ageRating: v.optional(v.string()), // "PG", "PG-13", "TV-Y7", etc.
    genre: v.optional(v.string()),
    overview: v.optional(v.string()),
    posterPath: v.optional(v.string()), // TMDB poster URL path
    runtime: v.optional(v.number()), // minutes

    // Streaming availability (refreshed periodically)
    streamingProviders: v.optional(v.array(v.object({
      name: v.string(),
      logoPath: v.optional(v.string()),
      affiliateUrl: v.optional(v.string()),
    }))),

    // AI Rating Results (raw, unweighted)
    ratings: v.optional(v.object({
      lgbtq: v.number(),         // 0-4
      climate: v.number(),       // 0-4
      racialIdentity: v.number(),// 0-4
      genderRoles: v.number(),   // 0-4
      antiAuthority: v.number(), // 0-4
      religious: v.number(),     // 0-4
      political: v.number(),     // 0-4
      sexuality: v.number(),     // 0-4
    })),

    // AI rating metadata
    ratingConfidence: v.optional(v.number()), // 0-1 confidence score
    ratingNotes: v.optional(v.string()),      // AI-generated summary of findings
    ratingModel: v.optional(v.string()),      // which model rated it
    ratedAt: v.optional(v.number()),          // timestamp

    // Episode flags (TV shows only)
    episodeFlags: v.optional(v.array(v.object({
      season: v.number(),
      episode: v.number(),
      episodeTitle: v.optional(v.string()),
      category: v.string(),      // which category is flagged
      severity: v.number(),      // 0-4
      note: v.string(),          // description of the flagged content
    }))),

    // Status
    status: v.union(
      v.literal("pending"),     // metadata loaded, not yet rated
      v.literal("rating"),      // currently being rated by AI
      v.literal("rated"),       // AI rating complete
      v.literal("reviewed"),    // human spot-checked
      v.literal("disputed"),    // user submitted correction, needs review
    ),

    // User request tracking
    requestCount: v.optional(v.number()), // how many users requested this
  })
    .index("by_tmdbId", ["tmdbId"])
    .index("by_imdbId", ["imdbId"])
    .index("by_status", ["status"])
    .index("by_type_and_year", ["type", "year"])
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["type", "status"],
    }),

  // User preferences and subscription data
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
    categoryWeights: v.optional(v.object({
      lgbtq: v.number(),         // 0-10, default 5
      climate: v.number(),
      racialIdentity: v.number(),
      genderRoles: v.number(),
      antiAuthority: v.number(),
      religious: v.number(),
      political: v.number(),
      sexuality: v.number(),
    })),

    // Rate limiting
    onDemandRatingsToday: v.optional(v.number()),
    onDemandRatingsDate: v.optional(v.string()), // YYYY-MM-DD

    // Watchlist (paid feature)
    watchlist: v.optional(v.array(v.id("titles"))),
  })
    .index("by_clerkId", ["clerkId"])
    .index("by_stripeCustomerId", ["stripeCustomerId"]),

  // User-submitted corrections
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
      v.literal("rejected"),
    ),
    createdAt: v.number(),
    reviewedAt: v.optional(v.number()),
  })
    .index("by_titleId", ["titleId"])
    .index("by_status", ["status"])
    .index("by_userId", ["userId"]),

  // Rating queue for batch processing
  ratingQueue: defineTable({
    tmdbId: v.number(),
    title: v.string(),
    type: v.union(v.literal("movie"), v.literal("tv")),
    priority: v.number(), // higher = more urgent (user-requested get higher priority)
    source: v.union(v.literal("batch"), v.literal("user_request")),
    status: v.union(
      v.literal("queued"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed"),
    ),
    attempts: v.optional(v.number()),
    lastError: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_status_priority", ["status", "priority"])
    .index("by_tmdbId", ["tmdbId"]),
});
```

---

## AI Rating Pipeline

### Overview

The rating engine uses a multi-signal approach: it gathers data from multiple sources, constructs a detailed prompt, and sends it to Claude via OpenRouter.

### Data Sources Per Title

1. **TMDB API** — title, overview, genre, age rating, cast, keywords, content ratings
2. **OMDB API** — additional metadata, Rotten Tomatoes scores, plot summary, parental guide
3. **OpenSubtitles** — subtitle/dialogue text for direct content analysis
4. **Existing parental reviews** — scraped/cached data from IMDb Parents Guide (via OMDB or direct)

### Batch Pipeline (Convex Cron)

```
Nightly at 2 AM:
1. Query TMDB for new/popular releases (movies + TV)
2. For each new title:
   a. Check if already in DB → skip if rated
   b. Fetch TMDB metadata
   c. Fetch OMDB supplementary data
   d. Search OpenSubtitles for subtitle file
   e. Add to ratingQueue with priority based on popularity
3. Process queue items:
   a. Construct AI prompt with all gathered signals
   b. Send to OpenRouter (Claude)
   c. Parse structured JSON response
   d. Write ratings to titles table
   e. Flag low-confidence results for manual review
```

### On-Demand Pipeline (User Search)

```
1. User searches for title not in DB
2. Check rate limit (3 free / 10 paid per day)
3. Fetch TMDB metadata immediately → show to user
4. Fire Convex action:
   a. Fetch OMDB data
   b. Fetch subtitle data (if available quickly)
   c. Construct prompt (may have fewer signals than batch)
   d. Call OpenRouter → Claude
   e. Parse response → write to titles table
5. Convex real-time subscription updates user's UI automatically
```

### AI Rating Prompt

See `AI_RATING_RUBRIC.md` for the complete prompt and rubric.

### Cost Estimates

| Item | Cost |
|------|------|
| OpenRouter (Claude Sonnet) per rating | ~$0.02–0.05 |
| Initial catalog (5,000 titles) | ~$100–250 |
| Nightly batch (20–50 new titles/day) | ~$1–2.50/day |
| On-demand ratings (assuming 100/day) | ~$2–5/day |
| **Monthly AI cost estimate** | **$80–250** |
| Convex (existing plan) | Already paid |
| Vercel (free tier) | $0 |
| Clerk (free tier, <10k users) | $0 |
| TMDB API | Free |
| OMDB API | Free (1,000/day) or $1/mo |
| OpenSubtitles API | Free tier available |

---

## Application Architecture

### Directory Structure

```
project-root/
├── app/                          # Next.js 16 App Router
│   ├── layout.tsx                # Root layout with providers
│   ├── page.tsx                  # Landing / home page
│   ├── (auth)/
│   │   ├── sign-in/
│   │   └── sign-up/
│   ├── (app)/
│   │   ├── layout.tsx            # App layout (nav, sidebar)
│   │   ├── search/
│   │   │   └── page.tsx          # Search results
│   │   ├── title/
│   │   │   └── [id]/
│   │   │       └── page.tsx      # Individual title detail page
│   │   ├── browse/
│   │   │   ├── page.tsx          # Browse / filter page
│   │   │   └── no-flags/
│   │   │       └── page.tsx      # "No Flags" curated page
│   │   ├── settings/
│   │   │   └── page.tsx          # User settings + category weights
│   │   ├── watchlist/
│   │   │   └── page.tsx          # Saved watchlist (paid)
│   │   └── corrections/
│   │       └── page.tsx          # Submit / view corrections
│   └── api/
│       └── webhooks/
│           ├── clerk/
│           │   └── route.ts      # Clerk webhook handler
│           └── stripe/
│               └── route.ts      # Stripe webhook handler
├── components/
│   ├── ui/                       # shadcn/ui components
│   ├── rating/
│   │   ├── RatingBadge.tsx       # Single category severity badge
│   │   ├── RatingBreakdown.tsx   # Full 8-category breakdown card
│   │   ├── CompositeScore.tsx    # The big composite number
│   │   ├── NoFlagsBadge.tsx      # "No Flags" green badge
│   │   └── EpisodeFlags.tsx      # TV show episode exceptions
│   ├── title/
│   │   ├── TitleCard.tsx         # Card for browse/search results
│   │   ├── TitleDetail.tsx       # Full title detail view
│   │   ├── TitleSearch.tsx       # Search input component
│   │   ├── StreamingLinks.tsx    # Where to watch + affiliate links
│   │   └── RatingLoading.tsx     # Loading state while AI rates
│   ├── browse/
│   │   ├── FilterSidebar.tsx     # Age, streaming, category filters
│   │   └── TitleGrid.tsx         # Grid of TitleCards
│   ├── corrections/
│   │   ├── CorrectionForm.tsx    # Submit a correction
│   │   └── CorrectionsList.tsx   # View submitted corrections
│   ├── settings/
│   │   ├── WeightSliders.tsx     # Category weight customization
│   │   └── SubscriptionCard.tsx  # Manage subscription
│   └── layout/
│       ├── Navbar.tsx
│       ├── Footer.tsx
│       └── ConvexClientProvider.tsx
├── convex/
│   ├── schema.ts                 # Database schema (see above)
│   ├── titles.ts                 # Title queries and mutations
│   ├── users.ts                  # User queries and mutations
│   ├── corrections.ts            # Correction submissions
│   ├── search.ts                 # Search functionality
│   ├── ratings.ts                # Rating pipeline actions
│   ├── stripe.ts                 # Stripe integration
│   ├── crons.ts                  # Scheduled jobs (nightly batch)
│   └── http.ts                   # HTTP endpoints if needed
├── lib/
│   ├── constants.ts              # Category definitions, severity labels, etc.
│   ├── scoring.ts                # Composite score calculation logic
│   ├── tmdb.ts                   # TMDB API client
│   ├── omdb.ts                   # OMDB API client
│   ├── opensubtitles.ts          # OpenSubtitles API client
│   └── openrouter.ts             # OpenRouter API client
├── public/
├── tailwind.config.ts
├── next.config.ts
├── tsconfig.json
└── package.json
```

### Key Architectural Patterns

1. **Convex for all data**: No REST APIs to build. Convex queries are called directly from React components via hooks. Real-time by default.

2. **Server Components for SEO**: Title detail pages use Next.js Server Components with `preloadQuery` from `convex/nextjs` so they're server-rendered and indexable by Google. This is critical for organic search traffic ("is [movie] appropriate for kids").

3. **Client Components for interactivity**: Search, filters, weight sliders, and anything requiring real-time updates use Client Components with Convex hooks.

4. **Convex Actions for external APIs**: TMDB, OMDB, OpenSubtitles, and OpenRouter calls happen inside Convex `action` functions (not queries/mutations) since they involve external network calls.

5. **Convex Crons for batch processing**: The nightly rating pipeline runs as a scheduled Convex function.

6. **Webhook handlers in Next.js API routes**: Clerk (user events) and Stripe (subscription events) webhooks hit Next.js API routes, which call Convex mutations to update the database.
