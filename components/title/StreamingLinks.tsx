"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { ExternalLink } from "lucide-react";
import posthog from "posthog-js";
import { buildWatchProviderRedirectUrl, type WatchProviderSurface } from "@/lib/affiliateTracking";

interface StreamingProvider {
  name: string;
  logoPath?: string;
  affiliateUrl?: string;
  url?: string;
}

interface StreamingLinksProps {
  titleId: string;
  tmdbId: number;
  titleType: "movie" | "tv" | "youtube";
  providers: StreamingProvider[];
  surface?: WatchProviderSurface;
  compact?: boolean;
}

export function StreamingLinks({
  titleId,
  tmdbId,
  titleType,
  providers,
  surface = "title_detail",
  compact = false,
}: StreamingLinksProps) {
  if (providers.length === 0) return null;

  let distinctId: string | null = null;
  try {
    distinctId = posthog.get_distinct_id();
  } catch {
    distinctId = null;
  }

  return (
    <div
      className={cn("flex items-center gap-1.5 flex-wrap")}
      data-title-id={titleId}
      data-tmdb-id={tmdbId}
      data-title-type={titleType}
    >
      {!compact && (
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mr-1">
          Watch on
        </span>
      )}
      {providers.map((provider) => {
        const content = (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md",
              "border border-border/40 bg-muted/40",
              "transition-all duration-200",
              "hover:bg-muted/80 hover:border-border/60 hover:shadow-sm",
              compact ? "px-1.5 py-0.5" : "px-2.5 py-1"
            )}
          >
            {provider.logoPath ? (
              <Image
                src={`https://image.tmdb.org/t/p/w45${provider.logoPath}`}
                alt={provider.name}
                width={compact ? 14 : 18}
                height={compact ? 14 : 18}
                className="rounded-sm"
              />
            ) : null}
            <span
              className={cn(
                "font-medium text-muted-foreground",
                compact ? "text-[9px]" : "text-xs"
              )}
            >
              {provider.name}
            </span>
            {provider.affiliateUrl && !compact && (
              <ExternalLink className="size-2.5 text-muted-foreground/50" />
            )}
          </span>
        );

        const href = buildWatchProviderRedirectUrl({
          titleId,
          providerName: provider.name,
          surface,
          distinctId,
        });

        return (
          <a
            key={provider.name}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="no-underline"
          >
            {content}
          </a>
        );
      })}
    </div>
  );
}
