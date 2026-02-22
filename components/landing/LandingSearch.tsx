"use client";

import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useState } from "react";

export function LandingSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className="flex items-center gap-3 rounded-2xl border bg-card pl-5 pr-2 h-14 shadow-sm transition-all duration-200 focus-within:shadow-md focus-within:ring-2 focus-within:ring-ring/20 focus-within:border-ring/40">
        <Search className="size-5 shrink-0 text-muted-foreground/60" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search any movie or TV show..."
          className="flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground/50"
        />
        <button
          type="submit"
          className="shrink-0 rounded-xl bg-foreground px-5 py-2.5 text-sm font-semibold text-background transition-all duration-150 hover:bg-foreground/90 active:scale-[0.97]"
        >
          Search
        </button>
      </div>
    </form>
  );
}
