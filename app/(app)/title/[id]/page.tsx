import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchQuery, preloadQuery } from "convex/nextjs";
import { Suspense } from "react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { calculateCompositeScore, getSeverityLabel, isNoFlags } from "@/lib/scoring";
import { CATEGORIES, DEFAULT_WEIGHTS } from "@/lib/constants";
import { TitleDetail } from "@/components/title/TitleDetail";
import { TitleDetailSkeleton } from "@/components/title/TitleDetailSkeleton";
import { TitleJsonLd } from "@/components/seo/TitleJsonLd";

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
    return {
      title: {
        absolute: "Title Not Found | How Very Dare You",
      },
    };
  }

  if (!title) {
    return {
      title: {
        absolute: "Title Not Found | How Very Dare You",
      },
    };
  }

  const ratings = title.status === "rated" ? title.ratings : undefined;
  const derivedEpisodeComposite =
    (title as { episodeCompositeScore?: number }).episodeCompositeScore;
  const typeLabel = title.type === "tv" ? "TV Show" : "Movie";

  let description: string;
  if (ratings) {
    const composite =
      title.hasEpisodeRatings && typeof derivedEpisodeComposite === "number"
        ? derivedEpisodeComposite
        : calculateCompositeScore(ratings, DEFAULT_WEIGHTS);
    const severityLabel = getSeverityLabel(Math.round(composite));
    const noFlags = isNoFlags(ratings);

    if (noFlags) {
      description = `${title.title} (${title.year}) has no cultural or ideological content flags. Safe for all audiences. AI-powered content advisory from How Very Dare You.`;
    } else {
      const flaggedCategories = CATEGORIES
        .filter((category) => (ratings[category.key] ?? 0) >= 2)
        .sort(
          (a, b) =>
            (ratings[b.key] ?? 0) - (ratings[a.key] ?? 0)
        )
        .slice(0, 3)
        .map((category) => category.label);

      const flagSummary =
        flaggedCategories.length > 0
          ? ` Notable themes: ${flaggedCategories.join(", ")}.`
          : "";

      description = `Content advisory for ${title.title} (${title.year}): ${severityLabel} overall.${flagSummary} AI-powered cultural and ideological theme ratings for parents.`;
    }
  } else {
    description = `Content advisory and parental guide for ${title.title} (${title.year}). AI-powered cultural and ideological theme ratings from How Very Dare You.`;
  }

  const ogImage = title.posterPath
    ? `https://image.tmdb.org/t/p/w780${title.posterPath}`
    : `${baseUrl}/og-default.png`;

  return {
    title: {
      absolute: `${title.title} (${title.year}) Content Advisory — Is It Appropriate for Kids? | How Very Dare You`,
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
      canonical: `/title/${id}`,
    },
    openGraph: {
      title: `${title.title} (${title.year}) — Content Advisory | How Very Dare You`,
      description,
      url: `${baseUrl}/title/${id}`,
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
      title: `${title.title} (${title.year}) — Content Advisory`,
      description,
      images: [ogImage],
    },
  };
}

export default async function TitlePage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;

  let preloadedTitle;
  let titleData: Awaited<ReturnType<typeof fetchQuery<typeof api.titles.getTitle>>> = null;

  try {
    preloadedTitle = await preloadQuery(api.titles.getTitle, {
      titleId: id as Id<"titles">,
    });
  } catch {
    notFound();
  }

  try {
    titleData = await fetchQuery(api.titles.getTitle, {
      titleId: id as Id<"titles">,
    });
  } catch {
    // Allow page render without JSON-LD if title query fails on this pass.
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
