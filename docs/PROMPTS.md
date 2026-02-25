# Claude Code Prompt Sequence

## How to Use This File

This file contains the exact prompts to give Claude Code (or Claude Desktop with computer use), in order. Each prompt is a focused, scoped task. Complete one before moving to the next.

**Package manager: Use `bun` for everything.** All install commands use `bun add`, all CLI tools use `bunx` (or `bunx --bun` for tools that need it like shadcn). Never use npm, npx, or yarn.

**Before starting:** Place the following files in your project root under a `docs/` folder so Claude Code can reference them:
- `SPEC.md` — the full technical spec
- `AI_RATING_RUBRIC.md` — the AI rating prompt and rubric
- `skills/CONVEX_PATTERNS.md` — Convex best practices
- `skills/REACT_NEXTJS_PATTERNS.md` — React/Next.js patterns
- `skills/PROJECT_DESIGN.md` — UI design guide

---

## Phase 1: Project Scaffolding

### Prompt 1.1 — Initialize the Project

```
Create a new Next.js 16 project with the following setup:

1. Initialize with: bunx create-next-app@latest [project-name] --typescript --tailwind --eslint --app --src=false
   - This will auto-generate AGENTS.md and CLAUDE.md at the project root. These contain official Next.js documentation references that Claude Code reads automatically. DO NOT delete them.
2. Install dependencies with bun:
   - bun add convex better-convex-query @clerk/nextjs stripe @stripe/stripe-js lucide-react
3. Install shadcn/ui: bunx --bun shadcn@latest init (New York style, Zinc base, CSS variables: yes)
4. Install these shadcn components: bunx --bun shadcn@latest add button card badge input slider select dialog sheet skeleton tabs tooltip separator avatar dropdown-menu command toggle-group textarea form label progress
5. Set up the font "Plus Jakarta Sans" from Google Fonts in the layout
6. Initialize Convex: bunx convex init
7. IMPORTANT: The auto-generated CLAUDE.md uses @import syntax. Add this line at the bottom of the generated CLAUDE.md:
   ```
   @docs/CLAUDE_PROJECT.md
   ```
   Then place the CLAUDE_APPEND.md file at docs/CLAUDE_PROJECT.md. This way Claude Code reads the official Next.js docs AND your project context automatically, and you keep them cleanly separated.
7. Create the directory structure as specified in docs/SPEC.md under "Directory Structure"
8. Set up the ConvexClientProvider component with Clerk integration as shown in docs/skills/CONVEX_PATTERNS.md

Do NOT add any page content yet — just the scaffolding, providers, and directory structure. Verify the dev server starts without errors.
```

### Prompt 1.2 — Database Schema

```
Read docs/SPEC.md and create the complete Convex database schema in convex/schema.ts.

The schema should include these tables with all fields, indexes, and search indexes as specified in the spec:
- titles (movies/shows with ratings)
- users (accounts with subscription and weight preferences)
- corrections (user-submitted rating corrections)
- ratingQueue (batch processing queue)

Reference docs/skills/CONVEX_PATTERNS.md for Convex schema patterns. Make sure all indexes are properly defined for the queries we'll need (search by title, filter by status, lookup by tmdbId, etc).

After creating the schema, run bunx convex dev to verify it deploys without errors.
```

### Prompt 1.3 — Constants and Utility Functions

```
Create the following shared utility files:

1. lib/constants.ts — Define:
   - CATEGORIES array with key, label, description, and icon for each of the 8 rating categories (see docs/SPEC.md for the list)
   - SEVERITY_LEVELS object mapping 0-4 to label, color classes, and background classes (see docs/skills/PROJECT_DESIGN.md for the color system)
   - DEFAULT_WEIGHTS object (all categories set to 5)
   - RATE_LIMITS object ({ free: 3, paid: 10 })

2. lib/scoring.ts — Implement:
   - calculateCompositeScore(ratings, weights) — the peak * 0.6 + avg * 0.4 formula
   - isNoFlags(ratings) — returns true if all categories are 0
   - getSeverityLabel(score) — maps a 0-4 number to the severity label
   - getSeverityColor(score) — maps to the Tailwind color class

3. lib/utils.ts — Ensure the shadcn cn() utility is here, plus any other shared helpers

Reference docs/skills/REACT_NEXTJS_PATTERNS.md for the exact scoring implementation.
```

---

## Phase 2: Core UI Components (Design System)

### Prompt 2.1 — Rating Components

```
Read the official Claude frontend-design skill at /mnt/skills/public/frontend-design/SKILL.md for general design philosophy. Then read docs/skills/PROJECT_DESIGN.md for this project's specific design system (severity colors, component wireframes, typography, layout rules). Then build these components:

1. components/rating/RatingBadge.tsx
   - Takes severity (0-4) and optional compact prop
   - Renders a shadcn Badge with the correct severity color (emerald for 0, lime for 1, amber for 2, orange for 3, red for 4)
   - Text shows the severity label (None, Brief, Notable, Significant, Core Theme)

2. components/rating/NoFlagsBadge.tsx
   - Green badge with checkmark icon (lucide-react CheckCircle2)
   - Text: "No Flags"
   - Subtle emerald styling as specified in the design doc

3. components/rating/CompositeScore.tsx
   - Takes a numeric score (0-4, can be decimal)
   - Renders a prominent circular/rounded display
   - Background tinted by severity color
   - Large number + label below
   - Compact variant for use in cards

4. components/rating/RatingBreakdown.tsx
   - Takes ratings object (8 categories) and optional user weights
   - Renders all 8 categories as rows: icon + label (left) + RatingBadge (right)
   - Categories with "None" should be visually quieter (opacity-50)
   - If user weights provided, calculates and shows the personalized composite score
   - Include a "Notes" section at the bottom (optional prop)

5. components/rating/EpisodeFlags.tsx
   - Takes array of episode flags
   - Renders a collapsible list of episode-specific exceptions
   - Format: "S3E17 — LGBT: Brief — [description]"

Make these components beautiful. Use the severity color system consistently. Add subtle transitions on hover. Reference the wireframes in the design doc. These are the core visual language of the entire product.
```

### Prompt 2.2 — Title Components

```
Read docs/skills/PROJECT_DESIGN.md for the card and detail layouts. Build these components:

1. components/title/TitleCard.tsx
   - Card component for browse/search grids
   - Shows: poster image (from TMDB), title, year, age rating, genre
   - Shows either CompositeScore or NoFlagsBadge
   - Shows streaming provider icons (small logos at bottom)
   - Hover effect: subtle lift/shadow
   - Click navigates to /title/[id]
   - Responsive: full card on desktop, compact on mobile

2. components/title/TitleCardSkeleton.tsx
   - Skeleton loading state matching TitleCard layout
   - Uses shadcn Skeleton components

3. components/title/TitleSearch.tsx
   - Search input using shadcn Command component
   - Debounced search (300ms)
   - Shows results in dropdown as user types
   - "Not Yet Rated" indicator for unrated titles
   - Uses Convex search query

4. components/title/StreamingLinks.tsx
   - Takes array of streaming providers
   - Renders small badges/icons for each service
   - Each is a link (affiliate URL if available)

5. components/title/RatingLoading.tsx
   - Loading state shown while AI rates a title on-demand
   - Shows poster + metadata immediately
   - Animated progress indicator
   - 8 category rows with skeleton/pulse state
   - Designed to feel like "analyzing" not "loading"

All components should use the styling conventions in the design doc. Use "Plus Jakarta Sans" for headings, standard font for body. Follow the color palette exactly.
```

### Prompt 2.3 — Layout Components

```
Build the app layout components:

1. components/layout/Navbar.tsx
   - Logo/app name on left
   - Search bar in center (TitleSearch component)
   - Auth buttons on right (Clerk UserButton when signed in, Sign In button when not)
   - Mobile: hamburger menu, search behind icon
   - Sticky header

2. components/layout/Footer.tsx
   - Simple footer: copyright, links to About, Privacy, Terms
   - Affiliate disclosure note

3. app/layout.tsx
   - Root layout with ConvexClientProvider, ClerkProvider
   - Import Plus Jakarta Sans font
   - Global styles

4. app/(app)/layout.tsx
   - App layout wrapping all authenticated pages
   - Includes Navbar and Footer
   - Main content area with max-w-7xl mx-auto

Keep the layout clean and professional. Reference docs/skills/PROJECT_DESIGN.md for the design direction.
```

---

## Phase 3: Pages

### Prompt 3.1 — Home / Landing Page

```
Build the landing page at app/page.tsx.

This is the first thing visitors see. It should:
1. Hero section: headline explaining the product ("Know what your kids are watching before they watch it"), subtitle about the 8-category rating system, and a prominent search bar
2. "How It Works" section: 3 steps (Search → See Ratings → Decide)
3. Sample rating cards: show 3-4 example titles with their ratings (use hardcoded sample data for now)
4. "No Flags" showcase: highlight the No Flags concept with a few example clean titles
5. Pricing section: Free vs Premium comparison
6. CTA: Sign up / Start Browsing

This is a Server Component for SEO. Make it visually impressive — this is the marketing page. Reference docs/skills/PROJECT_DESIGN.md for the design direction. The design should feel trustworthy and clean, NOT like a culture war product.
```

### Prompt 3.2 — Browse Page

```
Build the browse page at app/(app)/browse/page.tsx and related components.

1. components/browse/FilterSidebar.tsx
   - Content type filter (All / Movies / TV)
   - Age range filter (multi-select: G, PG, PG-13, TV-Y, TV-Y7, etc)
   - Streaming service filter (checkboxes: Netflix, Disney+, Prime, Hulu, etc)
   - Category threshold filters (dropdown per category: Any, None, up to Brief, up to Notable, etc)
     - These filters are PAID only — show a lock icon and "Premium" badge for free users
   - "Show No Flags Only" toggle button
   - On mobile: render inside a shadcn Sheet (slide-in)
   - On desktop: fixed left sidebar

2. components/browse/TitleGrid.tsx
   - Grid of TitleCard components
   - Responsive: 1 col mobile, 2 col tablet, 3-4 col desktop
   - Pagination or infinite scroll

3. app/(app)/browse/page.tsx
   - Combines FilterSidebar + TitleGrid
   - URL-based filter state (searchParams) for shareability
   - Convex queries filtered by the selected criteria

4. app/(app)/browse/no-flags/page.tsx
   - Special page showing ONLY "No Flags" content
   - No filter sidebar needed — just a clean grid
   - Prominent NoFlagsBadge header

For now, the Convex queries can return empty results — we'll wire up real data in Phase 5. Build the UI completely with proper loading states and empty states.
```

### Prompt 3.3 — Title Detail Page

```
Build the title detail page at app/(app)/title/[id]/page.tsx.

This is a Server Component for SEO. It should:

1. Use preloadQuery from convex/nextjs to preload title data
2. Generate dynamic metadata (title, description, OG image) for SEO — see docs/skills/REACT_NEXTJS_PATTERNS.md
3. Layout:
   - Large poster image (left on desktop, top on mobile)
   - Title, year, age rating, genre, runtime
   - CompositeScore (prominent)
   - Full RatingBreakdown (all 8 categories)
   - AI Notes section
   - EpisodeFlags section (if TV show with flags)
   - StreamingLinks (where to watch)
   - "Submit Correction" button → links to correction form
   - "Add to Watchlist" button (paid users)
4. If the title status is "pending" or "rating", show the RatingLoading component
5. If the title is not found, show a 404 page

Make the detail page comprehensive but scannable. The rating breakdown should be the visual focus. Reference the wireframes in docs/skills/PROJECT_DESIGN.md.
```

### Prompt 3.4 — Search Results Page

```
Build the search results page at app/(app)/search/page.tsx.

1. Read the search query from URL searchParams (?q=frozen)
2. Use Convex search index to find matching titles
3. Display results as a grid of TitleCards
4. If no results found in DB, show "No results found" with option to search TMDB
5. If title exists in TMDB but not rated, show the card with "Not Yet Rated" and a "Request Rating" button
6. Request Rating button triggers the on-demand rating flow (after checking rate limits)
7. Show rate limit status: "3 of 3 free lookups remaining today" or "Upgrade to Premium for more"

Wire up the TitleSearch component in the Navbar to navigate to this page on submit.
```

### Prompt 3.5 — Settings and Subscription Pages

```
Build the user settings page at app/(app)/settings/page.tsx.

1. components/settings/WeightSliders.tsx
   - 8 sliders (one per category), each 0-10
   - Show current value next to each slider
   - "Reset to Default" button
   - Live preview: show how a sample title's composite score changes
   - PAID feature: if free user, show sliders grayed out with upgrade CTA

2. components/settings/SubscriptionCard.tsx
   - Shows current plan (Free or Premium)
   - If free: shows upgrade button → Stripe checkout
   - If paid: shows "Manage Subscription" → Stripe customer portal
   - Shows next billing date

3. app/(app)/settings/page.tsx
   - Combines WeightSliders + SubscriptionCard
   - Save weights via Convex mutation on change (debounced)

For Stripe integration:
- Create app/api/webhooks/stripe/route.ts to handle subscription events
- Create a Convex action to create Stripe checkout sessions
- Create a Convex action to create Stripe customer portal sessions
- Update user tier in Convex when Stripe webhook confirms payment

Reference docs/skills/CONVEX_PATTERNS.md for the mutation patterns.
```

### Prompt 3.6 — Corrections Page

```
Build the corrections feature:

1. components/corrections/CorrectionForm.tsx
   - Select which category to correct
   - Show current severity vs dropdown for suggested severity
   - Textarea for reason/explanation
   - Submit button
   - Must be logged in to submit

2. components/corrections/CorrectionsList.tsx
   - Show all corrections for a title (on detail page)
   - Show status: pending, accepted, rejected
   - Admin view: ability to accept/reject (for you, the owner)

3. app/(app)/corrections/page.tsx
   - Dashboard of all submitted corrections (for you as admin)
   - Filter by status
   - Accept/reject actions

4. Convex functions:
   - corrections.submit mutation
   - corrections.listForTitle query
   - corrections.listAll query (admin)
   - corrections.updateStatus mutation (admin)

Add the CorrectionForm as a dialog/sheet accessible from the title detail page.
```

---

## Phase 4: Backend Logic

### Prompt 4.1 — Convex Queries and Mutations

```
Read docs/skills/CONVEX_PATTERNS.md and implement all Convex functions:

convex/titles.ts:
- getTitle(titleId) — get a single title by ID
- getTitleByTmdbId(tmdbId) — lookup by TMDB ID
- searchTitles(searchTerm) — full-text search using search index
- browseTitles({ type, ageRating, streamingProviders, maxSeverity, noFlagsOnly, limit, cursor }) — filtered browse with pagination
- getNoFlagsTitles(limit) — titles where all ratings are 0
- saveRating(tmdbId, ratings, confidence, notes, episodeFlags) — save AI rating result
- updateStatus(titleId, status) — update title status

convex/users.ts:
- getOrCreateUser(clerkId, email, name) — upsert user on sign-in
- getMyProfile() — get current user (auth-protected)
- updateWeights(weights) — save category weights (paid only)
- addToWatchlist(titleId) — add to watchlist (paid only)
- removeFromWatchlist(titleId)
- getWatchlist() — get user's watchlist
- checkRateLimit() — returns { remaining: number, limit: number }
- decrementRateLimit() — use one on-demand lookup
- resetDailyRateLimits() — called by cron, resets all users

convex/corrections.ts:
- submit(titleId, category, suggestedSeverity, reason)
- listForTitle(titleId)
- listAll(status?) — admin
- updateStatus(correctionId, status) — admin

Make sure all paid features check user.tier === "paid" and throw if not. Make sure rate limits check the date and reset if it's a new day.
```

### Prompt 4.2 — External API Clients

```
Create the API client libraries:

1. lib/tmdb.ts
   - searchMovies(query) — search TMDB for movies
   - searchTV(query) — search TMDB for TV shows
   - getMovieDetails(tmdbId) — full movie details + keywords + watch providers
   - getTVDetails(tmdbId) — full TV show details + keywords + watch providers
   - getPopularMovies(page) — for batch processing
   - getPopularTV(page) — for batch processing
   - All functions use TMDB_API_KEY env var
   - Type all responses

2. lib/omdb.ts
   - getByImdbId(imdbId) — fetch OMDB data including parental guide info
   - Type the response

3. lib/opensubtitles.ts
   - searchSubtitles(imdbId) — find available subtitle files
   - downloadSubtitle(fileId) — download subtitle text
   - Extract a meaningful excerpt (first 500 lines of dialogue)
   - Type all responses

4. lib/openrouter.ts
   - chatCompletion(systemPrompt, userMessage, model?) — generic OpenRouter call
   - Default model: "anthropic/claude-sonnet-4-20250514"
   - Returns parsed JSON response
   - Error handling and retries (3 attempts with exponential backoff)
   - Type the response

These clients will be called from Convex actions. Make sure they're pure functions that take API keys as parameters (since Convex actions get env vars from process.env).
```

### Prompt 4.3 — AI Rating Pipeline

```
Read docs/AI_RATING_RUBRIC.md for the complete prompt and rubric. Then implement:

convex/ratings.ts:
1. rateTitle action:
   - Takes tmdbId
   - Fetches TMDB data (via lib/tmdb.ts)
   - Fetches OMDB data (via lib/omdb.ts)
   - Attempts to fetch subtitles (via lib/opensubtitles.ts) — don't fail if unavailable
   - Constructs the rating prompt using the template from the rubric doc
   - Calls OpenRouter with the system prompt from the rubric doc
   - Parses and validates the JSON response
   - Saves to database via titles.saveRating mutation
   - Updates title status to "rated"
   - If confidence < 0.5, sets status to "disputed" for manual review

2. rateTitleOnDemand action:
   - Same as rateTitle but:
   - First checks if title already exists (skip if rated)
   - Creates a "pending" title record with TMDB metadata immediately
   - Then runs the rating (user sees metadata while waiting)
   - Lighter signal gathering (skip subtitles for speed)

3. runNightlyBatch action:
   - Called by cron job
   - Fetches popular/new releases from TMDB
   - Filters out already-rated titles
   - Adds to ratingQueue
   - Processes queue items one at a time (to control API costs)
   - Logs progress and errors

4. processQueueItem action:
   - Takes a ratingQueue item
   - Runs the full rating pipeline
   - Updates queue item status
   - On failure: increments attempts, saves error, marks failed after 3 attempts

Include the complete system prompt and user message template from the rubric doc.
```

### Prompt 4.4 — Cron Jobs

```
Set up Convex cron jobs in convex/crons.ts:

1. Nightly batch rating — runs at 2 AM UTC daily
   - Calls ratings.runNightlyBatch

2. Reset rate limits — runs at midnight UTC daily
   - Calls users.resetDailyRateLimits

3. Refresh streaming availability — runs weekly (Sunday 3 AM UTC)
   - Updates streaming provider data for all rated titles from TMDB

Reference docs/skills/CONVEX_PATTERNS.md for the cron pattern.
```

### Prompt 4.5 — Stripe Integration

```
Set up Stripe for the $4.99/mo subscription:

1. Create Stripe products/prices (do this manually in Stripe dashboard, then reference the price ID)

2. convex/stripe.ts:
   - createCheckoutSession action — creates a Stripe checkout session for the $4.99/mo plan, returns the URL
   - createPortalSession action — creates a Stripe billing portal session for managing subscription

3. app/api/webhooks/stripe/route.ts:
   - Handles these Stripe webhook events:
     - checkout.session.completed → update user tier to "paid"
     - customer.subscription.updated → update expiration date
     - customer.subscription.deleted → downgrade user to "free"
   - Verifies webhook signature
   - Calls Convex mutations to update user data

4. Wire up the SubscriptionCard component to call these actions.

Make sure the webhook handler is robust — verify signatures, handle edge cases, log errors.
```

### Prompt 4.6 — Clerk Webhook

```
Set up Clerk webhook handling:

1. app/api/webhooks/clerk/route.ts:
   - Handles user.created event → creates user record in Convex
   - Handles user.updated event → updates user email/name in Convex
   - Handles user.deleted event → handles user deletion
   - Verifies webhook signature using svix

2. Make sure the ConvexClientProvider handles the auth flow:
   - On sign-in, check if user exists in Convex DB
   - If not, create via getOrCreateUser mutation
   - Store clerkId, email, name
```

---

## Phase 5: Integration and Polish

### Prompt 5.1 — Wire Everything Together

```
Now connect all the pieces:

1. TitleSearch component → Convex searchTitles query → results display
2. Browse page filters → Convex browseTitles query with filter params
3. Title detail page → preloadQuery for the specific title
4. "Request Rating" button → check rate limit → call rateTitleOnDemand → show RatingLoading → real-time update when complete
5. Weight sliders → save to Convex → all composite scores recalculate client-side
6. Watchlist → add/remove via Convex mutations
7. Corrections → submit via Convex mutation → show on detail page

Test the complete flow:
1. Search for a title → see results
2. Click a title → see detail page with ratings
3. Search for a title not in DB → see "Not Yet Rated" → click "Request Rating" → watch it rate in real-time
4. Sign in → customize weights → see composite scores change
5. Upgrade to paid → access premium filters
6. Submit a correction → see it in the corrections dashboard

Fix any issues that arise during integration.
```

### Prompt 5.2 — Seed Data

```
Create a seed script to populate the database with initial rated titles for testing and demo purposes.

Create a convex/seed.ts file (or a script that runs Convex mutations) that adds these titles with pre-set ratings:

1. Paw Patrol: The Movie — All 0s (No Flags)
2. Cocomelon — All 0s (No Flags)
3. Bluey — All 0s except genderRoles: 1
4. Super Mario Bros Movie — All 0s except genderRoles: 1
5. Frozen II — climate: 2, genderRoles: 2, rest 0
6. Lightyear — lgbtq: 2, rest 0
7. Strange World — lgbtq: 3, climate: 3, political: 2, rest 0-1
8. Turning Red — genderRoles: 2, racialIdentity: 2, religious: 1, rest 0
9. Elemental — racialIdentity: 3, political: 2, rest 0-1
10. Wish — political: 2, genderRoles: 1, religious: 1, rest 0

Include realistic TMDB metadata (poster paths, overviews, genres, age ratings, streaming providers). Use real TMDB IDs so the poster images work.

Also create a few test user accounts with different weight configurations to demo personalization.
```

### Prompt 5.3 — Polish and Responsive

```
Review the entire application for polish:

1. Responsive design: test all pages at 375px, 768px, 1024px, 1440px widths
2. Loading states: every page and component that fetches data has proper skeleton states
3. Empty states: browse with no results, empty watchlist, no corrections
4. Error states: API failures, rate limit exceeded, subscription required
5. Transitions: rating badges animate in with staggered delays on the detail page
6. Typography: verify Plus Jakarta Sans is loading, check font sizes and weights
7. Color consistency: severity colors match across all components
8. Dark mode: if easy to add with the current setup, add it. If not, skip for now.
9. Performance: verify no unnecessary re-renders, check Convex query efficiency
10. Accessibility: keyboard navigation, screen reader labels, focus indicators
```

### Prompt 5.4 — SEO and Metadata

```
Ensure the app is optimized for search engines:

1. Every title detail page has dynamic metadata (title, description, OG image)
2. Home page has proper metadata and structured data
3. Browse pages have canonical URLs
4. Add a robots.txt
5. Add a sitemap.xml (can be dynamic, generated from rated titles)
6. All pages have proper heading hierarchy (h1, h2, etc)
7. Image alt text on all posters
8. Structured data (JSON-LD) for movie/TV show pages using schema.org

The goal: when someone Googles "is Strange World appropriate for kids", our title page should rank.
```

---

## Phase 6: Deployment

### Prompt 6.1 — Deploy

```
Prepare for deployment:

1. Verify all environment variables are set in:
   - Vercel (Next.js env vars)
   - Convex dashboard (API keys for TMDB, OMDB, OpenRouter, etc)
   - Clerk dashboard (webhook URL pointed to production)
   - Stripe dashboard (webhook URL pointed to production)

2. Run bunx convex deploy to deploy Convex functions to production

3. Deploy to Vercel:
   - Connect GitHub repo
   - Set environment variables
   - Deploy

4. Verify:
   - Home page loads
   - Search works
   - Auth flow works (sign up, sign in)
   - Stripe checkout works (test mode)
   - On-demand rating works
   - Cron jobs are scheduled

5. Run the seed script against production to populate initial data

6. Trigger a manual batch run to verify the nightly pipeline works
```

---

## Phase 7: V2 — Overstimulation Video Analysis

> **Prerequisites:** V1 must be live and working. You need a Railway account ($5/mo hobby plan) and a YouTube Data API key.

### Prompt 7.1 — Video Analysis Microservice (Go)

```
We're building a separate Go microservice that analyzes video for overstimulation metrics. This is NOT part of the Next.js app — it's a standalone Go HTTP service that will be deployed on Railway and called by Convex actions.

Read docs/V2_VIDEO_ANALYSIS.md for the full architecture and Go code patterns. Then:

1. Create a new directory called video-analysis-service/ at the project root (sibling to app/, convex/, etc.)
2. Initialize it as a Go module:
   - go mod init video-analysis-service
   - No external Go dependencies needed — stdlib only (net/http, encoding/json, image, os/exec, math)
   - External tools (installed in Docker, not Go deps): ffmpeg, ffprobe, yt-dlp
3. Create these Go files following the patterns in docs/V2_VIDEO_ANALYSIS.md:
   - main.go — HTTP server with POST /analyze and GET /health endpoints. Bearer token auth via API_SECRET env var.
   - download.go — downloadVideo(url) shells out to yt-dlp to download at 480p as mp4, returns file path. cleanup() removes the temp directory.
   - scene_cuts.go — detectSceneCuts(videoPath) shells out to ffmpeg with select='gt(scene,0.3)' filter, parses showinfo output to count cuts. getVideoDuration() via ffprobe. Returns { cutsPerMinute, avgCutDuration, totalCuts, totalDuration }.
   - color_analysis.go — analyzeColors(videoPath) shells out to ffmpeg to extract frames at 4fps as JPEGs into a temp dir. Decodes each JPEG with Go's image package. Computes HSV saturation and brightness per frame (RGB→HSV conversion in pure Go, no CGo, no OpenCV). Tracks frame-to-frame brightness deltas for flash detection. Returns { avgSaturation, avgBrightness, maxSaturation, brightnessVariance, colorChangeRate, flashCount }.
4. Create a multi-stage Dockerfile:
   - Build stage: golang:1.23-bookworm, compile with CGO_ENABLED=0
   - Runtime stage: debian:bookworm-slim, install ffmpeg + yt-dlp via apt/pip
   - Copy the Go binary in, expose 8080
5. Add error handling: request timeout context of 120 seconds, catch download/ffmpeg failures, return meaningful JSON error responses
6. Add a POST /analyze-url endpoint that accepts a direct video URL (not just YouTube) for testing

Test locally:
- go run .  (with ffmpeg and yt-dlp installed locally)
- curl -X POST http://localhost:8080/analyze -H "Authorization: Bearer test" -H "Content-Type: application/json" -d '{"video_url":"https://youtube.com/watch?v=TRAILER_ID","title":"Test","type":"movie"}'
```

### Prompt 7.2 — Deploy Video Analysis Service

```
Deploy the video-analysis-service (Go) to Railway:

1. Create a Railway project and service
2. Connect the video-analysis-service/ directory (or use Railway CLI)
3. Set environment variables on Railway:
   - API_SECRET=<generate a random 32-char string>
   - PORT=8080 (Railway convention)
4. The multi-stage Dockerfile handles everything — Railway auto-detects it. The final image is a small Debian slim with the Go binary + ffmpeg + yt-dlp.
5. Verify the service is running by hitting the /health endpoint
6. Test the /analyze endpoint with a YouTube trailer URL and the API_SECRET bearer token:
   curl -X POST https://YOUR-RAILWAY-URL/analyze \
     -H "Authorization: Bearer YOUR_API_SECRET" \
     -H "Content-Type: application/json" \
     -d '{"video_url":"https://youtube.com/watch?v=SOME_TRAILER","title":"Test","type":"movie"}'
7. Note the Railway service URL (e.g., https://video-analysis-service-production-xxxx.up.railway.app)

Save the Railway URL and API_SECRET — we'll need them as Convex environment variables.
```

### Prompt 7.3 — YouTube Trailer Lookup

```
Create a utility to find YouTube trailers for titles in our database.

1. Create lib/youtube.ts with:
   - searchTrailer(title, year, type) — uses YouTube Data API v3 to search for "{title} {year} official trailer"
   - Returns the video ID of the best match (first result), or null if not found
   - For TV shows, also try "{title} official trailer" (without year) as fallback
   - Uses YOUTUBE_API_KEY env var

2. Add YOUTUBE_API_KEY to Convex environment variables in the Convex dashboard

3. Add YOUTUBE_API_KEY to the env var list in docs/SPEC.md

Handle edge cases:
- No results found → return null (title will be skipped for overstimulation rating)
- Rate limiting → respect YouTube API quotas (10,000 units/day, search costs 100 units each = 100 searches/day max)
```

### Prompt 7.4 — Extend Schema for Overstimulation

```
Extend the Convex database schema to support the overstimulation rating. This must be a non-breaking change — all new fields are optional.

1. In convex/schema.ts, add to the ratings object inside the titles table:
   - overstimulation: v.optional(v.number()) — 0-4 severity scale

2. Add a new videoAnalysis field to the titles table:
   - youtubeVideoId: v.string()
   - analyzedAt: v.number()
   - cutsPerMinute: v.number()
   - avgCutDuration: v.number()
   - avgSaturation: v.number()
   - avgBrightness: v.number()
   - brightnessVariance: v.number()
   - flashCount: v.number()
   - trailerBiasCorrected: v.boolean()
   Make the entire videoAnalysis object optional.

3. Add overstimulation to the categoryWeights object in the users table (optional, default 5)

4. Run bunx convex dev to verify schema deploys cleanly without breaking existing data

Existing rated titles will simply have overstimulation as undefined until the video analysis runs for them.
```

### Prompt 7.5 — Overstimulation Rating Pipeline

```
Read docs/V2_VIDEO_ANALYSIS.md for the complete pipeline architecture. Then build:

1. Add environment variables to Convex dashboard:
   - VIDEO_ANALYSIS_SERVICE_URL (the Railway URL from Prompt 7.2)
   - VIDEO_ANALYSIS_API_SECRET (the API_SECRET from Prompt 7.2)
   - YOUTUBE_API_KEY

2. Create convex/healthRatings.ts with:

   a. analyzeOverstimulation action:
      - Takes a titleId
      - Looks up the title in the database
      - Calls lib/youtube.ts to find the trailer on YouTube
      - If no trailer found, log and skip (set overstimulation to null)
      - Calls the video analysis service with the YouTube URL
      - Sends the returned metrics to Claude via OpenRouter with the overstimulation prompt from docs/V2_VIDEO_ANALYSIS.md
      - If the title is a TV show, apply the 0.7x trailer bias correction (round to nearest integer, min 0)
      - Saves the overstimulation score and videoAnalysis metadata to the titles table

   b. runOverstimulationBatch action:
      - Queries all titles with status "rated" that don't have an overstimulation score yet
      - Processes them one at a time (to respect YouTube API quota — max 100/day)
      - Stops after processing 50 titles per run (cost protection)
      - Logs progress

3. Add a new cron job in convex/crons.ts:
   - Runs daily at 4 AM UTC (after the cultural rating batch at 2 AM)
   - Calls healthRatings.runOverstimulationBatch

4. Add an on-demand option: when a user triggers an on-demand cultural rating (rateTitleOnDemand), also queue the overstimulation analysis to run after the cultural rating completes. But don't block the user — the cultural rating shows immediately, and overstimulation appears when ready.

Use the exact overstimulation prompt from docs/V2_VIDEO_ANALYSIS.md for the Claude API call.
```

### Prompt 7.6 — Update Scoring Logic

```
Update the composite score calculation and constants to include overstimulation:

1. lib/constants.ts:
   - Add overstimulation to the CATEGORIES array with key, label ("Overstimulation"), description, and icon (Zap from lucide-react)
   - Add it as a separate group: { group: "health", ... } to distinguish from cultural categories
   - Add DEFAULT_WEIGHTS entry: overstimulation: 5

2. lib/scoring.ts:
   - Update CategoryRatings type to include overstimulation as optional
   - Update CategoryWeights type to include overstimulation
   - Update calculateCompositeScore to handle optional overstimulation:
     - If overstimulation is undefined (not yet rated), exclude from calculation entirely
     - If overstimulation is defined and weight > 0, include in both peak and average
   - Update isNoFlags to include overstimulation when present (undefined = ignored, 0 = passes, >0 = fails)

3. Make sure existing titles without overstimulation scores still calculate correctly — no regressions.
```

### Prompt 7.7 — Update UI for Overstimulation

```
Update the frontend to display the overstimulation category:

1. components/rating/RatingBreakdown.tsx:
   - Split the display into two sections: "Cultural Themes" (8 categories) and "Developmental Health" (overstimulation)
   - Add a subtle divider/section header between them
   - If overstimulation is undefined (not yet analyzed), show "Pending analysis" in muted text instead of a badge
   - If overstimulation is 0, show the "None" badge same as cultural categories

2. components/rating/CompositeScore.tsx:
   - No changes needed — it already calculates from whatever categories have scores and weights

3. components/title/TitleCard.tsx:
   - No changes needed for the card — composite score handles it
   - Optionally: add a small lightning bolt indicator on cards for titles with high overstimulation

4. components/settings/WeightSliders.tsx:
   - Add an overstimulation slider in a separate "Developmental Health" section below the 8 cultural sliders
   - Same 0-10 range
   - Show section header: "Developmental Health"

5. app/(app)/title/[id]/page.tsx:
   - The detail page should show the videoAnalysis metadata in a collapsible "Analysis Details" section:
     - Cuts per minute
     - Average scene duration
     - Color saturation level
     - Flash count
   - This is interesting data parents might want to see — make it feel like a data card, not a debug dump

6. app/(app)/browse/page.tsx:
   - Add overstimulation to the filter sidebar (same pattern as cultural category thresholds)
   - "Max Overstimulation: [None / Brief / Notable / Any]"

Make sure the "Developmental Health" section is visually distinct but uses the same severity color system. It should feel like part of the same product, just a different lens.
```

### Prompt 7.8 — Seed Overstimulation Data

```
Update the seed data to include overstimulation scores for the existing test titles:

| Title                    | Overstimulation | Video Analysis (approximate)              |
|--------------------------|-----------------|------------------------------------------|
| Paw Patrol: The Movie    | 1 (Brief)       | 14 cuts/min, moderate saturation          |
| Cocomelon                | 3 (Significant) | 28 cuts/min, high saturation, some flash  |
| Bluey                    | 0 (None)        | 7 cuts/min, natural colors                |
| Super Mario Bros Movie   | 2 (Notable)     | 18 cuts/min, bright vivid colors          |
| Frozen II                | 1 (Brief)       | 12 cuts/min, natural palette              |
| Lightyear                | 1 (Brief)       | 15 cuts/min, moderate                     |
| Strange World            | 2 (Notable)     | 16 cuts/min, highly saturated alien world |
| Turning Red              | 1 (Brief)       | 13 cuts/min, moderate                     |
| Elemental                | 1 (Brief)       | 11 cuts/min, bright but steady            |
| Wish                     | 1 (Brief)       | 12 cuts/min, standard Disney              |

Also add videoAnalysis metadata with plausible numbers matching the scores above. These don't need to be real measurements — they're for testing the UI display.
```

### Prompt 7.9 — Test Complete V2 Flow

```
Test the entire overstimulation pipeline end-to-end:

1. Verify the video analysis service is healthy: curl the /health endpoint
2. Test with a real trailer:
   - Pick a well-known kids title (e.g., Cocomelon)
   - Call the /analyze endpoint directly with its YouTube trailer URL
   - Verify the returned metrics look reasonable (Cocomelon should show high cuts/min and saturation)
3. Test the Convex pipeline:
   - Add a test title that doesn't have an overstimulation score
   - Call analyzeOverstimulation action manually from the Convex dashboard
   - Verify the overstimulation score appears in the database
   - Verify the videoAnalysis metadata is saved
4. Test the UI:
   - View a title that has overstimulation data — verify it shows in the "Developmental Health" section
   - View a title without overstimulation data — verify it shows "Pending analysis"
   - Adjust the overstimulation weight slider — verify the composite score changes
   - Test the browse filter for overstimulation threshold
5. Test the batch pipeline:
   - Trigger runOverstimulationBatch manually
   - Verify it processes titles and stops at the 50-title limit
6. Test edge cases:
   - Title with no trailer on YouTube → should skip gracefully
   - Video analysis service is down → should fail gracefully, not crash the rating pipeline
   - TV show trailer bias correction → verify the 0.7x multiplier is applied

Fix any issues found during testing.
```

### Prompt 7.10 — Deploy V2

```
Deploy the V2 overstimulation feature to production:

1. Ensure the video analysis service is deployed and stable on Railway (Prompt 7.2)
2. Add the new environment variables to the Convex production dashboard:
   - VIDEO_ANALYSIS_SERVICE_URL
   - VIDEO_ANALYSIS_API_SECRET
   - YOUTUBE_API_KEY
3. Run bunx convex deploy to push the updated schema and functions
4. Deploy the updated Next.js app to Vercel (should auto-deploy if connected to GitHub)
5. Verify:
   - Existing titles still display correctly (no regressions)
   - New "Developmental Health" section appears on title detail pages
   - Overstimulation weight slider appears in settings
   - The overstimulation batch cron job is scheduled
6. Trigger the overstimulation batch manually to start analyzing the existing catalog
7. Monitor the first batch run — check costs, errors, and YouTube API quota usage
```