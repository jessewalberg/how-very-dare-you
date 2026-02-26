"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import Link from "next/link";
import { Check, X, Clock, MessageSquare, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RatingBadge } from "@/components/rating/RatingBadge";
import { CATEGORIES, type SeverityLevel } from "@/lib/constants";

type StatusFilter = "pending" | "accepted" | "rejected" | undefined;

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: undefined, label: "All" },
  { value: "pending", label: "Pending" },
  { value: "accepted", label: "Accepted" },
  { value: "rejected", label: "Rejected" },
];

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

function getCategoryLabel(key: string): string {
  return CATEGORIES.find((c) => c.key === key)?.label ?? key;
}

export default function AdminCorrectionsPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const corrections = useQuery(api.corrections.listAll, {
    status: statusFilter,
  });
  const updateStatus = useMutation(api.corrections.updateStatus);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Corrections Review
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Review and manage user-submitted rating corrections.
        </p>
      </div>

      {/* Status filter */}
      <div className="flex items-center gap-2">
        <Filter className="size-4 text-muted-foreground" />
        <div className="flex gap-1.5">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.label}
              onClick={() => setStatusFilter(opt.value)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-150",
                statusFilter === opt.value
                  ? "bg-foreground text-background"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {corrections !== undefined && (
          <span className="text-xs text-muted-foreground ml-2">
            {corrections.length} result{corrections.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Loading */}
      {corrections === undefined && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-lg" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {corrections && corrections.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-muted">
            <MessageSquare className="size-6 text-muted-foreground/50" />
          </div>
          <h3 className="mt-4 text-base font-semibold">No corrections</h3>
          <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">
            {statusFilter
              ? `No ${statusFilter} corrections found.`
              : "No corrections have been submitted yet."}
          </p>
        </div>
      )}

      {/* Corrections list */}
      {corrections && corrections.length > 0 && (
        <div className="space-y-3">
          {corrections.map((correction) => {
            const config =
              STATUS_CONFIG[correction.status as keyof typeof STATUS_CONFIG];
            const StatusIcon = config.icon;

            return (
              <div
                key={correction._id}
                className="rounded-xl border bg-card p-4 space-y-3 transition-all duration-200 hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <Link
                      href={`/title/${correction.titleId}`}
                      className="text-sm font-semibold hover:underline underline-offset-2"
                    >
                      View Title →
                    </Link>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium text-muted-foreground">
                        {getCategoryLabel(correction.category)}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <RatingBadge
                          severity={
                            correction.currentSeverity as SeverityLevel
                          }
                          compact
                        />
                        <span className="text-[10px] text-muted-foreground">
                          →
                        </span>
                        <RatingBadge
                          severity={
                            correction.suggestedSeverity as SeverityLevel
                          }
                          compact
                        />
                      </div>
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

                <p className="text-sm leading-relaxed text-muted-foreground">
                  {correction.reason}
                </p>

                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-muted-foreground/50">
                    Submitted{" "}
                    {new Date(correction.createdAt).toLocaleDateString(
                      "en-US",
                      { year: "numeric", month: "short", day: "numeric" }
                    )}
                  </p>

                  {correction.status === "pending" && (
                    <div className="flex gap-2">
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
