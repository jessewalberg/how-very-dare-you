"use client";

import { useState } from "react";
import { useQuery, useAction } from "convex/react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import {
  RefreshCw,
  Filter,
  ChevronRight,
  DollarSign,
  ExternalLink,
  AlertTriangle,
  FileText,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
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
import { cn } from "@/lib/utils";
import type { CategoryRatings } from "@/lib/scoring";
import { assessRatingQuality } from "@/lib/ratingQuality";
import { canOpenAdminTitleSidebar } from "@/lib/sidebarBehavior";
import {
  toSubtitleViewerErrorState,
  toSubtitleViewerState,
  type SubtitleViewerState,
} from "@/lib/adminSubtitleViewer";

type StatusFilter =
  | "pending"
  | "rating"
  | "rated"
  | "reviewed"
  | "disputed"
  | undefined;
type TypeFilter = "movie" | "tv" | "youtube" | undefined;

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: undefined, label: "All" },
  { value: "pending", label: "Pending" },
  { value: "rating", label: "Rating" },
  { value: "rated", label: "Rated" },
  { value: "reviewed", label: "Reviewed" },
  { value: "disputed", label: "Disputed" },
];

const TYPE_OPTIONS: { value: TypeFilter; label: string }[] = [
  { value: undefined, label: "All Types" },
  { value: "movie", label: "Movies" },
  { value: "tv", label: "TV" },
  { value: "youtube", label: "YouTube" },
];

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-slate-100 text-slate-700 border-slate-200",
  rating: "bg-blue-50 text-blue-700 border-blue-200",
  rated: "bg-emerald-50 text-emerald-700 border-emerald-200",
  reviewed: "bg-violet-50 text-violet-700 border-violet-200",
  disputed: "bg-amber-50 text-amber-700 border-amber-200",
};

const EPISODE_STATUS_COLORS: Record<string, string> = {
  unrated: "bg-slate-100 text-slate-700 border-slate-200",
  rating: "bg-blue-50 text-blue-700 border-blue-200",
  rated: "bg-emerald-50 text-emerald-700 border-emerald-200",
  failed: "bg-red-50 text-red-700 border-red-200",
};

function formatCost(cents: number | undefined) {
  if (!cents) return null;
  return `$${(cents / 100).toFixed(3)}`;
}

function avgRating(ratings: Record<string, unknown> | undefined) {
  if (!ratings) return null;
  const nums = Object.values(ratings).filter(
    (v): v is number => typeof v === "number"
  );
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function qualityBadgeClass(severity: "none" | "warning" | "critical") {
  if (severity === "critical") return "bg-red-50 text-red-700 border-red-200";
  if (severity === "warning") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

export default function AdminTitlesPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(undefined);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>(undefined);
  const [needsReviewOnly, setNeedsReviewOnly] = useState(false);
  const [expandedTitle, setExpandedTitle] = useState<Id<"titles"> | null>(null);
  const [selectedEpisode, setSelectedEpisode] = useState<{
    episodeId: Id<"episodes">;
    showTitle: string;
  } | null>(null);
  const [selectedStandaloneTitleId, setSelectedStandaloneTitleId] =
    useState<Id<"titles"> | null>(null);
  const [confirmReRate, setConfirmReRate] = useState<{
    type: "title" | "episode";
    id: Id<"titles"> | Id<"episodes">;
    name: string;
  } | null>(null);
  const [reRating, setReRating] = useState(false);
  const [subtitleViewer, setSubtitleViewer] =
    useState<SubtitleViewerState | null>(null);

  const titles = useQuery(api.admin.listTitles, {
    status: statusFilter,
    type: typeFilter,
  });
  const reRateTitle = useAction(api.admin.reRateTitle);
  const reRateEpisode = useAction(api.admin.reRateEpisode);
  const getSubtitleArchive = useAction(api.admin.getSubtitleArchive);
  const visibleTitles = titles?.filter((title) => {
    if (!needsReviewOnly) return true;
    const quality = assessRatingQuality({
      confidence: title.ratingConfidence,
      subtitleInfo: title.subtitleInfo,
    });
    return quality.needsReview;
  });

  async function handleReRate() {
    if (!confirmReRate) return;
    setReRating(true);
    try {
      if (confirmReRate.type === "title") {
        await reRateTitle({ titleId: confirmReRate.id as Id<"titles"> });
      } else {
        await reRateEpisode({ episodeId: confirmReRate.id as Id<"episodes"> });
      }
      toast.success(`Re-rating started for ${confirmReRate.name}`);
      setConfirmReRate(null);
    } catch (e) {
      console.error("Re-rate failed:", e);
      toast.error("Re-rate failed", {
        description: e instanceof Error ? e.message : "Unknown error",
      });
    } finally {
      setReRating(false);
    }
  }

  async function handleViewSubtitles(
    target:
      | { scope: "title"; titleId: Id<"titles"> }
      | { scope: "episode"; episodeId: Id<"episodes"> },
    label: string
  ) {
    setSubtitleViewer({
      label,
      loading: true,
    });
    try {
      const result = await getSubtitleArchive({ target });
      setSubtitleViewer(toSubtitleViewerState(label, result));
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error";
      setSubtitleViewer(toSubtitleViewerErrorState(label, message));
      toast.error("Failed to load subtitles", {
        description: message,
      });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Title Management</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Browse titles and trigger re-ratings.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
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
        </div>
        <div className="flex gap-1.5">
          {TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.label}
              onClick={() => setTypeFilter(opt.value)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-150",
                typeFilter === opt.value
                  ? "bg-foreground text-background"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {titles !== undefined && (
          <span className="text-xs text-muted-foreground">
            {(visibleTitles ?? titles).length} result
            {(visibleTitles ?? titles).length !== 1 ? "s" : ""}
          </span>
        )}
        <button
          onClick={() => setNeedsReviewOnly((v) => !v)}
          className={cn(
            "rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-150 flex items-center gap-1.5",
            needsReviewOnly
              ? "bg-amber-100 text-amber-800"
              : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <AlertTriangle className="size-3.5" />
          Needs Review Only
        </button>
      </div>

      {/* Loading */}
      {titles === undefined && (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      )}

      {/* Empty */}
      {visibleTitles && visibleTitles.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-sm text-muted-foreground">
            {needsReviewOnly ? "No flagged titles found." : "No titles found."}
          </p>
        </div>
      )}

      {/* Title list */}
      {visibleTitles && visibleTitles.length > 0 && (
        <div className="space-y-2">
          {visibleTitles.map((title: NonNullable<typeof visibleTitles>[number]) => {
            const ratingSummary = avgRating(title.ratings);
            const isExpanded = expandedTitle === title._id;
            const isTv = title.type === "tv";
            const isStandalone = canOpenAdminTitleSidebar(title.type);
            const quality = assessRatingQuality({
              confidence: title.ratingConfidence,
              subtitleInfo: title.subtitleInfo,
            });

            return (
              <div key={title._id} className="space-y-0">
                <div
                  className={cn(
                    "flex items-center gap-3 rounded-lg border bg-card p-3 hover:shadow-sm transition-all",
                    isExpanded && "rounded-b-none border-b-0",
                    isStandalone && "cursor-pointer hover:border-foreground/20",
                    quality.severity === "critical" && "border-red-200/80"
                  )}
                  role={isStandalone ? "button" : undefined}
                  tabIndex={isStandalone ? 0 : undefined}
                  onClick={
                    isStandalone
                      ? () => setSelectedStandaloneTitleId(title._id)
                      : undefined
                  }
                  onKeyDown={
                    isStandalone
                      ? (event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setSelectedStandaloneTitleId(title._id);
                          }
                        }
                      : undefined
                  }
                >
                  {/* Expand toggle for TV */}
                  {isTv ? (
                    <button
                      onClick={() =>
                        setExpandedTitle(isExpanded ? null : title._id)
                      }
                      className="shrink-0 p-0.5 rounded hover:bg-muted transition-colors"
                    >
                      <ChevronRight
                        className={cn(
                          "size-4 text-muted-foreground transition-transform duration-200",
                          isExpanded && "rotate-90"
                        )}
                      />
                    </button>
                  ) : (
                    <div className="w-5 shrink-0" />
                  )}

                  {/* Poster */}
                  {title.posterPath ? (
                    <Image
                      src={`https://image.tmdb.org/t/p/w92${title.posterPath}`}
                      alt={title.title}
                      width={40}
                      height={60}
                      className="rounded object-cover shrink-0"
                    />
                  ) : (
                    <div className="size-10 rounded bg-muted shrink-0" />
                  )}

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {isTv ? (
                        <Link
                          href={`/title/${title._id}`}
                          className="text-sm font-semibold truncate hover:underline underline-offset-2"
                          onClick={(event) => event.stopPropagation()}
                        >
                          {title.title}
                        </Link>
                      ) : (
                        <span className="text-sm font-semibold truncate">
                          {title.title}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground shrink-0">
                        ({title.year})
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground capitalize">
                        {title.type}
                      </span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] px-1.5 py-0",
                          STATUS_COLORS[title.status]
                        )}
                      >
                        {title.status}
                      </Badge>
                      {quality.needsReview && (
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] px-1.5 py-0",
                            qualityBadgeClass(quality.severity)
                          )}
                          title={quality.reasons.join(" ")}
                        >
                          Needs review
                        </Badge>
                      )}
                      {ratingSummary !== null && (
                        <span className="text-xs text-muted-foreground">
                          Avg: {ratingSummary.toFixed(1)}
                        </span>
                      )}
                      {title.ratedAt && (
                        <span className="text-[10px] text-muted-foreground/50">
                          Rated{" "}
                          {new Date(title.ratedAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Cost */}
                  <TitleCost
                    titleId={title._id}
                    tmdbId={title.tmdbId}
                    type={title.type}
                  />

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1 shrink-0"
                    data-testid="admin-title-view-subtitles"
                    onClick={(event) => {
                      event.stopPropagation();
                      void handleViewSubtitles(
                        { scope: "title", titleId: title._id },
                        title.title
                      );
                    }}
                  >
                    <FileText className="size-3" />
                    View subtitles
                  </Button>

                  {/* Re-rate button */}
                  {(title.status === "rated" ||
                    title.status === "reviewed" ||
                    title.status === "disputed") && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1 shrink-0"
                      onClick={(event) => {
                        event.stopPropagation();
                        setConfirmReRate({
                          type: "title",
                          id: title._id,
                          name: title.title,
                        });
                      }}
                    >
                      <RefreshCw className="size-3" />
                      Re-rate
                    </Button>
                  )}
                </div>

                {/* Episodes panel */}
                {isTv && isExpanded && (
                  <EpisodePanel
                    titleId={title._id}
                    titleName={title.title}
                    onEpisodeOpen={(episodeId, showTitle) =>
                      setSelectedEpisode({ episodeId, showTitle })
                    }
                    onReRate={(episodeId, name) =>
                      setConfirmReRate({
                        type: "episode",
                        id: episodeId,
                        name,
                      })
                    }
                    onViewSubtitles={(episodeId, name) =>
                      void handleViewSubtitles(
                        { scope: "episode", episodeId },
                        name
                      )
                    }
                    needsReviewOnly={needsReviewOnly}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Confirm dialog */}
      <Dialog
        open={!!confirmReRate}
        onOpenChange={(open) => !open && setConfirmReRate(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Re-rate {confirmReRate?.type === "episode" ? "Episode" : "Title"}
            </DialogTitle>
            <DialogDescription>
              This will archive the current ratings for{" "}
              <span className="font-medium text-foreground">
                {confirmReRate?.name}
              </span>{" "}
              and send it back through the AI rating pipeline. Previous ratings
              will be preserved in the rating history.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmReRate(null)}
              disabled={reRating}
            >
              Cancel
            </Button>
            <Button onClick={handleReRate} disabled={reRating}>
              {reRating ? (
                <>
                  <RefreshCw className="size-3 animate-spin mr-1" />
                  Re-rating...
                </>
              ) : (
                "Confirm Re-rate"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={subtitleViewer !== null}
        onOpenChange={(open) => {
          if (!open) setSubtitleViewer(null);
        }}
      >
        <DialogContent className="max-w-3xl" data-testid="admin-subtitle-viewer-dialog">
          <DialogHeader>
            <DialogTitle>Archived Subtitles</DialogTitle>
            <DialogDescription>
              {subtitleViewer?.label
                ? `Transcript archive for ${subtitleViewer.label}`
                : "Transcript archive"}
            </DialogDescription>
          </DialogHeader>

          {subtitleViewer?.loading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-44 w-full" />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid gap-1 text-[11px] text-muted-foreground">
                <p>
                  Status:{" "}
                  <span className="text-foreground">
                    {subtitleViewer?.subtitleStatus ?? "unknown"}
                  </span>
                </p>
                {subtitleViewer?.source && (
                  <p>
                    Source:{" "}
                    <span className="text-foreground">{subtitleViewer.source}</span>
                  </p>
                )}
                {subtitleViewer?.language && (
                  <p>
                    Language:{" "}
                    <span className="text-foreground">{subtitleViewer.language}</span>
                  </p>
                )}
                {subtitleViewer?.dialogueLines != null && (
                  <p>
                    Dialogue lines:{" "}
                    <span className="text-foreground">
                      {subtitleViewer.dialogueLines}
                    </span>
                  </p>
                )}
                {subtitleViewer?.storageKey && (
                  <p className="break-all">
                    R2 key:{" "}
                    <span className="text-foreground">{subtitleViewer.storageKey}</span>
                  </p>
                )}
                {subtitleViewer?.storageBucket && (
                  <p>
                    Bucket:{" "}
                    <span className="text-foreground">{subtitleViewer.storageBucket}</span>
                  </p>
                )}
                {subtitleViewer?.storageBytes != null && (
                  <p>
                    Bytes:{" "}
                    <span className="text-foreground">
                      {subtitleViewer.storageBytes.toLocaleString()}
                    </span>
                  </p>
                )}
                {subtitleViewer?.uploadedAt && (
                  <p>
                    Uploaded:{" "}
                    <span className="text-foreground">
                      {new Date(subtitleViewer.uploadedAt).toLocaleString("en-US")}
                    </span>
                  </p>
                )}
              </div>

              {subtitleViewer?.found && subtitleViewer.transcript ? (
                <>
                  <Textarea
                    readOnly
                    value={subtitleViewer.transcript}
                    className="min-h-[360px] text-xs font-mono"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    {subtitleViewer.transcript.length.toLocaleString()} characters
                  </p>
                </>
              ) : (
                <p className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                  {subtitleViewer?.message ??
                    "No archived subtitle transcript is available for this record."}
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubtitleViewer(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EpisodeDetailSheet
        episodeId={selectedEpisode?.episodeId ?? null}
        open={selectedEpisode !== null}
        onOpenChange={(open) => !open && setSelectedEpisode(null)}
        showTitle={selectedEpisode?.showTitle ?? "Episode"}
      />

      <StandaloneTitleSheet
        titleId={selectedStandaloneTitleId}
        open={selectedStandaloneTitleId !== null}
        onOpenChange={(open) => !open && setSelectedStandaloneTitleId(null)}
        onViewSubtitles={(titleId, label) =>
          void handleViewSubtitles({ scope: "title", titleId }, label)
        }
      />
    </div>
  );
}

function TitleCost({
  titleId,
  tmdbId,
  type,
}: {
  titleId: Id<"titles">;
  tmdbId: number;
  type: "movie" | "tv" | "youtube";
}) {
  const titleCost = useQuery(api.admin.getTitleRatingCost, { tmdbId });
  const episodeCosts = useQuery(
    api.admin.getEpisodeRatingCostsForTitle,
    type === "tv" ? { titleId } : "skip"
  );

  const episodeRollup = episodeCosts?.totalCostCents ?? 0;
  const latestTitleCost = titleCost?.estimatedCostCents ?? 0;
  const displayCost =
    type === "tv" ? (episodeRollup > 0 ? episodeRollup : latestTitleCost) : latestTitleCost;

  if (!displayCost) return null;

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <DollarSign className="size-3 text-muted-foreground" />
      <span className="text-xs text-muted-foreground">
        {formatCost(displayCost)}
      </span>
      {type === "tv" && episodeRollup > 0 && (
        <span className="text-[10px] text-muted-foreground/70">
          ({episodeCosts?.episodesWithCost ?? 0} eps)
        </span>
      )}
    </div>
  );
}

function EpisodePanel({
  titleId,
  titleName,
  onEpisodeOpen,
  onReRate,
  onViewSubtitles,
  needsReviewOnly,
}: {
  titleId: Id<"titles">;
  titleName: string;
  onEpisodeOpen: (episodeId: Id<"episodes">, showTitle: string) => void;
  onReRate: (episodeId: Id<"episodes">, name: string) => void;
  onViewSubtitles: (episodeId: Id<"episodes">, name: string) => void;
  needsReviewOnly: boolean;
}) {
  const episodes = useQuery(api.admin.getEpisodesForTitle, { titleId });
  const episodeCosts = useQuery(api.admin.getEpisodeRatingCostsForTitle, {
    titleId,
  });

  if (episodes === undefined) {
    return (
      <div className="rounded-b-lg border bg-muted/30 p-3 space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded" />
        ))}
      </div>
    );
  }

  if (episodes.length === 0) {
    return (
      <div className="rounded-b-lg border bg-muted/30 p-4 text-center">
        <p className="text-xs text-muted-foreground">
          No episodes found. Episodes are created when users browse individual
          seasons.
        </p>
      </div>
    );
  }

  const visibleEpisodes = needsReviewOnly
    ? episodes.filter((episode) =>
        assessRatingQuality({
          confidence: episode.ratingConfidence,
          subtitleInfo: episode.subtitleInfo,
        }).needsReview
      )
    : episodes;

  if (visibleEpisodes.length === 0) {
    return (
      <div className="rounded-b-lg border bg-muted/30 p-4 text-center">
        <p className="text-xs text-muted-foreground">
          No flagged episodes found for this title.
        </p>
      </div>
    );
  }

  // Group by season
  const seasons = new Map<number, typeof visibleEpisodes>();
  for (const ep of visibleEpisodes) {
    const s = seasons.get(ep.seasonNumber) ?? [];
    s.push(ep);
    seasons.set(ep.seasonNumber, s);
  }

  // Sort seasons and episodes
  const sortedSeasons = Array.from(seasons.entries()).sort(
    ([a], [b]) => a - b
  );

  return (
    <div className="rounded-b-lg border bg-muted/20 px-3 pb-3 pt-1 space-y-3">
      {sortedSeasons.map(([seasonNum, eps]) => {
        const sortedEps = eps.sort(
          (a: (typeof eps)[number], b: (typeof eps)[number]) =>
            a.episodeNumber - b.episodeNumber
        );
        const ratedCount = sortedEps.filter(
          (e: (typeof sortedEps)[number]) => e.status === "rated"
        ).length;

        return (
          <div key={seasonNum}>
            <div className="flex items-center gap-2 py-1.5">
              <span className="text-xs font-semibold">
                Season {seasonNum}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {ratedCount}/{sortedEps.length} rated
              </span>
            </div>
            <div className="space-y-1">
              {sortedEps.map((ep: (typeof sortedEps)[number]) => {
                const epAvg = avgRating(ep.ratings);
                const episodeCostCents =
                  episodeCosts?.episodeLatestCostCents[ep._id];
                const quality = assessRatingQuality({
                  confidence: ep.ratingConfidence,
                  subtitleInfo: ep.subtitleInfo,
                });
                return (
                  <div
                    key={ep._id}
                    className={cn(
                      "flex items-center gap-3 rounded-md border bg-card px-3 py-2 text-xs transition-colors hover:bg-muted/40 cursor-pointer",
                      quality.severity === "critical" && "border-red-200/80"
                    )}
                    role="button"
                    tabIndex={0}
                    onClick={() => onEpisodeOpen(ep._id, titleName)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onEpisodeOpen(ep._id, titleName);
                      }
                    }}
                  >
                    {/* Episode number */}
                    <span className="text-muted-foreground font-mono w-6 shrink-0 text-right">
                      {ep.episodeNumber}
                    </span>

                    {/* Name */}
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {ep.name || `Episode ${ep.episodeNumber}`}
                    </span>

                    {/* Status */}
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] px-1.5 py-0 shrink-0",
                        EPISODE_STATUS_COLORS[ep.status]
                      )}
                    >
                      {ep.status}
                    </Badge>
                    {quality.needsReview && (
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] px-1.5 py-0 shrink-0",
                          qualityBadgeClass(quality.severity)
                        )}
                        title={quality.reasons.join(" ")}
                      >
                        Review
                      </Badge>
                    )}

                    {/* Avg rating */}
                    {epAvg !== null && (
                      <span className="text-muted-foreground shrink-0 w-12 text-right">
                        Avg: {epAvg.toFixed(1)}
                      </span>
                    )}

                    {/* Episode cost */}
                    {episodeCostCents != null && episodeCostCents > 0 && (
                      <span className="text-muted-foreground shrink-0">
                        {formatCost(episodeCostCents)}
                      </span>
                    )}

                    {/* Rated date */}
                    {ep.ratedAt && (
                      <span className="text-[10px] text-muted-foreground/50 shrink-0">
                        {new Date(ep.ratedAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[10px] gap-1 px-2 shrink-0"
                      data-testid="admin-episode-view-subtitles"
                      onClick={(event) => {
                        event.stopPropagation();
                        onViewSubtitles(
                          ep._id,
                          `${titleName} S${ep.seasonNumber}E${ep.episodeNumber}`
                        );
                      }}
                    >
                      <FileText className="size-2.5" />
                      Subtitles
                    </Button>

                    {/* Re-rate button */}
                    {(ep.status === "rated" || ep.status === "failed") && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[10px] gap-1 px-2 shrink-0"
                        onClick={(event) => {
                          event.stopPropagation();
                          onReRate(
                            ep._id,
                            `${titleName} S${ep.seasonNumber}E${ep.episodeNumber}`
                          );
                        }}
                      >
                        <RefreshCw className="size-2.5" />
                        Re-rate
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StandaloneTitleSheet({
  titleId,
  open,
  onOpenChange,
  onViewSubtitles,
}: {
  titleId: Id<"titles"> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onViewSubtitles: (titleId: Id<"titles">, label: string) => void;
}) {
  const title = useQuery(api.titles.getTitle, titleId ? { titleId } : "skip");
  const ratings = title?.ratings as CategoryRatings | undefined;
  const quality = assessRatingQuality({
    confidence: title?.ratingConfidence,
    subtitleInfo: title?.subtitleInfo,
  });
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
            {title ? `${title.title} (${title.year})` : "Title Details"}
          </SheetTitle>
          <SheetDescription>
            {title?.type === "movie" ? "Movie" : "Standalone title"}
          </SheetDescription>
        </SheetHeader>

        <div className="px-4 pb-8 space-y-4">
          {!title && (
            <div className="space-y-3 pt-4">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-28 w-full" />
            </div>
          )}

          {title?.overview && (
            <p className="text-sm leading-relaxed text-muted-foreground">
              {title.overview}
            </p>
          )}

          {title && title.ratings && quality.needsReview && (
            <div
              className={cn(
                "rounded-lg border px-3 py-2 text-xs",
                qualityBadgeClass(quality.severity)
              )}
            >
              <p className="font-semibold">Needs review</p>
              <p className="mt-0.5">{quality.reasons.join(" ")}</p>
            </div>
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
              This title has no saved ratings yet.
            </p>
          )}

          {title?.ratedAt && (
            <p className="text-[11px] text-muted-foreground/50">
              Rated{" "}
              {new Date(title.ratedAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
              {title.ratingModel && ` · Model: ${title.ratingModel}`}
              {title.ratingConfidence != null &&
                ` · Confidence: ${Math.round(title.ratingConfidence * 100)}%`}
            </p>
          )}

          {title && (
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-1.5"
              data-testid="admin-standalone-view-subtitles"
              onClick={() => onViewSubtitles(title._id, title.title)}
            >
              <FileText className="size-3" />
              View archived subtitles
            </Button>
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
