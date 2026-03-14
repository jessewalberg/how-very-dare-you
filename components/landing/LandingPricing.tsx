"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const FREE_FEATURES = [
  "Search any title",
  "Full 8-category breakdown",
  "Browse low advisory picks",
  "Filter by age range",
  "3 on-demand AI analyses/day (with free account)",
];

const PREMIUM_FEATURES = [
  "Everything in Free",
  "Weight categories that matter most to your family",
  "Get a single score tuned to your values",
  "Advanced filters",
  "Save to watchlist",
  "10 on-demand AI analyses/day",
];

export function LandingPricing() {
  const [interval, setInterval] = useState<"month" | "year">("month");

  return (
    <section className="border-b border-border/30">
      <div className="mx-auto max-w-7xl px-4 py-16 md:py-20">
        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Simple, Transparent Pricing
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Most features are free. Upgrade for personalization.
          </p>

          {/* Billing interval toggle */}
          <div className="mt-6 inline-flex items-center gap-1 rounded-lg bg-muted p-1">
            <button
              type="button"
              onClick={() => setInterval("month")}
              className={cn(
                "rounded-md px-4 py-2 text-sm font-medium transition-colors",
                interval === "month"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setInterval("year")}
              className={cn(
                "rounded-md px-4 py-2 text-sm font-medium transition-colors",
                interval === "year"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Annual
              <span className="ml-1.5 text-xs text-emerald-500 font-semibold">
                save 33%
              </span>
            </button>
          </div>
        </div>

        <div className="mx-auto mt-12 grid max-w-3xl gap-6 sm:grid-cols-2">
          {/* Free */}
          <div className="rounded-2xl border border-border/60 bg-card p-6 space-y-5">
            <div>
              <h3 className="text-lg font-bold">Free</h3>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold tracking-tight">
                  $0
                </span>
                <span className="text-sm text-muted-foreground">/month</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Everything you need to make informed decisions.
              </p>
            </div>
            <ul className="space-y-2.5">
              {FREE_FEATURES.map((feature) => (
                <li
                  key={feature}
                  className="flex items-start gap-2 text-sm"
                >
                  <Check className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                  {feature}
                </li>
              ))}
            </ul>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/browse">Start Browsing</Link>
            </Button>
          </div>

          {/* Premium */}
          <div className="relative rounded-2xl border-2 border-foreground bg-card p-6 space-y-5">
            <div className="absolute -top-3 right-4 rounded-full bg-foreground px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest text-background">
              Pro
            </div>
            <div>
              <h3 className="text-lg font-bold">Premium</h3>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold tracking-tight">
                  {interval === "year" ? "$39.99" : "$4.99"}
                </span>
                <span className="text-sm text-muted-foreground">
                  /{interval === "year" ? "year" : "month"}
                </span>
              </div>
              {interval === "year" && (
                <p className="mt-1 text-xs text-emerald-500 font-medium">
                  $3.33/month · Save $19.89/year
                </p>
              )}
              <p className="mt-2 text-sm text-muted-foreground">
                Scores tuned to your family&apos;s priorities.
              </p>
            </div>
            <ul className="space-y-2.5">
              {PREMIUM_FEATURES.map((feature) => (
                <li
                  key={feature}
                  className="flex items-start gap-2 text-sm"
                >
                  <Check className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                  {feature}
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">
              For families who want to prioritize specific categories — like
              sexuality high and political lower — and get a personalized
              composite score.{" "}
              <Link
                href="/settings#weights"
                className="font-medium underline underline-offset-2"
              >
                See weighting controls
              </Link>
              .
            </p>
            <Button className="w-full" asChild>
              <Link href="/settings#weights">Get Premium</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
