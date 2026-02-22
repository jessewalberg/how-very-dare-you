# Content Advisory Platform — Build Kit

## What's In This Kit

This is a complete build kit for a parental content advisory web application. It contains everything you need to build the product using Claude Code / Claude Desktop.

### Files

| File | Purpose |
|------|---------|
| `SPEC.md` | Complete technical specification — every product decision, database schema, architecture, costs |
| `AI_RATING_RUBRIC.md` | The AI prompt and rubric used to rate movies/shows across 8 categories |
| `PROMPTS.md` | **Start here for building.** Step-by-step prompts to give Claude Code, in order |
| `CLAUDE_APPEND.md` | Project-specific context — append this to the auto-generated CLAUDE.md that `create-next-app` creates |
| `skills/CONVEX_PATTERNS.md` | Convex patterns for this project (supplements official docs at docs.convex.dev) |
| `skills/REACT_NEXTJS_PATTERNS.md` | React component patterns for this project (supplements official Next.js bundled docs) |
| `skills/PROJECT_DESIGN.md` | UI design guide — color system, typography, component wireframes, responsive rules |

### How to Build

1. Read `SPEC.md` to understand what you're building
2. Copy all `.md` files and the `skills/` folder into a `docs/` folder in your project root
3. After running `create-next-app` (Prompt 1.1), append `CLAUDE_APPEND.md` to the auto-generated `CLAUDE.md` — this gives Claude Code both official Next.js docs AND your project-specific context
4. Open `PROMPTS.md` and follow the prompts in order, giving each one to Claude Code
5. Each prompt is a focused task — complete it before moving to the next

### Build Phases

| Phase | What | Prompts |
|-------|------|---------|
| **1. Scaffolding** | Project setup, schema, utilities | 1.1 – 1.3 |
| **2. UI Components** | Design system, rating components, cards | 2.1 – 2.3 |
| **3. Pages** | Landing, browse, detail, search, settings | 3.1 – 3.6 |
| **4. Backend** | Convex functions, API clients, AI pipeline, payments | 4.1 – 4.6 |
| **5. Integration** | Wire everything, seed data, polish | 5.1 – 5.4 |
| **6. Deployment** | Deploy to Vercel + Convex production | 6.1 |

### Tech Stack Summary

- **Frontend:** Next.js 16.1, React 19, Tailwind CSS, shadcn/ui
- **Backend:** Convex (database + server functions + cron jobs)
- **Auth:** Clerk
- **Payments:** Stripe ($4.99/mo)
- **AI:** Claude via OpenRouter
- **Data:** TMDB + OMDB + OpenSubtitles
- **Hosting:** Vercel (free tier)

### Pre-requisites

Before starting, you'll need accounts/API keys for:
- [ ] Convex (you already have this)
- [ ] Clerk (free tier)
- [ ] Stripe (test mode to start)
- [ ] TMDB (free API key)
- [ ] OMDB (free tier or $1/mo)
- [ ] OpenRouter (for Claude API access)
- [ ] OpenSubtitles (free API key)
- [ ] Vercel (free tier)

### Still To Decide

- [ ] **Product name** — needed before launch
- [ ] **Domain name** — buy once you have a name
- [ ] **Brand colors** — the design doc has 3 options, pick one during Phase 2
- [ ] **Logo** — can commission or generate later
