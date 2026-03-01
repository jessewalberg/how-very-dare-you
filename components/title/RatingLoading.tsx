"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { CATEGORIES } from "@/lib/constants";
import { Sparkles } from "lucide-react";
import { CompositeScoreSkeleton } from "@/components/rating/CompositeScoreSkeleton";

interface RatingLoadingProps {
  title: string;
  year: number;
  type: "movie" | "tv" | "youtube";
  ageRating?: string;
  genre?: string;
  posterPath?: string;
}

export function RatingLoading({
  title,
  year,
  type,
  ageRating,
  genre,
  posterPath,
}: RatingLoadingProps) {
  const typeLabel = type === "tv" ? "TV Show" : type === "youtube" ? "YouTube" : "Movie";

  return (
    <div className="space-y-6">
      {/* Header: poster + metadata */}
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
        {/* Poster */}
        <div className="relative shrink-0 w-28 h-[168px] sm:w-32 sm:h-48 overflow-hidden rounded-xl bg-muted shadow-sm">
          {posterPath ? (
            <Image
              src={`https://image.tmdb.org/t/p/w342${posterPath}`}
              alt={`${title} (${year}) ${type === "tv" ? "TV show" : "movie"} poster`}
              fill
              className="object-cover"
              sizes="128px"
              priority
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Skeleton className="size-full" />
            </div>
          )}
        </div>

        {/* Metadata */}
        <div className="flex flex-col items-center text-center sm:items-start sm:text-left justify-center gap-2">
          <h1 className="text-lg sm:text-xl font-bold leading-tight tracking-tight">
            {title}
            <span className="ml-1.5 text-lg font-normal text-muted-foreground">
              ({year})
            </span>
          </h1>
          <p className="text-sm text-muted-foreground">
            {typeLabel}
            {genre && <span> · {genre}</span>}
            {ageRating && <span> · {ageRating}</span>}
          </p>

          {/* Analyzing indicator */}
          <div
            className={cn(
              "mt-2 inline-flex items-center gap-2 self-start",
              "rounded-lg border border-amber-500/20 bg-amber-50 px-3 py-1.5"
            )}
          >
            <Sparkles className="size-3.5 text-amber-600 animate-pulse" />
            <span className="text-xs font-semibold text-amber-700 tracking-wide">
              Analyzing content...
            </span>
          </div>
        </div>
      </div>

      {/* Rating breakdown skeleton */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Content Advisory
          </h3>
          <CompositeScoreSkeleton />
        </div>

        {/* Animated progress bar */}
        <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "absolute inset-y-0 left-0 rounded-full",
              "bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400",
              "animate-[shimmer_2s_ease-in-out_infinite]"
            )}
            style={{
              width: "40%",
              animation: "shimmer 2s ease-in-out infinite",
            }}
          />
        </div>

        {/* Category rows */}
        <div className="space-y-0.5">
          {CATEGORIES.map((category, index) => {
            const Icon = category.icon;
            return (
              <div
                key={category.key}
                className={cn(
                  "flex items-center justify-between gap-3",
                  "rounded-lg px-3 py-2"
                )}
                style={{
                  animationDelay: `${index * 80}ms`,
                }}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className="size-4 shrink-0 text-muted-foreground/40"
                    strokeWidth={1.8}
                  />
                  <span className="text-sm text-muted-foreground/60">
                    {category.label}
                  </span>
                </div>
                <Skeleton
                  className="h-5 w-16 rounded-full"
                  style={{
                    animationDelay: `${index * 120}ms`,
                    animationDuration: "1.8s",
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* Notes skeleton */}
        <div className="rounded-lg border border-border/30 bg-muted/20 px-4 py-3 space-y-2">
          <Skeleton className="h-2.5 w-16" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
          <Skeleton className="h-3 w-3/5" />
        </div>
      </div>
    </div>
  );
}
