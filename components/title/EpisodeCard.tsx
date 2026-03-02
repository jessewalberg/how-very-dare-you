"use client";

import Image from "next/image";
import { SignInButton } from "@clerk/nextjs";
import { Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  calculateCompositeScore,
  isNoFlags,
  type CategoryRatings,
  type CategoryWeights,
} from "@/lib/scoring";
import { NoFlagsBadge } from "@/components/rating/NoFlagsBadge";
import { SEVERITY_LEVELS, type SeverityLevel } from "@/lib/constants";

interface EpisodeCardProps {
  episodeNumber: number;
  name?: string;
  stillPath?: string;
  status: "unrated" | "rating" | "rated" | "failed";
  ratings?: CategoryRatings;
  weights?: CategoryWeights;
  onRate: () => void;
  onClick: () => void;
  rateDisabled?: boolean;
  requireSignInForRate?: boolean;
  rateLabel?: string;
}

export function EpisodeCard({
  episodeNumber,
  name,
  stillPath,
  status,
  ratings,
  weights,
  onRate,
  onClick,
  rateDisabled,
  requireSignInForRate = false,
  rateLabel = "Analyze Episode",
}: EpisodeCardProps) {
  const isRated = status === "rated" && ratings;
  const isRating = status === "rating";
  const noFlags = isRated ? isNoFlags(ratings) : false;
  const composite = isRated ? calculateCompositeScore(ratings, weights) : null;
  const roundedSeverity =
    composite !== null ? (Math.round(composite) as SeverityLevel) : null;
  const adjustedSeverity =
    roundedSeverity === 0 && composite !== null && composite > 0
      ? 1
      : roundedSeverity;
  const scoreLabel =
    composite !== null
      ? roundedSeverity === 0 && composite > 0
        ? `Low (${composite.toFixed(1)}/4)`
        : `${SEVERITY_LEVELS[roundedSeverity!].label} (${composite.toFixed(1)}/4)`
      : null;
  const stillImageSrc = stillPath
    ? stillPath.startsWith("http")
      ? stillPath
      : `https://image.tmdb.org/t/p/w300${stillPath}`
    : null;

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
        {stillImageSrc ? (
          <Image
            src={stillImageSrc}
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
          {isRated && !noFlags && composite !== null && adjustedSeverity !== null && (
            <Badge
              variant="outline"
              role="status"
              aria-label={`Episode score ${composite.toFixed(1)} out of 4`}
              className={cn(
                SEVERITY_LEVELS[adjustedSeverity].border,
                SEVERITY_LEVELS[adjustedSeverity].color,
                SEVERITY_LEVELS[adjustedSeverity].bg,
                "font-semibold tracking-tight transition-all duration-200",
                "hover:shadow-sm hover:scale-[1.04]",
                "text-[10px] leading-tight px-1.5 py-0"
              )}
            >
              {scoreLabel}
            </Badge>
          )}
          {isRating && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="size-3 animate-spin" />
              Analyzing...
            </span>
          )}
          {status === "failed" && (
            <span className="text-xs text-destructive">Failed</span>
          )}
          {(status === "unrated" || status === "failed") && (
            requireSignInForRate ? (
              <SignInButton mode="modal">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 px-2 text-[10px]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Sparkles className="mr-1 size-3" />
                  {rateLabel}
                </Button>
              </SignInButton>
            ) : (
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
                {rateLabel}
              </Button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
