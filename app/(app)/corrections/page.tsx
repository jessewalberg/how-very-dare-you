"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { Check, X, MessageSquare, Filter, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RatingBadge } from "@/components/rating/RatingBadge";
import { Breadcrumbs } from "@/components/navigation/Breadcrumbs";
import { CATEGORIES, SEVERITY_LEVELS, type SeverityLevel } from "@/lib/constants";

type StatusFilter = "accepted" | "rejected" | undefined;

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: undefined, label: "All" },
  { value: "accepted", label: "Accepted" },
  { value: "rejected", label: "Rejected" },
];

const STATUS_CONFIG = {
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

export default function CorrectionsPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(undefined);
  const corrections = useQuery(api.corrections.listPublic, {});
  const filteredCorrections =
    corrections?.filter((correction) =>
      statusFilter ? correction.status === statusFilter : true
    ) ?? corrections;

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Corrections & Updates" },
        ]}
      />

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Corrections &amp; Updates</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Reviewed advisory corrections from the community, along with whether
          each update was accepted or rejected.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Filter className="size-4 text-muted-foreground" />
        <div className="flex gap-1.5">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.label}
              onClick={() => setStatusFilter(opt.value)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-150",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                statusFilter === opt.value
                  ? "bg-foreground text-background"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {filteredCorrections !== undefined && (
          <span className="ml-2 text-xs text-muted-foreground">
            {filteredCorrections.length} result
            {filteredCorrections.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {corrections === undefined && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-lg" />
          ))}
        </div>
      )}

      {filteredCorrections && filteredCorrections.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-muted">
            <MessageSquare className="size-6 text-muted-foreground/50" />
          </div>
          <h2 className="mt-4 text-base font-semibold">No reviewed corrections yet</h2>
          <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">
            {statusFilter
              ? `No ${statusFilter} corrections found.`
              : "Once submissions are reviewed, they will appear here."}
          </p>
        </div>
      )}

      {filteredCorrections && filteredCorrections.length > 0 && (
        <div className="space-y-3">
          {filteredCorrections.map((correction) => {
            const config =
              STATUS_CONFIG[correction.status as keyof typeof STATUS_CONFIG];
            const StatusIcon = config.icon;

            return (
              <div
                key={correction._id}
                className="space-y-3 rounded-xl border bg-card p-4 transition-all duration-200 hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <Link
                      href={`/title/${correction.titlePath}`}
                      className="inline-flex items-center gap-1 text-sm font-semibold hover:underline underline-offset-2"
                    >
                      {correction.titleName}
                      {correction.titleYear ? ` (${correction.titleYear})` : ""}
                      <ArrowUpRight className="size-3.5" />
                    </Link>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">
                        {getCategoryLabel(correction.category)}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <RatingBadge
                          severity={correction.currentSeverity as SeverityLevel}
                          compact
                          ariaLabel={`${getCategoryLabel(correction.category)}: current rating ${SEVERITY_LEVELS[correction.currentSeverity as SeverityLevel].label}`}
                        />
                        <span className="text-[10px] text-muted-foreground">→</span>
                        <RatingBadge
                          severity={correction.suggestedSeverity as SeverityLevel}
                          compact
                          ariaLabel={`${getCategoryLabel(correction.category)}: suggested rating ${SEVERITY_LEVELS[correction.suggestedSeverity as SeverityLevel].label}`}
                        />
                      </div>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "shrink-0 gap-0.5 px-1.5 py-0 text-[10px]",
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
                    Reviewed{" "}
                    {new Date(
                      correction.reviewedAt ?? correction.createdAt
                    ).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
