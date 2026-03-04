import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { fetchQuery } from "convex/nextjs";
import { ArrowLeft, Clock, Tv } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RatingBreakdown } from "@/components/rating/RatingBreakdown";
import { EpisodeJsonLd } from "@/components/seo/EpisodeJsonLd";
import { CATEGORIES, DEFAULT_WEIGHTS } from "@/lib/constants";
import {
  calculateCompositeScore,
  getSeverityLabel,
  type CategoryRatings,
} from "@/lib/scoring";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://howverydareyou.com";
export const revalidate = 60 * 60;

type EpisodePageParams = {
  id: string;
  season: string;
  episode: string;
};

function looksLikeSlug(param: string): boolean {
  return /^[a-z0-9].*-.*[a-z0-9]$/.test(param);
}

function parsePositiveInt(value: string): number | null {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

async function resolveTitle(param: string) {
  if (looksLikeSlug(param)) {
    try {
      const title = await fetchQuery(api.titles.getTitleBySlug, { slug: param });
      if (title) return { title, fromSlug: true };
    } catch {
      // Fall through to ID lookup.
    }
  }

  try {
    const title = await fetchQuery(api.titles.getTitle, {
      titleId: param as Id<"titles">,
    });
    return title ? { title, fromSlug: false } : null;
  } catch {
    return null;
  }
}

async function resolveEpisodePageData(params: EpisodePageParams) {
  const seasonNumber = parsePositiveInt(params.season);
  const episodeNumber = parsePositiveInt(params.episode);
  if (!seasonNumber || !episodeNumber) return null;

  const titleResult = await resolveTitle(params.id);
  if (!titleResult || titleResult.title.type !== "tv") return null;

  const episode = await fetchQuery(api.episodes.getEpisodeByTitleSeasonEpisode, {
    titleId: titleResult.title._id as Id<"titles">,
    seasonNumber,
    episodeNumber,
  });

  if (!episode) return null;

  return {
    ...titleResult,
    seasonNumber,
    episodeNumber,
    episode,
  };
}

export async function generateMetadata(props: {
  params: Promise<EpisodePageParams>;
}): Promise<Metadata> {
  const params = await props.params;
  const resolved = await resolveEpisodePageData(params);

  if (!resolved) {
    return {
      title: {
        absolute: "Episode Not Found | How Very Dare You",
      },
    };
  }

  const { title, episode, seasonNumber, episodeNumber } = resolved;
  const titlePath = title.slug ?? title._id;
  const episodeCode = `S${String(seasonNumber).padStart(2, "0")}E${String(episodeNumber).padStart(2, "0")}`;
  const episodeLabel = episode.name
    ? `${episodeCode}: ${episode.name}`
    : `${episodeCode} Episode`;

  const hasRatings = episode.status === "rated" && Boolean(episode.ratings);
  const ratings = episode.ratings as CategoryRatings | undefined;

  let description =
    `${title.title} ${episodeCode} content advisory and parental guide.` +
    " AI-powered cultural and ideological theme ratings from How Very Dare You.";

  if (hasRatings && ratings) {
    const composite = calculateCompositeScore(ratings, DEFAULT_WEIGHTS);
    const severityLabel = getSeverityLabel(Math.round(composite));
    const flaggedCategories = CATEGORIES
      .filter((category) => (ratings[category.key] ?? 0) >= 2)
      .sort((a, b) => (ratings[b.key] ?? 0) - (ratings[a.key] ?? 0))
      .slice(0, 3)
      .map((category) => category.label);

    const notableThemes =
      flaggedCategories.length > 0
        ? ` Notable themes: ${flaggedCategories.join(", ")}.`
        : "";
    description = `Episode advisory for ${title.title} ${episodeCode}: ${severityLabel} overall.${notableThemes} AI-powered ratings for parents.`;
  }

  const imageUrl = episode.stillPath
    ? episode.stillPath.startsWith("http")
      ? episode.stillPath
      : `https://image.tmdb.org/t/p/w780${episode.stillPath}`
    : title.posterPath
      ? `https://image.tmdb.org/t/p/w780${title.posterPath}`
      : `${baseUrl}/og-default.png`;

  const canonicalPath = `/title/${titlePath}/season/${seasonNumber}/episode/${episodeNumber}`;

  return {
    title: {
      absolute: `${title.title} ${episodeLabel} Content Advisory — Is It Appropriate for Kids? | How Very Dare You`,
    },
    description,
    keywords: [
      `${title.title} ${episodeCode} parental guide`,
      `${title.title} ${episodeCode} content advisory`,
      `is ${title.title} ${episodeCode} appropriate for kids`,
      `${title.title} episode advisory`,
      "TV episode parental guide",
    ],
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title: `${title.title} ${episodeLabel} — Content Advisory`,
      description,
      url: `${baseUrl}${canonicalPath}`,
      siteName: "How Very Dare You",
      images: [
        {
          url: imageUrl,
          width: 780,
          height: 1170,
          alt: `${title.title} ${episodeCode} advisory image`,
        },
      ],
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: `${title.title} ${episodeLabel} — Content Advisory`,
      description,
      images: [imageUrl],
    },
  };
}

export default async function EpisodePage(props: {
  params: Promise<EpisodePageParams>;
}) {
  const params = await props.params;
  const resolved = await resolveEpisodePageData(params);
  if (!resolved) notFound();

  const { title, fromSlug, episode, seasonNumber, episodeNumber } = resolved;
  const titlePath = title.slug ?? title._id;

  if (!fromSlug && title.slug) {
    redirect(`/title/${title.slug}/season/${seasonNumber}/episode/${episodeNumber}`);
  }

  const parentTitleHref = `/title/${titlePath}`;
  const episodeCode = `S${String(seasonNumber).padStart(2, "0")}E${String(episodeNumber).padStart(2, "0")}`;
  const episodeHeading = episode.name ? `${episodeCode}: ${episode.name}` : episodeCode;
  const hasRatings = episode.status === "rated" && Boolean(episode.ratings);
  const ratings = episode.ratings as CategoryRatings | undefined;
  const imageUrl = episode.stillPath
    ? episode.stillPath.startsWith("http")
      ? episode.stillPath
      : `https://image.tmdb.org/t/p/w500${episode.stillPath}`
    : title.posterPath
      ? `https://image.tmdb.org/t/p/w500${title.posterPath}`
      : null;

  return (
    <>
      <EpisodeJsonLd title={title} episode={episode} />
      <div className="mx-auto max-w-5xl space-y-6">
        <Link
          href={parentTitleHref}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to {title.title}
        </Link>

        <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
          <div className="space-y-3">
            <div className="relative aspect-video w-full overflow-hidden rounded-xl border bg-muted">
              {imageUrl ? (
                <Image
                  src={imageUrl}
                  alt={`${title.title} ${episodeCode} still image`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 220px"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground/40">
                  <Tv className="size-10" />
                </div>
              )}
            </div>
            <div className="rounded-lg border bg-card p-3 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">{title.title}</p>
              <p className="mt-1">{title.year}</p>
              {episode.airDate && <p className="mt-1">Aired: {episode.airDate}</p>}
              {episode.runtime && (
                <p className="mt-1 inline-flex items-center gap-1">
                  <Clock className="size-3.5" />
                  {episode.runtime}m
                </p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="text-xs font-semibold">
                  TV Episode
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {title.title} ({title.year})
                </span>
              </div>
              <h1 className="break-words text-3xl font-extrabold tracking-tight">
                {episodeHeading}
              </h1>
              {episode.overview && (
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {episode.overview}
                </p>
              )}
            </div>

            {hasRatings && ratings ? (
              <RatingBreakdown
                ratings={ratings}
                notes={episode.ratingNotes ?? undefined}
              />
            ) : (
              <div className="rounded-xl border bg-card p-5">
                <h2 className="text-lg font-semibold">Episode Analysis Pending</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  This episode has not been analyzed yet. Open the parent title page to
                  request AI analysis.
                </p>
                <Button asChild className="mt-4">
                  <Link href={parentTitleHref}>Open Title Advisory</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
