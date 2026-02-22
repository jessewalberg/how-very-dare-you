# React & Next.js 16 Patterns — Project-Specific Skill

## Overview

This is a **project-specific** skill file, NOT official React or Next.js documentation. It contains patterns tailored to this content advisory platform.

**When in doubt, always defer to the official docs:**
- Next.js 16: https://nextjs.org/docs
- Convex + Next.js: https://docs.convex.dev/client/nextjs/app-router
- Convex server rendering: https://docs.convex.dev/client/nextjs/app-router/server-rendering
- Clerk + Convex: https://docs.convex.dev/auth/clerk
- shadcn/ui: https://ui.shadcn.com/docs
- better-convex-query: https://github.com/dan-myles/better-convex-query
- Tailwind CSS v4: https://tailwindcss.com/docs

If you're using Claude Code, you can fetch these docs directly with `bunx convex docs` or by reading the URLs above before implementing any pattern you're unsure about.

---

## Next.js 16 Key Changes

### Async Request APIs
All dynamic request APIs are now fully async. No synchronous access.

```typescript
// ✅ Correct — Next.js 16
export default async function Page(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  return <TitleDetail id={id} />;
}

// ❌ Wrong — this was deprecated in 15 and removed in 16
export default function Page({ params }: { params: { id: string } }) {
  return <TitleDetail id={params.id} />;
}
```

### Turbopack Default
Turbopack is now the default bundler. No `--turbopack` flag needed.

### proxy.ts Replaces middleware.ts
For any proxy/middleware logic, use `proxy.ts` instead.

---

## Component Patterns

### Server vs Client Components

```
Server Components (default):
- Title detail pages (SEO critical)
- Browse pages (initial load)
- Layout components
- Static content

Client Components ("use client"):
- Search input/results (real-time)
- Filter sidebar (interactive)
- Rating weight sliders (interactive)
- Any component using Convex hooks
- Any component using Clerk hooks
```

### Server Component with Convex Preloading

```typescript
// app/(app)/title/[id]/page.tsx
import { preloadQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { TitleDetail } from "@/components/title/TitleDetail";

export default async function TitlePage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const preloadedTitle = await preloadQuery(api.titles.getTitle, {
    titleId: id as any, // Convex ID
  });

  return <TitleDetail preloadedTitle={preloadedTitle} />;
}
```

### Client Component with Convex Hooks

```typescript
// components/title/TitleDetail.tsx
"use client";

import { Preloaded, usePreloadedQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export function TitleDetail({
  preloadedTitle,
}: {
  preloadedTitle: Preloaded<typeof api.titles.getTitle>;
}) {
  const title = usePreloadedQuery(preloadedTitle);

  if (!title) return <NotFound />;

  return (
    <div>
      <h1>{title.title}</h1>
      <RatingBreakdown ratings={title.ratings} />
    </div>
  );
}
```

---

## shadcn/ui Component Strategy

### Installation

```bash
bunx --bun shadcn@latest init
# Select: New York style, Zinc base color, CSS variables: yes
```

### Components to Install

```bash
# Core UI components needed for this project
bunx --bun shadcn@latest add button
bunx --bun shadcn@latest add card
bunx --bun shadcn@latest add badge
bunx --bun shadcn@latest add input
bunx --bun shadcn@latest add slider
bunx --bun shadcn@latest add select
bunx --bun shadcn@latest add dialog
bunx --bun shadcn@latest add sheet          # mobile filter sidebar
bunx --bun shadcn@latest add skeleton       # loading states
bunx --bun shadcn@latest add tabs
bunx --bun shadcn@latest add tooltip
bunx --bun shadcn@latest add separator
bunx --bun shadcn@latest add avatar
bunx --bun shadcn@latest add dropdown-menu
bunx --bun shadcn@latest add command        # search command palette
bunx --bun shadcn@latest add toggle-group
bunx --bun shadcn@latest add textarea       # correction form
bunx --bun shadcn@latest add form           # form handling
bunx --bun shadcn@latest add label
bunx --bun shadcn@latest add progress       # loading bar for AI rating
```

### Custom Component Patterns

#### Rating Badge

```typescript
// components/rating/RatingBadge.tsx
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const SEVERITY_CONFIG = {
  0: { label: "None", variant: "outline" as const, className: "border-emerald-500/30 text-emerald-600 bg-emerald-50" },
  1: { label: "Brief", variant: "outline" as const, className: "border-lime-500/30 text-lime-700 bg-lime-50" },
  2: { label: "Notable", variant: "outline" as const, className: "border-amber-500/30 text-amber-700 bg-amber-50" },
  3: { label: "Significant", variant: "outline" as const, className: "border-orange-500/30 text-orange-700 bg-orange-50" },
  4: { label: "Core Theme", variant: "outline" as const, className: "border-red-500/30 text-red-700 bg-red-50" },
} as const;

interface RatingBadgeProps {
  severity: 0 | 1 | 2 | 3 | 4;
  compact?: boolean;
}

export function RatingBadge({ severity, compact = false }: RatingBadgeProps) {
  const config = SEVERITY_CONFIG[severity];
  return (
    <Badge
      variant={config.variant}
      className={cn(
        config.className,
        compact && "text-xs px-1.5 py-0"
      )}
    >
      {config.label}
    </Badge>
  );
}
```

#### No Flags Badge

```typescript
// components/rating/NoFlagsBadge.tsx
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";

export function NoFlagsBadge() {
  return (
    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-100 gap-1">
      <CheckCircle2 className="h-3 w-3" />
      No Flags
    </Badge>
  );
}
```

---

## State Management

### Composite Score Calculation (Client-Side)

```typescript
// lib/scoring.ts

export interface CategoryRatings {
  lgbtq: number;
  climate: number;
  racialIdentity: number;
  genderRoles: number;
  antiAuthority: number;
  religious: number;
  political: number;
  sexuality: number;
}

export interface CategoryWeights {
  lgbtq: number;
  climate: number;
  racialIdentity: number;
  genderRoles: number;
  antiAuthority: number;
  religious: number;
  political: number;
  sexuality: number;
}

export const DEFAULT_WEIGHTS: CategoryWeights = {
  lgbtq: 5,
  climate: 5,
  racialIdentity: 5,
  genderRoles: 5,
  antiAuthority: 5,
  religious: 5,
  political: 5,
  sexuality: 5,
};

export function calculateCompositeScore(
  ratings: CategoryRatings,
  weights: CategoryWeights = DEFAULT_WEIGHTS
): number {
  const categories = Object.keys(ratings) as (keyof CategoryRatings)[];

  // Filter out categories with weight 0
  const active = categories.filter((cat) => weights[cat] > 0);

  if (active.length === 0) return 0;

  // Calculate weighted scores (normalize weight to 0-1 range)
  const weightedScores = active.map((cat) => {
    const normalizedWeight = weights[cat] / 10;
    return ratings[cat] * normalizedWeight;
  });

  const peak = Math.max(...weightedScores);
  const avg = weightedScores.reduce((a, b) => a + b, 0) / weightedScores.length;

  // Composite: peak * 0.6 + average * 0.4
  const raw = peak * 0.6 + avg * 0.4;

  // Clamp to 0-4 range
  return Math.min(4, Math.max(0, Math.round(raw * 10) / 10));
}

export function isNoFlags(ratings: CategoryRatings): boolean {
  return Object.values(ratings).every((v) => v === 0);
}
```

### Using better-convex-query

```typescript
// Using better-convex-query for TanStack-style DX
import { useQuery, useMutation } from "better-convex-query";
import { api } from "@/convex/_generated/api";

function SearchResults({ query }: { query: string }) {
  const {
    data: results,
    isLoading,
    isError,
    error,
  } = useQuery(api.search.searchTitles, { searchTerm: query });

  if (isLoading) return <SearchSkeleton />;
  if (isError) return <ErrorState error={error} />;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {results?.map((title) => (
        <TitleCard key={title._id} title={title} />
      ))}
    </div>
  );
}
```

---

## Styling Guidelines

### Tailwind Conventions for This Project

```
Color Palette:
- Severity 0 (None):       emerald-500/600
- Severity 1 (Brief):      lime-500/700
- Severity 2 (Notable):    amber-500/700
- Severity 3 (Significant): orange-500/700
- Severity 4 (Core Theme): red-500/700
- "No Flags" badge:        emerald
- Primary brand:           TBD (choose during design phase)
- Background:              neutral-50 / white
- Text:                    neutral-900 / neutral-600

Spacing:
- Card padding: p-4 md:p-6
- Grid gaps: gap-4 md:gap-6
- Section spacing: space-y-6 md:space-y-8
- Page max-width: max-w-7xl mx-auto px-4

Responsive:
- Mobile-first
- Grid: grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4
- Sidebar: Sheet on mobile, fixed sidebar on desktop
```

### Loading States

Every data-dependent component should have a skeleton loading state:

```typescript
// Always pair data components with skeleton states
<Suspense fallback={<TitleCardSkeleton />}>
  <TitleCard />
</Suspense>

// Or with better-convex-query
const { data, isLoading } = useQuery(api.titles.getTitle, { titleId });
if (isLoading) return <TitleCardSkeleton />;
```

---

## Error Handling

```typescript
// Consistent error boundary pattern
"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <h2 className="text-xl font-semibold">Something went wrong</h2>
      <p className="text-neutral-600">{error.message}</p>
      <button
        onClick={reset}
        className="px-4 py-2 bg-neutral-900 text-white rounded-md hover:bg-neutral-800"
      >
        Try again
      </button>
    </div>
  );
}
```

---

## SEO

### Title Detail Pages (Critical for Organic Traffic)

```typescript
// app/(app)/title/[id]/page.tsx
import type { Metadata } from "next";

export async function generateMetadata(props: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await props.params;
  // Fetch title data for metadata
  const title = await fetchQuery(api.titles.getTitle, { titleId: id as any });

  if (!title) return { title: "Title Not Found" };

  const composite = calculateCompositeScore(title.ratings!, DEFAULT_WEIGHTS);
  const severity = getSeverityLabel(Math.round(composite));

  return {
    title: `${title.title} (${title.year}) - Content Advisory | [App Name]`,
    description: `Content advisory for ${title.title}: ${severity} overall. See detailed breakdown of cultural and ideological themes for parents.`,
    openGraph: {
      title: `${title.title} - Parent Content Advisory`,
      description: title.ratingNotes || title.overview || "",
      images: title.posterPath
        ? [`https://image.tmdb.org/t/p/w500${title.posterPath}`]
        : [],
    },
  };
}
```
