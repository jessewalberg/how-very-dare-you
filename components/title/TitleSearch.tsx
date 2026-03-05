"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useQuery } from "convex/react";
import { Search, Film, Tv, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/convex/_generated/api";
import { CompositeScore } from "@/components/rating/CompositeScore";
import { NoFlagsBadge } from "@/components/rating/NoFlagsBadge";
import posthog from "posthog-js";
import {
  calculateCompositeScore,
  isNoFlags,
  type CategoryRatings,
} from "@/lib/scoring";
import { getEffectiveCategoryWeights } from "@/lib/userWeights";

interface TitleSearchProps {
  placeholder?: string;
  className?: string;
}

export function TitleSearch({
  placeholder = "Search movies and TV shows...",
  className,
}: TitleSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const results = useQuery(
    api.search.searchTitles,
    debouncedQuery.length >= 2 ? { searchTerm: debouncedQuery } : "skip"
  );
  const profile = useQuery(api.users.getMyProfile);
  const effectiveWeights = getEffectiveCategoryWeights(profile);

  const showResults = open && debouncedQuery.length >= 2;

  const handleSelect = useCallback(
    (title: {
      _id: string;
      slug?: string;
      title: string;
      type: string;
      year: number;
    }) => {
      posthog.capture("search_result_clicked", {
        source: "header_search",
        title_id: title._id,
        title: title.title,
        type: title.type,
        year: title.year,
      });
      setOpen(false);
      setQuery("");
      router.push(`/title/${title.slug ?? title._id}`);
    },
    [router]
  );

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      {/* Input */}
      <div
        className={cn(
          "flex items-center gap-2.5 rounded-xl border bg-card px-4 h-11",
          "transition-all duration-200",
          "focus-within:ring-2 focus-within:ring-ring/20 focus-within:border-ring/40",
          showResults && "rounded-b-none border-b-0"
        )}
      >
        <Search className="size-4 shrink-0 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && query.trim()) {
              posthog.capture("search_submitted", {
                source: "header_search",
                query: query.trim(),
                query_length: query.trim().length,
              });
              setOpen(false);
              router.push(`/search?q=${encodeURIComponent(query.trim())}`);
            }
          }}
          placeholder={placeholder}
          className={cn(
            "flex-1 bg-transparent text-sm outline-none",
            "placeholder:text-muted-foreground/60"
          )}
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setDebouncedQuery("");
              inputRef.current?.focus();
            }}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Results dropdown */}
      {showResults && (
        <div
          className={cn(
            "absolute z-50 w-full rounded-b-xl border border-t-0 bg-card shadow-lg",
            "max-h-[min(360px,60vh)] overflow-y-auto",
            "animate-in fade-in-0 slide-in-from-top-1 duration-150"
          )}
        >
          {results === undefined ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="size-4 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
                Searching...
              </div>
            </div>
          ) : results.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                No titles found for &ldquo;{debouncedQuery}&rdquo;
              </p>
              <p className="mt-1 text-xs text-muted-foreground/60">
                Try a different search term
              </p>
            </div>
          ) : (
            <div className="py-1">
              {results.map((title: (typeof results)[number]) => {
                const hasRatings =
                  title.ratings && title.status === "rated";
                const noFlags =
                  hasRatings && isNoFlags(title.ratings as CategoryRatings);
                const composite =
                  hasRatings
                    ? calculateCompositeScore(
                        title.ratings as CategoryRatings,
                        effectiveWeights
                      )
                    : null;
                const TypeIcon = title.type === "tv" ? Tv : Film;

                return (
                  <button
                    key={title._id}
                    onClick={() => handleSelect(title)}
                    className={cn(
                      "flex w-full items-center gap-3 px-3 py-2.5",
                      "text-left transition-colors duration-100",
                      "hover:bg-muted/50 focus:bg-muted/50 outline-none",
                      "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                    )}
                  >
                    {/* Poster thumbnail */}
                    <div className="relative size-12 shrink-0 overflow-hidden rounded-md bg-muted">
                      {title.posterPath ? (
                        <Image
                          src={`https://image.tmdb.org/t/p/w92${title.posterPath}`}
                          alt={`${title.title} (${title.year}) ${title.type === "tv" ? "TV show" : "movie"} poster`}
                          fill
                          className="object-cover"
                          sizes="48px"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <TypeIcon className="size-4 text-muted-foreground/40" />
                        </div>
                      )}
                    </div>

                    {/* Title info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {title.title}
                        <span className="ml-1 font-normal text-muted-foreground">
                          ({title.year})
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <TypeIcon className="size-3" />
                        {title.type === "tv" ? "TV Show" : "Movie"}
                        {title.ageRating && (
                          <span> · {title.ageRating}</span>
                        )}
                      </p>
                    </div>

                    {/* Score or status */}
                    <div className="shrink-0">
                      {noFlags ? (
                        <NoFlagsBadge compact />
                      ) : composite !== null ? (
                        <CompositeScore score={composite} compact />
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-[10px] font-medium text-muted-foreground">
                          <Clock className="size-3" />
                          Not Analyzed
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
