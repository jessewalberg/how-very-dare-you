"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  CATEGORIES,
  SEVERITY_LEVELS,
  type CategoryKey,
  type SeverityLevel,
} from "@/lib/constants";
import { RatingBadge } from "@/components/rating/RatingBadge";
import type { Id } from "@/convex/_generated/dataModel";
import type { CategoryRatings } from "@/lib/scoring";

interface CorrectionFormProps {
  titleId: Id<"titles">;
  titleName: string;
  ratings: CategoryRatings;
  onSuccess?: () => void;
}

export function CorrectionForm({
  titleId,
  titleName,
  ratings,
  onSuccess,
}: CorrectionFormProps) {
  const submit = useMutation(api.corrections.submit);

  const [category, setCategory] = useState<CategoryKey | "">("");
  const [suggestedSeverity, setSuggestedSeverity] = useState<string>("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const currentSeverity = category
    ? ratings[category as CategoryKey]
    : undefined;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!category || suggestedSeverity === "" || !reason.trim()) return;

    setLoading(true);
    setError(null);
    try {
      await submit({
        titleId,
        category,
        currentSeverity: currentSeverity ?? 0,
        suggestedSeverity: Number(suggestedSeverity),
        reason: reason.trim(),
      });
      setSubmitted(true);
      onSuccess?.();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center py-8 text-center">
        <div className="flex size-12 items-center justify-center rounded-xl bg-emerald-100">
          <Send className="size-5 text-emerald-600" />
        </div>
        <h3 className="mt-3 text-base font-semibold">Correction Submitted</h3>
        <p className="mt-1 text-sm text-muted-foreground max-w-xs">
          Thank you for helping improve our ratings for &ldquo;{titleName}
          &rdquo;. We&apos;ll review your submission.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h3 className="text-base font-semibold">Submit a Correction</h3>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Suggest a rating change for &ldquo;{titleName}&rdquo;
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Category select */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold">Category</Label>
        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value as CategoryKey);
            setSuggestedSeverity("");
          }}
          required
          className={cn(
            "flex h-9 w-full rounded-md border bg-transparent px-3 text-sm",
            "focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring/40"
          )}
        >
          <option value="">Select a category...</option>
          {CATEGORIES.map((cat) => (
            <option key={cat.key} value={cat.key}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      {/* Current vs Suggested severity */}
      {category && currentSeverity !== undefined && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">
              Current Rating
            </Label>
            <div className="flex h-9 items-center">
              <RatingBadge severity={currentSeverity as SeverityLevel} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">
              Suggested Rating
            </Label>
            <select
              value={suggestedSeverity}
              onChange={(e) => setSuggestedSeverity(e.target.value)}
              required
              className={cn(
                "flex h-9 w-full rounded-md border bg-transparent px-3 text-sm",
                "focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring/40"
              )}
            >
              <option value="">Select...</option>
              {([0, 1, 2, 3, 4] as SeverityLevel[])
                .filter((s) => s !== currentSeverity)
                .map((s) => (
                  <option key={s} value={s}>
                    {s} — {SEVERITY_LEVELS[s].label}
                  </option>
                ))}
            </select>
          </div>
        </div>
      )}

      {/* Reason */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold">Reason</Label>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Explain why this rating should change. Be specific about scenes or content..."
          required
          rows={4}
          className="resize-none text-sm"
        />
        <p className="text-[10px] text-muted-foreground">
          Minimum 20 characters. Cite specific examples from the content.
        </p>
      </div>

      <Button
        type="submit"
        disabled={
          loading ||
          !category ||
          suggestedSeverity === "" ||
          reason.trim().length < 20
        }
        className="w-full gap-1.5"
      >
        {loading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Send className="size-4" />
        )}
        Submit Correction
      </Button>
    </form>
  );
}
