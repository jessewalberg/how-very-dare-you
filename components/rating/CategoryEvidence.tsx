"use client";

import { Quote } from "lucide-react";
import { cn } from "@/lib/utils";
import { CATEGORIES } from "@/lib/constants";

interface CategoryEvidenceEntry {
  explanation: string;
  quote?: string;
}

interface CategoryEvidenceProps {
  evidence: Partial<Record<string, CategoryEvidenceEntry>>;
}

export function CategoryEvidence({ evidence }: CategoryEvidenceProps) {
  const entries = Object.entries(evidence).filter(
    ([key, entry]) =>
      entry &&
      entry.explanation &&
      CATEGORIES.some((c) => c.key === key)
  ) as [string, CategoryEvidenceEntry][];

  if (entries.length === 0) return null;

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Why These Ratings
      </p>
      <div className="space-y-2">
        {entries.map(([key, entry]) => {
          const category = CATEGORIES.find((c) => c.key === key);
          if (!category) return null;
          const Icon = category.icon;

          return (
            <div
              key={key}
              className={cn(
                "rounded-lg border border-border/50 bg-muted/20",
                "px-3.5 py-2.5 space-y-1.5"
              )}
            >
              <div className="flex items-center gap-2">
                <Icon
                  className="size-3.5 text-muted-foreground shrink-0"
                  strokeWidth={1.8}
                />
                <span className="text-xs font-medium text-foreground">
                  {category.label}
                </span>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {entry.explanation}
              </p>
              {entry.quote && (
                <blockquote className="flex gap-2 rounded-md bg-muted/40 border-l-2 border-muted-foreground/20 px-3 py-2">
                  <Quote className="size-3 shrink-0 mt-0.5 text-muted-foreground/50" />
                  <p className="text-xs italic leading-relaxed text-muted-foreground/80">
                    {entry.quote}
                  </p>
                </blockquote>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
