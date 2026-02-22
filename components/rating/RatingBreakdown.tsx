"use client";

import { cn } from "@/lib/utils";
import { CATEGORIES, type CategoryKey } from "@/lib/constants";
import {
  calculateCompositeScore,
  isNoFlags,
  type CategoryRatings,
  type CategoryWeights,
} from "@/lib/scoring";
import { RatingBadge } from "./RatingBadge";
import { NoFlagsBadge } from "./NoFlagsBadge";
import { CompositeScore } from "./CompositeScore";

interface RatingBreakdownProps {
  ratings: CategoryRatings;
  weights?: CategoryWeights;
  notes?: string;
}

export function RatingBreakdown({
  ratings,
  weights,
  notes,
}: RatingBreakdownProps) {
  const composite = calculateCompositeScore(ratings, weights);
  const noFlags = isNoFlags(ratings);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Content Advisory
          </h3>
          {noFlags && (
            <div className="mt-2">
              <NoFlagsBadge />
            </div>
          )}
        </div>
        {!noFlags && <CompositeScore score={composite} />}
      </div>

      {/* Category rows */}
      <div className="space-y-0.5">
        {CATEGORIES.map((category, index) => {
          const severity = ratings[category.key as CategoryKey] as
            | 0
            | 1
            | 2
            | 3
            | 4;
          const isNone = severity === 0;
          const Icon = category.icon;

          return (
            <div
              key={category.key}
              className={cn(
                "group flex items-center justify-between gap-3",
                "rounded-lg px-3 py-2",
                "transition-all duration-200",
                isNone
                  ? "opacity-45 hover:opacity-70"
                  : "hover:bg-muted/50"
              )}
              style={{
                animationDelay: `${index * 50}ms`,
              }}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon
                  className={cn(
                    "size-4 shrink-0 text-muted-foreground",
                    "transition-colors duration-200",
                    !isNone && "group-hover:text-foreground"
                  )}
                  strokeWidth={1.8}
                />
                <span
                  className={cn(
                    "text-sm truncate",
                    isNone
                      ? "text-muted-foreground"
                      : "text-foreground font-medium"
                  )}
                >
                  {category.label}
                </span>
              </div>
              <RatingBadge severity={severity} />
            </div>
          );
        })}
      </div>

      {/* Notes */}
      {notes && (
        <div
          className={cn(
            "rounded-lg border border-border/50 bg-muted/30",
            "px-4 py-3"
          )}
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
            AI Analysis
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {notes}
          </p>
        </div>
      )}
    </div>
  );
}
