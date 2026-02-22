// OpenSubtitles API client
// Docs: https://opensubtitles.stoplight.io/docs/opensubtitles-api

const BASE_URL = "https://api.opensubtitles.com/api/v1";

// ── Types ─────────────────────────────────────────────────

export interface OpenSubtitlesAttributes {
  subtitle_id: string;
  language: string;
  download_count: number;
  hearing_impaired: boolean;
  fps: number;
  votes: number;
  ratings: number;
  from_trusted: boolean;
  foreign_parts_only: boolean;
  ai_translated: boolean;
  machine_translated: boolean;
  release: string;
  files: {
    file_id: number;
    file_name: string;
  }[];
  feature_details: {
    feature_id: number;
    feature_type: string;
    year: number;
    title: string;
    movie_name: string;
    imdb_id: number;
    tmdb_id: number;
  };
}

export interface OpenSubtitlesSearchResult {
  total_pages: number;
  total_count: number;
  per_page: number;
  page: number;
  data: {
    id: string;
    type: string;
    attributes: OpenSubtitlesAttributes;
  }[];
}

export interface OpenSubtitlesDownload {
  link: string;
  file_name: string;
  requests: number;
  remaining: number;
  message: string;
}

// ── Public API ────────────────────────────────────────────

export async function searchSubtitles(
  imdbId: string,
  apiKey: string
): Promise<OpenSubtitlesSearchResult> {
  // Normalize: OMDB gives "tt1234567", OpenSubtitles wants the numeric part
  const numericId = imdbId.replace(/^tt/, "");

  const url = new URL(`${BASE_URL}/subtitles`);
  url.searchParams.set("imdb_id", numericId);
  url.searchParams.set("languages", "en");
  url.searchParams.set("order_by", "download_count");
  url.searchParams.set("order_direction", "desc");

  const res = await fetch(url.toString(), {
    headers: {
      "Api-Key": apiKey,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(
      `OpenSubtitles API error: ${res.status} ${res.statusText}`
    );
  }

  return res.json() as Promise<OpenSubtitlesSearchResult>;
}

export async function downloadSubtitle(
  fileId: number,
  apiKey: string
): Promise<string> {
  // Step 1: Get download link
  const linkRes = await fetch(`${BASE_URL}/download`, {
    method: "POST",
    headers: {
      "Api-Key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ file_id: fileId }),
  });

  if (!linkRes.ok) {
    throw new Error(
      `OpenSubtitles download error: ${linkRes.status} ${linkRes.statusText}`
    );
  }

  const linkData = (await linkRes.json()) as OpenSubtitlesDownload;

  // Step 2: Fetch the actual subtitle file
  const subtitleRes = await fetch(linkData.link);
  if (!subtitleRes.ok) {
    throw new Error("Failed to download subtitle file");
  }

  return subtitleRes.text();
}

// ── Utility ───────────────────────────────────────────────

/** Extract dialogue lines from SRT subtitle text, stripping timestamps and tags. */
export function extractDialogue(
  srtText: string,
  maxLines = 500
): string {
  const lines = srtText.split("\n");
  const dialogueLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines, sequence numbers, and timestamps
    if (!trimmed) continue;
    if (/^\d+$/.test(trimmed)) continue;
    if (/^\d{2}:\d{2}:\d{2}/.test(trimmed)) continue;

    // Strip HTML-like tags (e.g. <i>, <b>, <font>)
    const cleaned = trimmed.replace(/<[^>]+>/g, "").trim();
    if (!cleaned) continue;

    // Skip sound effects in brackets: [music], (gunshot), etc.
    if (/^\[.*\]$/.test(cleaned) || /^\(.*\)$/.test(cleaned)) continue;

    dialogueLines.push(cleaned);

    if (dialogueLines.length >= maxLines) break;
  }

  return dialogueLines.join("\n");
}

/** Find the best subtitle file from search results. Prefers non-AI, high downloads. */
export function pickBestSubtitle(
  results: OpenSubtitlesSearchResult
): { fileId: number; release: string } | null {
  const candidates = results.data
    .filter(
      (d) =>
        !d.attributes.ai_translated &&
        !d.attributes.machine_translated &&
        d.attributes.files.length > 0
    )
    .sort(
      (a, b) => b.attributes.download_count - a.attributes.download_count
    );

  if (candidates.length === 0) return null;

  const best = candidates[0];
  return {
    fileId: best.attributes.files[0].file_id,
    release: best.attributes.release,
  };
}
