"use client";

import { CheckCircle2 } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export function LandingNoFlagsPreview() {
  const titles = useQuery(api.titles.browseNoFlags, { limit: 4 });

  if (titles === undefined) {
    return (
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-xl border p-3">
            <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
            <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  if (titles.length === 0) {
    return (
      <div className="mt-10 rounded-xl border border-dashed bg-card px-6 py-8 text-center text-sm text-muted-foreground">
        No live no-flags titles yet. Analyze more content to populate this section.
      </div>
    );
  }

  return (
    <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {titles.map((item) => (
        <div
          key={item._id}
          className="group flex items-center gap-3 rounded-xl border border-emerald-200/60 bg-emerald-50/30 p-3 transition-all duration-200 hover:border-emerald-300/80 hover:shadow-sm"
        >
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
            <CheckCircle2 className="size-5" strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight truncate">
              {item.title}
              <span className="ml-1 font-normal text-muted-foreground">
                ({item.year})
              </span>
            </p>
            <p className="text-xs text-muted-foreground">
              {item.type === "tv" ? "TV Show" : "Movie"}
              {item.ageRating ? ` · ${item.ageRating}` : ""}
              {item.genre ? ` · ${item.genre.split(",").slice(0, 2).join(" · ")}` : ""}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
