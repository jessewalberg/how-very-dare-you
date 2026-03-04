"use client";

import Link from "next/link";
import { Preloaded, usePreloadedQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { TitleGrid } from "@/components/browse/TitleGrid";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

interface SafeMoviesClientProps {
  preloadedTitles: Preloaded<typeof api.titles.browseLowScores>;
}

export function SafeMoviesClient({ preloadedTitles }: SafeMoviesClientProps) {
  const results = usePreloadedQuery(preloadedTitles);

  return (
    <div className="space-y-6">
      {results !== undefined && (
        <p className="text-xs text-muted-foreground">
          {results.length} title{results.length !== 1 ? "s" : ""} with low
          advisory scores
        </p>
      )}

      <TitleGrid
        titles={results}
        isLoading={results === undefined}
        emptyState={{
          title: "No safe titles yet",
          description:
            "We're still analyzing titles. Check back soon for low-advisory picks.",
          ctaLabel: "Browse all titles",
          ctaHref: "/browse",
        }}
      />

      <div className="text-center pt-4">
        <Button variant="outline" asChild>
          <Link href="/browse/low-scores">
            Browse Low Advisory Picks
            <ArrowRight className="ml-1.5 size-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
