import type { CategoryRatings } from "@/lib/scoring";
import { calculateCompositeScore, isNoFlags, getSeverityLabel } from "@/lib/scoring";
import { DEFAULT_WEIGHTS } from "@/lib/constants";
import { resolveTitlePath } from "@/lib/titlePaths";
import { getBrowseHubForTitleType } from "@/lib/browseHubs";

interface StreamingProvider {
  name: string;
  url?: string;
  affiliateUrl?: string;
}

interface TitleJsonLdProps {
  title: {
    _id: string;
    slug?: string;
    title: string;
    year: number;
    type: "movie" | "tv" | "youtube";
    overview?: string;
    genre?: string;
    ageRating?: string;
    posterPath?: string;
    ratings?: CategoryRatings;
    status: string;
    aiNotes?: string;
    ratingNotes?: string;
    runtime?: number;
    episodeCompositeScore?: number;
    streamingProviders?: StreamingProvider[];
  };
}

export function TitleJsonLd({ title }: TitleJsonLdProps) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://howverydareyou.com";
  const schemaType = title.type === "tv" ? "TVSeries" : "Movie";
  const titlePath = resolveTitlePath(title._id, title.slug, title.title, title.year);
  const browseHub = getBrowseHubForTitleType(title.type);

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": schemaType,
    name: title.title,
    url: `${baseUrl}/title/${titlePath}`,
    datePublished: String(title.year),
  };

  if (title.overview) jsonLd.description = title.overview;
  if (title.genre) jsonLd.genre = title.genre.split(",").map((g) => g.trim());
  if (title.ageRating) jsonLd.contentRating = title.ageRating;
  if (title.posterPath) {
    jsonLd.image = `https://image.tmdb.org/t/p/w780${title.posterPath}`;
  }
  if (title.runtime && title.type === "movie") {
    jsonLd.duration = `PT${title.runtime}M`;
  }

  if (title.status === "rated" && title.ratings) {
    const composite =
      typeof title.episodeCompositeScore === "number"
        ? title.episodeCompositeScore
        : calculateCompositeScore(title.ratings, DEFAULT_WEIGHTS);
    const roundedComposite = Math.round(composite);
    const severityLabel = getSeverityLabel(roundedComposite);
    const noFlags = isNoFlags(title.ratings);

    jsonLd.review = {
      "@type": "Review",
      author: {
        "@type": "Organization",
        name: "How Very Dare You",
        url: baseUrl,
      },
      reviewRating: {
        "@type": "Rating",
        ratingValue: roundedComposite,
        bestRating: 4,
        worstRating: 0,
        ratingExplanation: noFlags
          ? "No cultural or ideological content flags detected"
          : `${severityLabel} — AI-powered content advisory across 8 cultural and ideological theme categories`,
      },
      reviewBody:
        title.aiNotes ??
        title.ratingNotes ??
        `Content advisory: ${severityLabel} overall.`,
    };
  }

  if (title.streamingProviders && title.streamingProviders.length > 0) {
    const watchActions = title.streamingProviders
      .map((provider) => ({
        provider,
        targetUrl: provider.affiliateUrl ?? provider.url,
      }))
      .filter(
        (
          entry
        ): entry is {
          provider: StreamingProvider;
          targetUrl: string;
        } => typeof entry.targetUrl === "string" && entry.targetUrl.length > 0
      )
      .map((entry) => ({
        "@type": "WatchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: entry.targetUrl,
          actionPlatform: "http://schema.org/DesktopWebPlatform",
        },
        name: `Watch on ${entry.provider.name}`,
      }));

    if (watchActions.length > 0) {
      jsonLd.potentialAction = watchActions;
    }
  }

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: baseUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Browse",
        item: `${baseUrl}/browse`,
      },
      ...(browseHub
        ? [
            {
              "@type": "ListItem",
              position: 3,
              name: browseHub.label,
              item: `${baseUrl}${browseHub.href}`,
            },
          ]
        : []),
      {
        "@type": "ListItem",
        position: browseHub ? 4 : 3,
        name: `${title.title} (${title.year})`,
        item: `${baseUrl}/title/${titlePath}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
    </>
  );
}
