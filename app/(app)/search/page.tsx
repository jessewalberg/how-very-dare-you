"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useAction } from "convex/react";
import { useState, useEffect } from "react";
import Image from "next/image";
import {
  Search,
  Sparkles,
  Crown,
  AlertCircle,
  Film,
  Tv,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { TitleGrid } from "@/components/browse/TitleGrid";
import type { CategoryRatings } from "@/lib/scoring";

export default function SearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const q = searchParams.get("q") ?? "";

  // Search our DB first
  const dbResults = useQuery(
    api.search.searchTitles,
    q.length >= 2 ? { searchTerm: q } : "skip"
  );

  const rateLimit = useQuery(api.users.getRateLimitStatus);
  const requestRating = useMutation(api.ratings.requestOnDemandRating);
  const searchTMDB = useAction(api.ratings.searchTMDB);

  const [tmdbResults, setTmdbResults] = useState<
    {
      tmdbId: number;
      title: string;
      type: "movie" | "tv";
      year: number;
      posterPath: string | null;
      overview: string;
    }[]
  >([]);
  const [tmdbLoading, setTmdbLoading] = useState(false);
  const [requestingId, setRequestingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isLoading = dbResults === undefined && q.length >= 2;
  const hasDbResults = dbResults && dbResults.length > 0;
  const remaining = rateLimit ? rateLimit.limit - rateLimit.used : null;

  // When DB has no results, search TMDB
  useEffect(() => {
    if (dbResults && dbResults.length === 0 && q.length >= 2) {
      setTmdbLoading(true);
      setTmdbResults([]);
      searchTMDB({ query: q })
        .then(setTmdbResults)
        .catch(() => {})
        .finally(() => setTmdbLoading(false));
    } else {
      setTmdbResults([]);
    }
  }, [dbResults, q, searchTMDB]);

  async function handleRequestRating(
    tmdbId: number,
    title: string,
    type: "movie" | "tv"
  ) {
    setError(null);
    setRequestingId(tmdbId);
    try {
      const titleId = await requestRating({ tmdbId, title, type });
      router.push(`/title/${titleId}`);
    } catch (e: unknown) {
      setError(
        e instanceof Error ? e.message : "Failed to request rating"
      );
    } finally {
      setRequestingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Search Results</h1>
        {q && (
          <p className="mt-0.5 text-sm text-muted-foreground">
            {isLoading
              ? "Searching..."
              : hasDbResults
                ? `${dbResults.length} result${dbResults.length !== 1 ? "s" : ""} for "${q}"`
                : `No rated results for "${q}"`}
          </p>
        )}
      </div>

      {/* Rate limit indicator */}
      {rateLimit && (
        <div
          className={cn(
            "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs",
            remaining === 0
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-border/50 bg-muted/30 text-muted-foreground"
          )}
        >
          <Sparkles className="size-3.5" />
          <span>
            <span className="font-semibold tabular-nums">{remaining}</span> of{" "}
            {rateLimit.limit} on-demand lookups remaining today
          </span>
          {rateLimit.tier === "free" && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto px-1.5 py-0.5 text-[10px] font-semibold gap-1"
              onClick={() => router.push("/settings")}
            >
              <Crown className="size-3" />
              Upgrade
            </Button>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </div>
      )}

      {/* No query */}
      {!q && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-muted">
            <Search className="size-7 text-muted-foreground/50" />
          </div>
          <h2 className="mt-4 text-base font-semibold">
            Search for a title
          </h2>
          <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">
            Enter a movie or TV show name to see its content advisory ratings.
          </p>
        </div>
      )}

      {/* DB Results grid */}
      {q.length >= 2 && (
        <TitleGrid
          titles={
            dbResults?.map((t) => ({
              ...t,
              ratings: t.ratings as CategoryRatings | undefined,
            }))
          }
          isLoading={isLoading}
        />
      )}

      {/* TMDB results — shown when nothing in our DB */}
      {q.length >= 2 && dbResults && dbResults.length === 0 && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex size-10 items-center justify-center rounded-xl bg-amber-50">
                <Sparkles className="size-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">
                  Not yet rated — found on TMDB
                </h3>
                <p className="text-xs text-muted-foreground">
                  Select a title to request an AI content rating (10–30 seconds)
                </p>
              </div>
            </div>

            {tmdbLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">
                  Searching TMDB...
                </span>
              </div>
            )}

            {!tmdbLoading && tmdbResults.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No titles found on TMDB for &ldquo;{q}&rdquo;
              </p>
            )}

            {!tmdbLoading && tmdbResults.length > 0 && (
              <div className="grid gap-2">
                {tmdbResults.map((result) => {
                  const TypeIcon = result.type === "tv" ? Tv : Film;
                  const isRequesting = requestingId === result.tmdbId;

                  return (
                    <div
                      key={`${result.type}-${result.tmdbId}`}
                      className="flex items-center gap-3 rounded-xl border bg-background p-3 transition-colors hover:bg-muted/40"
                    >
                      {/* Poster thumbnail */}
                      <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                        {result.posterPath ? (
                          <Image
                            src={`https://image.tmdb.org/t/p/w92${result.posterPath}`}
                            alt={result.title}
                            fill
                            className="object-cover"
                            sizes="56px"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-muted-foreground/30">
                            <TypeIcon className="size-6" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-sm font-semibold">
                            {result.title}
                          </span>
                          {result.year > 0 && (
                            <span className="shrink-0 text-xs text-muted-foreground">
                              ({result.year})
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <TypeIcon className="size-3" />
                          {result.type === "tv" ? "TV Show" : "Movie"}
                        </div>
                      </div>

                      {/* Request button */}
                      {remaining !== null && remaining > 0 ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={requestingId !== null}
                          onClick={() =>
                            handleRequestRating(
                              result.tmdbId,
                              result.title,
                              result.type
                            )
                          }
                          className="shrink-0 gap-1.5"
                        >
                          {isRequesting ? (
                            <>
                              <Loader2 className="size-3.5 animate-spin" />
                              Rating...
                            </>
                          ) : (
                            <>
                              <Sparkles className="size-3.5" />
                              Rate
                            </>
                          )}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="shrink-0 gap-1 text-xs"
                          onClick={() => router.push("/settings")}
                        >
                          <Crown className="size-3" />
                          Upgrade
                          <ArrowRight className="size-3" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
