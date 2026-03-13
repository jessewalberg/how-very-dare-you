export const BROWSE_HUBS = {
  movie: {
    label: "Movies",
    href: "/browse/movies",
    pageTitle: "Browse Movie Content Advisories",
    description:
      "Browse AI-analyzed movie advisories with age ratings, theme breakdowns, and family-friendly context for parents.",
    heading: "Movie Content Advisories",
    intro:
      "Browse AI-analyzed movie advisories with transparent 0-4 category scores, age ratings, and quick links to low-advisory picks.",
  },
  tv: {
    label: "TV Shows",
    href: "/browse/tv",
    pageTitle: "Browse TV Show Content Advisories",
    description:
      "Browse AI-analyzed TV show advisories with episode-aware ratings, age guidance, and theme breakdowns for parents.",
    heading: "TV Show Content Advisories",
    intro:
      "Browse AI-analyzed TV show advisories with episode-aware scoring, age ratings, and detailed theme breakdowns for families.",
  },
} as const;

export type BrowseHubType = keyof typeof BROWSE_HUBS;

export function getBrowseHubForTitleType(type: "movie" | "tv" | "youtube") {
  if (type === "movie") return BROWSE_HUBS.movie;
  if (type === "tv") return BROWSE_HUBS.tv;
  return null;
}
