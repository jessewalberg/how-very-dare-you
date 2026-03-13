import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { fetchQuery, preloadQuery } from "convex/nextjs";
import { Suspense } from "react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { calculateCompositeScore, getSeverityLabel, isNoFlags } from "@/lib/scoring";
import { CATEGORIES, DEFAULT_WEIGHTS } from "@/lib/constants";
import { TitleDetail } from "@/components/title/TitleDetail";
import { TitleDetailSkeleton } from "@/components/title/TitleDetailSkeleton";
import { TitleJsonLd } from "@/components/seo/TitleJsonLd";
import { resolveTitlePath } from "@/lib/titlePaths";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://howverydareyou.com";
export const revalidate = 3600;

/**
 * Convex document IDs are base-64-ish strings that always contain characters
 * like uppercase letters or digits without hyphens. Slugs are lowercase with
 * hyphens (e.g. "inception-2010"). This heuristic lets us choose the right
 * lookup strategy without a round-trip.
 */
function looksLikeSlug(param: string): boolean {
  return /^[a-z0-9].*-.*[a-z0-9]$/.test(param);
}

async function resolveTitle(param: string) {
  // Try slug lookup first if it looks like a slug
  if (looksLikeSlug(param)) {
    try {
      const title = await fetchQuery(api.titles.getTitleBySlug, { slug: param });
      if (title) return { title, fromSlug: true };
    } catch {
      // Fall through to ID lookup
    }
  }

  // Try as Convex document ID
  try {
    const title = await fetchQuery(api.titles.getTitle, {
      titleId: param as Id<"titles">,
    });
    return title ? { title, fromSlug: false } : null;
  } catch {
    return null;
  }
}

export async function generateMetadata(props: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await props.params;

  const result = await resolveTitle(id);

  if (!result) {
    return {
      title: {
        absolute: "Title Not Found | How Very Dare You",
      },
    };
  }

  const title = result.title;
  const ratings = title.status === "rated" ? title.ratings : undefined;
  const derivedEpisodeComposite =
    (title as { episodeCompositeScore?: number }).episodeCompositeScore;
  const typeLabel = title.type === "tv" ? "TV Show" : "Movie";
  const canonicalParam = resolveTitlePath(title._id, title.slug, title.title, title.year);

  let description: string;
  if (ratings) {
    const composite =
      title.hasEpisodeRatings && typeof derivedEpisodeComposite === "number"
        ? derivedEpisodeComposite
        : calculateCompositeScore(ratings, DEFAULT_WEIGHTS);
    const roundedComposite = Math.round(composite);
    const severityLabel = getSeverityLabel(roundedComposite);
    const noFlags = isNoFlags(ratings);

    if (noFlags) {
      description = `${title.title} (${title.year}) overall score: ${roundedComposite}/4. No cultural or ideological content flags detected. See the full 8-category breakdown.`;
    } else {
      const flaggedCategories = CATEGORIES
        .filter((category) => (ratings[category.key] ?? 0) >= 2)
        .sort(
          (a, b) =>
            (ratings[b.key] ?? 0) - (ratings[a.key] ?? 0)
        )
        .slice(0, 2)
        .map((category) => category.label);

      const flagSummary =
        flaggedCategories.length > 0
          ? ` Flagged categories: ${flaggedCategories.join(", ")}.`
          : "";

      description = `${title.title} (${title.year}) overall score: ${roundedComposite}/4 (${severityLabel}).${flagSummary} See the full 8-category breakdown.`;
    }
  } else {
    description = `${title.title} (${title.year}) parent content advisory with AI-powered cultural and ideological theme ratings. See the full 8-category breakdown.`;
  }

  const ogImage = title.posterPath
    ? `https://image.tmdb.org/t/p/w780${title.posterPath}`
    : `${baseUrl}/og-default.png`;

  return {
    title: {
      absolute: `${title.title} (${title.year}) — Parent Content Advisory | How Very Dare You`,
    },
    description,
    keywords: [
      `${title.title} content advisory`,
      `${title.title} parental guide`,
      `is ${title.title} appropriate for kids`,
      `${title.title} age rating`,
      `${title.title} themes`,
      `${typeLabel.toLowerCase()} content advisory`,
      "parental guide",
      "content ratings",
    ],
    alternates: {
      canonical: `/title/${canonicalParam}`,
    },
    openGraph: {
      title: `${title.title} (${title.year}) — Parent Content Advisory | How Very Dare You`,
      description,
      url: `${baseUrl}/title/${canonicalParam}`,
      siteName: "How Very Dare You",
      images: [
        {
          url: ogImage,
          width: 780,
          height: 1170,
          alt: `${title.title} (${title.year}) poster`,
        },
      ],
      type: title.type === "tv" ? "video.tv_show" : "video.movie",
    },
    twitter: {
      card: "summary_large_image",
      title: `${title.title} (${title.year}) — Parent Content Advisory`,
      description,
      images: [ogImage],
    },
  };
}

export default async function TitlePage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;

  const result = await resolveTitle(id);
  if (!result) notFound();

  const { title: titleData, fromSlug } = result;
  const canonicalPath = `/title/${resolveTitlePath(
    titleData._id,
    titleData.slug,
    titleData.title,
    titleData.year
  )}`;

  if (!fromSlug && id !== canonicalPath.replace("/title/", "")) {
    redirect(canonicalPath);
  }

  if (fromSlug && id !== canonicalPath.replace("/title/", "")) {
    redirect(canonicalPath);
  }

  let preloadedTitle;
  try {
    preloadedTitle = await preloadQuery(api.titles.getTitle, {
      titleId: titleData._id as Id<"titles">,
    });
  } catch {
    notFound();
  }

  return (
    <>
      {titleData && <TitleJsonLd title={titleData} />}
      <Suspense fallback={<TitleDetailSkeleton />}>
        <TitleDetail preloadedTitle={preloadedTitle} />
      </Suspense>
    </>
  );
}
