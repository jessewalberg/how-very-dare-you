import type { CategoryRatings } from "@/lib/scoring";
import { calculateCompositeScore, getSeverityLabel } from "@/lib/scoring";
import { DEFAULT_WEIGHTS } from "@/lib/constants";

interface EpisodeJsonLdProps {
  title: {
    _id: string;
    slug?: string;
    title: string;
    year: number;
    ageRating?: string;
    posterPath?: string;
  };
  episode: {
    _id: string;
    seasonNumber: number;
    episodeNumber: number;
    name?: string;
    overview?: string;
    airDate?: string;
    stillPath?: string;
    ratings?: CategoryRatings;
    status: "unrated" | "rating" | "rated" | "failed";
    ratingNotes?: string;
  };
}

export function EpisodeJsonLd({ title, episode }: EpisodeJsonLdProps) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://howverydareyou.com";
  const titlePath = title.slug ?? title._id;
  const episodeCode = `S${String(episode.seasonNumber).padStart(2, "0")}E${String(
    episode.episodeNumber
  ).padStart(2, "0")}`;
  const episodeName = episode.name ? `${episodeCode}: ${episode.name}` : episodeCode;
  const episodeUrl = `${baseUrl}/title/${titlePath}/season/${episode.seasonNumber}/episode/${episode.episodeNumber}`;

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "TVEpisode",
    name: episodeName,
    url: episodeUrl,
    episodeNumber: episode.episodeNumber,
    partOfSeries: {
      "@type": "TVSeries",
      name: title.title,
      url: `${baseUrl}/title/${titlePath}`,
    },
    partOfSeason: {
      "@type": "CreativeWorkSeason",
      name: `Season ${episode.seasonNumber}`,
      seasonNumber: episode.seasonNumber,
    },
  };

  if (episode.overview) jsonLd.description = episode.overview;
  if (episode.airDate) jsonLd.datePublished = episode.airDate;
  if (title.ageRating) jsonLd.contentRating = title.ageRating;

  if (episode.stillPath) {
    jsonLd.image = episode.stillPath.startsWith("http")
      ? episode.stillPath
      : `https://image.tmdb.org/t/p/w780${episode.stillPath}`;
  } else if (title.posterPath) {
    jsonLd.image = `https://image.tmdb.org/t/p/w780${title.posterPath}`;
  }

  if (episode.status === "rated" && episode.ratings) {
    const composite = calculateCompositeScore(episode.ratings, DEFAULT_WEIGHTS);
    const roundedComposite = Math.round(composite);
    const severityLabel = getSeverityLabel(roundedComposite);

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
      },
      reviewBody:
        episode.ratingNotes ??
        `Episode content advisory: ${severityLabel} overall based on AI analysis.`,
    };
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
      {
        "@type": "ListItem",
        position: 3,
        name: `${title.title} (${title.year})`,
        item: `${baseUrl}/title/${titlePath}`,
      },
      {
        "@type": "ListItem",
        position: 4,
        name: episodeName,
        item: episodeUrl,
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
