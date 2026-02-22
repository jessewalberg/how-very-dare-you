import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function TitleCardSkeleton() {
  return (
    <div
      className={cn(
        "flex gap-3 rounded-xl border bg-card p-3",
        "sm:flex-col sm:gap-0 sm:p-0 sm:overflow-hidden"
      )}
    >
      {/* Poster */}
      <Skeleton
        className={cn(
          "shrink-0 rounded-lg",
          "w-20 h-[120px]",
          "sm:w-full sm:h-auto sm:aspect-[2/3] sm:rounded-none sm:rounded-t-xl"
        )}
      />

      {/* Info */}
      <div className="flex min-w-0 flex-1 flex-col justify-between gap-2 sm:p-3 sm:pt-2.5">
        <div className="space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <Skeleton className="h-6 w-20 rounded-md" />
        <div className="flex gap-1">
          <Skeleton className="h-4 w-12 rounded-sm" />
          <Skeleton className="h-4 w-12 rounded-sm" />
        </div>
      </div>
    </div>
  );
}
