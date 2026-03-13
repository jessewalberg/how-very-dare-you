export const MOVIE_AGE_RATING_PAGES = {
  g: {
    rating: "G",
    href: "/browse/rating/g",
    label: "G",
    heading: "G-Rated Movie Advisories",
    pageTitle: "Browse G-Rated Movie Content Advisories",
    description:
      "Browse AI-analyzed G-rated movie advisories with clear 0-4 category scores, family context, and quick links for parents.",
    intro:
      "Browse G-rated movies with AI-analyzed advisory details, age labels, and category-level context that goes beyond a single MPAA badge.",
  },
  pg: {
    rating: "PG",
    href: "/browse/rating/pg",
    label: "PG",
    heading: "PG Movie Advisories",
    pageTitle: "Browse PG Movie Content Advisories",
    description:
      "Browse AI-analyzed PG movie advisories with transparent category scores, family context, and low-advisory discovery paths for parents.",
    intro:
      "Browse PG-rated movies with AI-analyzed advisory details so parents can compare age labels with category-level themes before movie night.",
  },
  "pg-13": {
    rating: "PG-13",
    href: "/browse/rating/pg-13",
    label: "PG-13",
    heading: "PG-13 Movie Advisories",
    pageTitle: "Browse PG-13 Movie Content Advisories",
    description:
      "Browse AI-analyzed PG-13 movie advisories with transparent category scores, content themes, and parent-focused guidance.",
    intro:
      "Browse PG-13 movies with AI-analyzed advisory details so parents can quickly understand which themes are driving the rating.",
  },
  r: {
    rating: "R",
    href: "/browse/rating/r",
    label: "R",
    heading: "R-Rated Movie Advisories",
    pageTitle: "Browse R-Rated Movie Content Advisories",
    description:
      "Browse AI-analyzed R-rated movie advisories with category-level theme scores, family context, and detailed parent guidance.",
    intro:
      "Browse R-rated movies with AI-analyzed advisory details and category-level context that helps parents move past a broad age label.",
  },
} as const;

export type MovieAgeRatingPageSlug = keyof typeof MOVIE_AGE_RATING_PAGES;

export function getMovieAgeRatingPage(slug: string) {
  return MOVIE_AGE_RATING_PAGES[slug as MovieAgeRatingPageSlug] ?? null;
}

export function getMovieAgeRatingPageForRating(rating?: string | null) {
  if (!rating) return null;
  return Object.values(MOVIE_AGE_RATING_PAGES).find((page) => page.rating === rating) ?? null;
}
