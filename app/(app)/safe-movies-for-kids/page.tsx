import { Suspense } from "react";
import { preloadQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { SafeMoviesClient } from "./SafeMoviesClient";

export default async function SafeMoviesPage() {
  const preloadedTitles = await preloadQuery(api.titles.browseLowScores, {
    limit: 50,
    maxComposite: 1,
    maxCategorySeverity: 1,
  });

  return (
    <div className="space-y-8">
      {/* SEO intro */}
      <div className="mx-auto max-w-3xl space-y-4">
        <h1 className="text-3xl font-extrabold tracking-tight">
          Safe Movies &amp; TV Shows for Kids
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Looking for family-friendly movies with no surprises? Every title on
          this page has been AI-analyzed across 8 cultural and ideological
          categories and selected for a low advisory profile. This list is
          ideal for families who want lower concern scores across tracked
          categories.
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Our AI reads actual subtitle transcripts to identify themes that
          traditional rating systems miss. Whether you&apos;re planning movie
          night or looking for a low-friction show pick, these titles keep
          category severity and overall scores in lower ranges.
        </p>
      </div>

      <Suspense
        fallback={
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="h-[164px] animate-pulse rounded-2xl border bg-muted"
              />
            ))}
          </div>
        }
      >
        <SafeMoviesClient preloadedTitles={preloadedTitles} />
      </Suspense>
    </div>
  );
}
