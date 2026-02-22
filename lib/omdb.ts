// OMDB API client
// Docs: https://www.omdbapi.com/

const BASE_URL = "https://www.omdbapi.com/";

// ── Types ─────────────────────────────────────────────────

export interface OMDBRating {
  Source: string;
  Value: string;
}

export interface OMDBResponse {
  Title: string;
  Year: string;
  Rated: string;
  Released: string;
  Runtime: string;
  Genre: string;
  Director: string;
  Writer: string;
  Actors: string;
  Plot: string;
  Language: string;
  Country: string;
  Awards: string;
  Poster: string;
  Ratings: OMDBRating[];
  Metascore: string;
  imdbRating: string;
  imdbVotes: string;
  imdbID: string;
  Type: string;
  DVD: string;
  BoxOffice: string;
  Production: string;
  Website: string;
  Response: "True" | "False";
  Error?: string;
}

// ── Public API ────────────────────────────────────────────

export async function getByImdbId(
  imdbId: string,
  apiKey: string
): Promise<OMDBResponse | null> {
  const url = new URL(BASE_URL);
  url.searchParams.set("i", imdbId);
  url.searchParams.set("apikey", apiKey);
  url.searchParams.set("plot", "full");

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`OMDB API error: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as OMDBResponse;
  if (data.Response === "False") {
    return null;
  }

  return data;
}

// ── Utility ───────────────────────────────────────────────

/** Extract Rotten Tomatoes score if available. */
export function getRottenTomatoesScore(
  data: OMDBResponse
): string | undefined {
  return data.Ratings.find((r) => r.Source === "Rotten Tomatoes")?.Value;
}

/** Parse runtime string ("142 min") to number. */
export function parseRuntime(runtime: string): number | undefined {
  const match = runtime.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : undefined;
}
