"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Filter,
  Lock,
  CheckCircle2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { CATEGORIES } from "@/lib/constants";
import {
  hasMaxSeverityFilters,
  parseMaxSeverityFilters,
} from "@/lib/browseFilters";

const culturalCategories = CATEGORIES.filter((c) => c.group === "cultural");
const healthCategories = CATEGORIES.filter((c) => c.group === "health");

const CONTENT_TYPES = [
  { value: "", label: "All" },
  { value: "movie", label: "Movies" },
  { value: "tv", label: "TV Shows" },
] as const;

const AGE_RATINGS = [
  "G",
  "PG",
  "PG-13",
  "R",
  "TV-Y",
  "TV-Y7",
  "TV-G",
  "TV-PG",
  "TV-14",
] as const;

const STREAMING_SERVICES = [
  "Netflix",
  "Disney+",
  "Prime Video",
  "Hulu",
  "Max",
  "Apple TV+",
  "Peacock",
  "Paramount+",
] as const;

const THRESHOLD_OPTIONS = [
  { value: "", label: "Any" },
  { value: "0", label: "No concerns only" },
  { value: "1", label: "Up to Brief" },
  { value: "2", label: "Up to Notable" },
  { value: "3", label: "Up to Significant" },
] as const;

interface FilterSidebarProps {
  isPaid?: boolean;
}

function FilterContent({ isPaid = false }: FilterSidebarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentType = searchParams.get("type") ?? "";
  const currentAgeRatings = searchParams.getAll("age");
  const currentServices = searchParams.getAll("service");
  const lowScoresOnly =
    searchParams.get("lowScores") === "true" ||
    searchParams.get("noFlags") === "true";
  const maxSeverityByCategory = parseMaxSeverityFilters(
    new URLSearchParams(searchParams.toString())
  );

  const getLatestParams = useCallback(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search);
    }
    return new URLSearchParams(searchParams.toString());
  }, [searchParams]);

  const pushBrowseParams = useCallback(
    (params: URLSearchParams) => {
      const query = params.toString();
      router.push(query ? `/browse?${query}` : "/browse");
    },
    [router]
  );

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = getLatestParams();
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      if (key === "lowScores") {
        // Normalize legacy param so URLs stay canonical.
        params.delete("noFlags");
      }
      pushBrowseParams(params);
    },
    [getLatestParams, pushBrowseParams]
  );

  const toggleArrayParam = useCallback(
    (key: string, value: string) => {
      const params = getLatestParams();
      const current = params.getAll(key);
      if (current.includes(value)) {
        params.delete(key);
        current
          .filter((v) => v !== value)
          .forEach((v) => params.append(key, v));
      } else {
        params.append(key, value);
      }
      pushBrowseParams(params);
    },
    [getLatestParams, pushBrowseParams]
  );

  const clearFilters = useCallback(() => {
    router.push("/browse");
  }, [router]);

  const hasActiveFilters =
    currentType ||
    currentAgeRatings.length > 0 ||
    currentServices.length > 0 ||
    lowScoresOnly ||
    hasMaxSeverityFilters(maxSeverityByCategory);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="size-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Filters</span>
        </div>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="size-3" />
            Clear all
          </button>
        )}
      </div>

      {/* Content Type */}
      <div className="space-y-2.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Content Type
        </label>
        <div className="flex flex-wrap gap-1.5">
          {CONTENT_TYPES.map((type) => (
            <button
              key={type.value}
              onClick={() => updateParam("type", type.value)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-150",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                currentType === type.value
                  ? "bg-foreground text-background"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      <Separator />

      {/* Age Range */}
      <div className="space-y-2.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Age Rating
        </label>
        <div className="flex flex-wrap gap-1.5">
          {AGE_RATINGS.map((age) => (
            <button
              key={age}
              onClick={() => toggleArrayParam("age", age)}
              className={cn(
                "rounded-md px-2 py-1 text-[11px] font-medium transition-all duration-150",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                currentAgeRatings.includes(age)
                  ? "bg-foreground text-background"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {age}
            </button>
          ))}
        </div>
      </div>

      <Separator />

      {/* Streaming Services */}
      <div className="space-y-2.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Streaming Service
        </label>
        <div className="space-y-1">
          {STREAMING_SERVICES.map((service) => {
            const active = currentServices.includes(service);
            return (
              <button
                key={service}
                onClick={() => toggleArrayParam("service", service)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all duration-150",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  active
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
              >
                <div
                  className={cn(
                    "flex size-4 shrink-0 items-center justify-center rounded border transition-colors",
                    active
                      ? "border-foreground bg-foreground text-background"
                      : "border-border"
                  )}
                >
                  {active && <CheckCircle2 className="size-3" />}
                </div>
                {service}
              </button>
            );
          })}
        </div>
      </div>

      <Separator />

      {/* Category Thresholds (Premium) */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Max Severity
          </label>
          {!isPaid && (
            <Badge
              variant="secondary"
              className="text-[9px] px-1.5 py-0 gap-0.5"
            >
              <Lock className="size-2.5" />
              Premium
            </Badge>
          )}
        </div>
        {!isPaid && (
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Lock className="size-3" />
              Premium: set max severity per category and tune score weights to
              your family priorities.
            </span>
            {" "}
            <Link
              href="/settings#weights"
              className="font-medium underline underline-offset-2"
            >
              Configure weights
            </Link>
            {" "}
            or{" "}
            <Link
              href="/settings#subscription"
              className="font-medium underline underline-offset-2"
            >
              upgrade
            </Link>
          </p>
        )}

        {/* Cultural Themes */}
        <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60 pt-1">
          Cultural Themes
        </p>
        <div className="space-y-1.5">
          {culturalCategories.map((category) => {
            const paramKey = `max_${category.key}`;
            const currentVal = searchParams.get(paramKey) ?? "";
            return (
              <div
                key={category.key}
                className={cn(
                  "flex items-center justify-between gap-2",
                  !isPaid && "opacity-50 pointer-events-none"
                )}
              >
                <span className="text-xs text-muted-foreground truncate">
                  {category.label}
                </span>
                <select
                  value={currentVal}
                  onChange={(e) => updateParam(paramKey, e.target.value)}
                  disabled={!isPaid}
                  className={cn(
                    "h-7 rounded-md border bg-transparent px-2 text-[11px] font-medium text-muted-foreground",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    "disabled:cursor-not-allowed"
                  )}
                >
                  {THRESHOLD_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>

        {/* Developmental Health */}
        <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60 pt-2 border-t border-border/30">
          Developmental Health
        </p>
        <div className="space-y-1.5">
          {healthCategories.map((category) => {
            const paramKey = `max_${category.key}`;
            const currentVal = searchParams.get(paramKey) ?? "";
            return (
              <div
                key={category.key}
                className={cn(
                  "flex items-center justify-between gap-2",
                  !isPaid && "opacity-50 pointer-events-none"
                )}
              >
                <span className="text-xs text-muted-foreground truncate">
                  {category.label}
                </span>
                <select
                  value={currentVal}
                  onChange={(e) => updateParam(paramKey, e.target.value)}
                  disabled={!isPaid}
                  className={cn(
                    "h-7 rounded-md border bg-transparent px-2 text-[11px] font-medium text-muted-foreground",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    "disabled:cursor-not-allowed"
                  )}
                >
                  {THRESHOLD_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      </div>

      <Separator />

      {/* Low advisory toggle */}
      <button
        onClick={() =>
          updateParam("lowScores", lowScoresOnly ? "" : "true")
        }
        className={cn(
          "flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          lowScoresOnly
            ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
            : "bg-muted/60 text-muted-foreground border border-transparent hover:bg-muted hover:text-foreground"
        )}
      >
        <CheckCircle2 className="size-4" />
        Show Low Advisory Only
      </button>
    </div>
  );
}

export function FilterSidebar({ isPaid = false }: FilterSidebarProps) {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-64 shrink-0">
        <div className="sticky top-20 space-y-6 overflow-y-auto max-h-[calc(100vh-6rem)] pr-2 pb-8">
          <FilterContent isPaid={isPaid} />
        </div>
      </aside>

      {/* Mobile sheet trigger + content */}
      <div className="lg:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              aria-label="Open filters"
            >
              <Filter className="size-3.5" />
              Filters
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[min(20rem,100vw-2rem)] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
              <SheetDescription className="sr-only">
                Filter browse results
              </SheetDescription>
            </SheetHeader>
            <div className="px-4 pb-8">
              <FilterContent isPaid={isPaid} />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
