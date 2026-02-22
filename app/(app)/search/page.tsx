"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { useState } from "react";
import Image from "next/image";
import {
  Search,
  Sparkles,
  Crown,
  AlertCircle,
  Film,
  Tv,
  Clock,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TitleGrid } from "@/components/browse/TitleGrid";
import type { CategoryRatings } from "@/lib/scoring";
import type { Id } from "@/convex/_generated/dataModel";

export default function SearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const q = searchParams.get("q") ?? "";

  const results = useQuery(
    api.search.searchTitles,
    q.length >= 2 ? { searchTerm: q } : "skip"
  );

  const rateLimit = useQuery(api.users.getRateLimitStatus);
  const requestRating = useMutation(api.ratings.requestOnDemandRating);
  const [requestingId, setRequestingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isLoading = results === undefined && q.length >= 2;
  const hasResults = results && results.length > 0;
  const remaining = rateLimit ? rateLimit.limit - rateLimit.used : null;

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
              : hasResults
                ? `${results.length} result${results.length !== 1 ? "s" : ""} for "${q}"`
                : `No results for "${q}"`}
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

      {/* Results grid */}
      {q.length >= 2 && (
        <TitleGrid
          titles={
            results?.map((t) => ({
              ...t,
              ratings: t.ratings as CategoryRatings | undefined,
            }))
          }
          isLoading={isLoading}
        />
      )}

      {/* No results — suggest on-demand rating */}
      {q.length >= 2 && results && results.length === 0 && (
        <NotInDatabase
          query={q}
          remaining={remaining}
          requestingId={requestingId}
          onRequest={handleRequestRating}
        />
      )}
    </div>
  );
}

function NotInDatabase({
  query,
  remaining,
  requestingId,
  onRequest,
}: {
  query: string;
  remaining: number | null;
  requestingId: number | null;
  onRequest: (tmdbId: number, title: string, type: "movie" | "tv") => void;
}) {
  // In a real implementation, this would search TMDB via a Convex action.
  // For now, show a static prompt to request a rating.
  return (
    <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 p-8">
      <div className="mx-auto max-w-md text-center space-y-4">
        <div className="flex size-12 mx-auto items-center justify-center rounded-xl bg-amber-50">
          <Sparkles className="size-5 text-amber-600" />
        </div>
        <div>
          <h3 className="text-base font-semibold">
            &ldquo;{query}&rdquo; hasn&apos;t been rated yet
          </h3>
          <p className="mt-1.5 text-sm text-muted-foreground">
            We can rate this title on-demand using AI. The rating typically
            takes 10–30 seconds.
          </p>
        </div>
        {remaining !== null && remaining > 0 ? (
          <Button
            onClick={() => {
              // Placeholder — in production this would first search TMDB
              // to get the tmdbId and type, then call onRequest
              onRequest(0, query, "movie");
            }}
            disabled={requestingId !== null}
            className="gap-1.5"
          >
            {requestingId !== null ? (
              <>
                <div className="size-3.5 animate-spin rounded-full border-2 border-background/30 border-t-background" />
                Requesting...
              </>
            ) : (
              <>
                <Sparkles className="size-3.5" />
                Request On-Demand Rating
              </>
            )}
          </Button>
        ) : (
          <div className="space-y-2">
            <p className="text-sm font-medium text-red-600">
              Daily lookup limit reached
            </p>
            <Button variant="outline" size="sm" className="gap-1.5" asChild>
              <a href="/settings">
                <Crown className="size-3.5" />
                Upgrade for more lookups
                <ArrowRight className="size-3" />
              </a>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
