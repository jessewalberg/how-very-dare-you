import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function TitleCardSkeleton() {
  return (
    <div
      className={cn(
        "flex gap-3.5 rounded-2xl border border-border/60 bg-card/95 p-3.5"
      )}
    >
      {/* Poster */}
      <Skeleton
        className={cn(
          "h-[132px] w-[88px] shrink-0 rounded-xl"
        )}
      />

      {/* Info */}
      <div className="flex min-w-0 flex-1 flex-col justify-between gap-2.5">
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-[85%]" />
          <Skeleton className="h-4 w-[60%]" />
          <Skeleton className="h-3 w-2/3" />
        </div>
        <Skeleton className="h-6 w-24 rounded-md" />
        <div className="flex gap-1.5">
          <Skeleton className="h-5 w-14 rounded-md" />
          <Skeleton className="h-5 w-14 rounded-md" />
        </div>
      </div>
    </div>
  );
}
