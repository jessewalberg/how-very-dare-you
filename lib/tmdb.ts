// TMDB API client
// Docs: https://developer.themoviedb.org/docs

import { logExternalRequest, logExternalResponse } from "./externalApiLogs";

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

export interface TMDBSeasonSummary {
  air_date: string | null;
  episode_count: number;
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  season_number: number;
  vote_average: number;
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
  seasons: TMDBSeasonSummary[];
  popularity: number;
  vote_average: number;
  vote_count: number;
  tagline: string;
  status: string;
  keywords?: { results: TMDBKeyword[] };
  "watch/providers"?: TMDBWatchProviderResult;
  content_ratings?: { results: TMDBContentRating[] };
}

export interface TMDBEpisode {
  id: number;
  name: string;
  overview: string;
  air_date: string | null;
  episode_number: number;
  season_number: number;
  still_path: string | null;
  runtime: number | null;
  vote_average: number;
  vote_count: number;
}

export interface TMDBSeason {
  id: number;
  name: string;
  overview: string;
  air_date: string | null;
  season_number: number;
  poster_path: string | null;
  episodes: TMDBEpisode[];
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

  const requestLog = logExternalRequest("TMDB", "GET", url);
  const res = await fetch(url.toString());
  logExternalResponse("TMDB", requestLog, res.status, res.statusText);
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

export async function getTVSeason(
  tvId: number,
  seasonNumber: number,
  apiKey: string
): Promise<TMDBSeason> {
  return tmdbFetch(`/tv/${tvId}/season/${seasonNumber}`, apiKey);
}

export async function getTVEpisode(
  tvId: number,
  seasonNumber: number,
  episodeNumber: number,
  apiKey: string
): Promise<TMDBEpisode> {
  return tmdbFetch(
    `/tv/${tvId}/season/${seasonNumber}/episode/${episodeNumber}`,
    apiKey
  );
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
