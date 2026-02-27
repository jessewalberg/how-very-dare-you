"use client";

import { useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { FilterSidebar } from "@/components/browse/FilterSidebar";
import { TitleGrid } from "@/components/browse/TitleGrid";

export default function BrowsePage() {
  const searchParams = useSearchParams();
  const typeParam = searchParams.get("type") as
    | "movie"
    | "tv"
    | "youtube"
    | null;
  const noFlagsOnly = searchParams.get("noFlags") === "true";
  const ageFilters = searchParams.getAll("age");
  const serviceFilters = searchParams.getAll("service");

  // Use the appropriate Convex query
  const browseResults = useQuery(
    api.titles.browse,
    noFlagsOnly ? "skip" : { type: typeParam ?? undefined, status: "rated", limit: 50 }
  );
  const noFlagResults = useQuery(
    api.titles.browseNoFlags,
    noFlagsOnly ? { type: typeParam ?? undefined, limit: 50 } : "skip"
  );
  const rawResults = noFlagsOnly ? noFlagResults : browseResults;

  // Client-side filtering for age rating and streaming services
  const titles = rawResults?.filter((title: NonNullable<typeof rawResults>[number]) => {
    if (
      ageFilters.length > 0 &&
      (!title.ageRating || !ageFilters.includes(title.ageRating))
    ) {
      return false;
    }
    if (serviceFilters.length > 0) {
      const titleServices =
        title.streamingProviders?.map(
          (p: NonNullable<typeof title.streamingProviders>[number]) => p.name
        ) ?? [];
      if (!serviceFilters.some((s) => titleServices.includes(s))) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="flex gap-8">
      <FilterSidebar />

      <div className="flex-1 min-w-0 space-y-4">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {noFlagsOnly ? "No Flags Content" : "Browse Titles"}
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {titles !== undefined
                ? `${titles.length} title${titles.length !== 1 ? "s" : ""}`
                : "Loading..."}
            </p>
          </div>
          {/* Mobile filter button is inside FilterSidebar */}
        </div>

        <TitleGrid titles={titles} isLoading={rawResults === undefined} />
      </div>
    </div>
  );
}
