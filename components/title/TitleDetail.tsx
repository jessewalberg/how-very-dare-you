"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Preloaded, usePreloadedQuery, useQuery, useMutation, useAction } from "convex/react";
import { useUser } from "@clerk/nextjs";
import {
  Clock,
  Film,
  Tv,
  Bookmark,
  MessageSquarePlus,
  ArrowLeft,
  ChevronDown,
  Sparkles,
  RefreshCw,
  Zap,
  Scissors,
  Palette,
  Sun,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { RatingBreakdown } from "@/components/rating/RatingBreakdown";
import { CompositeScore } from "@/components/rating/CompositeScore";
import { NoFlagsBadge } from "@/components/rating/NoFlagsBadge";
import { EpisodeFlags } from "@/components/rating/EpisodeFlags";
import { StreamingLinks } from "@/components/title/StreamingLinks";
import { RatingLoading } from "@/components/title/RatingLoading";
import { SeasonList } from "@/components/title/SeasonList";
import { CorrectionForm } from "@/components/corrections/CorrectionForm";
import { CorrectionsList } from "@/components/corrections/CorrectionsList";
import {
  calculateCompositeScore,
  isNoFlags,
  type CategoryRatings,
} from "@/lib/scoring";
import { canOpenUserEpisodeSidebar } from "@/lib/sidebarBehavior";

interface TitleDetailProps {
  preloadedTitle: Preloaded<typeof api.titles.getTitle>;
}

export function TitleDetail({ preloadedTitle }: TitleDetailProps) {
  const title = usePreloadedQuery(preloadedTitle);
  const { isSignedIn } = useUser();
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const profile = useQuery(api.users.getMyProfile);
  const addToWatchlist = useMutation(api.users.addToWatchlist);
  const removeFromWatchlist = useMutation(api.users.removeFromWatchlist);
  const requestRating = useMutation(api.ratings.requestOnDemandRating);
  const adminReRateTitle = useAction(api.admin.reRateTitle);
  const refreshAllSeasons = useAction(api.admin.refreshAllSeasonsForTitle);
  const [watchlistLoading, setWatchlistLoading] = useState(false);
  const [requestingRating, setRequestingRating] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [refreshingSeasons, setRefreshingSeasons] = useState(false);
  const [seasonRefreshMessage, setSeasonRefreshMessage] = useState<string | null>(null);
  const [seasonRefreshError, setSeasonRefreshError] = useState<string | null>(null);

  const isInWatchlist = (title && profile?.watchlist?.includes(title._id)) ?? false;
  const isPaid = profile?.tier === "paid";

  if (!title) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h1 className="text-2xl font-bold">Title Not Found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This title doesn&apos;t exist or may have been removed.
        </p>
        <Button variant="outline" className="mt-6" asChild>
          <Link href="/browse">
            <ArrowLeft className="mr-1.5 size-4" />
            Back to Browse
          </Link>
        </Button>
      </div>
    );
  }

  const isLoading = title.status === "pending" || title.status === "rating";
  const hasRatings = title.ratings && title.status !== "pending" && title.status !== "rating";
  const ratings = title.ratings as CategoryRatings | undefined;
  const noFlags = ratings ? isNoFlags(ratings) : false;
  const composite = ratings ? calculateCompositeScore(ratings) : null;
  const totalSeasonEpisodes =
    title.type === "tv"
      ? (title.seasonData ?? []).reduce(
          (sum: number, season: NonNullable<typeof title.seasonData>[number]) =>
            sum + season.episodeCount,
          0
        )
      : undefined;
  const normalizedRatingNotes =
    title.hasEpisodeRatings &&
    title.ratedEpisodeCount != null &&
    totalSeasonEpisodes != null &&
    totalSeasonEpisodes > 0
      ? `Based on ${title.ratedEpisodeCount} of ${totalSeasonEpisodes} episodes. Average severity per category across rated episodes.`
      : title.ratingNotes ?? undefined;
  const showScoreExplanation =
    title.hasEpisodeRatings && title.ratedEpisodeCount != null
      ? `Show-level score from ${title.ratedEpisodeCount} rated episode${title.ratedEpisodeCount !== 1 ? "s" : ""} (average per category across rated episodes).`
      : "Show-level score on a 0-4 scale.";
  const TypeIcon = title.type === "tv" ? Tv : Film;
  const typeLabel =
    title.type === "tv"
      ? "TV Show"
      : title.type === "youtube"
        ? "YouTube"
        : "Movie";
  const canRequestTitleRating = title.type === "movie" || title.type === "tv";
  const canManuallyRate = title.status === "pending" && canRequestTitleRating;
  const isAdmin = profile?.isAdmin === true;
  const canReRateTitle = canRequestTitleRating && hasRatings && isAdmin;
  const canInitialRateTitle = canRequestTitleRating && !hasRatings;
  const showTitleRateAction = canInitialRateTitle || canReRateTitle;
  const titleRateButtonLabel = canReRateTitle ? "Re-Rate Title" : "Rate This Title";
  const canRefreshSeasonData = isAdmin && title.type === "tv";
  const canOpenEpisodeSidebar = canOpenUserEpisodeSidebar(title.type);

  async function handleRequestTitleRating() {
    if (!title) return;
    if (!canRequestTitleRating) return;
    setRequestError(null);
    setRequestingRating(true);
    try {
      if (canReRateTitle) {
        await adminReRateTitle({ titleId: title._id });
      } else {
        await requestRating({
          tmdbId: title.tmdbId,
          title: title.title,
          type: title.type as "movie" | "tv",
        });
      }
    } catch (e) {
      setRequestError(e instanceof Error ? e.message : "Failed to request rating");
    } finally {
      setRequestingRating(false);
    }
  }

  async function handleRefreshSeasonData() {
    if (!title) return;
    if (!canRefreshSeasonData) return;

    setSeasonRefreshError(null);
    setSeasonRefreshMessage(null);
    setRefreshingSeasons(true);
    try {
      const result = await refreshAllSeasons({ titleId: title._id });
      const failed =
        result.seasonsFailed > 0
          ? ` (${result.seasonsFailed} failed: ${result.failedSeasons.join(", ")})`
          : "";
      setSeasonRefreshMessage(
        `Refreshed ${result.seasonsRefreshed}/${result.seasonCount} seasons. ${result.episodeCount} episodes indexed.${failed}`
      );
    } catch (e) {
      setSeasonRefreshError(
        e instanceof Error ? e.message : "Failed to refresh season data"
      );
    } finally {
      setRefreshingSeasons(false);
    }
  }

  // Show loading state while AI is rating
  if (isLoading) {
    return (
      <div>
        <Link
          href="/browse"
          className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          Back
        </Link>
        <RatingLoading
          title={title.title}
          year={title.year}
          type={title.type}
          ageRating={title.ageRating}
          genre={title.genre}
          posterPath={title.posterPath}
        />
        {canManuallyRate && (
          <div className="mt-4 flex flex-col items-center gap-3">
            {requestError && (
              <p className="text-sm text-destructive">{requestError}</p>
            )}
            <Button
              onClick={handleRequestTitleRating}
              disabled={requestingRating}
              className="gap-1.5"
            >
              <Sparkles className={cn("size-4", requestingRating && "animate-pulse")} />
              {requestingRating ? "Requesting rating..." : "Rate This Title"}
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Back link */}
      <Link
        href="/browse"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-3.5" />
        Back
      </Link>

      <div className="flex flex-col gap-8 lg:flex-row lg:gap-10">
        {/* Left column — Poster */}
        <div className="shrink-0">
          <div
            className={cn(
              "relative mx-auto w-44 max-w-full overflow-hidden rounded-2xl bg-muted shadow-lg",
              "sm:w-60 lg:w-64"
            )}
          >
            <div className="aspect-[2/3]">
              {title.posterPath ? (
                <Image
                  src={`https://image.tmdb.org/t/p/w500${title.posterPath}`}
                  alt={title.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 208px, (max-width: 1024px) 240px, 256px"
                  priority
                />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground/30">
                  <TypeIcon className="size-16" />
                </div>
              )}
            </div>
          </div>

          {/* Streaming links — below poster on desktop */}
          {title.streamingProviders && title.streamingProviders.length > 0 && (
            <div className="mt-4 hidden lg:block">
              <StreamingLinks providers={title.streamingProviders} />
            </div>
          )}
        </div>

        {/* Right column — Info + Ratings */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Title header */}
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {title.ageRating && (
                <Badge variant="outline" className="text-xs font-bold">
                  {title.ageRating}
                </Badge>
              )}
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <TypeIcon className="size-3" />
                {typeLabel}
              </span>
              {title.genre && (
                <span className="text-xs text-muted-foreground">
                  · {title.genre}
                </span>
              )}
              {title.runtime && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  · <Clock className="size-3" />
                  {title.runtime}m
                </span>
              )}
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight lg:text-4xl">
              {title.title}
              <span className="ml-2 text-2xl font-normal text-muted-foreground lg:text-3xl">
                ({title.year})
              </span>
            </h1>

            {title.overview && (
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {title.overview}
              </p>
            )}
          </div>

          {/* Composite score hero (mobile shows inline, desktop shows in breakdown) */}
          {hasRatings && !noFlags && composite !== null && (
            <div className="lg:hidden">
              <CompositeScore score={composite} />
              <p className="mt-1 text-xs text-muted-foreground">
                {showScoreExplanation}
              </p>
            </div>
          )}
          {hasRatings && noFlags && (
            <div className="lg:hidden">
              <NoFlagsBadge />
              <p className="mt-1 text-xs text-muted-foreground">
                {showScoreExplanation}
              </p>
            </div>
          )}

          {/* Streaming links — inline on mobile */}
          {title.streamingProviders && title.streamingProviders.length > 0 && (
            <div className="lg:hidden">
              <StreamingLinks providers={title.streamingProviders} />
            </div>
          )}

          <Separator />

          {/* Rating breakdown */}
          {ratings && (
            <RatingBreakdown
              ratings={ratings}
              notes={normalizedRatingNotes}
              categoryEvidence={title.categoryEvidence ?? undefined}
            />
          )}

          {/* Per-episode ratings (new system) */}
          {canOpenEpisodeSidebar && title.tmdbId && (
            <>
              <Separator />
              <SeasonList
                titleId={title._id}
                tmdbShowId={title.tmdbId}
                showTitle={title.title}
              />
            </>
          )}

          {/* Episode flags (legacy holistic ratings — shown when no per-episode ratings) */}
          {title.type === "tv" &&
            !title.hasEpisodeRatings &&
            title.episodeFlags &&
            title.episodeFlags.length > 0 && (
              <>
                <Separator />
                <EpisodeFlags flags={title.episodeFlags} />
              </>
            )}

          {/* Video Analysis Details */}
          {title.videoAnalysis && <VideoAnalysisCard analysis={title.videoAnalysis} />}

          {/* Rating metadata */}
          {title.ratedAt && (
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

          <Separator />

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            {showTitleRateAction && (
              <div className="flex flex-col gap-1.5">
                <Button
                  size="sm"
                  onClick={handleRequestTitleRating}
                  disabled={requestingRating}
                  className="gap-1.5"
                >
                  <Sparkles className={cn("size-3.5", requestingRating && "animate-pulse")} />
                  {requestingRating ? "Requesting rating..." : titleRateButtonLabel}
                </Button>
                {requestError && (
                  <p className="text-xs text-destructive">{requestError}</p>
                )}
              </div>
            )}
            {canRefreshSeasonData && (
              <div className="flex flex-col gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefreshSeasonData}
                  disabled={refreshingSeasons}
                  className="gap-1.5"
                >
                  <RefreshCw className={cn("size-3.5", refreshingSeasons && "animate-spin")} />
                  {refreshingSeasons ? "Refreshing seasons..." : "Refresh Seasons Data"}
                </Button>
                {seasonRefreshMessage && (
                  <p className="text-xs text-muted-foreground">{seasonRefreshMessage}</p>
                )}
                {seasonRefreshError && (
                  <p className="text-xs text-destructive">{seasonRefreshError}</p>
                )}
              </div>
            )}
            {isSignedIn && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCorrectionOpen(true)}
              >
                <MessageSquarePlus className="mr-1.5 size-3.5" />
                Submit Correction
              </Button>
            )}
            {isSignedIn && isPaid && (
              <Button
                variant="outline"
                size="sm"
                disabled={watchlistLoading}
                onClick={async () => {
                  if (!title) return;
                  setWatchlistLoading(true);
                  try {
                    if (isInWatchlist) {
                      await removeFromWatchlist({ titleId: title._id });
                    } else {
                      await addToWatchlist({ titleId: title._id });
                    }
                  } catch {
                    // silent
                  } finally {
                    setWatchlistLoading(false);
                  }
                }}
              >
                <Bookmark
                  className={cn(
                    "mr-1.5 size-3.5",
                    isInWatchlist && "fill-current"
                  )}
                />
                {isInWatchlist ? "In Watchlist" : "Add to Watchlist"}
              </Button>
            )}
            {!isSignedIn && (
              <p className="text-xs text-muted-foreground">
                <Link
                  href="/sign-in"
                  className="font-medium underline underline-offset-2 hover:text-foreground transition-colors"
                >
                  Sign in
                </Link>{" "}
                to submit corrections or save to your watchlist.
              </p>
            )}
          </div>

          {/* Community corrections */}
          <CorrectionsList titleId={title._id} />
        </div>
      </div>

      {/* Correction sheet */}
      {ratings && (
        <Sheet open={correctionOpen} onOpenChange={setCorrectionOpen}>
          <SheetContent className="overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Submit Correction</SheetTitle>
              <SheetDescription>
                Suggest a rating change for &ldquo;{title.title}&rdquo;
              </SheetDescription>
            </SheetHeader>
            <div className="px-4 pb-8">
              <CorrectionForm
                titleId={title._id}
                titleName={title.title}
                ratings={ratings}
                onSuccess={() => setCorrectionOpen(false)}
              />
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}

function VideoAnalysisCard({
  analysis,
}: {
  analysis: {
    cutsPerMinute: number;
    avgCutDuration: number;
    avgSaturation: number;
    avgBrightness: number;
    brightnessVariance: number;
    flashCount: number;
    trailerBiasCorrected: boolean;
    analyzedAt: number;
  };
}) {
  const [open, setOpen] = useState(false);

  const stats = [
    {
      icon: Scissors,
      label: "Cuts per minute",
      value: analysis.cutsPerMinute.toFixed(1),
      detail:
        analysis.cutsPerMinute < 10
          ? "Gentle pacing"
          : analysis.cutsPerMinute < 20
            ? "Moderate pacing"
            : "Rapid editing",
    },
    {
      icon: Clock,
      label: "Avg scene duration",
      value: `${analysis.avgCutDuration.toFixed(1)}s`,
      detail:
        analysis.avgCutDuration > 6
          ? "Long, calm scenes"
          : analysis.avgCutDuration > 3
            ? "Moderate scenes"
            : "Very short scenes",
    },
    {
      icon: Palette,
      label: "Color saturation",
      value: `${Math.round(analysis.avgSaturation)}/255`,
      detail:
        analysis.avgSaturation < 80
          ? "Muted, natural colors"
          : analysis.avgSaturation < 150
            ? "Moderate colors"
            : "Highly saturated",
    },
    {
      icon: Sun,
      label: "Flash count",
      value: String(analysis.flashCount),
      detail:
        analysis.flashCount === 0
          ? "No flashing"
          : analysis.flashCount < 5
            ? "Occasional flashes"
            : "Frequent flashing",
    },
  ];

  return (
    <div className="rounded-xl border border-border/50 bg-muted/20">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-muted/30 rounded-xl"
      >
        <div className="flex items-center gap-2">
          <Zap className="size-3.5 text-muted-foreground" strokeWidth={1.8} />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Video Analysis Details
          </span>
        </div>
        <ChevronDown
          className={cn(
            "size-4 text-muted-foreground transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div className="border-t border-border/30 px-4 pb-4 pt-3 space-y-3 animate-fade-in-up">
          <div className="grid grid-cols-2 gap-3">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.label}
                  className="rounded-lg bg-background/60 border border-border/30 p-3 space-y-1"
                >
                  <div className="flex items-center gap-1.5">
                    <Icon className="size-3 text-muted-foreground" strokeWidth={1.8} />
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                      {stat.label}
                    </span>
                  </div>
                  <p className="text-lg font-bold tabular-nums tracking-tight">
                    {stat.value}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{stat.detail}</p>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-3 text-[10px] text-muted-foreground/60 pt-1">
            {analysis.trailerBiasCorrected && (
              <span>Score adjusted for trailer bias (TV show)</span>
            )}
            <span>
              Analyzed{" "}
              {new Date(analysis.analyzedAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
