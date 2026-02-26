"use client";

import Image from "next/image";
import { Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { RatingBadge } from "@/components/rating/RatingBadge";
import { calculateCompositeScore, isNoFlags, type CategoryRatings } from "@/lib/scoring";
import { NoFlagsBadge } from "@/components/rating/NoFlagsBadge";
import type { SeverityLevel } from "@/lib/constants";

interface EpisodeCardProps {
  episodeNumber: number;
  name?: string;
  stillPath?: string;
  status: "unrated" | "rating" | "rated" | "failed";
  ratings?: CategoryRatings;
  onRate: () => void;
  onClick: () => void;
  rateDisabled?: boolean;
}

export function EpisodeCard({
  episodeNumber,
  name,
  stillPath,
  status,
  ratings,
  onRate,
  onClick,
  rateDisabled,
}: EpisodeCardProps) {
  const isRated = status === "rated" && ratings;
  const isRating = status === "rating";
  const noFlags = isRated ? isNoFlags(ratings) : false;
  const composite = isRated ? calculateCompositeScore(ratings) : null;

  return (
    <div
      className={cn(
        "group flex gap-3 rounded-lg border border-border/40 bg-card p-2.5",
        "transition-all duration-200",
        isRated && "cursor-pointer hover:border-border hover:shadow-sm"
      )}
      onClick={isRated ? onClick : undefined}
    >
      {/* Still image */}
      <div className="relative w-24 shrink-0 overflow-hidden rounded-md bg-muted aspect-video">
        {stillPath ? (
          <Image
            src={`https://image.tmdb.org/t/p/w300${stillPath}`}
            alt={name || `Episode ${episodeNumber}`}
            fill
            className="object-cover"
            sizes="96px"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground/30 text-xs">
            E{episodeNumber}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col justify-between min-w-0 gap-1">
        <div>
          <p className="text-xs font-bold tabular-nums text-muted-foreground">
            Episode {episodeNumber}
          </p>
          {name && (
            <p className="text-sm font-medium truncate">{name}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isRated && noFlags && <NoFlagsBadge compact />}
          {isRated && !noFlags && composite !== null && (
            <RatingBadge
              severity={Math.round(composite) as SeverityLevel}
              compact
            />
          )}
          {isRating && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="size-3 animate-spin" />
              Rating...
            </span>
          )}
          {status === "failed" && (
            <span className="text-xs text-destructive">Failed</span>
          )}
          {(status === "unrated" || status === "failed") && (
            <Button
              variant="outline"
              size="sm"
              className="h-6 px-2 text-[10px]"
              disabled={rateDisabled || isRating}
              onClick={(e) => {
                e.stopPropagation();
                onRate();
              }}
            >
              <Sparkles className="mr-1 size-3" />
              Rate This
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
