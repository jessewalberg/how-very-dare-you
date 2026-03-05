// YouTube Data API v3 client for trailer lookup
// Docs: https://developers.google.com/youtube/v3/docs/search/list
// Quota: 10,000 units/day, search costs 100 units = 100 searches/day max

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

interface YouTubeSearchItem {
  id: { videoId: string };
  snippet: { title: string };
}

interface YouTubeSearchResponse {
  items?: YouTubeSearchItem[];
}

/**
 * Search YouTube for the official trailer of a title.
 * Returns the video ID of the best match, or null if not found.
 */
export async function searchTrailer(
  title: string,
  year: number | string,
  type: "movie" | "tv"
): Promise<string | null> {
  const candidates = await searchTrailerCandidates(title, year, type, 1);
  return candidates[0] ?? null;
}

/**
 * Search YouTube for multiple trailer candidates.
 * Useful when one candidate is blocked/unavailable by downstream downloaders.
 */
export async function searchTrailerCandidates(
  title: string,
  year: number | string,
  type: "movie" | "tv",
  maxResults = 4
): Promise<string[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new Error("YOUTUBE_API_KEY environment variable is not set");
  }

  // Primary search: "{title} {year} official trailer"
  const primaryQuery = `${title} ${year} official trailer`;
  const primaryIds = await searchYouTubeIds(primaryQuery, apiKey, {
    maxResults,
  });

  // Fallback for TV shows: try without year
  const fallbackIds: string[] = [];
  if (type === "tv") {
    const fallbackQuery = `${title} official trailer`;
    fallbackIds.push(
      ...(await searchYouTubeIds(fallbackQuery, apiKey, { maxResults }))
    );
  }

  return Array.from(new Set([...primaryIds, ...fallbackIds])).slice(0, maxResults);
}

/**
 * Search YouTube for full episode clips of a TV show.
 * Uses "long" video duration filter to find actual episode content.
 * Returns array of video IDs (up to maxResults).
 */
export async function searchEpisodeClips(
  title: string,
  maxResults = 2
): Promise<string[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new Error("YOUTUBE_API_KEY environment variable is not set");
  }

  const params = new URLSearchParams({
    part: "snippet",
    q: `${title} full episode`,
    type: "video",
    videoDuration: "long",
    maxResults: String(maxResults),
    key: apiKey,
  });

  const response = await fetch(`${YOUTUBE_API_BASE}/search?${params}`);

  if (!response.ok) {
    if (response.status === 403) {
      console.error("YouTube API quota exceeded or key invalid");
      return [];
    }
    console.error(`YouTube API error: ${response.status} ${response.statusText}`);
    return [];
  }

  const data: YouTubeSearchResponse = await response.json();

  if (!data.items || data.items.length === 0) {
    return [];
  }

  return data.items.map((item) => item.id.videoId);
}

/**
 * Search YouTube for a specific episode video/clip.
 * Returns the best-match video ID or null.
 */
export async function searchEpisodeVideo(
  title: string,
  seasonNumber: number,
  episodeNumber: number,
  episodeName?: string
): Promise<string | null> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new Error("YOUTUBE_API_KEY environment variable is not set");
  }

  const episodeCode = `S${seasonNumber}E${episodeNumber}`;
  const queries = [
    `${title} ${episodeCode} ${episodeName ?? ""} full episode`.trim(),
    `${title} season ${seasonNumber} episode ${episodeNumber} ${episodeName ?? ""}`.trim(),
    `${title} ${episodeName ?? ""} clip`.trim(),
  ];

  for (const query of queries) {
    const videoId = await searchYouTube(query, apiKey, { videoDuration: "long" });
    if (videoId) return videoId;
  }

  // Final fallback without long-duration constraint.
  return searchYouTube(`${title} ${episodeCode} ${episodeName ?? ""}`.trim(), apiKey);
}

async function searchYouTube(
  query: string,
  apiKey: string,
  options?: { maxResults?: number; videoDuration?: "any" | "short" | "medium" | "long" }
): Promise<string | null> {
  const ids = await searchYouTubeIds(query, apiKey, options);
  return ids[0] ?? null;
}

async function searchYouTubeIds(
  query: string,
  apiKey: string,
  options?: { maxResults?: number; videoDuration?: "any" | "short" | "medium" | "long" }
): Promise<string[]> {
  const params = new URLSearchParams({
    part: "snippet",
    q: query,
    type: "video",
    maxResults: String(options?.maxResults ?? 1),
    key: apiKey,
  });
  if (options?.videoDuration) {
    params.set("videoDuration", options.videoDuration);
  }

  const response = await fetch(`${YOUTUBE_API_BASE}/search?${params}`);

  if (!response.ok) {
    if (response.status === 403) {
      console.error("YouTube API quota exceeded or key invalid");
      return [];
    }
    console.error(`YouTube API error: ${response.status} ${response.statusText}`);
    return [];
  }

  const data: YouTubeSearchResponse = await response.json();

  if (!data.items || data.items.length === 0) {
    return [];
  }

  return data.items.map((item) => item.id.videoId);
}
