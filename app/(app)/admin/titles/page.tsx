"use client";

import { useState } from "react";
import { useQuery, useAction } from "convex/react";
import Link from "next/link";
import Image from "next/image";
import { RefreshCw, Filter } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

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

export default function AdminTitlesPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(undefined);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>(undefined);
  const [confirmTitle, setConfirmTitle] = useState<{
    id: Id<"titles">;
    name: string;
  } | null>(null);
  const [reRating, setReRating] = useState(false);

  const titles = useQuery(api.admin.listTitles, {
    status: statusFilter,
    type: typeFilter,
  });
  const reRateTitle = useAction(api.admin.reRateTitle);

  async function handleReRate() {
    if (!confirmTitle) return;
    setReRating(true);
    try {
      await reRateTitle({ titleId: confirmTitle.id });
      setConfirmTitle(null);
    } catch (e) {
      console.error("Re-rate failed:", e);
    } finally {
      setReRating(false);
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
            {titles.length} result{titles.length !== 1 ? "s" : ""}
          </span>
        )}
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
      {titles && titles.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-sm text-muted-foreground">No titles found.</p>
        </div>
      )}

      {/* Title list */}
      {titles && titles.length > 0 && (
        <div className="space-y-2">
          {titles.map((title) => {
            const ratingSummary = title.ratings
              ? Object.values(title.ratings)
                  .filter((v): v is number => typeof v === "number")
                  .reduce((a, b) => a + b, 0) /
                Object.values(title.ratings).filter(
                  (v): v is number => typeof v === "number"
                ).length
              : null;

            return (
              <div
                key={title._id}
                className="flex items-center gap-3 rounded-lg border bg-card p-3 hover:shadow-sm transition-all"
              >
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
                    <Link
                      href={`/title/${title._id}`}
                      className="text-sm font-semibold truncate hover:underline underline-offset-2"
                    >
                      {title.title}
                    </Link>
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

                {/* Re-rate button */}
                {(title.status === "rated" || title.status === "reviewed" || title.status === "disputed") && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1 shrink-0"
                    onClick={() =>
                      setConfirmTitle({ id: title._id, name: title.title })
                    }
                  >
                    <RefreshCw className="size-3" />
                    Re-rate
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Confirm dialog */}
      <Dialog
        open={!!confirmTitle}
        onOpenChange={(open) => !open && setConfirmTitle(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Re-rate Title</DialogTitle>
            <DialogDescription>
              This will archive the current ratings for{" "}
              <span className="font-medium text-foreground">
                {confirmTitle?.name}
              </span>{" "}
              and send it back through the AI rating pipeline. Previous ratings
              will be preserved in the rating history.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmTitle(null)}
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
    </div>
  );
}
