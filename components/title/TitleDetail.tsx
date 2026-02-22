"use client";

import Image from "next/image";
import Link from "next/link";
import { Preloaded, usePreloadedQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import {
  Clock,
  Film,
  Tv,
  Bookmark,
  MessageSquarePlus,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RatingBreakdown } from "@/components/rating/RatingBreakdown";
import { CompositeScore } from "@/components/rating/CompositeScore";
import { NoFlagsBadge } from "@/components/rating/NoFlagsBadge";
import { EpisodeFlags } from "@/components/rating/EpisodeFlags";
import { StreamingLinks } from "@/components/title/StreamingLinks";
import { RatingLoading } from "@/components/title/RatingLoading";
import {
  calculateCompositeScore,
  isNoFlags,
  type CategoryRatings,
} from "@/lib/scoring";

interface TitleDetailProps {
  preloadedTitle: Preloaded<typeof api.titles.getTitle>;
}

export function TitleDetail({ preloadedTitle }: TitleDetailProps) {
  const title = usePreloadedQuery(preloadedTitle);
  const { isSignedIn } = useUser();

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
  const TypeIcon = title.type === "tv" ? Tv : Film;
  const typeLabel =
    title.type === "tv"
      ? "TV Show"
      : title.type === "youtube"
        ? "YouTube"
        : "Movie";

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
              "relative mx-auto w-52 overflow-hidden rounded-2xl bg-muted shadow-lg",
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
            </div>
          )}
          {hasRatings && noFlags && (
            <div className="lg:hidden">
              <NoFlagsBadge />
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
              notes={title.ratingNotes ?? undefined}
            />
          )}

          {/* Episode flags */}
          {title.type === "tv" &&
            title.episodeFlags &&
            title.episodeFlags.length > 0 && (
              <>
                <Separator />
                <EpisodeFlags flags={title.episodeFlags} />
              </>
            )}

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
            {isSignedIn && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/corrections?titleId=${title._id}`}>
                  <MessageSquarePlus className="mr-1.5 size-3.5" />
                  Submit Correction
                </Link>
              </Button>
            )}
            {isSignedIn && (
              <Button variant="outline" size="sm">
                <Bookmark className="mr-1.5 size-3.5" />
                Add to Watchlist
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
        </div>
      </div>
    </div>
  );
}
