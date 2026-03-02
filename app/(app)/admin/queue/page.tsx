"use client";

import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Filter,
  ListOrdered,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Trash2,
  ExternalLink,
  Zap,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { RatingBreakdown } from "@/components/rating/RatingBreakdown";
import { EpisodeDetailSheet } from "@/components/title/EpisodeDetailSheet";
import type { CategoryRatings } from "@/lib/scoring";
import { cn } from "@/lib/utils";
import { resolveAdminQueueSidebarTarget } from "@/lib/sidebarBehavior";

type StatusFilter = "queued" | "processing" | "completed" | "failed" | undefined;
type OverstimStatusFilter =
  | "queued"
  | "processing"
  | "completed"
  | "skipped"
  | "failed"
  | undefined;

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: undefined, label: "All" },
  { value: "queued", label: "Queued" },
  { value: "processing", label: "Processing" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
];

const OVERSTIM_STATUS_OPTIONS: { value: OverstimStatusFilter; label: string }[] = [
  { value: undefined, label: "All" },
  { value: "queued", label: "Queued" },
  { value: "processing", label: "Processing" },
  { value: "completed", label: "Completed" },
  { value: "skipped", label: "Skipped" },
  { value: "failed", label: "Failed" },
];

const STATUS_COLORS: Record<string, string> = {
  queued: "bg-slate-100 text-slate-700 border-slate-200",
  processing: "bg-blue-50 text-blue-700 border-blue-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  skipped: "bg-amber-50 text-amber-700 border-amber-200",
  failed: "bg-red-50 text-red-700 border-red-200",
};

const SOURCE_LABELS: Record<string, string> = {
  batch: "Batch",
  user_request: "User",
  admin_rerate: "Admin Re-rate",
};

type QualitySeverityFilter = "all" | "warning" | "critical";

interface QualityReviewItem {
  key: string;
  scope: "title" | "episode";
  severity: "warning" | "critical";
  reasons: string[];
  confidence?: number;
  subtitleStatus?: string;
  ratedAt?: number;
  titleId?: string;
  episodeId?: string;
  tmdbId?: number;
  displayTitle: string;
}

export default function AdminQueuePage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(undefined);
  const [overstimStatusFilter, setOverstimStatusFilter] =
    useState<OverstimStatusFilter>(undefined);
  const [qualitySeverityFilter, setQualitySeverityFilter] =
    useState<QualitySeverityFilter>("all");
  const [acting, setActing] = useState<string | null>(null);
  const items = useQuery(api.admin.getQueueItems, { status: statusFilter });
  const overstimJobs = useQuery(api.admin.getOverstimulationJobs, {
    status: overstimStatusFilter,
    limit: 100,
  });
  const qualityItems = useQuery(api.admin.getQualityReviewItems, {
    severity:
      qualitySeverityFilter === "all" ? undefined : qualitySeverityFilter,
  }) as QualityReviewItem[] | undefined;
  const forceComplete = useMutation(api.admin.forceCompleteQueueItem);
  const retryItem = useAction(api.admin.retryQueueItem);
  const retryOverstimJob = useAction(api.admin.retryOverstimulationJob);
  const deleteItem = useMutation(api.admin.deleteQueueItem);
  const reRateTitle = useAction(api.admin.reRateTitle);
  const reRateEpisode = useAction(api.admin.reRateEpisode);
  const addManualSubtitleArchive = useAction(api.admin.addManualSubtitleArchive);
  const [manualSubtitleIssue, setManualSubtitleIssue] =
    useState<QualityReviewItem | null>(null);
  const [manualTranscript, setManualTranscript] = useState("");
  const [savingManualSubtitles, setSavingManualSubtitles] = useState(false);
  const [selectedEpisode, setSelectedEpisode] = useState<{
    episodeId: Id<"episodes">;
    showTitle: string;
  } | null>(null);
  const [selectedQueueTitle, setSelectedQueueTitle] = useState<{
    titleId: Id<"titles">;
    label: string;
  } | null>(null);

  async function handleAction(
    action: () => Promise<unknown>,
    itemId: string
  ) {
    setActing(itemId);
    try {
      await action();
      toast.success("Action completed");
    } catch (e) {
      console.error("Queue action failed:", e);
      toast.error("Action failed", {
        description: e instanceof Error ? e.message : "Unknown error",
      });
    } finally {
      setActing(null);
    }
  }

  async function handleQualityRerate(
    issue: QualityReviewItem
  ) {
    setActing(issue.key);
    try {
      if (issue.scope === "title" && issue.titleId) {
        await reRateTitle({ titleId: issue.titleId as Id<"titles"> });
      } else if (issue.scope === "episode" && issue.episodeId) {
        await reRateEpisode({ episodeId: issue.episodeId as Id<"episodes"> });
      } else {
        throw new Error("Missing target id for rerate");
      }
      toast.success("Re-rating started");
    } catch (e) {
      console.error("Quality re-rate failed:", e);
      toast.error("Re-rate failed", {
        description: e instanceof Error ? e.message : "Unknown error",
      });
    } finally {
      setActing(null);
    }
  }

  async function handleManualSubtitleSave(rerate: boolean) {
    if (!manualSubtitleIssue) return;

    const transcript = manualTranscript.trim();
    if (transcript.length < 20) {
      toast.error("Transcript too short", {
        description: "Paste a meaningful subtitle transcript.",
      });
      return;
    }

    const target =
      manualSubtitleIssue.scope === "title"
        ? manualSubtitleIssue.titleId
          ? {
              scope: "title" as const,
              titleId: manualSubtitleIssue.titleId as Id<"titles">,
            }
          : null
        : manualSubtitleIssue.episodeId
          ? {
              scope: "episode" as const,
              episodeId: manualSubtitleIssue.episodeId as Id<"episodes">,
            }
          : null;

    if (!target) {
      toast.error("Could not determine target for subtitle upload");
      return;
    }

    setSavingManualSubtitles(true);
    try {
      await addManualSubtitleArchive({
        target,
        transcript,
        rerate,
      });
      toast.success(
        rerate
          ? "Subtitles saved and re-rate started"
          : "Subtitles saved to archive"
      );
      setManualSubtitleIssue(null);
      setManualTranscript("");
    } catch (e) {
      console.error("Manual subtitle save failed:", e);
      toast.error("Failed to save subtitles", {
        description: e instanceof Error ? e.message : "Unknown error",
      });
    } finally {
      setSavingManualSubtitles(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Queue Monitor</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Real-time view of the rating processing queue.
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
        {items !== undefined && (
          <span className="text-xs text-muted-foreground ml-2">
            {items.length} item{items.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Quality review */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold flex items-center gap-1.5">
              <AlertTriangle className="size-4 text-amber-600" />
              Rating Quality Review
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Auto-flagged ratings where confidence is low or subtitle/script
              evidence was weak.
            </p>
          </div>
          {qualityItems !== undefined && (
            <span className="text-xs text-muted-foreground">
              {qualityItems.length} item{qualityItems.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {(["all", "warning", "critical"] as const).map((value) => (
            <button
              key={value}
              onClick={() => setQualitySeverityFilter(value)}
              className={cn(
                "rounded-md px-2 py-1 text-[11px] font-medium capitalize transition-colors",
                qualitySeverityFilter === value
                  ? "bg-foreground text-background"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {value}
            </button>
          ))}
        </div>

        {qualityItems === undefined && (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        )}

        {qualityItems && qualityItems.length === 0 && (
          <p className="text-xs text-muted-foreground">
            No flagged ratings for this filter.
          </p>
        )}

        {qualityItems && qualityItems.length > 0 && (
          <div className="space-y-2">
            {qualityItems.map((issue) => {
              const issueIsActing = acting === issue.key;
              const severityClass =
                issue.severity === "critical"
                  ? "bg-red-50 text-red-700 border-red-200"
                  : "bg-amber-50 text-amber-700 border-amber-200";
              return (
                <div
                  key={issue.key}
                  className="rounded-lg border bg-muted/10 p-3 space-y-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={cn("text-[10px] px-1.5 py-0", severityClass)}
                        >
                          {issue.severity}
                        </Badge>
                        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          {issue.scope}
                        </span>
                      </div>
                      <p className="text-sm font-medium truncate mt-1">
                        {issue.displayTitle}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {issue.reasons.join(" ")}
                      </p>
                      <p className="text-[10px] text-muted-foreground/70 mt-1">
                        {issue.confidence != null &&
                          `Confidence ${Math.round(issue.confidence * 100)}%`}
                        {issue.confidence != null &&
                          issue.subtitleStatus &&
                          " · "}
                        {issue.subtitleStatus &&
                          `Subtitle ${issue.subtitleStatus}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {issue.titleId && (
                        <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-[11px]">
                          <Link href={`/title/${issue.titleId}`}>Open</Link>
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-[11px] gap-1"
                        disabled={issueIsActing}
                        onClick={() => void handleQualityRerate(issue)}
                      >
                        <RefreshCw
                          className={cn("size-3", issueIsActing && "animate-spin")}
                        />
                        Re-rate
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-[11px]"
                        disabled={issueIsActing}
                        onClick={() => {
                          setManualSubtitleIssue(issue);
                          setManualTranscript("");
                        }}
                      >
                        Add subtitles
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Overstimulation queue */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold flex items-center gap-1.5">
              <Zap className="size-4 text-blue-600" />
              Overstimulation Jobs
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Background video-analysis jobs. Failures include service
              `request_id` when available.
            </p>
          </div>
          {overstimJobs !== undefined && (
            <span className="text-xs text-muted-foreground">
              {overstimJobs.length} job{overstimJobs.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {OVERSTIM_STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.label}
              onClick={() => setOverstimStatusFilter(opt.value)}
              className={cn(
                "rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
                overstimStatusFilter === opt.value
                  ? "bg-foreground text-background"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {overstimJobs === undefined && (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        )}

        {overstimJobs && overstimJobs.length === 0 && (
          <p className="text-xs text-muted-foreground">
            No overstimulation jobs for this filter.
          </p>
        )}

        {overstimJobs && overstimJobs.length > 0 && (
          <div className="space-y-2">
            {overstimJobs.map((job) => {
              const jobActionKey = `overstim:${job._id}`;
              const isJobActing = acting === jobActionKey;
              const episodeCode =
                job.seasonNumber != null && job.episodeNumber != null
                  ? `S${String(job.seasonNumber).padStart(2, "0")}E${String(
                    job.episodeNumber
                  ).padStart(2, "0")}`
                  : undefined;
              const targetLabel =
                job.targetType === "episode"
                  ? `episode${episodeCode ? ` ${episodeCode}` : ""}`
                  : "title";
              const displayName =
                job.targetType === "episode" && job.episodeName
                  ? `${job.titleName}${job.titleYear ? ` (${job.titleYear})` : ""} · ${job.episodeName}`
                  : `${job.titleName}${job.titleYear ? ` (${job.titleYear})` : ""}`;

              return (
                <div
                  key={job._id}
                  className="rounded-lg border bg-muted/10 p-3 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {displayName}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {targetLabel} · tmdb {job.tmdbId ?? "unknown"} · attempts{" "}
                        {job.attempts ?? 0}
                        {job.force ? " · force" : ""}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn("text-[10px] px-1.5 py-0", STATUS_COLORS[job.status])}
                    >
                      {job.status}
                    </Badge>
                  </div>
                  {job.lastError && (
                    <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-2 py-1">
                      {job.lastError}
                    </p>
                  )}
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] text-muted-foreground">
                      Updated{" "}
                      {new Date(job.updatedAt).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                    {job.status === "failed" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-[11px] gap-1"
                        disabled={isJobActing}
                        onClick={() =>
                          void handleAction(
                            () =>
                              retryOverstimJob({
                                jobId: job._id as Id<"overstimulationQueue">,
                              }),
                            jobActionKey
                          )
                        }
                      >
                        <RefreshCw
                          className={cn("size-3", isJobActing && "animate-spin")}
                        />
                        Retry
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Loading */}
      {items === undefined && (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      )}

      {/* Empty */}
      {items && items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-muted">
            <ListOrdered className="size-6 text-muted-foreground/50" />
          </div>
          <h3 className="mt-4 text-base font-semibold">Queue empty</h3>
          <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">
            {statusFilter
              ? `No ${statusFilter} items found.`
              : "No items in the queue."}
          </p>
        </div>
      )}

      {/* Queue items */}
      <div className="space-y-1">
        <h2 className="text-sm font-semibold">Queue Items</h2>
        <p className="text-xs text-muted-foreground">
          Processing jobs for ratings. Click a row to open details in the sidebar.
        </p>
      </div>
      {items && items.length > 0 && (
        <div className="space-y-2">
          {/* Header */}
          <div className="hidden sm:grid grid-cols-[1fr_80px_100px_80px_80px_80px_120px_auto] gap-3 px-3 py-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            <span>Title</span>
            <span>Type</span>
            <span>Source</span>
            <span>Status</span>
            <span>Attempts</span>
            <span>Cost</span>
            <span>Created</span>
            <span>Actions</span>
          </div>

          {items.map((item: NonNullable<typeof items>[number]) => {
            const isActing = acting === item._id;
            const sidebarTarget = resolveAdminQueueSidebarTarget({
              type: item.type,
              episodeId: item.episodeId,
              titleId: item.titleId,
            });
            const canOpen = sidebarTarget !== null;
            return (
            <div
              key={item._id}
              className={cn(
                "rounded-lg border bg-card p-3 transition-all hover:shadow-sm",
                canOpen && "cursor-pointer hover:border-foreground/20",
                "sm:grid sm:grid-cols-[1fr_80px_100px_80px_80px_80px_120px_auto] sm:items-center sm:gap-3"
              )}
              role={canOpen ? "button" : undefined}
              tabIndex={canOpen ? 0 : undefined}
              onClick={() => {
                if (!sidebarTarget) return;
                if (sidebarTarget.kind === "episode") {
                  setSelectedEpisode({
                    episodeId: sidebarTarget.episodeId as Id<"episodes">,
                    showTitle: item.title,
                  });
                  return;
                }
                setSelectedQueueTitle({
                  titleId: sidebarTarget.titleId as Id<"titles">,
                  label: item.title,
                });
              }}
              onKeyDown={(event) => {
                if (!canOpen) return;
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault();
                if (!sidebarTarget) return;
                if (sidebarTarget.kind === "episode") {
                  setSelectedEpisode({
                    episodeId: sidebarTarget.episodeId as Id<"episodes">,
                    showTitle: item.title,
                  });
                  return;
                }
                setSelectedQueueTitle({
                  titleId: sidebarTarget.titleId as Id<"titles">,
                  label: item.title,
                });
              }}
            >
              {/* Title */}
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{item.title}</p>
                {item.lastError && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <AlertCircle className="size-3 text-red-500 shrink-0" />
                    <p className="text-[10px] text-red-600 truncate">
                      {item.lastError}
                    </p>
                  </div>
                )}
              </div>

              {/* Type */}
              <span className="text-xs text-muted-foreground capitalize">
                {item.type}
              </span>

              {/* Source */}
              <span className="text-xs text-muted-foreground">
                {SOURCE_LABELS[item.source] ?? item.source}
              </span>

              {/* Status */}
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] px-1.5 py-0 w-fit",
                  STATUS_COLORS[item.status]
                )}
              >
                {item.status}
              </Badge>

              {/* Attempts */}
              <span className="text-xs text-muted-foreground">
                {item.attempts ?? 0}
              </span>

              {/* Cost */}
              <span className="text-xs text-muted-foreground">
                {item.estimatedCostCents
                  ? `$${(item.estimatedCostCents / 100).toFixed(3)}`
                  : "—"}
              </span>

              {/* Created */}
              <span className="text-[10px] text-muted-foreground">
                {new Date(item.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>

              {/* Actions */}
              <div className="flex items-center gap-1">
                {(item.status === "processing" || item.status === "failed") && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    title="Force complete"
                    disabled={isActing}
                    onClick={(event) => {
                      event.stopPropagation();
                      void handleAction(
                        () => forceComplete({ queueItemId: item._id as Id<"ratingQueue"> }),
                        item._id
                      );
                    }}
                  >
                    <CheckCircle2 className="size-3.5 text-emerald-600" />
                  </Button>
                )}
                {(item.status === "processing" || item.status === "failed") && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    title="Retry"
                    disabled={isActing}
                    onClick={(event) => {
                      event.stopPropagation();
                      void handleAction(
                        () => retryItem({ queueItemId: item._id as Id<"ratingQueue"> }),
                        item._id
                      );
                    }}
                  >
                    <RefreshCw className={cn("size-3.5", isActing && "animate-spin")} />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  title="Delete"
                  disabled={isActing}
                  onClick={(event) => {
                    event.stopPropagation();
                    void handleAction(
                      () => deleteItem({ queueItemId: item._id as Id<"ratingQueue"> }),
                      item._id
                    );
                  }}
                >
                  <Trash2 className="size-3.5 text-red-500" />
                </Button>
              </div>
            </div>
            );
          })}
        </div>
      )}

      <Dialog
        open={manualSubtitleIssue !== null}
        onOpenChange={(open) => {
          if (!open) {
            setManualSubtitleIssue(null);
            setManualTranscript("");
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Manual Subtitles</DialogTitle>
            <DialogDescription>
              Upload subtitle/transcript text to R2 for{" "}
              <span className="font-medium text-foreground">
                {manualSubtitleIssue?.displayTitle}
              </span>
              . This archive will be used before calling OpenSubtitles.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Textarea
              value={manualTranscript}
              onChange={(event) => setManualTranscript(event.target.value)}
              placeholder="Paste subtitle or transcript text here..."
              className="min-h-48 text-xs font-mono"
            />
            <p className="text-[11px] text-muted-foreground">
              {manualTranscript.trim().length} characters
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setManualSubtitleIssue(null);
                setManualTranscript("");
              }}
              disabled={savingManualSubtitles}
            >
              Cancel
            </Button>
            <Button
              variant="secondary"
              onClick={() => void handleManualSubtitleSave(false)}
              disabled={savingManualSubtitles}
            >
              Save Only
            </Button>
            <Button
              onClick={() => void handleManualSubtitleSave(true)}
              disabled={savingManualSubtitles}
              className="gap-1.5"
            >
              <RefreshCw className={cn("size-3", savingManualSubtitles && "animate-spin")} />
              Save + Re-rate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EpisodeDetailSheet
        episodeId={selectedEpisode?.episodeId ?? null}
        open={selectedEpisode !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedEpisode(null);
        }}
        showTitle={selectedEpisode?.showTitle ?? "Episode"}
      />

      <QueueTitleDetailSheet
        titleId={selectedQueueTitle?.titleId ?? null}
        open={selectedQueueTitle !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedQueueTitle(null);
        }}
        fallbackLabel={selectedQueueTitle?.label ?? "Queue Item"}
      />
    </div>
  );
}

function QueueTitleDetailSheet({
  titleId,
  open,
  onOpenChange,
  fallbackLabel,
}: {
  titleId: Id<"titles"> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fallbackLabel: string;
}) {
  const title = useQuery(api.titles.getTitle, titleId ? { titleId } : "skip");
  const ratings = title?.ratings as CategoryRatings | undefined;
  const hasRatings =
    !!ratings &&
    (title?.status === "rated" ||
      title?.status === "reviewed" ||
      title?.status === "disputed");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {title ? `${title.title} (${title.year})` : fallbackLabel}
          </SheetTitle>
          <SheetDescription>
            {title ? `${title.type} · status ${title.status}` : "Queue item details"}
          </SheetDescription>
        </SheetHeader>

        <div className="px-4 pb-8 space-y-4">
          {!title && (
            <p className="text-sm text-muted-foreground">
              No linked title record yet. This queue item may be waiting for initial ingestion.
            </p>
          )}

          {title?.overview && (
            <p className="text-sm leading-relaxed text-muted-foreground">
              {title.overview}
            </p>
          )}

          {hasRatings && ratings && (
            <RatingBreakdown
              ratings={ratings}
              notes={title?.ratingNotes ?? undefined}
              categoryEvidence={title?.categoryEvidence ?? undefined}
            />
          )}

          {title && !hasRatings && (
            <p className="text-sm text-muted-foreground">
              This title does not have saved ratings yet.
            </p>
          )}

          {title && (
            <Button asChild variant="outline" size="sm" className="w-full gap-1.5">
              <Link href={`/title/${title._id}`}>
                Open full title page
                <ExternalLink className="size-3" />
              </Link>
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
