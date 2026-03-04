import { Suspense } from "react";
import { preloadQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { LowScoresPageClient } from "./LowScoresPageClient";

export default async function LowScoresPage() {
  const preloadedTitles = await preloadQuery(api.titles.browseLowScores, {
    limit: 50,
    maxComposite: 1,
    maxCategorySeverity: 1,
  });

  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div className="flex flex-col items-center text-center gap-3">
            <div className="h-14 w-14 animate-pulse rounded-2xl bg-muted" />
            <div className="h-6 w-56 animate-pulse rounded bg-muted" />
            <div className="h-4 w-72 animate-pulse rounded bg-muted" />
          </div>
        </div>
      }
    >
      <LowScoresPageClient preloadedTitles={preloadedTitles} />
    </Suspense>
  );
}
