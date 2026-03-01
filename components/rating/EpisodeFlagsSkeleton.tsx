import { Skeleton } from "@/components/ui/skeleton";

export function EpisodeFlagsSkeleton() {
  return (
    <div className="space-y-1.5" aria-live="polite">
      <div className="rounded-lg border border-border/50 bg-muted/30 px-4 py-3">
        <Skeleton className="h-4 w-44" />
      </div>
      {Array.from({ length: 3 }).map((_, idx) => (
        <div
          key={idx}
          className="rounded-lg border border-border/30 bg-muted/20 px-4 py-3"
        >
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="mt-2 h-3 w-full" />
          <Skeleton className="mt-1 h-3 w-4/5" />
        </div>
      ))}
    </div>
  );
}
