"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { ChevronDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { EpisodeCard } from "./EpisodeCard";
import { EpisodeDetailSheet } from "./EpisodeDetailSheet";
import type { CategoryRatings, CategoryWeights } from "@/lib/scoring";
import { getEpisodeAnalysisActionLabel } from "@/lib/analysisCopy";

interface SeasonAccordionProps {
  titleId: Id<"titles">;
  tmdbShowId: number;
  seasonNumber: number;
  seasonName?: string;
  episodeCount: number;
  showTitle: string;
  weights?: CategoryWeights;
}

export function SeasonAccordion({
  titleId,
  tmdbShowId,
  seasonNumber,
  seasonName,
  episodeCount,
  showTitle,
  weights,
}: SeasonAccordionProps) {
  const { isSignedIn } = useUser();
  const [open, setOpen] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [selectedEpisodeId, setSelectedEpisodeId] =
    useState<Id<"episodes"> | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Subscribe to episodes once the accordion has been opened
  const episodes = useQuery(
    api.episodes.getEpisodesByTitleAndSeason,
    open || fetched ? { titleId, seasonNumber } : "skip"
  );

  const fetchSeasonEpisodes = useAction(api.episodes.fetchSeasonEpisodes);
  const requestEpisodeRating = useMutation(api.episodes.requestEpisodeRating);

  const handleOpen = useCallback(
    async (isOpen: boolean) => {
      setOpen(isOpen);
      if (isOpen && !fetched) {
        setFetching(true);
        try {
          await fetchSeasonEpisodes({ titleId, tmdbShowId, seasonNumber });
          setFetched(true);
        } catch (e) {
          console.error("Failed to fetch episodes:", e);
        } finally {
          setFetching(false);
        }
      }
    },
    [fetched, fetchSeasonEpisodes, titleId, tmdbShowId, seasonNumber]
  );

  const handleRate = useCallback(
    async (episodeId: Id<"episodes">) => {
      try {
        await requestEpisodeRating({ episodeId });
      } catch (e) {
        console.error("Failed to request episode rating:", e);
      }
    },
    [requestEpisodeRating]
  );

  const handleEpisodeClick = useCallback((episodeId: Id<"episodes">) => {
    setSelectedEpisodeId(episodeId);
    setSheetOpen(true);
  }, []);

  const ratedCount =
    episodes?.filter((ep: NonNullable<typeof episodes>[number]) => ep.status === "rated")
      .length ?? 0;

  return (
    <>
      <Collapsible open={open} onOpenChange={handleOpen}>
        <CollapsibleTrigger
          className={cn(
            "flex w-full items-center justify-between gap-2",
            "rounded-lg border border-border/50 bg-muted/20",
            "px-4 py-3",
            "text-sm font-medium text-foreground",
            "transition-all duration-200",
            "hover:bg-muted/40",
            "cursor-pointer"
          )}
        >
          <span className="flex items-center gap-2">
            {seasonName || `Season ${seasonNumber}`}
            <span className="text-xs text-muted-foreground">
              {episodeCount} episodes
              {ratedCount > 0 && ` · ${ratedCount} analyzed`}
            </span>
          </span>
          <div className="flex items-center gap-2">
            {fetching && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
            <ChevronDown
              className={cn(
                "size-4 text-muted-foreground transition-transform duration-200",
                open && "rotate-180"
              )}
            />
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="mt-2 space-y-1.5">
            {!episodes && fetching && (
              <div className="space-y-2 py-2" aria-live="polite">
                {Array.from({ length: 3 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="flex gap-3 rounded-lg border border-border/40 bg-card p-2.5"
                  >
                    <Skeleton className="h-14 w-24 rounded-md" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3.5 w-32" />
                      <Skeleton className="h-3 w-48 max-w-[80%]" />
                      <Skeleton className="h-5 w-20 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            )}
            {episodes
              ?.sort(
                (a: NonNullable<typeof episodes>[number], b: NonNullable<typeof episodes>[number]) =>
                  a.episodeNumber - b.episodeNumber
              )
              .map((ep: NonNullable<typeof episodes>[number]) => (
                <EpisodeCard
                  key={ep._id}
                  episodeNumber={ep.episodeNumber}
                  name={ep.name ?? undefined}
                  stillPath={ep.stillPath ?? undefined}
                  status={ep.status}
                  ratings={ep.ratings as CategoryRatings | undefined}
                  weights={weights}
                  onRate={() => handleRate(ep._id)}
                  onClick={() => handleEpisodeClick(ep._id)}
                  requireSignInForRate={!isSignedIn}
                  rateLabel={getEpisodeAnalysisActionLabel(Boolean(isSignedIn))}
                />
              ))}
          </div>
        </CollapsibleContent>
      </Collapsible>

      <EpisodeDetailSheet
        episodeId={selectedEpisodeId}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        showTitle={showTitle}
      />
    </>
  );
}
