import type { CategoryRatings } from "@/lib/scoring";
import { calculateCompositeScore, isNoFlags, getSeverityLabel } from "@/lib/scoring";
import { DEFAULT_WEIGHTS } from "@/lib/constants";

interface StreamingProvider {
  name: string;
  url?: string;
  affiliateUrl?: string;
}

interface TitleJsonLdProps {
  title: {
    _id: string;
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
    streamingProviders?: StreamingProvider[];
  };
}

export function TitleJsonLd({ title }: TitleJsonLdProps) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://howverydareyou.com";
  const schemaType = title.type === "tv" ? "TVSeries" : "Movie";

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": schemaType,
    name: title.title,
    url: `${baseUrl}/title/${title._id}`,
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
    const composite = calculateCompositeScore(title.ratings, DEFAULT_WEIGHTS);
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

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
