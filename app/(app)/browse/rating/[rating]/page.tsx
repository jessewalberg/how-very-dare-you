import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AgeRatingBrowsePage } from "@/components/browse/AgeRatingBrowsePage";
import {
  getMovieAgeRatingPage,
  MOVIE_AGE_RATING_PAGES,
  type MovieAgeRatingPageSlug,
} from "@/lib/ageRatingBrowse";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://howverydareyou.com";

export const revalidate = 3600;

export function generateStaticParams() {
  return Object.keys(MOVIE_AGE_RATING_PAGES).map((rating) => ({ rating }));
}

export async function generateMetadata(props: {
  params: Promise<{ rating: string }>;
}): Promise<Metadata> {
  const { rating } = await props.params;
  const page = getMovieAgeRatingPage(rating);

  if (!page) {
    return {
      title: {
        absolute: "Browse Movie Advisories | How Very Dare You",
      },
    };
  }

  return {
    title: page.pageTitle,
    description: page.description,
    alternates: {
      canonical: page.href,
    },
    openGraph: {
      title: `${page.heading} | How Very Dare You`,
      description: page.description,
      url: `${baseUrl}${page.href}`,
    },
  };
}

export default async function BrowseAgeRatingPage(props: {
  params: Promise<{ rating: string }>;
}) {
  const { rating } = await props.params;
  const page = getMovieAgeRatingPage(rating);

  if (!page) notFound();

  return <AgeRatingBrowsePage ratingSlug={rating as MovieAgeRatingPageSlug} />;
}
