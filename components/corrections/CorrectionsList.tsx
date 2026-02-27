"use client";

import { useQuery, useMutation } from "convex/react";
import { Check, X, Clock, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RatingBadge } from "@/components/rating/RatingBadge";
import { CATEGORIES, type SeverityLevel } from "@/lib/constants";
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

  if (corrections === undefined) return null;
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

          return (
            <div
              key={correction._id}
              className="rounded-lg border border-border/50 bg-muted/20 p-3 space-y-2"
            >
              {/* Header */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-semibold truncate">
                    {getCategoryLabel(correction.category)}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <RatingBadge
                      severity={correction.currentSeverity as SeverityLevel}
                      compact
                    />
                    <span className="text-[10px] text-muted-foreground">→</span>
                    <RatingBadge
                      severity={correction.suggestedSeverity as SeverityLevel}
                      compact
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
