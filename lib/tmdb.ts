// TMDB API client
// Docs: https://developer.themoviedb.org/docs

const BASE_URL = "https://api.themoviedb.org/3";

// ── Types ─────────────────────────────────────────────────

export interface TMDBMovie {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  release_date: string;
  poster_path: string | null;
  backdrop_path: string | null;
  genre_ids: number[];
  adult: boolean;
  popularity: number;
  vote_average: number;
  vote_count: number;
}

export interface TMDBTVShow {
  id: number;
  name: string;
  original_name: string;
  overview: string;
  first_air_date: string;
  poster_path: string | null;
  backdrop_path: string | null;
  genre_ids: number[];
  popularity: number;
  vote_average: number;
  vote_count: number;
}

export interface TMDBSearchResult<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

export interface TMDBGenre {
  id: number;
  name: string;
}

export interface TMDBWatchProvider {
  logo_path: string;
  provider_id: number;
  provider_name: string;
  display_priority: number;
}

export interface TMDBWatchProviderResult {
  results: Record<
    string,
    {
      link?: string;
      flatrate?: TMDBWatchProvider[];
      rent?: TMDBWatchProvider[];
      buy?: TMDBWatchProvider[];
    }
  >;
}

export interface TMDBKeyword {
  id: number;
  name: string;
}

export interface TMDBContentRating {
  descriptors: string[];
  iso_3166_1: string;
  rating: string;
}

export interface TMDBMovieDetails {
  id: number;
  imdb_id: string | null;
  title: string;
  original_title: string;
  overview: string;
  release_date: string;
  poster_path: string | null;
  backdrop_path: string | null;
  genres: TMDBGenre[];
  runtime: number | null;
  adult: boolean;
  popularity: number;
  vote_average: number;
  vote_count: number;
  tagline: string;
  status: string;
  keywords?: { keywords: TMDBKeyword[] };
  "watch/providers"?: TMDBWatchProviderResult;
  releases?: {
    countries: {
      iso_3166_1: string;
      certification: string;
      release_date: string;
    }[];
  };
}

export interface TMDBTVDetails {
  id: number;
  name: string;
  original_name: string;
  overview: string;
  first_air_date: string;
  poster_path: string | null;
  backdrop_path: string | null;
  genres: TMDBGenre[];
  episode_run_time: number[];
  number_of_seasons: number;
  number_of_episodes: number;
  popularity: number;
  vote_average: number;
  vote_count: number;
  tagline: string;
  status: string;
  keywords?: { results: TMDBKeyword[] };
  "watch/providers"?: TMDBWatchProviderResult;
  content_ratings?: { results: TMDBContentRating[] };
}

// ── Helpers ───────────────────────────────────────────────

async function tmdbFetch<T>(
  path: string,
  apiKey: string,
  params: Record<string, string> = {}
): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  url.searchParams.set("api_key", apiKey);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`TMDB API error: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

// ── Public API ────────────────────────────────────────────

export async function searchMovies(
  query: string,
  apiKey: string,
  page = 1
): Promise<TMDBSearchResult<TMDBMovie>> {
  return tmdbFetch("/search/movie", apiKey, {
    query,
    page: String(page),
    include_adult: "false",
  });
}

export async function searchTV(
  query: string,
  apiKey: string,
  page = 1
): Promise<TMDBSearchResult<TMDBTVShow>> {
  return tmdbFetch("/search/tv", apiKey, {
    query,
    page: String(page),
    include_adult: "false",
  });
}

export async function getMovieDetails(
  tmdbId: number,
  apiKey: string
): Promise<TMDBMovieDetails> {
  return tmdbFetch(`/movie/${tmdbId}`, apiKey, {
    append_to_response: "keywords,watch/providers,releases",
  });
}

export async function getTVDetails(
  tmdbId: number,
  apiKey: string
): Promise<TMDBTVDetails> {
  return tmdbFetch(`/tv/${tmdbId}`, apiKey, {
    append_to_response: "keywords,watch/providers,content_ratings",
  });
}

export async function getPopularMovies(
  apiKey: string,
  page = 1
): Promise<TMDBSearchResult<TMDBMovie>> {
  return tmdbFetch("/movie/popular", apiKey, { page: String(page) });
}

export async function getPopularTV(
  apiKey: string,
  page = 1
): Promise<TMDBSearchResult<TMDBTVShow>> {
  return tmdbFetch("/tv/popular", apiKey, { page: String(page) });
}

// ── Utility ───────────────────────────────────────────────

/** Extract US age rating from movie release data. */
export function extractMovieAgeRating(
  details: TMDBMovieDetails
): string | undefined {
  const us = details.releases?.countries.find(
    (c) => c.iso_3166_1 === "US" && c.certification
  );
  return us?.certification || undefined;
}

/** Extract US age rating from TV content ratings. */
export function extractTVAgeRating(
  details: TMDBTVDetails
): string | undefined {
  const us = details.content_ratings?.results.find(
    (c) => c.iso_3166_1 === "US"
  );
  return us?.rating || undefined;
}

/** Extract US streaming providers. */
export function extractStreamingProviders(
  watchProviders: TMDBWatchProviderResult | undefined
): { name: string; logoPath: string }[] {
  if (!watchProviders?.results?.US?.flatrate) return [];
  return watchProviders.results.US.flatrate.map((p) => ({
    name: p.provider_name,
    logoPath: p.logo_path,
  }));
}
