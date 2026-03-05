"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useAction } from "convex/react";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { SignInButton, useUser } from "@clerk/nextjs";
import {
  Search,
  Sparkles,
  Crown,
  LogIn,
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
import { getEffectiveCategoryWeights } from "@/lib/userWeights";
import {
  SIGN_IN_DAILY_ANALYSIS_PROMPT,
  formatRemainingAnalyses,
  formatUsageResetCopy,
} from "@/lib/analysisCopy";
import posthog from "posthog-js";

export default function SearchPageClient() {
  const { isSignedIn } = useUser();
  const searchParams = useSearchParams();
  const router = useRouter();
  const q = searchParams.get("q") ?? "";

  // Search our DB first
  const dbResults = useQuery(
    api.search.searchTitles,
    q.length >= 2 ? { searchTerm: q } : "skip"
  );
  const profile = useQuery(api.users.getMyProfile);

  const rateLimit = useQuery(api.users.getRateLimitStatus);
  const isAdmin = useQuery(api.admin.isCurrentUserAdmin);
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
      existingTitleId?: string;
      existingTitleSlug?: string;
      existingTitleStatus?: string;
      existingHasRatings?: boolean;
    }[]
  >([]);
  const [tmdbLoading, setTmdbLoading] = useState(false);
  const [tmdbError, setTmdbError] = useState(false);
  const [requestingId, setRequestingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tmdbRetryNonce, setTmdbRetryNonce] = useState(0);
  const trackedSearchQueryRef = useRef<string | null>(null);
  const trackedResultsQueryRef = useRef<string | null>(null);

  const isLoading = dbResults === undefined && q.length >= 2;
  const remaining = rateLimit ? rateLimit.limit - rateLimit.used : null;
  const canAdminAdd = isAdmin === true;
  const canRequestFromSearch =
    canAdminAdd || (isSignedIn && remaining !== null && remaining > 0);
  const effectiveWeights = getEffectiveCategoryWeights(profile);

  // Always search TMDB for additional candidates, then de-duplicate against DB hits.
  useEffect(() => {
    if (q.length >= 2) {
      let cancelled = false;
      setTmdbLoading(true);
      setTmdbError(false);
      setTmdbResults([]);
      searchTMDB({ query: q })
        .then((results) => {
          if (!cancelled) setTmdbResults(results);
        })
        .catch(() => {
          if (!cancelled) setTmdbError(true);
        })
        .finally(() => {
          if (!cancelled) setTmdbLoading(false);
        });
      return () => {
        cancelled = true;
      };
    } else {
      setTmdbResults([]);
      setTmdbLoading(false);
      setTmdbError(false);
    }
  }, [q, searchTMDB, tmdbRetryNonce]);

  const dbKeys = new Set(
    (dbResults ?? []).map(
      (t: NonNullable<typeof dbResults>[number]) => `${t.type}-${t.tmdbId}`
    )
  );
  const tmdbAdditionalResults = tmdbResults.filter(
    (r) => !dbKeys.has(`${r.type}-${r.tmdbId}`)
  );
  const existingFromTmdbCount = tmdbAdditionalResults.filter(
    (r) => r.existingTitleId
  ).length;
  const totalMatchedCount = (dbResults?.length ?? 0) + existingFromTmdbCount;
  const isSearching = isLoading || tmdbLoading;

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) {
      trackedSearchQueryRef.current = null;
      trackedResultsQueryRef.current = null;
      return;
    }

    if (trackedSearchQueryRef.current === query) return;
    trackedSearchQueryRef.current = query;

    posthog.capture("search_submitted", {
      source: "search_page",
      query,
      query_length: query.length,
      signed_in: isSignedIn,
    });
  }, [q, isSignedIn]);

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2 || dbResults === undefined || tmdbLoading) {
      return;
    }
    if (trackedResultsQueryRef.current === query) return;
    trackedResultsQueryRef.current = query;

    posthog.capture("search_results_viewed", {
      source: "search_page",
      query,
      db_results_count: dbResults.length,
      tmdb_additional_results_count: tmdbAdditionalResults.length,
      tmdb_existing_results_count: existingFromTmdbCount,
      total_results_count: dbResults.length + tmdbAdditionalResults.length,
      tmdb_error: tmdbError,
    });
  }, [
    q,
    dbResults,
    tmdbLoading,
    tmdbAdditionalResults.length,
    existingFromTmdbCount,
    tmdbError,
  ]);

  async function handleRequestRating(
    tmdbId: number,
    title: string,
    type: "movie" | "tv"
  ) {
    setError(null);
    setRequestingId(tmdbId);
    try {
      const titleId = await requestRating({ tmdbId, title, type });
      posthog.capture("rating_requested", {
        tmdb_id: tmdbId,
        title,
        type,
        search_query: q,
        is_admin: canAdminAdd,
      });
      router.push(`/title/${titleId}`);
    } catch (err) {
      if (err instanceof Error && err.message.includes("Sign in required")) {
        setError("Sign in to request AI analyses.");
      } else {
        posthog.captureException(err instanceof Error ? err : new Error(String(err)), {
          properties: { tmdb_id: tmdbId, title, type },
        });
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setRequestingId(null);
    }
  }

  function handleOpenExistingAdvisory(result: {
    existingTitleId?: string;
    existingTitleSlug?: string;
    tmdbId: number;
    title: string;
    type: "movie" | "tv";
    existingHasRatings?: boolean;
  }) {
    if (!result.existingTitleId) return;
    posthog.capture("search_result_clicked", {
      source: "search_page_tmdb_existing",
      title_id: result.existingTitleId,
      tmdb_id: result.tmdbId,
      title: result.title,
      type: result.type,
      has_ratings: Boolean(result.existingHasRatings),
      query: q.trim(),
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Search Results</h1>
        {q && (
          <p className="mt-0.5 text-sm text-muted-foreground">
            {isSearching
              ? "Searching..."
              : totalMatchedCount > 0
                ? `${totalMatchedCount} result${totalMatchedCount !== 1 ? "s" : ""} for "${q}"`
                : `No AI-analyzed results for "${q}"`}
          </p>
        )}
      </div>

      {/* Signed-out gate for on-demand requests */}
      {!isSignedIn && !canAdminAdd && (
        <div className="inline-flex max-w-full items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          <LogIn className="size-3.5" />
          <span>{SIGN_IN_DAILY_ANALYSIS_PROMPT}</span>
          <SignInButton mode="modal">
            <Button
              variant="ghost"
              size="sm"
              className="h-auto gap-1 px-1.5 py-0.5 text-[10px] font-semibold"
            >
              Sign In
              <ArrowRight className="size-3" />
            </Button>
          </SignInButton>
        </div>
      )}

      {/* Rate limit indicator */}
      {rateLimit && isSignedIn && (
        <div
          className={cn(
            "inline-flex max-w-full items-center gap-2 rounded-lg border px-3 py-2 text-xs",
            !canAdminAdd && remaining === 0
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-border/50 bg-muted/30 text-muted-foreground"
          )}
        >
          <Sparkles className="size-3.5" />
          <span>
            {canAdminAdd ? (
              "Admin mode: add/re-analyze requests from search are always enabled"
            ) : (
              formatRemainingAnalyses(remaining ?? 0, rateLimit.limit)
            )}
          </span>
          {!canAdminAdd && rateLimit.tier === "free" && (
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

      {!canAdminAdd && isSignedIn && rateLimit && remaining === 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <Crown className="size-4 shrink-0" />
          {rateLimit.tier === "free" ? (
            <p>
              {formatUsageResetCopy(rateLimit.used, rateLimit.limit, "free")}
              <Button
                variant="link"
                className="h-auto p-0 pl-1 text-amber-900 underline-offset-2"
                onClick={() => router.push("/settings")}
              >
                Upgrade to Premium
              </Button>{" "}
              for 10 analyses per day.
            </p>
          ) : (
            <p>{formatUsageResetCopy(rateLimit.used, rateLimit.limit, "paid")}</p>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="size-4 shrink-0" />
          <span>{error}</span>
          <Button
            size="sm"
            variant="outline"
            className="ml-auto h-7 text-xs"
            onClick={() => router.refresh()}
          >
            Retry
          </Button>
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
            dbResults?.map((t: NonNullable<typeof dbResults>[number]) => ({
              ...t,
              ratings: t.ratings as CategoryRatings | undefined,
            }))
          }
          isLoading={isLoading}
          weights={effectiveWeights}
          emptyState={
            q
              ? existingFromTmdbCount > 0
                ? {
                    title: "No exact index matches",
                    description:
                      "We found related titles below that already exist in our database.",
                  }
                : {
                  title: `No results for "${q}"`,
                  description:
                    "Check your spelling or try a different title.",
                  }
              : undefined
          }
        />
      )}

      {/* Additional TMDB results (not already in our DB) */}
      {q.length >= 2 && dbResults && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex size-10 items-center justify-center rounded-xl bg-amber-50">
                <Sparkles className="size-5 text-amber-600" />
              </div>
              <div>
                <h2 className="text-sm font-semibold">
                  More titles from TMDB
                </h2>
                <p className="text-xs text-muted-foreground">
                  View existing advisories or request a new AI analysis for missing titles.
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

            {!tmdbLoading &&
              !tmdbError &&
              dbResults.length === 0 &&
              tmdbAdditionalResults.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No results for &ldquo;{q}&rdquo;. Check your spelling or try a different title.
              </p>
            )}

            {!tmdbLoading && tmdbError && (
              <div className="py-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Something went wrong. Please try again.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => setTmdbRetryNonce((value) => value + 1)}
                >
                  Retry
                </Button>
              </div>
            )}

            {!tmdbLoading && tmdbAdditionalResults.length > 0 && (
              <div className="grid gap-2">
                {tmdbAdditionalResults.map((result) => {
                  const TypeIcon = result.type === "tv" ? Tv : Film;
                  const isRequesting = requestingId === result.tmdbId;
                  const canViewExisting = Boolean(result.existingTitleId);

                  return (
                    <div
                      key={`${result.type}-${result.tmdbId}`}
                      className="flex flex-wrap items-center gap-3 rounded-xl border bg-background p-3 transition-colors hover:bg-muted/40 sm:flex-nowrap"
                    >
                      {/* Poster thumbnail */}
                      <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                        {result.posterPath ? (
                          <Image
                            src={`https://image.tmdb.org/t/p/w92${result.posterPath}`}
                            alt={`${result.title}${result.year > 0 ? ` (${result.year})` : ""} ${result.type === "tv" ? "TV show" : "movie"} poster`}
                            fill
                            className="object-cover"
                            sizes="56px"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-muted-foreground/30">
                            <TypeIcon className="size-6" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
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
                      {canViewExisting ? (
                        <Button
                          size="sm"
                          variant="outline"
                          asChild
                          className="w-full shrink-0 gap-1.5 sm:ml-auto sm:w-auto"
                        >
                          <Link
                            href={`/title/${result.existingTitleSlug ?? result.existingTitleId}`}
                            onClick={() => handleOpenExistingAdvisory(result)}
                          >
                            {result.existingHasRatings ? "View Advisory" : "View Title"}
                          </Link>
                        </Button>
                      ) : canRequestFromSearch ? (
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
                          className="w-full shrink-0 gap-1.5 sm:ml-auto sm:w-auto"
                        >
                          {isRequesting ? (
                            <>
                              <Loader2 className="size-3.5 animate-spin" />
                              {canAdminAdd ? "Adding..." : "Analyzing..."}
                            </>
                          ) : (
                            <>
                              <Sparkles className="size-3.5" />
                              {canAdminAdd ? "Add Title" : "Request AI Analysis"}
                            </>
                          )}
                        </Button>
                      ) : !isSignedIn ? (
                        <SignInButton mode="modal">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="w-full shrink-0 gap-1 text-xs sm:ml-auto sm:w-auto"
                          >
                            <LogIn className="size-3" />
                            Sign In to Request
                            <ArrowRight className="size-3" />
                          </Button>
                        </SignInButton>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="w-full shrink-0 gap-1 text-xs sm:ml-auto sm:w-auto"
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
