import { Skeleton } from "@/components/ui/skeleton";

export function CompositeScoreSkeleton({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return <Skeleton className="h-7 w-24 rounded-md" />;
  }

  return (
    <div className="flex flex-col items-center gap-1.5">
      <Skeleton className="size-20 rounded-2xl" />
      <Skeleton className="h-3 w-28" />
      <Skeleton className="h-2.5 w-36" />
    </div>
  );
}
