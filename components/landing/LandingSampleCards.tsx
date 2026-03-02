"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { RatingBreakdown } from "@/components/rating/RatingBreakdown";
import type { CategoryRatings } from "@/lib/scoring";

export function LandingSampleCards() {
  const browseResults = useQuery(api.titles.browse, { status: "rated", limit: 50 });
  const featured = (browseResults ?? [])
    .filter((title) => !!title.ratings && !!title.ratingNotes)
    .slice(0, 3);

  if (browseResults === undefined) {
    return (
      <div className="grid gap-6 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="rounded-2xl border bg-card p-5 space-y-4"
          >
            <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
            <div className="h-28 animate-pulse rounded-xl bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  if (featured.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
        No analyzed titles yet. Request analysis from search and it will appear here.
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {featured.map((sample) => (
        <div
          key={sample._id}
          className="rounded-2xl border bg-card p-5 space-y-4 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
        >
          {/* Title header */}
          <div>
            <h3 className="text-base font-bold leading-tight">
              {sample.title}
              <span className="ml-1 text-sm font-normal text-muted-foreground">
                ({sample.year})
              </span>
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {sample.type === "tv" ? "TV Show" : "Movie"}
              {sample.ageRating ? ` · ${sample.ageRating}` : ""}
              {sample.genre ? ` · ${sample.genre.split(",").slice(0, 2).join(" · ")}` : ""}
            </p>
          </div>

          {/* Rating breakdown */}
          <RatingBreakdown
            ratings={sample.ratings as CategoryRatings}
            notes={sample.ratingNotes ?? ""}
          />
        </div>
      ))}
    </div>
  );
}
