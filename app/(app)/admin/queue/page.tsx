"use client";

import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { toast } from "sonner";
import {
  Filter,
  ListOrdered,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type StatusFilter = "queued" | "processing" | "completed" | "failed" | undefined;

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: undefined, label: "All" },
  { value: "queued", label: "Queued" },
  { value: "processing", label: "Processing" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
];

const STATUS_COLORS: Record<string, string> = {
  queued: "bg-slate-100 text-slate-700 border-slate-200",
  processing: "bg-blue-50 text-blue-700 border-blue-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  failed: "bg-red-50 text-red-700 border-red-200",
};

const SOURCE_LABELS: Record<string, string> = {
  batch: "Batch",
  user_request: "User",
  admin_rerate: "Admin Re-rate",
};

export default function AdminQueuePage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(undefined);
  const [acting, setActing] = useState<string | null>(null);
  const items = useQuery(api.admin.getQueueItems, { status: statusFilter });
  const forceComplete = useMutation(api.admin.forceCompleteQueueItem);
  const retryItem = useAction(api.admin.retryQueueItem);
  const deleteItem = useMutation(api.admin.deleteQueueItem);

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
            return (
            <div
              key={item._id}
              className={cn(
                "rounded-lg border bg-card p-3 transition-all hover:shadow-sm",
                "sm:grid sm:grid-cols-[1fr_80px_100px_80px_80px_80px_120px_auto] sm:items-center sm:gap-3"
              )}
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
                    onClick={() =>
                      handleAction(
                        () => forceComplete({ queueItemId: item._id as Id<"ratingQueue"> }),
                        item._id
                      )
                    }
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
                    onClick={() =>
                      handleAction(
                        () => retryItem({ queueItemId: item._id as Id<"ratingQueue"> }),
                        item._id
                      )
                    }
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
                  onClick={() =>
                    handleAction(
                      () => deleteItem({ queueItemId: item._id as Id<"ratingQueue"> }),
                      item._id
                    )
                  }
                >
                  <Trash2 className="size-3.5 text-red-500" />
                </Button>
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
