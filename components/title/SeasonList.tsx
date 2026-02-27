"use client";

import { useEffect, useRef } from "react";
import { useQuery, useAction } from "convex/react";
import { Tv, Loader2 } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { SeasonAccordion } from "./SeasonAccordion";

interface SeasonListProps {
  titleId: Id<"titles">;
  tmdbShowId: number;
  showTitle: string;
}

export function SeasonList({ titleId, tmdbShowId, showTitle }: SeasonListProps) {
  const seasonInfo = useQuery(api.titles.getSeasonList, { titleId });
  const populateSeasonData = useAction(api.titles.populateSeasonData);
  const populatingRef = useRef(false);

  // Auto-populate season data for existing TV shows that don't have it
  useEffect(() => {
    if (
      seasonInfo &&
      (!seasonInfo.seasonData || seasonInfo.seasonData.length === 0) &&
      !populatingRef.current
    ) {
      populatingRef.current = true;
      populateSeasonData({ titleId }).catch((e) => {
        console.error("Failed to populate season data:", e);
        populatingRef.current = false;
      });
    }
  }, [seasonInfo, titleId, populateSeasonData]);

  if (!seasonInfo?.seasonData || seasonInfo.seasonData.length === 0) {
    // Show a subtle loading indicator while fetching season data
    if (seasonInfo && (!seasonInfo.seasonData || seasonInfo.seasonData.length === 0)) {
      return (
        <div className="flex items-center gap-2 py-2">
          <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Loading seasons...</span>
        </div>
      );
    }
    return null;
  }

  // Filter out "Specials" (season 0) unless it's the only season
  const seasons = seasonInfo.seasonData.filter(
    (s: (typeof seasonInfo.seasonData)[number]) =>
      s.seasonNumber > 0 || seasonInfo.seasonData!.length === 1
  );

  if (seasons.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Tv className="size-4 text-muted-foreground" strokeWidth={1.8} />
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Episodes
        </h3>
        {seasonInfo.ratedEpisodeCount != null && seasonInfo.ratedEpisodeCount > 0 && (
          <span className="text-xs text-muted-foreground">
            · {seasonInfo.ratedEpisodeCount} rated
          </span>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground/70">
        Episode badges are per-episode scores (0-4). The main title score is show-level.
      </p>

      <div className="space-y-1.5">
        {seasons.map((season: (typeof seasons)[number]) => (
          <SeasonAccordion
            key={season.seasonNumber}
            titleId={titleId}
            tmdbShowId={tmdbShowId}
            seasonNumber={season.seasonNumber}
            seasonName={season.name ?? undefined}
            episodeCount={season.episodeCount}
            showTitle={showTitle}
          />
        ))}
      </div>
    </div>
  );
}
