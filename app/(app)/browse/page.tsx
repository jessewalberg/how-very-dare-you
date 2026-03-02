"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { FilterSidebar } from "@/components/browse/FilterSidebar";
import { TitleGrid, type TitleData } from "@/components/browse/TitleGrid";
import {
  applyBrowseClientFilters,
  parseMaxSeverityFilters,
} from "@/lib/browseFilters";
import { getEffectiveCategoryWeights } from "@/lib/userWeights";

export default function BrowsePage() {
  return (
    <Suspense>
      <BrowseContent />
    </Suspense>
  );
}

function BrowseContent() {
  const searchParams = useSearchParams();
  const profile = useQuery(api.users.getMyProfile);
  const typeParam = searchParams.get("type") as
    | "movie"
    | "tv"
    | "youtube"
    | null;
  const noFlagsOnly = searchParams.get("noFlags") === "true";
  const ageFilters = searchParams.getAll("age");
  const serviceFilters = searchParams.getAll("service");
  const maxSeverityByCategory = parseMaxSeverityFilters(
    new URLSearchParams(searchParams.toString())
  );
  const isPaid = profile?.tier === "paid";
  const effectiveWeights = getEffectiveCategoryWeights(profile);

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
  const titles = applyBrowseClientFilters<TitleData>(
    rawResults as TitleData[] | undefined,
    {
      ageFilters,
      serviceFilters,
      maxSeverityByCategory,
    }
  );

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:gap-8">
      <FilterSidebar isPaid={isPaid} />

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

        <TitleGrid
          titles={titles}
          isLoading={rawResults === undefined}
          weights={effectiveWeights}
          emptyState={{
            title: "No titles match your filters",
            description:
              "Try adjusting your criteria or browse all titles to see more options.",
            ctaLabel: "Browse all titles",
            ctaHref: "/browse",
          }}
        />
      </div>
    </div>
  );
}
