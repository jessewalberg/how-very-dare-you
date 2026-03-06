"use client";

import { useQuery, useMutation } from "convex/react";
import { Check, X, Clock, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RatingBadge } from "@/components/rating/RatingBadge";
import { CATEGORIES } from "@/lib/constants";
import { getSeverityLabel } from "@/lib/scoring";
import type { Id } from "@/convex/_generated/dataModel";

interface CorrectionsListProps {
  titleId: Id<"titles">;
  isAdmin?: boolean;
}

function getCategoryLabel(key: string): string {
  return CATEGORIES.find((c) => c.key === key)?.label ?? key;
}

const STATUS_CONFIG = {
  pending: {
    label: "Pending",
    icon: Clock,
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  accepted: {
    label: "Accepted",
    icon: Check,
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  rejected: {
    label: "Rejected",
    icon: X,
    className: "bg-red-50 text-red-700 border-red-200",
  },
} as const;

export function CorrectionsList({
  titleId,
  isAdmin = false,
}: CorrectionsListProps) {
  const corrections = useQuery(api.corrections.listForTitle, { titleId });
  const updateStatus = useMutation(api.corrections.updateStatus);

  if (corrections === undefined) {
    return (
      <div className="space-y-2" aria-live="polite">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div
            key={idx}
            className="rounded-lg border border-border/50 bg-muted/20 p-3 space-y-2"
          >
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
          </div>
        ))}
      </div>
    );
  }
  if (corrections.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <MessageSquare className="size-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">
          Community Corrections
          <span className="ml-1.5 text-muted-foreground font-normal">
            ({corrections.length})
          </span>
        </h3>
      </div>

      <div className="space-y-2">
        {corrections.map((correction: NonNullable<typeof corrections>[number]) => {
          const config =
            STATUS_CONFIG[
              correction.status as keyof typeof STATUS_CONFIG
            ];
          const StatusIcon = config.icon;
          const currentSeverity = Number.isFinite(correction.currentSeverity)
            ? correction.currentSeverity
            : 0;
          const suggestedSeverity = Number.isFinite(correction.suggestedSeverity)
            ? correction.suggestedSeverity
            : 0;
          const current = Math.min(4, Math.max(0, currentSeverity));
          const suggested = Math.min(4, Math.max(0, suggestedSeverity));
          const categoryLabel = getCategoryLabel(correction.category);

          return (
            <div
              key={correction._id}
              className="rounded-lg border border-border/50 bg-muted/20 p-3 space-y-2"
            >
              {/* Header */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-semibold truncate">
                    {categoryLabel}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <RatingBadge
                      severity={current}
                      compact
                      showValue
                      ariaLabel={`${categoryLabel}: current rating ${getSeverityLabel(current)} (${current.toFixed(1)}/4)`}
                    />
                    <span className="text-[10px] text-muted-foreground">→</span>
                    <RatingBadge
                      severity={suggested}
                      compact
                      showValue
                      ariaLabel={`${categoryLabel}: suggested rating ${getSeverityLabel(suggested)} (${suggested.toFixed(1)}/4)`}
                    />
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] px-1.5 py-0 gap-0.5 shrink-0",
                    config.className
                  )}
                >
                  <StatusIcon className="size-2.5" />
                  {config.label}
                </Badge>
              </div>

              {/* Reason */}
              <p className="text-xs leading-relaxed text-muted-foreground">
                {correction.reason}
              </p>

              {/* Timestamp */}
              <p className="text-[10px] text-muted-foreground/50">
                {new Date(correction.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
                {correction.reviewedAt && (
                  <span>
                    {" · Reviewed "}
                    {new Date(correction.reviewedAt).toLocaleDateString(
                      "en-US",
                      { year: "numeric", month: "short", day: "numeric" }
                    )}
                  </span>
                )}
              </p>

              {/* Admin actions */}
              {isAdmin && correction.status === "pending" && (
                <div className="flex gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1 text-emerald-700 hover:bg-emerald-50"
                    onClick={() =>
                      updateStatus({
                        correctionId: correction._id,
                        status: "accepted",
                      })
                    }
                  >
                    <Check className="size-3" />
                    Accept
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1 text-red-700 hover:bg-red-50"
                    onClick={() =>
                      updateStatus({
                        correctionId: correction._id,
                        status: "rejected",
                      })
                    }
                  >
                    <X className="size-3" />
                    Reject
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
