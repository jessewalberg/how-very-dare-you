"use client";

import { cn } from "@/lib/utils";
import { CATEGORIES, SEVERITY_LEVELS, type CategoryKey } from "@/lib/constants";
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

const culturalCategories = CATEGORIES.filter((c) => c.group === "cultural");
const healthCategories = CATEGORIES.filter((c) => c.group === "health");

function CategoryRow({
  category,
  severity,
  pending,
  index,
}: {
  category: (typeof CATEGORIES)[number];
  severity: 0 | 1 | 2 | 3 | 4;
  pending?: boolean;
  index: number;
}) {
  const isNone = severity === 0 && !pending;
  const Icon = category.icon;
  const severityLabel = pending ? "Pending" : SEVERITY_LEVELS[severity].label;

  return (
    <div
      role="listitem"
      aria-label={`${category.label}: rated ${severityLabel}`}
      className={cn(
        "group flex items-center justify-between gap-3",
        "rounded-lg px-3 py-2",
        "transition-colors duration-200",
        "animate-fade-in-up",
        isNone ? "hover:opacity-70" : "hover:bg-muted/50"
      )}
      style={{
        animationDelay: `${index * 50}ms`,
        "--fade-end-opacity": isNone ? "0.45" : "1",
      } as React.CSSProperties}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <Icon
          className={cn(
            "size-4 shrink-0 text-muted-foreground",
            "transition-colors duration-200",
            !isNone && !pending && "group-hover:text-foreground"
          )}
          strokeWidth={1.8}
        />
        <span
          className={cn(
            "text-sm truncate",
            isNone || pending
              ? "text-muted-foreground"
              : "text-foreground font-medium"
          )}
        >
          {category.label}
        </span>
      </div>
      {pending ? (
        <span className="text-xs text-muted-foreground/60 italic">
          Pending analysis
        </span>
      ) : (
        <RatingBadge severity={severity} />
      )}
    </div>
  );
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

      {/* Cultural Themes */}
      <div>
        <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Cultural Themes
        </p>
        <div className="space-y-0.5" role="list" aria-label="Cultural theme categories">
          {culturalCategories.map((category, index) => {
            const severity = ratings[category.key as CategoryKey] as
              | 0 | 1 | 2 | 3 | 4;
            return (
              <CategoryRow
                key={category.key}
                category={category}
                severity={severity}
                index={index}
              />
            );
          })}
        </div>
      </div>

      {/* Developmental Health */}
      <div className="border-t border-border/40 pt-4">
        <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Developmental Health
        </p>
        <div className="space-y-0.5" role="list" aria-label="Developmental health categories">
          {healthCategories.map((category, index) => {
            const rawValue = ratings[category.key as keyof CategoryRatings];
            const isPending = rawValue === undefined;
            const severity = (isPending ? 0 : rawValue) as 0 | 1 | 2 | 3 | 4;
            return (
              <CategoryRow
                key={category.key}
                category={category}
                severity={severity}
                pending={isPending}
                index={culturalCategories.length + index}
              />
            );
          })}
        </div>
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
