import { Skeleton } from "@/components/ui/skeleton";

export function WeightSlidersSkeleton() {
  return (
    <div className="space-y-6" aria-live="polite">
      <div className="space-y-2">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>

      {Array.from({ length: 9 }).map((_, idx) => (
        <div key={idx} className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-4 w-44 max-w-[75%]" />
            <Skeleton className="h-4 w-8" />
          </div>
          <Skeleton className="h-2.5 w-full rounded-full" />
        </div>
      ))}

      <div className="rounded-xl border bg-muted/20 p-4">
        <Skeleton className="h-3 w-24" />
        <div className="mt-3 flex items-center gap-4">
          <Skeleton className="h-7 w-24 rounded-md" />
          <Skeleton className="h-7 w-24 rounded-md" />
        </div>
      </div>
    </div>
  );
}
