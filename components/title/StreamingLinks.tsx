"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { ExternalLink } from "lucide-react";

interface StreamingProvider {
  name: string;
  logoPath?: string;
  affiliateUrl?: string;
}

interface StreamingLinksProps {
  providers: StreamingProvider[];
  compact?: boolean;
}

export function StreamingLinks({
  providers,
  compact = false,
}: StreamingLinksProps) {
  if (providers.length === 0) return null;

  return (
    <div className={cn("flex items-center gap-1.5 flex-wrap")}>
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

        if (provider.affiliateUrl) {
          return (
            <a
              key={provider.name}
              href={provider.affiliateUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="no-underline"
            >
              {content}
            </a>
          );
        }

        return <span key={provider.name}>{content}</span>;
      })}
    </div>
  );
}
