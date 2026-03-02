"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useMutation } from "convex/react";
import { RotateCcw, Lock, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/convex/_generated/api";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { CATEGORIES, DEFAULT_WEIGHTS, type CategoryKey } from "@/lib/constants";
import { calculateCompositeScore, type CategoryRatings } from "@/lib/scoring";
import { CompositeScore } from "@/components/rating/CompositeScore";
import {
  normalizeCategoryWeights,
  serializeCategoryWeights,
  areCategoryWeightsEqual,
} from "@/lib/userWeights";
import posthog from "posthog-js";

// Sample title for live preview
const SAMPLE_RATINGS: CategoryRatings = {
  lgbtq: 2,
  climate: 1,
  racialIdentity: 3,
  genderRoles: 2,
  antiAuthority: 1,
  religious: 0,
  political: 2,
  sexuality: 1,
  overstimulation: 2,
};

const culturalCategories = CATEGORIES.filter((c) => c.group === "cultural");
const healthCategories = CATEGORIES.filter((c) => c.group === "health");

type Weights = Record<CategoryKey, number>;

interface WeightSlidersProps {
  isPaid: boolean;
  currentWeights?: Weights;
}

function SliderRow({
  category,
  value,
  onChange,
  disabled,
}: {
  category: (typeof CATEGORIES)[number];
  value: number;
  onChange: (key: CategoryKey, value: number[]) => void;
  disabled: boolean;
}) {
  const Icon = category.icon;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon
            className="size-4 text-muted-foreground"
            strokeWidth={1.8}
          />
          <span className="text-sm font-medium">{category.label}</span>
        </div>
        <span
          className={cn(
            "text-sm font-bold tabular-nums w-8 text-right",
            value === 0
              ? "text-muted-foreground/50"
              : "text-foreground"
          )}
        >
          {value}
        </span>
      </div>
      <Slider
        data-testid={`weight-slider-${category.key}`}
        aria-label={`${category.label} weight`}
        value={[value]}
        onValueChange={(v) => onChange(category.key, v)}
        min={0}
        max={10}
        step={1}
        disabled={disabled}
      />
    </div>
  );
}

export function WeightSliders({ isPaid, currentWeights }: WeightSlidersProps) {
  const serverWeights = useMemo(
    () => normalizeCategoryWeights(currentWeights),
    [currentWeights]
  );
  const [weights, setWeights] = useState<Weights>(serverWeights);
  const lastSyncedServerSnapshotRef = useRef(
    serializeCategoryWeights(serverWeights)
  );
  const [saving, setSaving] = useState(false);
  const updateWeights = useMutation(api.users.updateCategoryWeights);

  // Sync from server only when the server values actually change.
  useEffect(() => {
    const nextSnapshot = serializeCategoryWeights(serverWeights);
    if (nextSnapshot === lastSyncedServerSnapshotRef.current) {
      return;
    }

    lastSyncedServerSnapshotRef.current = nextSnapshot;
    setWeights(serverWeights);
  }, [serverWeights]);

  // Debounced save
  useEffect(() => {
    if (!isPaid) return;

    // Don't save if weights haven't changed from the latest server value.
    if (areCategoryWeightsEqual(weights, serverWeights)) return;

    const timer = setTimeout(async () => {
      setSaving(true);
      try {
        await updateWeights({ weights });
        posthog.capture("category_weights_saved", {
          weights,
        });
      } catch {
        // Silently handle - user will see stale weights
      } finally {
        setSaving(false);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [weights, isPaid, serverWeights, updateWeights]);

  const handleChange = useCallback((key: CategoryKey, value: number[]) => {
    setWeights((prev) => ({ ...prev, [key]: value[0] }));
  }, []);

  const resetToDefaults = useCallback(() => {
    setWeights({ ...DEFAULT_WEIGHTS });
  }, []);

  const previewScore = calculateCompositeScore(SAMPLE_RATINGS, weights);
  const defaultScore = calculateCompositeScore(SAMPLE_RATINGS, DEFAULT_WEIGHTS);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight">
            Category Weights
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Set how much each category affects your composite score. Set to 0 to
            ignore a category entirely.
          </p>
        </div>
        <span
          aria-live="polite"
          className={cn(
            "min-w-[64px] text-right text-xs text-muted-foreground transition-opacity",
            saving ? "animate-pulse opacity-100" : "opacity-0"
          )}
        >
          Saving...
        </span>
      </div>

      {/* Locked overlay for free users */}
      {!isPaid && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <Lock className="size-5 shrink-0 text-amber-600" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800">
              Premium Feature
            </p>
            <p className="text-xs text-amber-700/80">
              Upgrade to customize how categories affect your score.
            </p>
          </div>
          <Button size="sm" className="shrink-0 gap-1.5" asChild>
            <a href="/settings#subscription">
              <Crown className="size-3.5" />
              Upgrade
            </a>
          </Button>
        </div>
      )}

      {/* Sliders */}
      <div
        className={cn(
          "space-y-5",
          !isPaid && "opacity-50 pointer-events-none select-none"
        )}
      >
        {/* Cultural Themes */}
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Cultural Themes
        </p>
        {culturalCategories.map((category) => (
          <SliderRow
            key={category.key}
            category={category}
            value={weights[category.key]}
            onChange={handleChange}
            disabled={!isPaid}
          />
        ))}

        {/* Developmental Health */}
        <div className="border-t border-border/40 pt-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-5">
            Developmental Health
          </p>
          {healthCategories.map((category) => (
            <SliderRow
              key={category.key}
              category={category}
              value={weights[category.key]}
              onChange={handleChange}
              disabled={!isPaid}
            />
          ))}
        </div>

        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={resetToDefaults}
          disabled={!isPaid}
        >
          <RotateCcw className="size-3.5" />
          Reset to Defaults
        </Button>
      </div>

      {/* Live preview */}
      <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Live Preview
        </p>
        <div className="flex items-center gap-6">
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground mb-1">
              Your Score
            </p>
            <div data-testid="weights-preview-your-score">
              <CompositeScore score={previewScore} compact />
            </div>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground mb-1">Default</p>
            <div data-testid="weights-preview-default-score">
              <CompositeScore score={defaultScore} compact />
            </div>
          </div>
          <div className="min-h-[2.25rem] flex-1 text-xs text-muted-foreground">
            Sample title: &ldquo;Elemental&rdquo; — your weights{" "}
            {previewScore < defaultScore
              ? "lower"
              : previewScore > defaultScore
                ? "raise"
                : "don't change"}{" "}
            the score
            {previewScore !== defaultScore && (
              <span className="font-medium">
                {" "}
                by {Math.abs(previewScore - defaultScore).toFixed(1)} points
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
