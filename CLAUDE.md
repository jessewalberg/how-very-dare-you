# CLAUDE.md — How Very Dare You

This file provides guidance to Claude Code when working with this project.

## Project Overview

Content advisory platform built with Next.js 16 (App Router), Convex, Clerk, Stripe, and shadcn/ui.

## Commands

- `bun dev` — Start the Next.js dev server
- `bun run build` — Production build
- `bun run lint` — Run ESLint
- `bunx convex dev` — Start Convex dev server (requires Convex account)

## Project Structure

- `app/` — Next.js App Router pages and layouts
- `components/` — React components (shadcn/ui in `components/ui/`)
- `convex/` — Convex backend (schema, queries, mutations, actions)
- `lib/` — Utility functions and API clients
- `docs/` — Project documentation and specs

---

# Project-Specific Context (Append to auto-generated CLAUDE.md)

## IMPORTANT: This project uses the following stack. Always consult official docs:

- **Convex** (backend/database): https://docs.convex.dev
  - Next.js App Router integration: https://docs.convex.dev/client/nextjs/app-router
  - Server rendering with preloadQuery: https://docs.convex.dev/client/nextjs/app-router/server-rendering
  - Schema definition: https://docs.convex.dev/database/schemas
  - Actions (external API calls): https://docs.convex.dev/functions/actions
  - Cron jobs: https://docs.convex.dev/scheduling/cron-jobs
  - Clerk auth: https://docs.convex.dev/auth/clerk
  - Environment variables: https://docs.convex.dev/production/environment-variables

- **Clerk** (auth): https://clerk.com/docs
  - Convex integration: https://docs.convex.dev/auth/clerk

- **Stripe** (payments): https://stripe.com/docs/api

- **shadcn/ui** (components): https://ui.shadcn.com/docs

- **better-convex-query** (enhanced Convex hooks): https://github.com/dan-myles/better-convex-query

- **OpenRouter** (AI API): https://openrouter.ai/docs

- **TMDB API** (movie data): https://developer.themoviedb.org/docs

## Package Manager

Use `bun` for everything. `bun add` for installs, `bunx` for CLI tools, `bunx --bun` for shadcn. Never use npm, npx, or yarn.
If docs/examples show npm/npx/yarn/pnpm commands, convert them to Bun equivalents before running.

## Project Docs

Read these files in `docs/` for project-specific architecture and patterns:
- `docs/SPEC.md` — Full technical specification
- `docs/AI_RATING_RUBRIC.md` — AI prompt and rating rubric
- `docs/skills/CONVEX_PATTERNS.md` — Convex patterns for this project
- `docs/skills/REACT_NEXTJS_PATTERNS.md` — React component patterns for this project
- `docs/skills/PROJECT_DESIGN.md` — UI design system (colors, typography, components)

When any pattern in these project docs conflicts with the official Next.js docs bundled in `node_modules/next/dist/docs/`, the official docs win for Next.js-specific APIs. The project docs win for project-specific decisions (database schema, rating system logic, design system colors, etc).
