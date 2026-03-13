"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { resolveTitlePath } from "@/lib/titlePaths";

export function LandingTrendingTitles() {
  const titles = useQuery(api.titles.getFeaturedRatedTitles, { limit: 6 });

  if (titles === undefined) {
    return (
      <div className="flex flex-wrap justify-center gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-7 w-28 animate-pulse rounded-full bg-muted"
          />
        ))}
      </div>
    );
  }

  if (titles.length === 0) return null;

  return (
    <div className="flex flex-wrap justify-center gap-2">
      <span className="self-center text-xs text-muted-foreground/50">
        Recently analyzed:
      </span>
      {titles.map((title) => (
        <Link
          key={title._id}
          href={`/title/${resolveTitlePath(title._id, title.slug, title.title, title.year)}`}
          className="inline-flex items-center rounded-full border border-border/50 bg-card/80 px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-border hover:text-foreground"
        >
          {title.title}
          <span className="ml-1 text-muted-foreground/50">
            ({title.year})
          </span>
        </Link>
      ))}
    </div>
  );
}
