"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { ChevronDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { EpisodeCard } from "./EpisodeCard";
import { EpisodeDetailSheet } from "./EpisodeDetailSheet";
import type { CategoryRatings } from "@/lib/scoring";

interface SeasonAccordionProps {
  titleId: Id<"titles">;
  tmdbShowId: number;
  seasonNumber: number;
  seasonName?: string;
  episodeCount: number;
  showTitle: string;
}

export function SeasonAccordion({
  titleId,
  tmdbShowId,
  seasonNumber,
  seasonName,
  episodeCount,
  showTitle,
}: SeasonAccordionProps) {
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

  const ratedCount = episodes?.filter((ep) => ep.status === "rated").length ?? 0;

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
              {ratedCount > 0 && ` · ${ratedCount} rated`}
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
              <div className="flex items-center justify-center py-6">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            )}
            {episodes
              ?.sort((a, b) => a.episodeNumber - b.episodeNumber)
              .map((ep) => (
                <EpisodeCard
                  key={ep._id}
                  episodeNumber={ep.episodeNumber}
                  name={ep.name ?? undefined}
                  stillPath={ep.stillPath ?? undefined}
                  status={ep.status}
                  ratings={ep.ratings as CategoryRatings | undefined}
                  onRate={() => handleRate(ep._id)}
                  onClick={() => handleEpisodeClick(ep._id)}
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
