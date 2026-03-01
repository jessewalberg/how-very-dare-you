import { Skeleton } from "@/components/ui/skeleton";
import { CATEGORIES } from "@/lib/constants";
import { CompositeScoreSkeleton } from "@/components/rating/CompositeScoreSkeleton";

export function RatingBreakdownSkeleton() {
  return (
    <div className="space-y-5" aria-live="polite">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-56" />
        </div>
        <CompositeScoreSkeleton />
      </div>

      <div className="space-y-1">
        {CATEGORIES.map((category) => (
          <div
            key={category.key}
            className="flex items-center justify-between gap-3 rounded-lg px-3 py-2"
          >
            <div className="flex items-center gap-2.5">
              <category.icon className="size-4 text-muted-foreground/40" strokeWidth={1.8} />
              <Skeleton className="h-4 w-40" />
            </div>
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
