import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchQuery, preloadQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  calculateCompositeScore,
  getSeverityLabel,
  isNoFlags,
  type CategoryRatings,
} from "@/lib/scoring";
import { CATEGORIES, DEFAULT_WEIGHTS, SEVERITY_LEVELS } from "@/lib/constants";
import { TitleDetail } from "@/components/title/TitleDetail";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://howverydareyou.com";

export async function generateMetadata(props: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await props.params;

  let title;
  try {
    title = await fetchQuery(api.titles.getTitle, {
      titleId: id as Id<"titles">,
    });
  } catch {
    return { title: "Title Not Found" };
  }

  if (!title) return { title: "Title Not Found" };

  const hasRatings = title.ratings && title.status === "rated";
  const ratings = title.ratings as CategoryRatings | undefined;
  const composite = hasRatings
    ? calculateCompositeScore(ratings!, DEFAULT_WEIGHTS)
    : null;
  const severity = composite !== null ? getSeverityLabel(composite) : "Pending";
  const noFlags = ratings ? isNoFlags(ratings) : false;

  const description = noFlags
    ? `${title.title} (${title.year}) has no cultural or ideological flags. Safe for all ages according to our content advisory analysis.`
    : `Content advisory for ${title.title} (${title.year}): ${severity} overall. See detailed breakdown of 8 cultural and ideological theme categories for parents.`;

  return {
    title: `${title.title} (${title.year}) Content Advisory`,
    description,
    openGraph: {
      title: `Is ${title.title} appropriate for kids? Content Advisory`,
      description: title.ratingNotes || title.overview || description,
      type: "article",
      images: title.posterPath
        ? [`https://image.tmdb.org/t/p/w500${title.posterPath}`]
        : [],
      url: `${baseUrl}/title/${id}`,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title.title} (${title.year}) — Content Advisory`,
      description,
    },
    alternates: {
      canonical: `${baseUrl}/title/${id}`,
    },
  };
}

function buildJsonLd(title: NonNullable<Awaited<ReturnType<typeof fetchQuery<typeof api.titles.getTitle>>>>) {
  const ratings = title.ratings as CategoryRatings | undefined;
  const composite = ratings
    ? calculateCompositeScore(ratings, DEFAULT_WEIGHTS)
    : null;
  const noFlags = ratings ? isNoFlags(ratings) : false;

  // Build the review body from category ratings
  let reviewBody = "";
  if (ratings) {
    const lines = CATEGORIES.map((cat) => {
      const val = ratings[cat.key as keyof CategoryRatings];
      const label = SEVERITY_LEVELS[val as keyof typeof SEVERITY_LEVELS]?.label ?? "Unknown";
      return `${cat.label}: ${label}`;
    });
    reviewBody = lines.join(". ") + ".";
    if (title.ratingNotes) {
      reviewBody += " " + title.ratingNotes;
    }
  }

  const isMovie = title.type === "movie";

  return {
    "@context": "https://schema.org",
    "@type": isMovie ? "Movie" : "TVSeries",
    name: title.title,
    datePublished: title.year ? `${title.year}` : undefined,
    image: title.posterPath
      ? `https://image.tmdb.org/t/p/w500${title.posterPath}`
      : undefined,
    description: title.overview,
    genre: title.genre?.split(", "),
    contentRating: title.ageRating,
    ...(title.runtime && isMovie ? { duration: `PT${title.runtime}M` } : {}),
    review: ratings
      ? {
          "@type": "Review",
          author: {
            "@type": "Organization",
            name: "How Very Dare You",
            url: baseUrl,
          },
          reviewRating: {
            "@type": "Rating",
            ratingValue: composite?.toFixed(1),
            bestRating: "4",
            worstRating: "0",
            ratingExplanation: noFlags
              ? "No cultural or ideological flags detected"
              : `Composite content advisory score: ${getSeverityLabel(composite!)}`,
          },
          reviewBody,
        }
      : undefined,
  };
}

export default async function TitlePage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;

  let preloadedTitle;
  let titleData;
  try {
    [preloadedTitle, titleData] = await Promise.all([
      preloadQuery(api.titles.getTitle, {
        titleId: id as Id<"titles">,
      }),
      fetchQuery(api.titles.getTitle, {
        titleId: id as Id<"titles">,
      }),
    ]);
  } catch {
    notFound();
  }

  const jsonLd = titleData ? buildJsonLd(titleData) : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <TitleDetail preloadedTitle={preloadedTitle} />
    </>
  );
}
