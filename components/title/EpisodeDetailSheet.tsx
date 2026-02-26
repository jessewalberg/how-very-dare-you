"use client";

import { useState } from "react";
import { useQuery, useAction } from "convex/react";
import { RefreshCw } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { RatingBreakdown } from "@/components/rating/RatingBreakdown";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import type { CategoryRatings } from "@/lib/scoring";

interface EpisodeDetailSheetProps {
  episodeId: Id<"episodes"> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  showTitle: string;
}

export function EpisodeDetailSheet({
  episodeId,
  open,
  onOpenChange,
  showTitle,
}: EpisodeDetailSheetProps) {
  const episode = useQuery(
    api.episodes.getEpisode,
    episodeId ? { episodeId } : "skip"
  );
  const isAdmin = useQuery(api.admin.isCurrentUserAdmin);
  const reRateEpisode = useAction(api.admin.reRateEpisode);
  const [reRating, setReRating] = useState(false);

  const hasRatings = episode?.status === "rated" && episode?.ratings;

  async function handleReRate() {
    if (!episodeId) return;
    setReRating(true);
    try {
      await reRateEpisode({ episodeId });
    } catch (e) {
      console.error("Re-rate failed:", e);
    } finally {
      setReRating(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {episode
              ? `S${episode.seasonNumber}E${episode.episodeNumber}${episode.name ? `: ${episode.name}` : ""}`
              : "Episode Details"}
          </SheetTitle>
          <SheetDescription>{showTitle}</SheetDescription>
        </SheetHeader>

        <div className="px-4 pb-8 space-y-5">
          {!episode && (
            <div className="space-y-3 pt-4">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-32 w-full" />
            </div>
          )}

          {episode?.overview && (
            <p className="text-sm leading-relaxed text-muted-foreground">
              {episode.overview}
            </p>
          )}

          {hasRatings && (
            <RatingBreakdown
              ratings={episode.ratings as CategoryRatings}
              notes={episode.ratingNotes ?? undefined}
              categoryEvidence={episode.categoryEvidence ?? undefined}
            />
          )}

          {episode?.ratedAt && (
            <p className="text-[11px] text-muted-foreground/50">
              Rated{" "}
              {new Date(episode.ratedAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
              {episode.ratingModel && ` · Model: ${episode.ratingModel}`}
              {episode.ratingConfidence != null &&
                ` · Confidence: ${Math.round(episode.ratingConfidence * 100)}%`}
            </p>
          )}

          {isAdmin && episodeId && (episode?.status === "rated" || episode?.status === "failed") && (
            <Button
              variant="outline"
              size="sm"
              className="w-full h-8 text-xs gap-1.5"
              onClick={handleReRate}
              disabled={reRating}
            >
              {reRating ? (
                <>
                  <RefreshCw className="size-3 animate-spin" />
                  Re-rating...
                </>
              ) : (
                <>
                  <RefreshCw className="size-3" />
                  Re-rate Episode
                </>
              )}
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
