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
  slug?: string;
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
  slug,
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
      href={`/title/${slug ?? id}`}
      className={cn(
        "group relative flex gap-3.5 rounded-2xl border border-border/60 bg-card/95 p-3.5",
        "transition-all duration-200 ease-out",
        "hover:border-border/80 hover:shadow-sm",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      )}
    >
      {/* Poster */}
      <div
        className={cn(
          "relative h-[132px] w-[88px] shrink-0 overflow-hidden rounded-xl bg-muted",
          "ring-1 ring-black/5 dark:ring-white/10"
        )}
      >
        {posterPath ? (
          <Image
            src={`https://image.tmdb.org/t/p/w342${posterPath}`}
            alt={`${title} (${year}) ${type === "tv" ? "TV show" : "movie"} poster`}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            sizes="88px"
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
              "absolute right-1.5 top-1.5 inline-flex",
              "rounded-sm bg-black/75 px-1.5 py-0.5",
              "text-[10px] font-bold text-white tracking-wide"
            )}
          >
            {ageRating}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex min-w-0 flex-1 flex-col justify-between gap-2.5">
        <div className="space-y-1">
          {/* Title + year */}
          <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug tracking-tight transition-colors group-hover:text-foreground/85">
            {title}
            <span className="ml-1 font-normal text-muted-foreground">
              ({year})
            </span>
          </h3>

          {/* Type + genre + age rating (mobile) */}
          <p className="truncate text-xs font-medium text-muted-foreground">
            {TYPE_LABELS[type]}
            {genre && <span> · {genre}</span>}
          </p>
        </div>

        {/* Score or status */}
        <div className="flex items-center gap-1.5">
          {noFlags ? (
            <NoFlagsBadge compact />
          ) : composite !== null ? (
            <CompositeScore score={composite} compact />
          ) : status === "pending" || status === "rating" ? (
            <Badge
              variant="secondary"
              className="text-[10px] font-medium px-1.5 py-0"
            >
              {status === "rating" ? "Analyzing..." : "Queued"}
            </Badge>
          ) : null}
          {ratings?.overstimulation != null && ratings.overstimulation >= 3 && (
            <span
              className="inline-flex items-center gap-1 rounded-sm bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700"
              title={`Overstimulation: ${ratings.overstimulation}/4`}
            >
              <Zap className="size-2.5" />
              High stimulus
            </span>
          )}
        </div>

        {/* Streaming providers */}
        {streamingProviders && streamingProviders.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {streamingProviders.slice(0, 2).map((provider) => (
              <span
                key={provider.name}
                className={cn(
                  "inline-flex items-center rounded-md bg-muted/70 px-2 py-0.5",
                  "text-[10px] font-medium leading-tight text-muted-foreground"
                )}
              >
                {provider.name}
              </span>
            ))}
            {streamingProviders.length > 2 && (
              <span className="text-[10px] text-muted-foreground">
                +{streamingProviders.length - 2}
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
