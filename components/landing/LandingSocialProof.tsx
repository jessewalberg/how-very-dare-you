"use client";

import { useQuery } from "convex/react";
import { Shield, Users, BarChart3, CheckCircle2 } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { formatDisplayParentSignupCount } from "@/lib/socialProof";

export function LandingSocialProof() {
  const stats = useQuery(api.titles.getStats);
  const parentSignupCount = formatDisplayParentSignupCount(stats?.userCount);

  const items = [
    {
      icon: Users,
      label: "Parents signed up",
      value: parentSignupCount,
    },
    {
      icon: BarChart3,
      label: "Titles analyzed",
      value: stats ? `${stats.ratedCount}+` : "...",
    },
    {
      icon: Shield,
      label: "Categories tracked",
      value: "8",
    },
    {
      icon: CheckCircle2,
      label: "Always free to search",
      value: "Free",
    },
  ];

  return (
    <div className="mx-auto max-w-3xl text-center space-y-6">
      <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
        Trusted by Parents
      </h2>

      <p className="text-sm leading-relaxed text-muted-foreground">
        Join {parentSignupCount} parents already using How Very Dare You to
        make informed viewing decisions for their families.
      </p>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {items.map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-border/50 bg-card/80 p-4 space-y-1"
          >
            <item.icon
              className="mx-auto size-5 text-muted-foreground/50"
              strokeWidth={1.5}
            />
            <p className="text-lg font-extrabold tracking-tight">
              {item.value}
            </p>
            <p className="text-[11px] text-muted-foreground">{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
