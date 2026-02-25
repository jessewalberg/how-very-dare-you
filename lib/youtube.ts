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
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new Error("YOUTUBE_API_KEY environment variable is not set");
  }

  // Primary search: "{title} {year} official trailer"
  const primaryQuery = `${title} ${year} official trailer`;
  const videoId = await searchYouTube(primaryQuery, apiKey);
  if (videoId) return videoId;

  // Fallback for TV shows: try without year
  if (type === "tv") {
    const fallbackQuery = `${title} official trailer`;
    return searchYouTube(fallbackQuery, apiKey);
  }

  return null;
}

async function searchYouTube(
  query: string,
  apiKey: string
): Promise<string | null> {
  const params = new URLSearchParams({
    part: "snippet",
    q: query,
    type: "video",
    maxResults: "1",
    key: apiKey,
  });

  const response = await fetch(`${YOUTUBE_API_BASE}/search?${params}`);

  if (!response.ok) {
    if (response.status === 403) {
      console.error("YouTube API quota exceeded or key invalid");
      return null;
    }
    console.error(`YouTube API error: ${response.status} ${response.statusText}`);
    return null;
  }

  const data: YouTubeSearchResponse = await response.json();

  if (!data.items || data.items.length === 0) {
    return null;
  }

  return data.items[0].id.videoId;
}
