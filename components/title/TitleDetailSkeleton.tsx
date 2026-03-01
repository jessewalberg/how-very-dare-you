import { Skeleton } from "@/components/ui/skeleton";
import { RatingBreakdownSkeleton } from "@/components/rating/RatingBreakdownSkeleton";

export function TitleDetailSkeleton() {
  return (
    <div className="space-y-6" aria-live="polite">
      <Skeleton className="h-4 w-20" />
      <div className="flex flex-col gap-8 lg:flex-row lg:gap-10">
        <div className="w-full shrink-0 lg:w-auto">
          <Skeleton className="mx-auto aspect-[2/3] w-full max-w-sm rounded-2xl" />
        </div>
        <div className="min-w-0 flex-1 space-y-6">
          <div className="space-y-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-10 w-[90%] max-w-xl" />
            <Skeleton className="h-4 w-full max-w-2xl" />
            <Skeleton className="h-4 w-[90%] max-w-xl" />
          </div>
          <RatingBreakdownSkeleton />
        </div>
      </div>
    </div>
  );
}
