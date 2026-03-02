// OpenSubtitles API client
// Docs: https://ai.opensubtitles.com/docs

import { logExternalRequest, logExternalResponse } from "@/lib/externalApiLogs";

const BASE_URL = "https://api.opensubtitles.com/api/v1";
const DEFAULT_USER_AGENT = "HowVeryDareYou v1";
const AUTH_TOKEN_TTL_MS = 50 * 60 * 1000;

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

interface OpenSubtitlesLoginResponse {
  token?: string;
}

interface OpenSubtitlesErrorPayload {
  message?: string;
  request_id?: string;
  requests?: number;
  remaining?: number;
  reset_time?: string;
}

type SubtitleCandidate = {
  fileId: number;
  release: string;
  language: string;
};

type TokenCache = { token: string; expiresAtMs: number };

let tokenCache: TokenCache | null = null;

export class OpenSubtitlesApiError extends Error {
  readonly status: number;
  readonly statusText: string;
  readonly payload?: OpenSubtitlesErrorPayload | string;

  constructor(args: {
    prefix: string;
    status: number;
    statusText: string;
    payload?: OpenSubtitlesErrorPayload | string;
  }) {
    const detail =
      typeof args.payload === "string"
        ? args.payload
        : args.payload?.message;
    const requestId =
      typeof args.payload === "string" ? undefined : args.payload?.request_id;
    const suffix = detail
      ? `: ${detail}${requestId ? ` (request_id=${requestId})` : ""}`
      : "";
    super(`${args.prefix}: ${args.status} ${args.statusText}${suffix}`);
    this.name = "OpenSubtitlesApiError";
    this.status = args.status;
    this.statusText = args.statusText;
    this.payload = args.payload;
  }

  get isQuotaExceeded(): boolean {
    const detail =
      typeof this.payload === "string"
        ? this.payload
        : this.payload?.message;
    if (!detail) return false;
    return (
      this.status === 406 &&
      /allowed .*subtitles|quota|remaining/i.test(detail)
    );
  }
}

// ── Public API ────────────────────────────────────────────

export async function searchSubtitles(
  imdbId: string,
  apiKey: string,
  options?: { seasonNumber?: number; episodeNumber?: number }
): Promise<OpenSubtitlesSearchResult> {
  // Normalize: OMDB gives "tt1234567", OpenSubtitles wants the numeric part
  const numericId = imdbId.replace(/^tt/, "");

  const url = new URL(`${BASE_URL}/subtitles`);
  url.searchParams.set("imdb_id", numericId);
  url.searchParams.set("languages", "en");
  url.searchParams.set("order_by", "download_count");
  url.searchParams.set("order_direction", "desc");

  if (options?.seasonNumber !== undefined) {
    url.searchParams.set("season_number", String(options.seasonNumber));
  }
  if (options?.episodeNumber !== undefined) {
    url.searchParams.set("episode_number", String(options.episodeNumber));
  }

  const requestLog = logExternalRequest("OpenSubtitles", "GET", url);
  const res = await fetch(url.toString(), {
    headers: await buildRequestHeaders(apiKey, true),
  });
  logExternalResponse("OpenSubtitles", requestLog, res.status, res.statusText);

  if (!res.ok) {
    throw await buildApiError("OpenSubtitles API error", res);
  }

  return res.json() as Promise<OpenSubtitlesSearchResult>;
}

/**
 * Gather dialogue from two representative episodes of a TV show (S01E01 + S01E05).
 * Returns combined dialogue excerpt, or null if nothing found.
 */
export async function gatherTVEpisodeDialogue(
  imdbId: string,
  apiKey: string,
  linesPerEpisode = 150
): Promise<string | null> {
  const episodes = [
    { season: 1, episode: 1 },
    { season: 1, episode: 5 },
  ];

  const dialogueParts: string[] = [];

  for (const ep of episodes) {
    try {
      const results = await searchSubtitles(imdbId, apiKey, {
        seasonNumber: ep.season,
        episodeNumber: ep.episode,
      });
      const srtText = await downloadBestSubtitle(results, apiKey);
      if (!srtText) continue;
      const dialogue = extractDialogue(srtText, linesPerEpisode);
      if (dialogue) {
        dialogueParts.push(
          `[S${String(ep.season).padStart(2, "0")}E${String(ep.episode).padStart(2, "0")}]\n${dialogue}`
        );
      }
    } catch (e) {
      // Quota exhaustion is terminal for the current run; bubble up to caller.
      if (isOpenSubtitlesQuotaError(e)) throw e;
      console.error(
        `Subtitle fetch failed for S${ep.season}E${ep.episode} (non-fatal):`,
        e
      );
    }
  }

  return dialogueParts.length > 0 ? dialogueParts.join("\n\n") : null;
}

/**
 * Gather dialogue from a single specific episode of a TV show.
 * Returns dialogue excerpt, or null if nothing found.
 */
export async function gatherSingleEpisodeDialogue(
  imdbId: string,
  season: number,
  episode: number,
  apiKey: string,
  maxLines = 300
): Promise<string | null> {
  try {
    const results = await searchSubtitles(imdbId, apiKey, {
      seasonNumber: season,
      episodeNumber: episode,
    });
    const srtText = await downloadBestSubtitle(results, apiKey);
    if (!srtText) return null;
    return extractDialogue(srtText, maxLines);
  } catch (e) {
    if (isOpenSubtitlesQuotaError(e)) throw e;
    console.error(
      `Subtitle fetch failed for S${season}E${episode} (non-fatal):`,
      e
    );
    return null;
  }
}

export async function downloadSubtitle(
  fileId: number,
  apiKey: string
): Promise<string> {
  // Step 1: Get download link
  const downloadEndpoint = `${BASE_URL}/download`;
  const requestLog = logExternalRequest("OpenSubtitles", "POST", downloadEndpoint);
  const linkRes = await fetch(downloadEndpoint, {
    method: "POST",
    headers: await buildRequestHeaders(apiKey, true),
    body: JSON.stringify({ file_id: fileId }),
  });
  logExternalResponse(
    "OpenSubtitles",
    requestLog,
    linkRes.status,
    linkRes.statusText
  );

  if (!linkRes.ok) {
    throw await buildApiError("OpenSubtitles download error", linkRes);
  }

  const linkData = (await linkRes.json()) as OpenSubtitlesDownload;

  // Step 2: Fetch the actual subtitle file
  const subtitleRequestLog = logExternalRequest("OpenSubtitles", "GET", linkData.link);
  const subtitleRes = await fetch(linkData.link);
  logExternalResponse(
    "OpenSubtitles",
    subtitleRequestLog,
    subtitleRes.status,
    subtitleRes.statusText
  );
  if (!subtitleRes.ok) {
    throw new Error(
      `Failed to download subtitle file: ${subtitleRes.status} ${subtitleRes.statusText}`
    );
  }

  return subtitleRes.text();
}

export function isOpenSubtitlesQuotaError(error: unknown): boolean {
  if (error instanceof OpenSubtitlesApiError) return error.isQuotaExceeded;
  if (!(error instanceof Error)) return false;
  return /allowed .*subtitles|quota|remaining/i.test(error.message);
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

export function pickSubtitleCandidates(
  results: OpenSubtitlesSearchResult,
  maxCandidates = 5
): SubtitleCandidate[] {
  return results.data
    .filter(
      (d) =>
        !d.attributes.ai_translated &&
        !d.attributes.machine_translated &&
        d.attributes.files.length > 0
    )
    .sort((a, b) => {
      const trustedFirst =
        Number(b.attributes.from_trusted) - Number(a.attributes.from_trusted);
      if (trustedFirst !== 0) return trustedFirst;
      return b.attributes.download_count - a.attributes.download_count;
    })
    .slice(0, maxCandidates)
    .map((d) => ({
      fileId: d.attributes.files[0].file_id,
      release: d.attributes.release,
      language: d.attributes.language,
    }));
}

/** Find the best subtitle file from search results. */
export function pickBestSubtitle(
  results: OpenSubtitlesSearchResult
): { fileId: number; release: string; language: string } | null {
  const candidates = pickSubtitleCandidates(results, 1);
  return candidates[0] ?? null;
}

async function downloadBestSubtitle(
  results: OpenSubtitlesSearchResult,
  apiKey: string
): Promise<string | null> {
  const candidates = pickSubtitleCandidates(results, 5);
  if (candidates.length === 0) return null;

  let lastError: unknown;
  for (const candidate of candidates) {
    try {
      return await downloadSubtitle(candidate.fileId, apiKey);
    } catch (e) {
      lastError = e;
      if (isOpenSubtitlesQuotaError(e)) throw e;
      console.warn(
        `[OpenSubtitles] Candidate download failed for file_id=${candidate.fileId} (continuing)`,
        e
      );
    }
  }

  if (lastError) throw lastError;
  return null;
}

function getEnvTrimmed(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function resolveUserAgent(): string {
  return getEnvTrimmed("OPENSUBTITLES_USER_AGENT") ?? DEFAULT_USER_AGENT;
}

async function buildRequestHeaders(
  apiKey: string,
  includeAuthToken: boolean
): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    "Api-Key": apiKey,
    "Content-Type": "application/json",
    "User-Agent": resolveUserAgent(),
  };

  if (!includeAuthToken) return headers;

  try {
    const token = await getAuthToken(apiKey);
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  } catch (e) {
    // Non-fatal: key-only mode still works with lower quotas.
    console.warn(
      "[OpenSubtitles] Auth token login failed; continuing with Api-Key only mode.",
      e
    );
  }

  return headers;
}

async function getAuthToken(apiKey: string): Promise<string | undefined> {
  const username = getEnvTrimmed("OPENSUBTITLES_USERNAME");
  const password = getEnvTrimmed("OPENSUBTITLES_PASSWORD");
  if (!username || !password) return undefined;

  if (tokenCache && Date.now() < tokenCache.expiresAtMs) {
    return tokenCache.token;
  }

  const loginEndpoint = `${BASE_URL}/login`;
  const requestLog = logExternalRequest("OpenSubtitles", "POST", loginEndpoint);
  const res = await fetch(loginEndpoint, {
    method: "POST",
    headers: {
      "Api-Key": apiKey,
      "Content-Type": "application/json",
      "User-Agent": resolveUserAgent(),
    },
    body: JSON.stringify({ username, password }),
  });
  logExternalResponse("OpenSubtitles", requestLog, res.status, res.statusText);

  if (!res.ok) {
    throw await buildApiError("OpenSubtitles login error", res);
  }

  const data = (await res.json()) as OpenSubtitlesLoginResponse;
  if (!data.token) {
    throw new Error("OpenSubtitles login error: missing token in response");
  }

  tokenCache = {
    token: data.token,
    expiresAtMs: Date.now() + AUTH_TOKEN_TTL_MS,
  };
  return data.token;
}

async function buildApiError(
  prefix: string,
  response: Response
): Promise<OpenSubtitlesApiError> {
  const payload = await readErrorPayload(response);
  return new OpenSubtitlesApiError({
    prefix,
    status: response.status,
    statusText: response.statusText,
    payload,
  });
}

async function readErrorPayload(
  response: Response
): Promise<OpenSubtitlesErrorPayload | string | undefined> {
  const body = await response.text();
  if (!body) return undefined;

  try {
    return JSON.parse(body) as OpenSubtitlesErrorPayload;
  } catch {
    return body;
  }
}
