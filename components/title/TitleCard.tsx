"use client";

import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  calculateCompositeScore,
  isNoFlags,
  type CategoryRatings,
  type CategoryWeights,
} from "@/lib/scoring";
import { CompositeScore } from "@/components/rating/CompositeScore";
import { NoFlagsBadge } from "@/components/rating/NoFlagsBadge";
import { Badge } from "@/components/ui/badge";
import { Zap } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";

interface StreamingProvider {
  name: string;
  logoPath?: string;
  affiliateUrl?: string;
}

interface TitleCardProps {
  id: Id<"titles">;
  title: string;
  year: number;
  type: "movie" | "tv" | "youtube";
  ageRating?: string;
  genre?: string;
  posterPath?: string;
  ratings?: CategoryRatings;
  status: string;
  streamingProviders?: StreamingProvider[];
  weights?: CategoryWeights;
}

const TYPE_LABELS: Record<string, string> = {
  movie: "Movie",
  tv: "TV Show",
  youtube: "YouTube",
};

export function TitleCard({
  id,
  title,
  year,
  type,
  ageRating,
  genre,
  posterPath,
  ratings,
  status,
  streamingProviders,
  weights,
}: TitleCardProps) {
  const hasRatings = ratings && status === "rated";
  const noFlags = hasRatings && isNoFlags(ratings);
  const composite = hasRatings ? calculateCompositeScore(ratings, weights) : null;

  return (
    <Link
      href={`/title/${id}`}
      className={cn(
        "group relative flex gap-3 rounded-xl border bg-card p-3",
        "transition-all duration-200 ease-out",
        "hover:shadow-md hover:-translate-y-0.5 hover:border-border/80",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "sm:flex-col sm:gap-0 sm:p-0 sm:overflow-hidden"
      )}
    >
      {/* Poster */}
      <div
        className={cn(
          "relative shrink-0 overflow-hidden rounded-lg bg-muted",
          "w-20 h-[120px]",
          "sm:w-full sm:h-auto sm:aspect-[2/3] sm:rounded-none sm:rounded-t-xl"
        )}
      >
        {posterPath ? (
          <Image
            src={`https://image.tmdb.org/t/p/w342${posterPath}`}
            alt={`${title} (${year}) ${type === "tv" ? "TV show" : "movie"} poster`}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            sizes="(max-width: 640px) 80px, (max-width: 1024px) 200px, 240px"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground/40">
            <svg
              className="size-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a1.5 1.5 0 001.5-1.5V4.5a1.5 1.5 0 00-1.5-1.5H3.75a1.5 1.5 0 00-1.5 1.5v15a1.5 1.5 0 001.5 1.5z"
              />
            </svg>
          </div>
        )}

        {/* Age rating overlay on poster (desktop) */}
        {ageRating && (
          <span
            className={cn(
              "absolute top-1.5 right-1.5 hidden sm:inline-flex",
              "rounded-sm bg-black/70 px-1.5 py-0.5",
              "text-[10px] font-bold text-white tracking-wide"
            )}
          >
            {ageRating}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex min-w-0 flex-1 flex-col justify-between gap-2 sm:p-3 sm:pt-2.5">
        <div className="space-y-1">
          {/* Title + year */}
          <h3 className="text-sm font-semibold leading-tight line-clamp-2 group-hover:text-foreground/80 transition-colors">
            {title}
            <span className="ml-1 text-muted-foreground font-normal">
              ({year})
            </span>
          </h3>

          {/* Type + genre + age rating (mobile) */}
          <p className="text-xs text-muted-foreground truncate">
            {TYPE_LABELS[type]}
            {genre && <span> · {genre}</span>}
            {ageRating && <span className="sm:hidden"> · {ageRating}</span>}
          </p>
        </div>

        {/* Score or status */}
        <div className="flex items-center gap-2">
          {noFlags ? (
            <NoFlagsBadge compact />
          ) : composite !== null ? (
            <CompositeScore score={composite} compact />
          ) : status === "pending" || status === "rating" ? (
            <Badge
              variant="secondary"
              className="text-[10px] font-medium px-1.5 py-0"
            >
              {status === "rating" ? "Rating..." : "Pending"}
            </Badge>
          ) : null}
          {ratings?.overstimulation != null && ratings.overstimulation >= 3 && (
            <span
              className="inline-flex items-center gap-0.5 rounded-sm bg-amber-100 px-1 py-0.5 text-[9px] font-semibold text-amber-700"
              title={`Overstimulation: ${ratings.overstimulation}/4`}
            >
              <Zap className="size-2.5" />
            </span>
          )}
        </div>

        {/* Streaming providers */}
        {streamingProviders && streamingProviders.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            {streamingProviders.slice(0, 4).map((provider) => (
              <span
                key={provider.name}
                className={cn(
                  "inline-flex items-center rounded-sm bg-muted/60 px-1.5 py-0.5",
                  "text-[9px] font-medium text-muted-foreground tracking-wide"
                )}
              >
                {provider.logoPath ? (
                  <Image
                    src={`https://image.tmdb.org/t/p/w45${provider.logoPath}`}
                    alt={provider.name}
                    width={14}
                    height={14}
                    className="rounded-sm"
                    loading="lazy"
                  />
                ) : (
                  provider.name
                )}
              </span>
            ))}
            {streamingProviders.length > 4 && (
              <span className="text-[9px] text-muted-foreground">
                +{streamingProviders.length - 4}
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
