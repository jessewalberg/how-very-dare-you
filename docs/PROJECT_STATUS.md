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
| 5. Integration & Polish | 🔶 Partial | Real data in DB, core flows working. SEO pass complete; polish pass remains |
| 6. Deployment | ⬜ Not started | Env vars, Vercel, production verification |
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

- [ ] Responsive audit: 375px, 768px, 1024px, 1440px
- [ ] Loading states: verify every data-fetching component has skeleton/loading UI
- [ ] Empty states: browse with no results, empty watchlist, no corrections
- [ ] Error states: API failures, rate limit exceeded, subscription required
- [ ] Rating badge staggered animations on detail page
- [ ] Typography audit: Plus Jakarta Sans loading, correct font sizes/weights
- [ ] Severity color consistency across all components
- [ ] Dark mode (if straightforward with current shadcn/Tailwind setup)
- [ ] Accessibility: keyboard navigation, screen reader labels, focus indicators
- [ ] Performance: check for unnecessary re-renders, Convex query efficiency

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
| Affiliate links | Which streaming services? Setup needed? | ⬜ Research |
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
