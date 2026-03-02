# Project Status — How Very Dare You

> **Last Updated:** 2026-03-01
> **Purpose:** Living document tracking what's done, what's next, and open decisions. Add this to project knowledge so Claude always has current context.

---

## Status Summary

| Phase | Status | Notes |
|-------|--------|-------|
| 1. Scaffolding | ✅ Done | Next.js 16, Convex, Clerk, shadcn/ui, schema |
| 2. UI Components | ✅ Done | Rating components, title cards, layout |
| 3. Pages | ✅ Done | Landing, browse, search, detail, settings, corrections |
| 4. Backend | ✅ Done | Convex functions, API clients, AI pipeline, Stripe, Clerk webhooks |
| 5. Integration & Polish | ✅ Done | Real data in DB, core flows working, SEO + full Prompt 5.3 polish complete |
| 6. Deployment | 🔶 Partial | Production deployment completed; final production verification checklist still tracked below |
| 7. V2 Overstimulation | ✅ Done | Video analysis working |

---

## Active Workstreams

### ~~🔴 P0 — Blockers for Launch~~ ✅ Done

- [x] **Product name & domain** — "How Very Dare You" / howverydareyou.com

### 🟠 P1 — SEO & Metadata (Prompt 5.4)

Critical for organic discovery ("is [movie] appropriate for kids" searches).

- [x] Dynamic metadata on title detail pages (title, description, OG image via `generateMetadata`)
- [x] Structured data (JSON-LD) on title pages using schema.org `Movie` / `TVSeries`
- [x] Home page metadata and structured data
- [x] Canonical URLs on browse pages
- [x] `robots.txt`
- [x] Dynamic `sitemap.xml` generated from rated titles
- [x] Proper heading hierarchy (h1/h2) audit across all pages
- [x] Image alt text on all TMDB poster images
- [x] OG image generation (static fallback added at `public/og-default.png`)

### 🟡 P2 — Polish & Responsive (Prompt 5.3)

- [x] Responsive audit: 375px, 768px, 1024px, 1440px
- [x] Loading states: verify every data-fetching component has skeleton/loading UI
- [x] Empty states: browse with no results, empty watchlist, no corrections
- [x] Error states: API failures, rate limit exceeded, subscription required
- [x] Rating badge staggered animations on detail page
- [x] Typography audit: Plus Jakarta Sans loading, correct font sizes/weights
- [x] Severity color consistency across all components
- [x] Dark mode (preserved existing theme toggle support)
- [x] Accessibility: keyboard navigation, screen reader labels, focus indicators
- [x] Performance: quick wins (lazy poster loading, dynamic import for settings sliders, stable keys/skeletons)

### 🟢 P3 — Deployment (Prompt 6.1)

- [ ] Set environment variables in Vercel
- [ ] Set environment variables in Convex production dashboard
- [ ] Configure Clerk webhook URL for production
- [ ] Configure Stripe webhook URL for production (+ switch to live mode)
- [ ] `bunx convex deploy` to production
- [ ] Deploy to Vercel (connect GitHub repo)
- [ ] Verify: home page, search, auth flow, Stripe checkout, on-demand rating, cron jobs
- [ ] Verify nightly batch pipeline runs correctly in production
- [ ] SSL / custom domain setup

---

## Open Decisions

| Decision | Options | Status |
|----------|---------|--------|
| ~~Product name~~ | ~~"How Very Dare You"~~ | ✅ Decided |
| ~~Domain name~~ | ~~howverydareyou.com~~ | ✅ Purchased |
| Dark mode | Add in polish pass or post-launch? | ⬜ Decide |
| Affiliate links | Which streaming services? Setup needed? | 🟡 In progress (US-first hybrid routing/tracking shipped) |
| Launch strategy | Soft launch → Product Hunt? Beta users first? | ⬜ Decide |

---

## Recently Completed

- [x] Product name finalized: "How Very Dare You"
- [x] Domain purchased: howverydareyou.com
- [x] Real production data in database (rated titles with real TMDB metadata)
- [x] V2 Overstimulation video analysis (Go microservice + Convex integration)
- [x] Episode-level rating system for TV shows
- [x] Admin dashboard with model config (OpenRouter model picker)
- [x] Rating queue with admin management (retry, force complete, delete)
- [x] Stripe checkout + portal + webhook handling
- [x] Clerk webhook handling (user create/update/delete)
- [x] CI pipeline (lint, typecheck, unit tests, E2E with Playwright)
- [x] Search with TMDB fallback + on-demand rating flow
- [x] Corrections system (user submission + admin review)
- [x] Subtitle archival to R2
- [x] Prompt 5.3 polish pass: responsive layout fixes, full skeleton coverage, empty/error states, route error boundaries, rating/no-flags animations, accessibility labels/focus states, Convex reconnect banner, and performance quick wins
- [x] QA sweep: `bun run lint`, `bun run typecheck`, `bun run test:unit`, `bun run test:e2e` (63 passed, 6 skipped)
- [x] Build verification note: `bun run build` fails in sandbox due blocked Google Fonts fetch for Plus Jakarta Sans; expected to pass in networked CI/deploy environment
- [x] Branding refresh: optimized OG fallback, generated app/apple/favicons from brand mark, and wired icon metadata + web manifest
- [x] Favicon pipeline hardening: added `png-to-ico` + `bun run brand:favicon` to keep `app/favicon.ico` in sync with PNG sources
- [x] Next.js convention migration: replaced deprecated `middleware.ts` with `proxy.ts`
- [x] Browse filters fix: wired sidebar filters end-to-end on `/browse` (including premium `max_*` severity filters), fixed active filter detection, and preserved query params reliably on rapid toggles
- [x] Browse filter test coverage: added unit tests for filter parsing/application and a dedicated cross-browser e2e spec for filter interactions
- [x] Latest QA sweep: `bun run lint`, `bun run typecheck`, `bun run test:unit`, `bun run test:e2e` (75 passed, 12 skipped)
- [x] Production deployment completed (user confirmed)
- [x] Personalized weight scoring wired app-wide: browse/search/watchlist/title detail/title search/episode cards now use paid user weights (fallback to defaults for free users)
- [x] Settings weight live preview fix: prevented server prop re-sync from overwriting local slider edits and enabled first-save when a paid user has no prior `categoryWeights`
- [x] Weight scoring coverage: added `tests/unit/userWeights.unit.ts` and `tests/e2e/specs/settings-weights.spec.ts` (premium-auth dependent; gracefully skips when unavailable)
- [x] Verification for this pass: `bun run typecheck`, `bun run lint`, `bun run test:unit` passed; `bun run build` blocked in sandbox by Google Fonts fetch restriction
- [x] Auth gating update: signed-out users can browse/search/view rated titles, but requesting new on-demand ratings now requires sign-in (titles + episodes), with updated search/detail/landing copy and unauthenticated e2e coverage
- [x] Affiliate click tracking: provider links now route through `/go/[titleId]` with server-side PostHog events (`watch_provider_clicked` / `watch_provider_click_failed`), anonymized distinct-id fallback, and new unit/e2e coverage
- [x] Affiliate URL preservation: TMDB metadata refreshes now preserve existing `streamingProviders[].affiliateUrl` values by provider-name merge logic in title metadata/update mutations, with unit coverage

---

## How to Use This Document

1. **Keep it updated** — After completing work, move items from Active to Recently Completed and update the status summary table.
2. **Add to project knowledge** — Upload this file so Claude always knows what's been done and what's next.
3. **Reference in conversations** — Tell Claude "check the project status doc" when starting new work sessions.
4. **Track decisions** — When you make a decision from the Open Decisions table, note the outcome and date.

---

## Changelog

| Date | Change |
|------|--------|
| 2026-03-01 | Initial status doc created. Phases 1-4 + V2 confirmed complete. |
| 2026-03-01 | P0 resolved: name is "How Very Dare You", domain is howverydareyou.com. |
| 2026-03-01 | P1 SEO & metadata pass completed: dynamic title metadata + JSON-LD, homepage/browse/search metadata, robots/sitemap verification, heading and alt-text audits, static OG fallback, SEO unit/e2e coverage. |
| 2026-03-01 | P2 polish & responsive pass completed (Prompt 5.3): responsive fixes, loading/empty/error states, accessibility/performance improvements, animation refinements, and full lint/typecheck/unit/e2e verification. |
| 2026-03-01 | Branding + platform polish follow-up: icon/manifest pipeline, middleware→proxy migration, and browse filter sidebar wiring with new unit/e2e coverage (full suite green: 72 passed, 6 skipped). |
| 2026-03-01 | Deployment update: production deployment confirmed by user; deployment phase moved to partial pending final production checklist verification. |
| 2026-03-01 | Personalized weights follow-up: fixed settings live preview sync/save behavior, propagated paid category weights through score surfaces (browse/search/watchlist/detail/episodes), and added unit + premium-auth e2e coverage. |
| 2026-03-01 | Access model update: on-demand rating requests now require authentication (free accounts get 3/day), signed-out users still browse/search rated content, and unauthenticated search gate behavior is covered in Playwright. |
