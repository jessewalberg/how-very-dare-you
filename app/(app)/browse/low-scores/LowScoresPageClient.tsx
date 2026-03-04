"use client";

import { Preloaded, usePreloadedQuery } from "convex/react";
import { Gauge } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { TitleGrid } from "@/components/browse/TitleGrid";

interface LowScoresPageClientProps {
  preloadedTitles: Preloaded<typeof api.titles.browseLowScores>;
}

export function LowScoresPageClient({ preloadedTitles }: LowScoresPageClientProps) {
  const results = usePreloadedQuery(preloadedTitles);

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center text-center gap-3">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-100">
          <Gauge className="size-7 text-emerald-600" strokeWidth={2} />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Low Advisory Picks</h1>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            Titles in this list have low overall advisory scores and stay within
            lower-severity category ranges.
          </p>
        </div>
        {results !== undefined && (
          <p className="text-xs text-muted-foreground">
            {results.length} title{results.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      <TitleGrid
        titles={results}
        isLoading={results === undefined}
        emptyState={{
          title: "No low-advisory titles yet",
          description:
            "No titles currently meet low-score criteria. Check back after more AI analyses are processed.",
          ctaLabel: "Browse all titles",
          ctaHref: "/browse",
        }}
      />
    </div>
  );
}
