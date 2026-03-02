"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { SEVERITY_LEVELS, type SeverityLevel } from "@/lib/constants";
import { getSeverityLabel } from "@/lib/scoring";

interface CompositeScoreProps {
  score: number;
  compact?: boolean;
}

const SEVERITY_RING: Record<SeverityLevel, string> = {
  0: "ring-emerald-500/20",
  1: "ring-lime-500/20",
  2: "ring-amber-500/20",
  3: "ring-orange-500/20",
  4: "ring-red-500/20",
};

export function CompositeScore({
  score,
  compact = false,
}: CompositeScoreProps) {
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    if (compact) {
      return;
    }

    if (typeof window === "undefined" || score <= 0) {
      return;
    }

    const start = performance.now();
    const durationMs = 500;
    const startScore = 0;
    const delta = score - startScore;
    let raf = 0;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      setAnimatedScore(startScore + delta * progress);
      if (progress < 1) {
        raf = window.requestAnimationFrame(tick);
      }
    };

    raf = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(raf);
    };
  }, [compact, score]);

  const clamped = Math.round(
    Math.min(4, Math.max(0, score))
  ) as SeverityLevel;
  const config = SEVERITY_LEVELS[clamped];
  const label = getSeverityLabel(score);
  const renderScore = compact ? score : score <= 0 ? 0 : animatedScore;
  const displayScore = renderScore.toFixed(1);
  const scoreOutOfFour = `${displayScore}/4`;

  if (compact) {
    return (
      <div
        data-testid="composite-score-compact"
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md px-2 py-1",
          "ring-1 ring-inset",
          config.bg,
          SEVERITY_RING[clamped]
        )}
      >
        <span
          data-testid="composite-score-value-compact"
          className={cn(
            "text-sm font-bold tabular-nums tracking-tight",
            config.color
          )}
        >
          {scoreOutOfFour}
        </span>
        <span
          className={cn(
            "text-[10px] font-medium uppercase tracking-wider opacity-80",
            config.color
          )}
        >
          {label}
        </span>
      </div>
    );
  }

  return (
    <div
      data-testid="composite-score"
      className="flex flex-col items-center gap-1"
      role="status"
      aria-label={`Overall content advisory score: ${score.toFixed(1)} out of 4, ${label}`}
    >
      <div
        className={cn(
          "relative flex flex-col items-center justify-center",
          "size-20 rounded-2xl",
          "ring-1 ring-inset",
          config.bg,
          SEVERITY_RING[clamped],
          "transition-all duration-300",
          "hover:scale-[1.03] hover:shadow-md"
        )}
      >
        <span
          data-testid="composite-score-value"
          className={cn(
            "text-2xl font-extrabold tabular-nums leading-none tracking-tighter",
            config.color
          )}
        >
          {scoreOutOfFour}
        </span>
        <span
          className={cn(
            "mt-0.5 text-[10px] font-semibold uppercase tracking-wider",
            config.color,
            "opacity-75"
          )}
        >
          {label}
        </span>
      </div>
      <span className="text-[10px] font-medium text-muted-foreground tracking-wide uppercase">
        Overall Score (0-4)
      </span>
      <span className="text-[10px] text-muted-foreground/70">
        0 = no concerns, 4 = highest concern
      </span>
    </div>
  );
}
