"use client";

import { cn } from "@/lib/utils";
import { TitleCard } from "@/components/title/TitleCard";
import { TitleCardSkeleton } from "@/components/title/TitleCardSkeleton";
import { SearchX } from "lucide-react";
import type { CategoryRatings } from "@/lib/scoring";
import type { Id } from "@/convex/_generated/dataModel";

interface TitleData {
  _id: Id<"titles">;
  title: string;
  year: number;
  type: "movie" | "tv" | "youtube";
  ageRating?: string;
  genre?: string;
  posterPath?: string;
  ratings?: CategoryRatings;
  status: string;
  streamingProviders?: {
    name: string;
    logoPath?: string;
    affiliateUrl?: string;
  }[];
}

interface TitleGridProps {
  titles?: TitleData[];
  isLoading?: boolean;
}

export function TitleGrid({ titles, isLoading }: TitleGridProps) {
  if (isLoading || titles === undefined) {
    return (
      <div
        className={cn(
          "grid gap-4",
          "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        )}
      >
        {Array.from({ length: 12 }).map((_, i) => (
          <TitleCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (titles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-muted">
          <SearchX className="size-7 text-muted-foreground/50" />
        </div>
        <h2 className="mt-4 text-base font-semibold">No titles found</h2>
        <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">
          Try adjusting your filters or search for a specific title to rate it
          on demand.
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid gap-4",
        "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      )}
    >
      {titles.map((title) => (
        <TitleCard
          key={title._id}
          id={title._id}
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
  );
}
