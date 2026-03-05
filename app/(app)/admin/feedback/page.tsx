"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import Link from "next/link";
import { Inbox, Search, ThumbsDown, ThumbsUp } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ADVISORY_FEEDBACK_REASON_LABELS,
  ADVISORY_FEEDBACK_REASON_TAGS,
  type AdvisoryFeedbackReasonTag,
} from "@/lib/advisoryFeedback";
import { cn } from "@/lib/utils";

type HelpfulFilter = "all" | "helpful" | "not_helpful";
type DateRangeFilter = "7d" | "30d" | "90d" | "all";

export default function AdminFeedbackPage() {
  const [helpfulFilter, setHelpfulFilter] = useState<HelpfulFilter>("all");
  const [dateRange, setDateRange] = useState<DateRangeFilter>("30d");
  const [reasonFilter, setReasonFilter] = useState<
    AdvisoryFeedbackReasonTag | "all"
  >("all");
  const [searchTerm, setSearchTerm] = useState("");
  const selectedDays =
    dateRange === "all" ? undefined : dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : 90;

  const feedback = useQuery(api.feedback.listRecent, {
    limit: 250,
    helpful:
      helpfulFilter === "all"
        ? undefined
        : helpfulFilter === "helpful"
        ? true
        : false,
    reasonTag: reasonFilter === "all" ? undefined : reasonFilter,
    days: selectedDays,
  });
  const summary = useQuery(api.feedback.aggregateByReason, {
    days: selectedDays ?? 365,
  });

  const visibleFeedback = useMemo(() => {
    if (!feedback) return undefined;
    const normalized = searchTerm.trim().toLowerCase();
    if (!normalized) return feedback;
    return feedback.filter((item) => {
      const haystack = `${item.titleName} ${item.titleYear ?? ""} ${item.comment ?? ""}`.toLowerCase();
      return haystack.includes(normalized);
    });
  }, [feedback, searchTerm]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Advisory Feedback</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Weekly quality signal for copy, UX, and model calibration decisions.
        </p>
      </div>

      {!summary ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <Skeleton key={idx} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title={`${summary.days}-day feedback`}
            value={summary.total.toLocaleString("en-US")}
            subtitle="All responses"
          />
          <MetricCard
            title="Helpful rate"
            value={`${Math.round(summary.helpfulRate * 100)}%`}
            subtitle={`${summary.helpfulCount} helpful · ${summary.notHelpfulCount} not helpful`}
          />
          <MetricCard
            title="Comments"
            value={summary.commentedCount.toLocaleString("en-US")}
            subtitle="Responses with text context"
          />
          <MetricCard
            title="Top issue"
            value={summary.topReasons[0]?.label ?? "No issues"}
            subtitle={
              summary.topReasons[0]
                ? `${summary.topReasons[0].count} mentions`
                : "No negative feedback yet"
            }
          />
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/50" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by title or comment..."
                className="pl-9"
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              {[
                { value: "all", label: "All" },
                { value: "helpful", label: "Helpful" },
                { value: "not_helpful", label: "Needs work" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setHelpfulFilter(option.value as HelpfulFilter)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    helpfulFilter === option.value
                      ? "bg-foreground text-background"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <select
              value={dateRange}
              onChange={(event) => setDateRange(event.target.value as DateRangeFilter)}
              className={cn(
                "h-9 rounded-md border border-input bg-background px-3 text-xs",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              )}
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="all">All time</option>
            </select>

            <select
              value={reasonFilter}
              onChange={(event) =>
                setReasonFilter(event.target.value as AdvisoryFeedbackReasonTag | "all")
              }
              className={cn(
                "h-9 rounded-md border border-input bg-background px-3 text-xs",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              )}
            >
              <option value="all">All reasons</option>
              {ADVISORY_FEEDBACK_REASON_TAGS.map((tag) => (
                <option key={tag} value={tag}>
                  {ADVISORY_FEEDBACK_REASON_LABELS[tag]}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">
            Recent submissions
            {visibleFeedback && (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                ({visibleFeedback.length})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {visibleFeedback === undefined && (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, idx) => (
                <Skeleton key={idx} className="h-20 rounded-lg" />
              ))}
            </div>
          )}

          {visibleFeedback && visibleFeedback.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-muted">
                <Inbox className="size-6 text-muted-foreground/50" />
              </div>
              <h2 className="mt-4 text-base font-semibold">No feedback yet</h2>
              <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
                Once parents submit advisory feedback from title pages, it will
                show up here.
              </p>
            </div>
          )}

          {visibleFeedback && visibleFeedback.length > 0 && (
            <div className="space-y-3">
              {visibleFeedback.map((item) => {
                const titlePath = `/title/${item.titleSlug ?? item.titleId}`;
                return (
                  <div
                    key={item._id}
                    className="rounded-xl border border-border/60 bg-card p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="space-y-1">
                        <Link
                          href={titlePath}
                          className="text-sm font-semibold underline-offset-2 hover:underline"
                        >
                          {item.titleName}
                          {item.titleYear ? ` (${item.titleYear})` : ""}
                        </Link>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] px-1.5 py-0",
                              item.helpful
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : "border-amber-200 bg-amber-50 text-amber-700"
                            )}
                          >
                            {item.helpful ? (
                              <ThumbsUp className="mr-1 size-2.5" />
                            ) : (
                              <ThumbsDown className="mr-1 size-2.5" />
                            )}
                            {item.helpful ? "Helpful" : "Needs work"}
                          </Badge>
                          {item.reasonTag && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              {ADVISORY_FEEDBACK_REASON_LABELS[item.reasonTag as AdvisoryFeedbackReasonTag]}
                            </Badge>
                          )}
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            {item.surface === "title_card" ? "Title card" : "Title detail"}
                          </Badge>
                        </div>
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(item.createdAt).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    {item.comment && (
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {item.comment}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {summary && summary.topTitles.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Titles with repeated complaints</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {summary.topTitles.map((title) => (
              <div
                key={title.titleId}
                className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/20 px-3 py-2"
              >
                <Link
                  href={`/title/${title.titleSlug ?? title.titleId}`}
                  className="text-sm font-medium underline-offset-2 hover:underline"
                >
                  {title.titleName}
                  {title.titleYear ? ` (${title.titleYear})` : ""}
                </Link>
                <span className="text-xs text-muted-foreground">
                  {title.count} complaint{title.count === 1 ? "" : "s"}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string;
  subtitle: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold tracking-tight">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  );
}
