"use client";

import { useState } from "react";
import { ChevronDown, Tv } from "lucide-react";
import { cn } from "@/lib/utils";
import { CATEGORIES } from "@/lib/constants";
import { getSeverityLabel } from "@/lib/scoring";
import { RatingBadge } from "./RatingBadge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface EpisodeFlag {
  season: number;
  episode: number;
  episodeTitle?: string;
  category: string;
  severity: number;
  note: string;
}

interface EpisodeFlagsProps {
  flags: EpisodeFlag[];
}

function formatEpisodeCode(season: number, episode: number) {
  return `S${String(season).padStart(2, "0")}E${String(episode).padStart(2, "0")}`;
}

function getCategoryLabel(key: string): string {
  return (
    CATEGORIES.find((c) => c.key === key)?.label ?? key
  );
}

export function EpisodeFlags({ flags }: EpisodeFlagsProps) {
  const [open, setOpen] = useState(false);

  if (flags.length === 0) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger
        className={cn(
          "flex w-full items-center justify-between gap-2",
          "rounded-lg border border-border/50 bg-muted/30",
          "px-4 py-3",
          "text-sm font-medium text-muted-foreground",
          "transition-all duration-200",
          "hover:bg-muted/50 hover:text-foreground",
          "cursor-pointer"
        )}
      >
        <span className="flex items-center gap-2">
          <Tv className="size-4" strokeWidth={1.8} />
          Episode Exceptions
          <span className="inline-flex items-center justify-center rounded-full bg-muted px-1.5 py-0 text-[10px] font-semibold tabular-nums">
            {flags.length}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "size-4 transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="mt-1.5 space-y-1">
          {flags.map((flag, i) => {
            const safeSeverity = Number.isFinite(flag.severity) ? flag.severity : 0;
            const normalizedSeverity = Math.min(4, Math.max(0, safeSeverity));
            const severityLabel = getSeverityLabel(normalizedSeverity);
            const categoryLabel = getCategoryLabel(flag.category);
            return (
              <div
                key={i}
                className={cn(
                  "flex flex-col gap-1.5 rounded-lg px-4 py-3",
                  "border border-border/30 bg-muted/20",
                  "transition-colors duration-200",
                  "hover:bg-muted/40"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-bold tabular-nums tracking-tight text-foreground">
                      {formatEpisodeCode(flag.season, flag.episode)}
                    </span>
                    {flag.episodeTitle && (
                      <span className="text-xs text-muted-foreground truncate">
                        {flag.episodeTitle}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] font-medium text-muted-foreground">
                      {categoryLabel}
                    </span>
                    <RatingBadge
                      severity={normalizedSeverity}
                      compact
                      showValue
                      ariaLabel={`${categoryLabel}: rated ${severityLabel} (${normalizedSeverity.toFixed(1)}/4)`}
                    />
                  </div>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {flag.note}
                </p>
              </div>
            );
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
