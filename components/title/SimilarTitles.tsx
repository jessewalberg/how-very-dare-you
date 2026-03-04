"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { TitleCard } from "@/components/title/TitleCard";
import type { CategoryRatings } from "@/lib/scoring";
import type { Id } from "@/convex/_generated/dataModel";

interface SimilarTitlesProps {
  titleId: Id<"titles">;
}

export function SimilarTitles({ titleId }: SimilarTitlesProps) {
  const titles = useQuery(api.titles.getSimilarTitles, {
    titleId,
    limit: 4,
  });

  if (!titles || titles.length === 0) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold tracking-tight">More Titles</h2>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        {titles.map((title) => (
          <TitleCard
            key={title._id}
            id={title._id}
            slug={title.slug}
            title={title.title}
            year={title.year}
            type={title.type}
            ageRating={title.ageRating}
            genre={title.genre}
            posterPath={title.posterPath}
            ratings={title.ratings as CategoryRatings | undefined}
            status={title.status}
            streamingProviders={title.streamingProviders}
          />
        ))}
      </div>
    </div>
  );
}
