"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { formatDisplayParentSignupCount } from "@/lib/socialProof";

export function LandingStatsBar() {
  const stats = useQuery(api.titles.getStats);
  const parentSignupCount = formatDisplayParentSignupCount(stats?.userCount);

  const items = [
    {
      value: stats ? `${stats.ratedCount}+` : "...",
      label: "Titles Rated",
    },
    { value: "8", label: "Categories" },
    { value: "0–4", label: "Severity Scale" },
    { value: parentSignupCount, label: "Parents Signed Up" },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="text-center">
          <p className="text-2xl font-extrabold tracking-tight sm:text-3xl">
            {item.value}
          </p>
          <p className="mt-0.5 text-xs font-medium text-muted-foreground">
            {item.label}
          </p>
        </div>
      ))}
    </div>
  );
}
