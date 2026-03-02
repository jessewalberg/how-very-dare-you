"use client";

import { useQuery } from "convex/react";
import { CheckCircle2 } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { TitleGrid } from "@/components/browse/TitleGrid";

export default function NoFlagsPage() {
  const results = useQuery(api.titles.browseNoFlags, { limit: 50 });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col items-center text-center gap-3">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-100">
          <CheckCircle2
            className="size-7 text-emerald-600"
            strokeWidth={2}
          />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            No Flags Content
          </h1>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            Every title here scored zero across all 8 categories. Pure
            entertainment — no disclaimers needed.
          </p>
        </div>
        {results !== undefined && (
          <p className="text-xs text-muted-foreground">
            {results.length} title{results.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      <TitleGrid
        titles={results}
        isLoading={results === undefined}
        emptyState={{
          title: "No no-flags titles yet",
          description:
            "No titles currently meet zero-flag criteria. Check back after more AI analyses are processed.",
          ctaLabel: "Browse all titles",
          ctaHref: "/browse",
        }}
      />
    </div>
  );
}
