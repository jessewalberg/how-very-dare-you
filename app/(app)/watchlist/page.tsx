"use client";

import { useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import {
  Bookmark,
  Crown,
  LogIn,
  ArrowRight,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { TitleGrid } from "@/components/browse/TitleGrid";
import type { CategoryRatings } from "@/lib/scoring";
import { getEffectiveCategoryWeights } from "@/lib/userWeights";

export default function WatchlistPage() {
  const { isSignedIn, isLoaded } = useUser();
  const profile = useQuery(api.users.getMyProfile);
  const watchlist = useQuery(api.users.getWatchlist);

  if (!isLoaded) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-8 w-40 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-4 w-48 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-64 w-full animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  // Not signed in
  if (!isSignedIn) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-muted">
          <LogIn className="size-7 text-muted-foreground/50" />
        </div>
        <h1 className="mt-4 text-xl font-bold">Sign in to view your watchlist</h1>
        <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">
          Save titles you want to watch and track their content ratings.
        </p>
        <Button className="mt-6" asChild>
          <Link href="/sign-in">Sign In</Link>
        </Button>
      </div>
    );
  }

  // Free tier
  if (profile && profile.tier === "free") {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-muted">
          <Crown className="size-7 text-muted-foreground/50" />
        </div>
        <h1 className="mt-4 text-xl font-bold">Watchlist is a Premium feature</h1>
        <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">
          Upgrade to save titles and build your personal watchlist.
        </p>
        <Button className="mt-6 gap-1.5" asChild>
          <Link href="/settings">
            <Crown className="size-4" />
            Upgrade to Premium
            <ArrowRight className="size-3.5" />
          </Link>
        </Button>
      </div>
    );
  }

  const isLoading = watchlist === undefined;
  const isEmpty = watchlist && watchlist.length === 0;
  const effectiveWeights = getEffectiveCategoryWeights(profile);
  type WatchlistItem = Exclude<NonNullable<typeof watchlist>[number], null>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Watchlist</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {isLoading
            ? "Loading..."
            : isEmpty
              ? "Your watchlist is empty"
              : `${watchlist.length} title${watchlist.length !== 1 ? "s" : ""} saved`}
        </p>
      </div>

      {/* Empty state */}
      {isEmpty && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-muted">
            <Bookmark className="size-7 text-muted-foreground/50" />
          </div>
          <h2 className="mt-4 text-base font-semibold">No titles saved yet</h2>
          <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">
            Your watchlist is empty. Browse titles and tap the bookmark icon to save them here.
          </p>
          <Button variant="outline" className="mt-6" asChild>
            <Link href="/browse">Browse Titles</Link>
          </Button>
        </div>
      )}

      {/* Watchlist grid */}
      <TitleGrid
        titles={
          watchlist
            ?.filter(
              (t: NonNullable<typeof watchlist>[number]): t is WatchlistItem =>
                t !== null
            )
            .map((t: WatchlistItem) => ({
              ...t,
              ratings: t.ratings as CategoryRatings | undefined,
            }))
        }
        isLoading={isLoading}
        weights={effectiveWeights}
      />
    </div>
  );
}
