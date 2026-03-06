import { action, mutation, internalMutation, internalQuery } from "./_generated/server";
import type { ActionCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import {
  getMovieDetails,
  getTVDetails,
  getPopularMovies,
  getPopularTV,
  searchMovies,
  searchTV,
  extractMovieAgeRating,
  extractTVAgeRating,
  extractStreamingProviders,
} from "../lib/tmdb";
import { getByImdbId, parseRuntime } from "../lib/omdb";
import {
  searchSubtitles,
  downloadSubtitle,
  extractDialogue,
  pickSubtitleCandidates,
  isOpenSubtitlesQuotaError,
  gatherTVEpisodeDialogue,
  gatherSingleEpisodeDialogue,
} from "../lib/opensubtitles";
import {
  searchEpisodeClips,
  searchEpisodeVideo,
  searchTrailerCandidates,
} from "../lib/youtube";
import { chatCompletion, parseJSONResponse, estimateCostCents } from "../lib/openrouter";
import {
  downloadTextFromR2,
  uploadTextToR2,
  type R2TranscriptStorage,
} from "../lib/r2";
import { assessRatingQuality } from "../lib/ratingQuality";
import { mergeStreamingProvidersWithAffiliates } from "../lib/streamingProviders";
import {
  assertCategoryRatings,
  assertConfidence,
  sanitizeCategoryEvidence,
  sanitizeEpisodeFlags,
  type CategoryKey,
  type CategoryEvidenceEntry,
  type EpisodeFlag,
} from "./lib/ratingValidation";

// ── System Prompt ────────────────────────────────────────

const RATING_SYSTEM_PROMPT = `You are a content advisory analyst for a parental content rating service. Your job is to analyze movies and TV shows and rate them across 8 specific cultural/ideological theme categories on a 0-4 severity scale.

You must be OBJECTIVE and CONSISTENT. You are not making value judgments about whether these themes are good or bad — you are simply detecting their presence and intensity so parents can make informed decisions.
You may use decimal severities in 0.1 increments when content clearly falls between two rubric levels.

## Rating Categories

1. **LGBT Themes** (lgbtq)
   - 0 None: No LGBT characters, relationships, or references
   - 1 Brief: A background detail (rainbow flag in scenery, throwaway mention). Character's orientation is never plot-relevant.
   - 2 Notable: An openly LGBT character exists with some screen time, or a same-sex couple appears in a scene. Not a major plot point.
   - 3 Significant: An LGBT relationship or identity is a meaningful subplot. Coming-out storyline, same-sex romance subplot, gender identity exploration as recurring theme.
   - 4 Core Theme: The movie/show is fundamentally about an LGBT character's journey, relationship, or identity. Removal of this theme would collapse the story.

2. **Environmental / Climate Messaging** (climate)
   - 0 None: No environmental themes
   - 1 Brief: A character mentions recycling, littering is shown as bad, a single "take care of nature" line.
   - 2 Notable: Environmental themes appear in multiple scenes. A polluting villain, nature-in-danger subplot, characters actively discussing environmental issues.
   - 3 Significant: Environmental activism or climate change is a major subplot. Characters go on an environmental mission, industry/corporations are villains due to pollution.
   - 4 Core Theme: The entire story is an environmental allegory or climate change narrative. The central conflict is ecological.

3. **Racial Identity / Social Justice** (racialIdentity)
   - 0 None: No race-focused storylines or social justice themes. Diverse cast alone does NOT trigger this — only storylines *about* race/identity.
   - 1 Brief: A single reference to racial identity or cultural difference. A throwaway line about heritage.
   - 2 Notable: Cultural identity is explored in multiple scenes. Immigration experience, cultural clash, or prejudice shown but not the central story.
   - 3 Significant: Race, privilege, systemic injustice, or identity politics is a major subplot. Characters confront racism, navigate "being different," or explicitly discuss racial dynamics.
   - 4 Core Theme: The story is fundamentally about racial identity, discrimination, or social justice. An allegory for racism, immigration narrative, or civil rights story.

4. **Gender Role Commentary** (genderRoles)
   - 0 None: Traditional or unremarkable gender dynamics with no commentary
   - 1 Brief: A single moment subverting or commenting on gender expectations. A princess picks up a sword once, a dad does something domestic once.
   - 2 Notable: Repeated commentary on gender roles. Female characters consistently shown defying traditional femininity, male characters consistently shown as incompetent/bumbling, or explicit dialogue about gender expectations.
   - 3 Significant: Gender role subversion is a major theme. "Girl power" messaging throughout, a storyline about breaking gender norms, men consistently portrayed as inferior/foolish.
   - 4 Core Theme: The entire narrative is about challenging gender roles. A gender-swap story, a feminist hero's journey where gender is the central conflict.

5. **Anti-Authority / Anti-Tradition** (antiAuthority)
   - 0 None: Authority figures (parents, teachers, leaders, institutions) are portrayed positively or neutrally
   - 1 Brief: A single scene where an authority figure is wrong or a child knows better. Standard "believe in yourself" messaging.
   - 2 Notable: Authority figures are repeatedly shown as misguided, corrupt, or foolish. Parents are obstacles, teachers don't understand, institutions fail.
   - 3 Significant: Rebellion against authority/tradition is a major theme. Characters must defy parents/leaders to succeed. Traditional values are portrayed as backward.
   - 4 Core Theme: The entire story is about overthrowing an unjust system, defying oppressive authority, or rejecting traditional structures. The message is "authority is the enemy."

6. **Religious Sensitivity** (religious)
   - 0 None: No religious content or references
   - 1 Brief: A passing reference to religion, a character prays once, a church appears in background.
   - 2 Notable: Religion or spirituality is shown with some bias — faith characters are naive/judgmental, new-age/occult practices are normalized without question, or religion is subtly mocked.
   - 3 Significant: Anti-religious messaging is a clear subplot. Religious characters are villains, organized religion is corrupt, or occult/witchcraft is presented as empowering while traditional faith is backward.
   - 4 Core Theme: The story fundamentally challenges or attacks religious belief/tradition. Religion is the antagonist, or the narrative is a deconstruction of faith.

7. **Political Messaging** (political)
   - 0 None: No discernible political messaging
   - 1 Brief: A single line or background reference that could be read as political. A news broadcast in the background, a character's bumper sticker.
   - 2 Notable: Political themes appear in multiple scenes. Commentary on wealth inequality, capitalism, government, immigration policy, or similar, but as backdrop not focus.
   - 3 Significant: Political messaging is a clear subplot. Characters debate political issues, the plot mirrors real-world political conflicts, clear ideological framing.
   - 4 Core Theme: The story is fundamentally political. An election narrative, a revolution story with clear real-world parallels, or an allegory for a specific political issue.

8. **Sexuality / Age-Inappropriate Content** (sexuality)
   - 0 None: No on-screen romantic affection, sexual content, or age-inappropriate romantic content.
   - 1 Brief: A single kiss, a character has a crush, or mild romantic relationship content appropriate for the target age group.
   - 2 Notable: Romantic content that pushes the target age boundary. Puberty discussions, dating/relationship drama in a show aimed at young kids, innuendo parents would notice.
   - 3 Significant: Sexual themes that many parents would find inappropriate for the target age. Sexualized character designs, explicit romantic relationships in content for pre-teens, body-focused humor.
   - 4 Core Theme: Sexual content or romantic drama dominates the narrative in content marketed to children/young teens.

## Important Guidelines

- **Diverse cast ≠ social justice rating.** A movie with actors of many ethnicities playing characters where race is irrelevant scores 0 on Racial Identity. Only rate if the *storyline* engages with race/identity.
- **Strong female character ≠ gender role commentary.** A competent female lead in an adventure story scores 0. Only rate if the *narrative explicitly comments on* gender expectations.
- **Magic/fantasy ≠ occult.** Standard fantasy magic (Harry Potter-style) scores 0 on Religious unless it explicitly positions real-world faith negatively. Magical systems in fantasy worlds are not inherently "occult" for this rubric.
- **Context matters.** A villain who pollutes is different from an entire plotline about saving the planet. Rate the *emphasis and messaging*, not isolated plot mechanics.
- **Rate what's SHOWN, not what's theoretically there.** Don't speculate or read deeper meaning into ambiguous content. Rate the surface-level, as-experienced content.
- **Target audience matters for sexuality.** A romantic kiss in a PG-13 movie is different from the same kiss in content aimed at 4-year-olds. Rate against the content's intended age group.
- **Category overlap is allowed.** The same scene can affect multiple categories (for example, an LGBT relationship scene can increase both \`lgbtq\` and \`sexuality\`).
- **Sexuality floor rule.** If on-screen romantic affection/relationship content is present (kiss, dating, spouse/partner dynamics), \`sexuality\` should be at least 1, even when age-appropriate.

## Output Format

Respond with ONLY a JSON object. No preamble, no markdown fences, no explanation outside the JSON.

{
  "ratings": {
    "lgbtq": <0.0-4.0>,
    "climate": <0.0-4.0>,
    "racialIdentity": <0.0-4.0>,
    "genderRoles": <0.0-4.0>,
    "antiAuthority": <0.0-4.0>,
    "religious": <0.0-4.0>,
    "political": <0.0-4.0>,
    "sexuality": <0.0-4.0>
  },
  "confidence": <0.0-1.0>,
  "notes": "<2-3 sentence summary explaining the key ratings. Focus on the highest-rated categories and why they received that score. Be factual and specific — cite scenes or plot points.>",
  "categoryEvidence": {
    // Include ONLY categories rated 1 or higher. Omit categories rated 0.
    "<categoryKey>": {
      "explanation": "<1-2 sentences: why this score, citing specific scenes/characters/plot points.>",
      "quote": "<If dialogue/subtitle data was provided, include a short relevant quote. Otherwise omit this field.>"
    }
  },
  "episodeFlags": [
    // ONLY for TV shows. Omit for movies. List any specific episodes that deviate significantly from the show-level rating.
    {
      "season": <number>,
      "episode": <number>,
      "episodeTitle": "<title if known>",
      "category": "<category key>",
      "severity": <0.0-4.0>,
      "note": "<brief description of what happens in this episode>"
    }
  ]
}

The "confidence" score should reflect how much data you had to work with:
- 0.9-1.0: You have detailed plot information, dialogue/subtitle data, and multiple review sources
- 0.7-0.89: You have good plot information and at least one detailed source
- 0.5-0.69: You have basic plot/overview information only
- Below 0.5: Very limited information — flag for manual review`;

// ── Rating Result Types ──────────────────────────────────

interface RatingResult {
  ratings: Record<CategoryKey, number>;
  confidence: number;
  notes: string;
  categoryEvidence?: Partial<Record<CategoryKey, CategoryEvidenceEntry>>;
  episodeFlags?: EpisodeFlag[];
}

// ── Prompt Construction ──────────────────────────────────

function constructRatingPrompt(data: {
  title: string;
  year: number;
  type: "movie" | "tv";
  ageRating?: string;
  genre?: string;
  runtime?: number;
  tmdbOverview?: string;
  omdbPlot?: string;
  keywords?: string[];
  parentalGuide?: string;
  subtitleExcerpt?: string;
}): string {
  let prompt = `Rate the following ${data.type === "tv" ? "TV Show" : "Movie"} for our content advisory service.\n\n`;
  prompt += `## Title Information\n`;
  prompt += `- **Title:** ${data.title}\n`;
  prompt += `- **Year:** ${data.year}\n`;
  prompt += `- **Type:** ${data.type === "tv" ? "TV Show" : "Movie"}\n`;

  if (data.ageRating) prompt += `- **Target Age Rating:** ${data.ageRating}\n`;
  if (data.genre) prompt += `- **Genre:** ${data.genre}\n`;
  if (data.runtime) prompt += `- **Runtime:** ${data.runtime} minutes\n`;

  if (data.tmdbOverview) {
    prompt += `\n## Plot Overview (from TMDB)\n${data.tmdbOverview}\n`;
  }

  if (data.omdbPlot) {
    prompt += `\n## Additional Plot Summary (from OMDB)\n${data.omdbPlot}\n`;
  }

  if (data.keywords?.length) {
    prompt += `\n## Content Keywords\n${data.keywords.join(", ")}\n`;
  }

  if (data.parentalGuide) {
    prompt += `\n## Parental Guide Information\n${data.parentalGuide}\n`;
  }

  if (data.subtitleExcerpt) {
    prompt += `\n## Dialogue Sample (from subtitles)\n${data.subtitleExcerpt}\n`;
  }

  prompt += `\n---\n\nRate this title across all 8 categories using the rubric provided. Remember:\n`;
  prompt += `- Be objective and consistent\n`;
  prompt += `- Diverse cast alone does not trigger racial identity ratings\n`;
  prompt += `- Strong female leads alone do not trigger gender role ratings\n`;
  prompt += `- Standard fantasy magic is not "occult"\n`;
  prompt += `- Rate what is shown, not what could be theoretically interpreted\n`;
  prompt += `- Consider the target age group for sexuality ratings\n`;

  return prompt;
}

// ── Response Parsing ─────────────────────────────────────

const ROMANCE_SIGNAL_REGEX =
  /\b(kiss|kissing|romance|romantic|crush|dating|date|boyfriend|girlfriend|husband|wife|married|marriage|partner|relationship|couple)\b/i;

function maybeApplySexualityFloor(
  result: Pick<RatingResult, "ratings" | "notes" | "categoryEvidence">
): void {
  if (result.ratings.sexuality > 0) return;
  if (result.ratings.lgbtq < 1) return;

  const lgbtEvidence = result.categoryEvidence?.lgbtq;
  const evidenceText = [
    lgbtEvidence?.explanation ?? "",
    lgbtEvidence?.quote ?? "",
    result.notes ?? "",
  ]
    .join(" ")
    .trim();

  if (!ROMANCE_SIGNAL_REGEX.test(evidenceText)) return;

  result.ratings.sexuality = 1;

  if (!result.categoryEvidence) {
    result.categoryEvidence = {};
  }
  if (!result.categoryEvidence.sexuality) {
    result.categoryEvidence.sexuality = {
      explanation:
        "Brief romantic/relationship content is present on-screen, so Sexuality is set to 1 per rubric.",
    };
  }
}

function parseRatingResponse(
  responseText: string,
  titleType: "movie" | "tv"
): RatingResult {
  const parsed = parseJSONResponse<RatingResult>(responseText);
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Rating response is not an object");
  }

  assertCategoryRatings(parsed.ratings, "ratings");
  assertConfidence(parsed.confidence, "confidence");

  if (typeof parsed.notes !== "string" || parsed.notes.trim().length === 0) {
    throw new Error("Missing notes in rating response");
  }
  parsed.notes = parsed.notes.trim();

  parsed.categoryEvidence = sanitizeCategoryEvidence(
    parsed.categoryEvidence,
    parsed.ratings
  );

  const episodeFlags = sanitizeEpisodeFlags(parsed.episodeFlags);
  parsed.episodeFlags = titleType === "tv" ? episodeFlags : undefined;

  // Guardrail: avoid 0 sexuality when relationship content is clearly present.
  maybeApplySexualityFloor(parsed);

  return parsed;
}

// ── Data Gathering ───────────────────────────────────────

interface SubtitleInfo {
  status: "success" | "failed" | "skipped" | "timeout";
  source?: string;
  sourceVideoId?: string;
  language?: string;
  dialogueLines?: number;
  transcriptStorage?: R2TranscriptStorage;
}

interface GatheredData {
  title: string;
  year: number;
  type: "movie" | "tv";
  imdbId: string | null;
  ageRating?: string;
  genre?: string;
  runtime?: number;
  overview?: string;
  posterPath?: string;
  tmdbOverview?: string;
  omdbPlot?: string;
  keywords?: string[];
  parentalGuide?: string;
  subtitleExcerpt?: string;
  subtitleTranscript?: string;
  subtitleInfo?: SubtitleInfo;
  streamingProviders?: { name: string; logoPath: string }[];
  // TV-specific
  numberOfSeasons?: number;
  seasonData?: {
    seasonNumber: number;
    episodeCount: number;
    name?: string;
    overview?: string;
    posterPath?: string;
    airDate?: string;
  }[];
}

const MAX_PROMPT_SUBTITLE_LINES = 300;
const MAX_ARCHIVED_SUBTITLE_LINES = 2500;

function toTranscriptExcerpt(text: string, maxLines = MAX_PROMPT_SUBTITLE_LINES): string {
  return text.split("\n").slice(0, maxLines).join("\n");
}

function pickSubtitleTextForArchival(args: {
  subtitleTranscript?: string;
  subtitleExcerpt?: string;
}): string | undefined {
  const transcript = args.subtitleTranscript?.trim();
  if (transcript) return transcript;
  const excerpt = args.subtitleExcerpt?.trim();
  if (excerpt) return excerpt;
  return undefined;
}

function slugForKey(input: string): string {
  const slug = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const capped = slug.slice(0, 80);
  return capped || "untitled";
}

function generateTitleSlug(title: string, year: number): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `${base || "untitled"}-${year}`;
}

function isLegacyUnknownYearSlug(slug: string, title: string): boolean {
  const base = slugForKey(title);
  const unknownYearPrefix = `${base}-0`;
  return slug === unknownYearPrefix || slug.startsWith(`${unknownYearPrefix}-`);
}

function buildTitleTranscriptKey(args: {
  tmdbId: number;
  type: "movie" | "tv";
  title: string;
}): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `titles/${args.type}/${args.tmdbId}/${stamp}-${slugForKey(args.title)}.txt`;
}

function buildEpisodeTranscriptKey(args: {
  tmdbShowId: number;
  seasonNumber: number;
  episodeNumber: number;
  showTitle: string;
}): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const episodeCode = `s${String(args.seasonNumber).padStart(2, "0")}e${String(args.episodeNumber).padStart(2, "0")}`;
  return `episodes/${args.tmdbShowId}/${episodeCode}-${stamp}-${slugForKey(args.showTitle)}.txt`;
}

async function maybeArchiveTranscript(
  key: string,
  text: string
): Promise<R2TranscriptStorage | undefined> {
  try {
    const stored = await uploadTextToR2({ key, text });
    if (!stored) {
      console.error(
        `[R2] Transcript archival skipped for key=${key}. Check R2 env configuration.`
      );
    }
    return stored ?? undefined;
  } catch (e) {
    console.error("Transcript upload to R2 failed (non-fatal):", e);
    return undefined;
  }
}

async function maybeLoadArchivedTranscript(
  storage: R2TranscriptStorage | undefined,
  label: string
): Promise<string | undefined> {
  if (!storage) return undefined;
  try {
    const text = await downloadTextFromR2({
      bucket: storage.bucket,
      key: storage.key,
    });
    if (!text || text.trim().length === 0) {
      console.warn(
        `[R2] Archived subtitle not found or empty for ${label} key=${storage.key}`
      );
      return undefined;
    }
    console.log(
      `[R2] Loaded archived subtitle for ${label} key=${storage.key} chars=${text.length}`
    );
    return text;
  } catch (e) {
    console.error(
      `[R2] Failed to load archived subtitle for ${label} key=${storage.key}:`,
      e
    );
    return undefined;
  }
}

interface VideoServiceCaptionResponse {
  transcript?: string;
  language?: string;
  source?: string;
  dialogue_lines?: number;
  char_count?: number;
}

interface VideoServiceCaptionErrorResponse {
  error?: string;
  code?: string;
  retryable?: boolean;
  request_id?: string;
}

interface YouTubeCaptionResult {
  videoId: string;
  transcript: string;
  language?: string;
  source: string;
  dialogueLines: number;
}

function addUniqueVideoId(target: string[], videoId: string | null | undefined): void {
  const normalized = videoId?.trim();
  if (!normalized) return;
  if (!target.includes(normalized)) target.push(normalized);
}

function getVideoAnalysisServiceConfig():
  | { serviceUrl: string; apiSecret: string }
  | undefined {
  const serviceUrl = process.env.VIDEO_ANALYSIS_SERVICE_URL?.trim();
  const apiSecret = process.env.VIDEO_ANALYSIS_API_SECRET?.trim();
  if (!serviceUrl || !apiSecret) return undefined;
  return {
    serviceUrl: serviceUrl.replace(/\/+$/, ""),
    apiSecret,
  };
}

async function fetchYouTubeCaptionForVideoId(args: {
  videoId: string;
  title: string;
  type: "movie" | "tv";
}): Promise<Omit<YouTubeCaptionResult, "videoId"> | null> {
  const config = getVideoAnalysisServiceConfig();
  if (!config) return null;

  const requestId = `captions-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const videoUrl = `https://youtube.com/watch?v=${args.videoId}`;
  const response = await fetch(`${config.serviceUrl}/captions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiSecret}`,
      "X-Request-ID": requestId,
    },
    body: JSON.stringify({
      video_url: videoUrl,
      title: args.title,
      type: args.type,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    let parsed: VideoServiceCaptionErrorResponse | undefined;
    try {
      parsed = JSON.parse(body) as VideoServiceCaptionErrorResponse;
    } catch {
      // Keep raw body for logging.
    }

    const errorCode = parsed?.code;
    if (errorCode === "youtube_captions_unavailable") {
      return null;
    }

    console.warn(
      `[YouTubeCaptions] Caption fetch failed for video_id=${args.videoId} status=${response.status} code=${errorCode ?? "unknown"} body=${(parsed?.error ?? body).slice(0, 300)}`
    );
    return null;
  }

  const payload = (await response.json()) as VideoServiceCaptionResponse;
  const transcript = payload.transcript?.trim();
  if (!transcript || transcript.length < 20) {
    return null;
  }

  const dialogueLines =
    payload.dialogue_lines ??
    transcript.split("\n").filter((line) => line.trim().length > 0).length;

  return {
    transcript,
    language: payload.language,
    source: payload.source ?? "youtube_captions",
    dialogueLines,
  };
}

async function collectYouTubeCaptionCandidatesForTitle(args: {
  title: string;
  year: number;
  type: "movie" | "tv";
}): Promise<string[]> {
  const ids: string[] = [];

  if (args.type === "tv") {
    try {
      const episodeIds = await searchEpisodeClips(args.title, 2);
      for (const id of episodeIds) addUniqueVideoId(ids, id);
    } catch (e) {
      console.warn(
        `[YouTubeCaptions] Failed to search episode clips for "${args.title}" (non-fatal):`,
        e
      );
    }
  }

  try {
    const trailerIds = await searchTrailerCandidates(
      args.title,
      args.year,
      args.type,
      4
    );
    for (const id of trailerIds) addUniqueVideoId(ids, id);
  } catch (e) {
    console.warn(
      `[YouTubeCaptions] Failed to search trailer candidates for "${args.title}" (non-fatal):`,
      e
    );
  }

  return ids.slice(0, 4);
}

async function collectYouTubeCaptionCandidatesForEpisode(args: {
  title: string;
  year: number;
  seasonNumber: number;
  episodeNumber: number;
  episodeName?: string;
}): Promise<string[]> {
  const ids: string[] = [];

  try {
    const episodeVideo = await searchEpisodeVideo(
      args.title,
      args.seasonNumber,
      args.episodeNumber,
      args.episodeName
    );
    addUniqueVideoId(ids, episodeVideo);
  } catch (e) {
    console.warn(
      `[YouTubeCaptions] Failed to search direct episode video for "${args.title}" S${args.seasonNumber}E${args.episodeNumber} (non-fatal):`,
      e
    );
  }

  try {
    const episodeClipIds = await searchEpisodeClips(args.title, 2);
    for (const id of episodeClipIds) addUniqueVideoId(ids, id);
  } catch (e) {
    console.warn(
      `[YouTubeCaptions] Failed to search episode clips for "${args.title}" (non-fatal):`,
      e
    );
  }

  try {
    const trailerIds = await searchTrailerCandidates(args.title, args.year, "tv", 2);
    for (const id of trailerIds) addUniqueVideoId(ids, id);
  } catch (e) {
    console.warn(
      `[YouTubeCaptions] Failed to search trailer candidates for "${args.title}" (non-fatal):`,
      e
    );
  }

  return ids.slice(0, 4);
}

async function fetchFirstAvailableYouTubeCaption(args: {
  candidateVideoIds: string[];
  title: string;
  type: "movie" | "tv";
  logLabel: string;
}): Promise<YouTubeCaptionResult | null> {
  for (const videoId of args.candidateVideoIds) {
    try {
      const caption = await fetchYouTubeCaptionForVideoId({
        videoId,
        title: args.title,
        type: args.type,
      });
      if (!caption) continue;

      console.log(
        `[YouTubeCaptions] Using captions for ${args.logLabel} video_id=${videoId} source=${caption.source} lines=${caption.dialogueLines}`
      );
      return { videoId, ...caption };
    } catch (e) {
      console.warn(
        `[YouTubeCaptions] Caption fetch failed for ${args.logLabel} video_id=${videoId} (non-fatal):`,
        e
      );
    }
  }

  return null;
}

async function maybeApplyYouTubeCaptionFallback(args: {
  title: string;
  year: number;
  type: "movie" | "tv";
  currentSubtitleTranscript?: string;
  currentSubtitleInfo?: SubtitleInfo;
  logLabel: string;
  candidateVideoIds?: string[];
}): Promise<{
  subtitleTranscript?: string;
  subtitleExcerpt?: string;
  subtitleInfo?: SubtitleInfo;
}> {
  if (args.currentSubtitleTranscript?.trim()) {
    return {
      subtitleTranscript: args.currentSubtitleTranscript,
      subtitleInfo: args.currentSubtitleInfo,
      subtitleExcerpt: toTranscriptExcerpt(args.currentSubtitleTranscript),
    };
  }

  const candidateVideoIds =
    args.candidateVideoIds ??
    (await collectYouTubeCaptionCandidatesForTitle({
      title: args.title,
      year: args.year,
      type: args.type,
    }));

  if (candidateVideoIds.length === 0) {
    return {
      subtitleTranscript: args.currentSubtitleTranscript,
      subtitleInfo: args.currentSubtitleInfo,
    };
  }

  const caption = await fetchFirstAvailableYouTubeCaption({
    candidateVideoIds,
    title: args.title,
    type: args.type,
    logLabel: args.logLabel,
  });
  if (!caption) {
    return {
      subtitleTranscript: args.currentSubtitleTranscript,
      subtitleInfo: args.currentSubtitleInfo,
    };
  }

  return {
    subtitleTranscript: caption.transcript,
    subtitleExcerpt: toTranscriptExcerpt(caption.transcript),
    subtitleInfo: {
      status: "success",
      source: caption.source,
      sourceVideoId: caption.videoId,
      language: caption.language ?? "en",
      dialogueLines: caption.dialogueLines,
    },
  };
}

async function gatherMovieData(
  tmdbId: number,
  options: {
    includeSubtitles: boolean;
    archivedSubtitleText?: string;
    archivedTranscriptStorage?: R2TranscriptStorage;
    archivedSourceVideoId?: string;
  }
): Promise<GatheredData> {
  const tmdbKey = process.env.TMDB_API_KEY!;
  const omdbKey = process.env.OMDB_API_KEY;
  const subtitlesKey = process.env.OPENSUBTITLES_API_KEY;

  // Fetch TMDB details
  const tmdb = await getMovieDetails(tmdbId, tmdbKey);
  const year = tmdb.release_date ? parseInt(tmdb.release_date.slice(0, 4), 10) : 0;
  const ageRating = extractMovieAgeRating(tmdb);
  const genre = tmdb.genres.map((g) => g.name).join(", ");
  const keywords = tmdb.keywords?.keywords.map((k) => k.name) ?? [];
  const streamingProviders = extractStreamingProviders(tmdb["watch/providers"]);

  const data: GatheredData = {
    title: tmdb.title,
    year,
    type: "movie",
    imdbId: tmdb.imdb_id,
    ageRating,
    genre,
    runtime: tmdb.runtime ?? undefined,
    overview: tmdb.overview,
    posterPath: tmdb.poster_path ?? undefined,
    tmdbOverview: tmdb.overview,
    keywords,
    streamingProviders,
  };

  // Fetch OMDB data (for additional plot + parental info)
  if (omdbKey && tmdb.imdb_id) {
    try {
      const omdb = await getByImdbId(tmdb.imdb_id, omdbKey);
      if (omdb) {
        data.omdbPlot = omdb.Plot !== "N/A" ? omdb.Plot : undefined;
        data.parentalGuide = omdb.Rated !== "N/A" ? `Rated ${omdb.Rated}` : undefined;
        if (!data.runtime && omdb.Runtime !== "N/A") {
          data.runtime = parseRuntime(omdb.Runtime);
        }
      }
    } catch (e) {
      console.error("OMDB fetch failed (non-fatal):", e);
    }
  }

  const archivedText = options.archivedSubtitleText?.trim();
  if (archivedText) {
    data.subtitleTranscript = archivedText;
    data.subtitleExcerpt = toTranscriptExcerpt(archivedText);
    data.subtitleInfo = {
      status: "success",
      source: "r2_archive",
      sourceVideoId: options.archivedSourceVideoId,
      language: "en",
      dialogueLines: archivedText.split("\n").length,
      transcriptStorage: options.archivedTranscriptStorage,
    };
    return data;
  }

  // Fetch subtitles for dialogue analysis (8s timeout so it never blocks the pipeline)
  if (options.includeSubtitles && subtitlesKey && tmdb.imdb_id) {
    try {
      const SUBTITLE_TIMEOUT = 8000;
      const subtitleResult = await Promise.race([
        (async () => {
          const searchResults = await searchSubtitles(tmdb.imdb_id!, subtitlesKey);
          const candidates = pickSubtitleCandidates(searchResults, 5);
          if (candidates.length === 0) return null;
          for (const candidate of candidates) {
            try {
              const srtText = await downloadSubtitle(candidate.fileId, subtitlesKey);
              const transcript = extractDialogue(srtText, MAX_ARCHIVED_SUBTITLE_LINES);
              const dialogue = transcript
                ? toTranscriptExcerpt(transcript)
                : extractDialogue(srtText, MAX_PROMPT_SUBTITLE_LINES);
              const lines = transcript ? transcript.split("\n").length : 0;
              return { dialogue, transcript, language: candidate.language, lines };
            } catch (e) {
              if (isOpenSubtitlesQuotaError(e)) throw e;
              console.warn(
                `[OpenSubtitles] Movie candidate download failed file_id=${candidate.fileId} (continuing)`,
                e
              );
            }
          }
          return null;
        })(),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), SUBTITLE_TIMEOUT)),
      ]);
      if (subtitleResult) {
        data.subtitleExcerpt = subtitleResult.dialogue;
        data.subtitleTranscript = subtitleResult.transcript;
        data.subtitleInfo = {
          status: "success",
          source: "opensubtitles",
          language: subtitleResult.language,
          dialogueLines: subtitleResult.lines,
        };
      } else {
        // null from race = either no subtitle found or timeout
        data.subtitleInfo = { status: "timeout" };
      }
    } catch (e) {
      console.error("Subtitle fetch failed (non-fatal):", e);
      data.subtitleInfo = {
        status: "failed",
        source: isOpenSubtitlesQuotaError(e)
          ? "opensubtitles_quota"
          : "opensubtitles",
      };
    }
  } else if (!options.includeSubtitles) {
    data.subtitleInfo = { status: "skipped" };
  }

  if (options.includeSubtitles && !data.subtitleTranscript) {
    const fallback = await maybeApplyYouTubeCaptionFallback({
      title: data.title,
      year: data.year,
      type: "movie",
      currentSubtitleTranscript: data.subtitleTranscript,
      currentSubtitleInfo: data.subtitleInfo,
      logLabel: `movie tmdbId=${tmdbId}`,
    });
    if (fallback.subtitleTranscript) {
      data.subtitleTranscript = fallback.subtitleTranscript;
      data.subtitleExcerpt =
        fallback.subtitleExcerpt ?? toTranscriptExcerpt(fallback.subtitleTranscript);
      data.subtitleInfo = fallback.subtitleInfo;
    }
  }

  return data;
}

async function gatherTVData(
  tmdbId: number,
  options: {
    includeSubtitles: boolean;
    archivedSubtitleText?: string;
    archivedTranscriptStorage?: R2TranscriptStorage;
    archivedSourceVideoId?: string;
  }
): Promise<GatheredData> {
  const tmdbKey = process.env.TMDB_API_KEY!;
  const omdbKey = process.env.OMDB_API_KEY;
  const subtitlesKey = process.env.OPENSUBTITLES_API_KEY;

  // Fetch TMDB details
  const tmdb = await getTVDetails(tmdbId, tmdbKey);
  const year = tmdb.first_air_date ? parseInt(tmdb.first_air_date.slice(0, 4), 10) : 0;
  const ageRating = extractTVAgeRating(tmdb);
  const genre = tmdb.genres.map((g) => g.name).join(", ");
  const keywords = tmdb.keywords?.results.map((k) => k.name) ?? [];
  const runtime = tmdb.episode_run_time.length > 0 ? tmdb.episode_run_time[0] : undefined;
  const streamingProviders = extractStreamingProviders(tmdb["watch/providers"]);

  const seasonData = tmdb.seasons?.map((s) => ({
    seasonNumber: s.season_number,
    episodeCount: s.episode_count,
    name: s.name || undefined,
    overview: s.overview || undefined,
    posterPath: s.poster_path || undefined,
    airDate: s.air_date || undefined,
  }));

  const data: GatheredData = {
    title: tmdb.name,
    year,
    type: "tv",
    imdbId: null, // TV shows don't always have a single imdb_id from TMDB details
    ageRating,
    genre,
    runtime,
    overview: tmdb.overview,
    posterPath: tmdb.poster_path ?? undefined,
    tmdbOverview: tmdb.overview,
    keywords,
    streamingProviders,
    numberOfSeasons: tmdb.number_of_seasons,
    seasonData,
  };

  // For TV, attempt OMDB lookup by title+year since TMDB TV doesn't give imdb_id directly
  if (omdbKey) {
    try {
      // Try to find via OMDB search by title
      const url = new URL("https://www.omdbapi.com/");
      url.searchParams.set("t", tmdb.name);
      url.searchParams.set("y", String(year));
      url.searchParams.set("type", "series");
      url.searchParams.set("apikey", omdbKey);
      url.searchParams.set("plot", "full");
      const res = await fetch(url.toString());
      if (res.ok) {
        const omdb = await res.json();
        if (omdb.Response === "True") {
          data.imdbId = omdb.imdbID;
          data.omdbPlot = omdb.Plot !== "N/A" ? omdb.Plot : undefined;
          data.parentalGuide = omdb.Rated !== "N/A" ? `Rated ${omdb.Rated}` : undefined;
        }
      }
    } catch (e) {
      console.error("OMDB TV fetch failed (non-fatal):", e);
    }
  }

  const archivedText = options.archivedSubtitleText?.trim();
  if (archivedText) {
    data.subtitleTranscript = archivedText;
    data.subtitleExcerpt = toTranscriptExcerpt(archivedText);
    data.subtitleInfo = {
      status: "success",
      source: "r2_archive",
      sourceVideoId: options.archivedSourceVideoId,
      language: "en",
      dialogueLines: archivedText.split("\n").length,
      transcriptStorage: options.archivedTranscriptStorage,
    };
    return data;
  }

  // Fetch per-episode subtitles if we got an IMDB ID (15s timeout for multi-episode fetch)
  if (options.includeSubtitles && subtitlesKey && data.imdbId) {
    try {
      const SUBTITLE_TIMEOUT = 15000;
      const subtitleResult = await Promise.race([
        gatherTVEpisodeDialogue(data.imdbId, subtitlesKey, MAX_ARCHIVED_SUBTITLE_LINES),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), SUBTITLE_TIMEOUT)),
      ]);
      if (subtitleResult) {
        data.subtitleTranscript = subtitleResult;
        data.subtitleExcerpt = toTranscriptExcerpt(subtitleResult);
        const lines = subtitleResult.split("\n").length;
        data.subtitleInfo = {
          status: "success",
          source: "opensubtitles",
          language: "en",
          dialogueLines: lines,
        };
      } else {
        data.subtitleInfo = { status: "timeout" };
      }
    } catch (e) {
      console.error("Subtitle fetch failed (non-fatal):", e);
      data.subtitleInfo = {
        status: "failed",
        source: isOpenSubtitlesQuotaError(e)
          ? "opensubtitles_quota"
          : "opensubtitles",
      };
    }
  } else if (!options.includeSubtitles) {
    data.subtitleInfo = { status: "skipped" };
  }

  if (options.includeSubtitles && !data.subtitleTranscript) {
    const fallback = await maybeApplyYouTubeCaptionFallback({
      title: data.title,
      year: data.year,
      type: "tv",
      currentSubtitleTranscript: data.subtitleTranscript,
      currentSubtitleInfo: data.subtitleInfo,
      logLabel: `tv tmdbId=${tmdbId}`,
    });
    if (fallback.subtitleTranscript) {
      data.subtitleTranscript = fallback.subtitleTranscript;
      data.subtitleExcerpt =
        fallback.subtitleExcerpt ?? toTranscriptExcerpt(fallback.subtitleTranscript);
      data.subtitleInfo = fallback.subtitleInfo;
    }
  }

  return data;
}

// ── Core Rating Function ─────────────────────────────────

interface PipelineMetrics {
  durationMs: number;
  tokenUsage: { promptTokens: number; completionTokens: number; totalTokens: number };
  estimatedCostCents: number;
}

function titleNeedsMetadataRefresh(title: {
  slug?: string;
  year: number;
  posterPath?: string;
  overview?: string;
  ageRating?: string;
  genre?: string;
  type: "movie" | "tv" | "youtube";
  seasonData?: Array<{
    seasonNumber: number;
    episodeCount: number;
    name?: string;
    overview?: string;
    posterPath?: string;
    airDate?: string;
  }>;
}): boolean {
  return (
    !title.slug ||
    title.year <= 0 ||
    !title.posterPath ||
    !title.overview ||
    !title.ageRating ||
    !title.genre ||
    (title.type === "tv" && (!title.seasonData || title.seasonData.length === 0))
  );
}

async function hydrateTitleMetadataFromTmdb(
  ctx: ActionCtx,
  args: {
    titleId: Id<"titles">;
    tmdbId: number;
    type: "movie" | "tv";
  }
): Promise<void> {
  const data =
    args.type === "movie"
      ? await gatherMovieData(args.tmdbId, { includeSubtitles: false })
      : await gatherTVData(args.tmdbId, { includeSubtitles: false });

  await ctx.runMutation(internal.ratings.updateTitleMetadata, {
    titleId: args.titleId,
    year: data.year,
    imdbId: data.imdbId ?? undefined,
    ageRating: data.ageRating,
    genre: data.genre,
    overview: data.overview,
    posterPath: data.posterPath,
    runtime: data.runtime,
    streamingProviders: data.streamingProviders?.map((provider) => ({
      name: provider.name,
      logoPath: provider.logoPath,
    })),
    numberOfSeasons: data.numberOfSeasons,
    seasonData: data.seasonData,
  });
}

function logQualityWarning(args: {
  scope: "title" | "episode";
  label: string;
  confidence?: number;
  subtitleStatus?: string;
  reasons: string[];
}): void {
  if (args.reasons.length === 0) return;
  console.warn(
    "[QualityReview] Rating needs manual review:",
    JSON.stringify({
      scope: args.scope,
      label: args.label,
      confidence: args.confidence,
      subtitleStatus: args.subtitleStatus,
      reasons: args.reasons,
    })
  );
}

async function runRatingPipeline(
  ctx: ActionCtx,
  tmdbId: number,
  type: "movie" | "tv",
  options: { includeSubtitles: boolean } = { includeSubtitles: true }
): Promise<{ data: GatheredData; result: RatingResult; model: string; pipelineMetrics: PipelineMetrics }> {
  const openRouterKey = process.env.OPENROUTER_API_KEY!;
  const configuredModel = await ctx.runQuery(
    internal.admin.getConfiguredRatingModelInternal,
    {}
  );
  const startTime = Date.now();

  const existingTitle = await ctx.runQuery(api.titles.getTitleByTmdbId, {
    tmdbId,
  });
  const archivedSubtitleText = await maybeLoadArchivedTranscript(
    existingTitle?.subtitleInfo?.transcriptStorage,
    `title tmdbId=${tmdbId}`
  );
  const archivedTranscriptStorage = archivedSubtitleText
    ? existingTitle?.subtitleInfo?.transcriptStorage
    : undefined;
  const archivedSourceVideoId = archivedSubtitleText
    ? (existingTitle?.subtitleInfo as { sourceVideoId?: string } | undefined)
      ?.sourceVideoId
    : undefined;

  // 1. Gather data
  const data =
    type === "movie"
      ? await gatherMovieData(tmdbId, {
          ...options,
          archivedSubtitleText,
          archivedTranscriptStorage,
          archivedSourceVideoId,
        })
      : await gatherTVData(tmdbId, {
          ...options,
          archivedSubtitleText,
          archivedTranscriptStorage,
          archivedSourceVideoId,
        });

  const archivalText = pickSubtitleTextForArchival({
    subtitleTranscript: data.subtitleTranscript,
    subtitleExcerpt: data.subtitleExcerpt,
  });
  if (archivalText) {
    if (!data.subtitleInfo?.transcriptStorage) {
      console.log(
        `[R2] Attempting subtitle archival for title tmdbId=${tmdbId} type=${type} chars=${archivalText.length}`
      );
      const transcriptStorage = await maybeArchiveTranscript(
        buildTitleTranscriptKey({
          tmdbId,
          type,
          title: data.title,
        }),
        archivalText
      );
      if (transcriptStorage) {
        data.subtitleInfo = {
          ...(data.subtitleInfo ?? { status: "success" }),
          transcriptStorage,
        };
        console.log(
          `[R2] Subtitle archived for title tmdbId=${tmdbId} key=${transcriptStorage.key} bytes=${transcriptStorage.bytes}`
        );
      }
    } else {
      console.log(
        `[R2] Reusing existing archived subtitle for title tmdbId=${tmdbId} key=${data.subtitleInfo.transcriptStorage.key}`
      );
    }
  } else {
    console.log(
      `[R2] No subtitle text to archive for title tmdbId=${tmdbId} subtitleStatus=${data.subtitleInfo?.status ?? "unknown"}`
    );
  }

  // 2. Construct prompt
  const userMessage = constructRatingPrompt({
    title: data.title,
    year: data.year,
    type: data.type,
    ageRating: data.ageRating,
    genre: data.genre,
    runtime: data.runtime,
    tmdbOverview: data.tmdbOverview,
    omdbPlot: data.omdbPlot,
    keywords: data.keywords,
    parentalGuide: data.parentalGuide,
    subtitleExcerpt: data.subtitleExcerpt,
  });

  // 3. Call OpenRouter
  const completion = await chatCompletion(
    RATING_SYSTEM_PROMPT,
    userMessage,
    openRouterKey,
    {
      model: configuredModel,
      maxTokens: 6144,
      requestLabel: `title:${type}:${tmdbId}`,
    }
  );

  // 4. Parse and validate
  const result = parseRatingResponse(completion.content, data.type);

  const durationMs = Date.now() - startTime;
  const pipelineMetrics: PipelineMetrics = {
    durationMs,
    tokenUsage: {
      promptTokens: completion.usage.prompt_tokens,
      completionTokens: completion.usage.completion_tokens,
      totalTokens: completion.usage.total_tokens,
    },
    estimatedCostCents: estimateCostCents(completion.usage),
  };

  return {
    data,
    result,
    model: completion.model || configuredModel,
    pipelineMetrics,
  };
}

// ── Episode Rating ────────────────────────────────────────

const EPISODE_RATING_SYSTEM_PROMPT = `You are a content advisory analyst for a parental content rating service. Your job is to analyze a SINGLE EPISODE of a TV show and rate it across 8 specific cultural/ideological theme categories on a 0-4 severity scale.

You must be OBJECTIVE and CONSISTENT. You are not making value judgments about whether these themes are good or bad — you are simply detecting their presence and intensity so parents can make informed decisions.
You may use decimal severities in 0.1 increments when content clearly falls between two rubric levels.

Use the same 8-category rubric (lgbtq, climate, racialIdentity, genderRoles, antiAuthority, religious, political, sexuality) with 0-4 severity scale.

Category overlap is allowed for episodes too. If the episode shows on-screen romantic affection/relationship content (kiss, dating, spouse/partner dynamics), \`sexuality\` should be at least 1, even when age-appropriate.

## Output Format

Respond with ONLY a JSON object. No preamble, no markdown fences, no explanation outside the JSON.

{
  "ratings": {
    "lgbtq": <0.0-4.0>,
    "climate": <0.0-4.0>,
    "racialIdentity": <0.0-4.0>,
    "genderRoles": <0.0-4.0>,
    "antiAuthority": <0.0-4.0>,
    "religious": <0.0-4.0>,
    "political": <0.0-4.0>,
    "sexuality": <0.0-4.0>
  },
  "confidence": <0.0-1.0>,
  "notes": "<2-3 sentence summary of this specific episode's content. Be factual and specific — cite scenes or plot points from this episode.>",
  "categoryEvidence": {
    // Include ONLY categories rated 1 or higher. Omit categories rated 0.
    "<categoryKey>": {
      "explanation": "<1-2 sentences: why this score, citing specific scenes/characters/plot points from this episode.>",
      "quote": "<If dialogue/subtitle data was provided, include a short relevant quote. Otherwise omit this field.>"
    }
  }
}

The "confidence" score should reflect how much data you had to work with:
- 0.9-1.0: Detailed plot info, dialogue data, multiple sources
- 0.7-0.89: Good plot info and at least one detailed source
- 0.5-0.69: Basic plot/overview only
- Below 0.5: Very limited information`;

function constructEpisodeRatingPrompt(data: {
  showTitle: string;
  showYear: number;
  showGenre?: string;
  showAgeRating?: string;
  seasonNumber: number;
  episodeNumber: number;
  episodeName?: string;
  episodeOverview?: string;
  episodeRuntime?: number;
  subtitleExcerpt?: string;
}): string {
  let prompt = `Rate the following SINGLE EPISODE for our content advisory service.\n\n`;
  prompt += `## Show Context\n`;
  prompt += `- **Show:** ${data.showTitle} (${data.showYear})\n`;
  if (data.showGenre) prompt += `- **Genre:** ${data.showGenre}\n`;
  if (data.showAgeRating) prompt += `- **Target Age Rating:** ${data.showAgeRating}\n`;

  prompt += `\n## Episode\n`;
  prompt += `- **Season ${data.seasonNumber}, Episode ${data.episodeNumber}`;
  if (data.episodeName) prompt += `: "${data.episodeName}"`;
  prompt += `\n`;
  if (data.episodeRuntime) prompt += `- **Runtime:** ${data.episodeRuntime} minutes\n`;

  if (data.episodeOverview) {
    prompt += `\n## Episode Plot\n${data.episodeOverview}\n`;
  }

  if (data.subtitleExcerpt) {
    prompt += `\n## Dialogue Sample (from subtitles)\n${data.subtitleExcerpt}\n`;
  }

  prompt += `\n---\n\nRate THIS SPECIFIC EPISODE across all 8 categories. Remember:\n`;
  prompt += `- Rate only what happens in this episode, not the show overall\n`;
  prompt += `- Be objective and consistent\n`;
  prompt += `- Rate what is shown, not what could be theoretically interpreted\n`;

  return prompt;
}

interface EpisodeRatingResult {
  ratings: Record<CategoryKey, number>;
  confidence: number;
  notes: string;
  categoryEvidence?: Partial<Record<CategoryKey, CategoryEvidenceEntry>>;
}

function parseEpisodeRatingResponse(responseText: string): EpisodeRatingResult {
  const parsed = parseJSONResponse<EpisodeRatingResult>(responseText);
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Episode rating response is not an object");
  }

  assertCategoryRatings(parsed.ratings, "episode ratings");
  assertConfidence(parsed.confidence, "episode confidence");

  if (typeof parsed.notes !== "string" || parsed.notes.trim().length === 0) {
    throw new Error("Missing notes in rating response");
  }
  parsed.notes = parsed.notes.trim();

  parsed.categoryEvidence = sanitizeCategoryEvidence(
    parsed.categoryEvidence,
    parsed.ratings
  );

  // Reuse the same guardrail for episode outputs.
  maybeApplySexualityFloor(parsed);

  return parsed;
}

async function runEpisodeRatingPipeline(
  ctx: ActionCtx,
  showContext: {
    tmdbShowId: number;
    title: string;
    year: number;
    genre?: string;
    ageRating?: string;
    imdbId?: string;
  },
  episodeData: {
    seasonNumber: number;
    episodeNumber: number;
    name?: string;
    overview?: string;
    runtime?: number;
  },
  options: {
    archivedSubtitleText?: string;
    archivedTranscriptStorage?: R2TranscriptStorage;
    archivedSourceVideoId?: string;
  } = {}
): Promise<{
  result: EpisodeRatingResult;
  model: string;
  pipelineMetrics: PipelineMetrics;
  subtitleInfo?: SubtitleInfo;
}> {
  const openRouterKey = process.env.OPENROUTER_API_KEY!;
  const configuredModel = await ctx.runQuery(
    internal.admin.getConfiguredRatingModelInternal,
    {}
  );
  const subtitlesKey = process.env.OPENSUBTITLES_API_KEY;
  const startTime = Date.now();

  // Gather subtitle dialogue for this episode (8s timeout)
  let subtitleExcerpt: string | undefined;
  let subtitleTranscript: string | undefined;
  let subtitleInfo: SubtitleInfo | undefined;
  const archivedText = options.archivedSubtitleText?.trim();
  if (archivedText) {
    subtitleTranscript = archivedText;
    subtitleExcerpt = toTranscriptExcerpt(archivedText);
    subtitleInfo = {
      status: "success",
      source: "r2_archive",
      sourceVideoId: options.archivedSourceVideoId,
      language: "en",
      dialogueLines: archivedText.split("\n").length,
      transcriptStorage: options.archivedTranscriptStorage,
    };
  } else if (subtitlesKey && showContext.imdbId) {
    try {
      const dialogue = await Promise.race([
        gatherSingleEpisodeDialogue(
          showContext.imdbId,
          episodeData.seasonNumber,
          episodeData.episodeNumber,
          subtitlesKey,
          MAX_ARCHIVED_SUBTITLE_LINES
        ),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000)),
      ]);
      if (dialogue) {
        subtitleTranscript = dialogue;
        subtitleExcerpt = toTranscriptExcerpt(dialogue);
        subtitleInfo = {
          status: "success",
          source: "opensubtitles",
          language: "en",
          dialogueLines: dialogue.split("\n").length,
        };
      } else {
        subtitleInfo = { status: "timeout" };
      }
    } catch (e) {
      console.error("Episode subtitle fetch failed (non-fatal):", e);
      subtitleInfo = {
        status: "failed",
        source: isOpenSubtitlesQuotaError(e)
          ? "opensubtitles_quota"
          : "opensubtitles",
      };
    }
  } else {
    subtitleInfo = { status: "skipped" };
  }

  if (!subtitleTranscript) {
    const candidateVideoIds = await collectYouTubeCaptionCandidatesForEpisode({
      title: showContext.title,
      year: showContext.year,
      seasonNumber: episodeData.seasonNumber,
      episodeNumber: episodeData.episodeNumber,
      episodeName: episodeData.name,
    });
    const fallback = await maybeApplyYouTubeCaptionFallback({
      title: showContext.title,
      year: showContext.year,
      type: "tv",
      currentSubtitleTranscript: subtitleTranscript,
      currentSubtitleInfo: subtitleInfo,
      candidateVideoIds,
      logLabel: `episode tmdbShowId=${showContext.tmdbShowId} S${episodeData.seasonNumber}E${episodeData.episodeNumber}`,
    });
    if (fallback.subtitleTranscript) {
      subtitleTranscript = fallback.subtitleTranscript;
      subtitleExcerpt =
        fallback.subtitleExcerpt ?? toTranscriptExcerpt(fallback.subtitleTranscript);
      subtitleInfo = fallback.subtitleInfo;
    }
  }

  const archivalText = pickSubtitleTextForArchival({
    subtitleTranscript,
    subtitleExcerpt,
  });
  if (archivalText) {
    if (!subtitleInfo?.transcriptStorage) {
      console.log(
        `[R2] Attempting subtitle archival for episode tmdbShowId=${showContext.tmdbShowId} S${episodeData.seasonNumber}E${episodeData.episodeNumber} chars=${archivalText.length}`
      );
      const transcriptStorage = await maybeArchiveTranscript(
        buildEpisodeTranscriptKey({
          tmdbShowId: showContext.tmdbShowId,
          seasonNumber: episodeData.seasonNumber,
          episodeNumber: episodeData.episodeNumber,
          showTitle: showContext.title,
        }),
        archivalText
      );
      if (transcriptStorage) {
        subtitleInfo = {
          ...(subtitleInfo ?? { status: "success" }),
          transcriptStorage,
        };
        console.log(
          `[R2] Subtitle archived for episode tmdbShowId=${showContext.tmdbShowId} S${episodeData.seasonNumber}E${episodeData.episodeNumber} key=${transcriptStorage.key} bytes=${transcriptStorage.bytes}`
        );
      }
    } else {
      console.log(
        `[R2] Reusing existing archived subtitle for episode tmdbShowId=${showContext.tmdbShowId} S${episodeData.seasonNumber}E${episodeData.episodeNumber} key=${subtitleInfo.transcriptStorage.key}`
      );
    }
  } else {
    console.log(
      `[R2] No subtitle text to archive for episode tmdbShowId=${showContext.tmdbShowId} S${episodeData.seasonNumber}E${episodeData.episodeNumber} subtitleStatus=${subtitleInfo?.status ?? "unknown"}`
    );
  }

  const userMessage = constructEpisodeRatingPrompt({
    showTitle: showContext.title,
    showYear: showContext.year,
    showGenre: showContext.genre,
    showAgeRating: showContext.ageRating,
    seasonNumber: episodeData.seasonNumber,
    episodeNumber: episodeData.episodeNumber,
    episodeName: episodeData.name,
    episodeOverview: episodeData.overview,
    episodeRuntime: episodeData.runtime,
    subtitleExcerpt,
  });

  const completion = await chatCompletion(
    EPISODE_RATING_SYSTEM_PROMPT,
    userMessage,
    openRouterKey,
    {
      model: configuredModel,
      maxTokens: 3072,
      requestLabel: `episode:${showContext.tmdbShowId}:s${episodeData.seasonNumber}e${episodeData.episodeNumber}`,
    }
  );

  const result = parseEpisodeRatingResponse(completion.content);

  const durationMs = Date.now() - startTime;
  const pipelineMetrics: PipelineMetrics = {
    durationMs,
    tokenUsage: {
      promptTokens: completion.usage.prompt_tokens,
      completionTokens: completion.usage.completion_tokens,
      totalTokens: completion.usage.total_tokens,
    },
    estimatedCostCents: estimateCostCents(completion.usage),
  };

  return {
    result,
    model: completion.model || configuredModel,
    pipelineMetrics,
    subtitleInfo,
  };
}

// ── Public Actions ───────────────────────────────────────

/** Full rating pipeline — called for batch processing and queue items. */
export const rateTitle = action({
  args: {
    tmdbId: v.number(),
    type: v.union(v.literal("movie"), v.literal("tv")),
    queueItemId: v.optional(v.id("ratingQueue")),
  },
  handler: async (ctx, args): Promise<void> => {
    const { data, result, model, pipelineMetrics } = await runRatingPipeline(
      ctx,
      args.tmdbId,
      args.type,
      { includeSubtitles: true }
    );
    const quality = assessRatingQuality({
      confidence: result.confidence,
      subtitleInfo: data.subtitleInfo,
    });
    if (quality.needsReview) {
      logQualityWarning({
        scope: "title",
        label: `${data.title} (${args.type})`,
        confidence: result.confidence,
        subtitleStatus: data.subtitleInfo?.status,
        reasons: quality.reasons,
      });
    }

    // Ensure title exists in DB (create if batch-discovered)
    const existing = await ctx.runQuery(api.titles.getTitleByTmdbId, {
      tmdbId: args.tmdbId,
    });

    if (!existing) {
      // Create the title record with metadata
      await ctx.runMutation(internal.ratings.createTitleFromData, {
        tmdbId: args.tmdbId,
        title: data.title,
        type: args.type,
        year: data.year,
        imdbId: data.imdbId ?? undefined,
        ageRating: data.ageRating,
        genre: data.genre,
        overview: data.overview,
        posterPath: data.posterPath,
        runtime: data.runtime,
        streamingProviders: data.streamingProviders?.map((p) => ({
          name: p.name,
          logoPath: p.logoPath,
        })),
        numberOfSeasons: data.numberOfSeasons,
        seasonData: data.seasonData,
      });
    }

    // Save rating
    await ctx.runMutation(internal.titles.saveRating, {
      tmdbId: args.tmdbId,
      ratings: result.ratings,
      confidence: result.confidence,
      notes: result.notes,
      model,
      episodeFlags: result.episodeFlags?.map((f) => ({
        season: f.season,
        episode: f.episode,
        episodeTitle: f.episodeTitle,
        category: f.category,
        severity: f.severity,
        note: f.note,
      })),
      subtitleInfo: data.subtitleInfo,
      categoryEvidence: result.categoryEvidence as Record<string, { explanation: string; quote?: string }> | undefined,
    });

    // Update queue with metrics
    if (args.queueItemId) {
      await ctx.runMutation(internal.ratings.updateQueueStatusById, {
        queueItemId: args.queueItemId,
        status: "completed",
        completedAt: Date.now(),
        durationMs: pipelineMetrics.durationMs,
        tokenUsage: pipelineMetrics.tokenUsage,
        estimatedCostCents: pipelineMetrics.estimatedCostCents,
      });
    } else {
      await ctx.runMutation(internal.ratings.updateQueueStatus, {
        tmdbId: args.tmdbId,
        status: "completed",
        completedAt: Date.now(),
        durationMs: pipelineMetrics.durationMs,
        tokenUsage: pipelineMetrics.tokenUsage,
        estimatedCostCents: pipelineMetrics.estimatedCostCents,
      });
    }

    // Queue overstimulation analysis (non-blocking — runs after cultural rating)
    const ratedTitle = await ctx.runQuery(api.titles.getTitleByTmdbId, {
      tmdbId: args.tmdbId,
    });
    if (
      ratedTitle &&
      (!ratedTitle.videoAnalysis || ratedTitle.ratings?.overstimulation === undefined)
    ) {
      await ctx.scheduler.runAfter(0, api.healthRatings.analyzeOverstimulation, {
        titleId: ratedTitle._id,
      });
    }

    // If low confidence, mark as disputed for manual review
    if (result.confidence < 0.5) {
      if (ratedTitle) {
        await ctx.runMutation(internal.titles.updateStatus, {
          titleId: ratedTitle._id,
          status: "disputed",
        });
      }
    }
  },
});

/** On-demand rating — triggered by user request. Skips subtitles for speed. */
export const rateTitleOnDemand = action({
  args: {
    tmdbId: v.number(),
    type: v.union(v.literal("movie"), v.literal("tv")),
    queueItemId: v.optional(v.id("ratingQueue")),
  },
  handler: async (ctx, args): Promise<void> => {
    console.log(
      "[rateTitleOnDemand] Starting pipeline:",
      JSON.stringify({ tmdbId: args.tmdbId, type: args.type })
    );
    // Check if already rated
    const existing = await ctx.runQuery(api.titles.getTitleByTmdbId, {
      tmdbId: args.tmdbId,
    });
    if (existing) {
      console.log(
        "[rateTitleOnDemand] Existing title:",
        JSON.stringify({
          titleId: existing._id,
          title: existing.title,
          existingType: existing.type,
          status: existing.status,
        })
      );
      if (existing.type !== args.type) {
        console.error(
          "[rateTitleOnDemand] Type mismatch between request and existing title",
          JSON.stringify({
            tmdbId: args.tmdbId,
            requestedType: args.type,
            existingType: existing.type,
            titleId: existing._id,
            title: existing.title,
          })
        );
      }
    }
    if (existing?.status === "rated" || existing?.status === "reviewed") {
      return; // Already done
    }

    // Update status to "rating" so UI shows loading state
    if (existing) {
      await ctx.runMutation(internal.titles.updateStatus, {
        titleId: existing._id,
        status: "rating",
      });

      // Hydrate poster/year/metadata immediately so the pending detail page
      // shows useful context while the full AI pipeline runs.
      if (titleNeedsMetadataRefresh(existing)) {
        try {
          await hydrateTitleMetadataFromTmdb(ctx, {
            titleId: existing._id,
            tmdbId: args.tmdbId,
            type: args.type,
          });
        } catch (e) {
          console.warn(
            "[rateTitleOnDemand] Early metadata refresh failed (continuing):",
            e
          );
        }
      }
    }

    try {
      // Run pipeline with subtitles (timeout-protected so they don't block)
      const { data, result, model, pipelineMetrics } = await runRatingPipeline(
        ctx,
        args.tmdbId,
        args.type,
        { includeSubtitles: true }
      );
      const quality = assessRatingQuality({
        confidence: result.confidence,
        subtitleInfo: data.subtitleInfo,
      });
      if (quality.needsReview) {
        logQualityWarning({
          scope: "title",
          label: `${data.title} (${args.type})`,
          confidence: result.confidence,
          subtitleStatus: data.subtitleInfo?.status,
          reasons: quality.reasons,
        });
      }

      // Re-check metadata after pipeline in case early hydration failed or
      // the title still has stub fields.
      const latestTitle = await ctx.runQuery(api.titles.getTitleByTmdbId, {
        tmdbId: args.tmdbId,
      });
      if (latestTitle && titleNeedsMetadataRefresh(latestTitle)) {
        await ctx.runMutation(internal.ratings.updateTitleMetadata, {
          titleId: latestTitle._id,
          year: data.year,
          imdbId: data.imdbId ?? undefined,
          ageRating: data.ageRating,
          genre: data.genre,
          overview: data.overview,
          posterPath: data.posterPath,
          runtime: data.runtime,
          streamingProviders: data.streamingProviders?.map((p) => ({
            name: p.name,
            logoPath: p.logoPath,
          })),
          numberOfSeasons: data.numberOfSeasons,
          seasonData: data.seasonData,
        });
      }

      // Save rating
      await ctx.runMutation(internal.titles.saveRating, {
        tmdbId: args.tmdbId,
        ratings: result.ratings,
        confidence: result.confidence,
        notes: result.notes,
        model,
        episodeFlags: result.episodeFlags?.map((f) => ({
          season: f.season,
          episode: f.episode,
          episodeTitle: f.episodeTitle,
          category: f.category,
          severity: f.severity,
          note: f.note,
        })),
        subtitleInfo: data.subtitleInfo,
        categoryEvidence: result.categoryEvidence as Record<string, { explanation: string; quote?: string }> | undefined,
      });

      // Low confidence → disputed
      if (result.confidence < 0.5) {
        const title = await ctx.runQuery(api.titles.getTitleByTmdbId, {
          tmdbId: args.tmdbId,
        });
        if (title) {
          await ctx.runMutation(internal.titles.updateStatus, {
            titleId: title._id,
            status: "disputed",
          });
        }
      }

      // Mark queue item as completed with metrics
      if (args.queueItemId) {
        await ctx.runMutation(internal.ratings.updateQueueStatusById, {
          queueItemId: args.queueItemId,
          status: "completed",
          completedAt: Date.now(),
          durationMs: pipelineMetrics.durationMs,
          tokenUsage: pipelineMetrics.tokenUsage,
          estimatedCostCents: pipelineMetrics.estimatedCostCents,
        });
      } else {
        await ctx.runMutation(internal.ratings.updateQueueStatus, {
          tmdbId: args.tmdbId,
          status: "completed",
          completedAt: Date.now(),
          durationMs: pipelineMetrics.durationMs,
          tokenUsage: pipelineMetrics.tokenUsage,
          estimatedCostCents: pipelineMetrics.estimatedCostCents,
        });
      }

      // Queue overstimulation analysis (non-blocking — runs after cultural rating)
      const ratedTitle = await ctx.runQuery(api.titles.getTitleByTmdbId, {
        tmdbId: args.tmdbId,
      });
      if (
        ratedTitle &&
        (!ratedTitle.videoAnalysis || ratedTitle.ratings?.overstimulation === undefined)
      ) {
        await ctx.scheduler.runAfter(0, api.healthRatings.analyzeOverstimulation, {
          titleId: ratedTitle._id,
        });
      }
    } catch (e) {
      // On failure, mark queue item as failed
      const errorMsg = e instanceof Error ? e.message : String(e);
      if (args.queueItemId) {
        await ctx.runMutation(internal.ratings.updateQueueStatusById, {
          queueItemId: args.queueItemId,
          status: "failed",
          error: errorMsg,
        });
      } else {
        await ctx.runMutation(internal.ratings.updateQueueStatus, {
          tmdbId: args.tmdbId,
          status: "failed",
          error: errorMsg,
        });
      }

      // Reset title to pending so it can be retried
      if (existing) {
        await ctx.runMutation(internal.titles.updateStatus, {
          titleId: existing._id,
          status: "pending",
        });
      }

      throw e;
    }
  },
});

/** Rate a single episode on demand. */
export const rateEpisodeOnDemand = action({
  args: {
    episodeId: v.id("episodes"),
    queueItemId: v.optional(v.id("ratingQueue")),
  },
  handler: async (ctx, args): Promise<void> => {
    const episode = await ctx.runQuery(internal.episodes.getEpisodeInternal, {
      episodeId: args.episodeId,
    });
    if (!episode) throw new Error("Episode not found");
    console.log("[rateEpisodeOnDemand] Episode status:", episode.status, "for episodeId:", args.episodeId);
    if (episode.status === "rated") {
      console.log("[rateEpisodeOnDemand] SKIPPING - episode already rated");
      return;
    }

    const title = await ctx.runQuery(api.titles.getTitle, {
      titleId: episode.titleId,
    });
    if (!title) throw new Error("Parent title not found");

    // Mark as rating
    await ctx.runMutation(internal.episodes.setEpisodeStatus, {
      episodeId: args.episodeId,
      status: "rating",
    });

    try {
      // Find IMDB ID for subtitle lookup
      let imdbId = title.imdbId;
      if (!imdbId) {
        const omdbKey = process.env.OMDB_API_KEY;
        if (omdbKey) {
          try {
            const url = new URL("https://www.omdbapi.com/");
            url.searchParams.set("t", title.title);
            url.searchParams.set("y", String(title.year));
            url.searchParams.set("type", "series");
            url.searchParams.set("apikey", omdbKey);
            const res = await fetch(url.toString());
            if (res.ok) {
              const omdb = await res.json();
              if (omdb.Response === "True") imdbId = omdb.imdbID;
            }
          } catch {
            // non-fatal
          }
        }
      }

      const { result, model, pipelineMetrics, subtitleInfo } = await runEpisodeRatingPipeline(
        ctx,
        {
          tmdbShowId: episode.tmdbShowId,
          title: title.title,
          year: title.year,
          genre: title.genre ?? undefined,
          ageRating: title.ageRating ?? undefined,
          imdbId: imdbId ?? undefined,
        },
        {
          seasonNumber: episode.seasonNumber,
          episodeNumber: episode.episodeNumber,
          name: episode.name ?? undefined,
          overview: episode.overview ?? undefined,
          runtime: episode.runtime ?? undefined,
        },
        {
          archivedSubtitleText: await maybeLoadArchivedTranscript(
            episode.subtitleInfo?.transcriptStorage,
            `episode ${episode._id}`
          ),
          archivedTranscriptStorage: episode.subtitleInfo?.transcriptStorage,
          archivedSourceVideoId: (
            episode.subtitleInfo as { sourceVideoId?: string } | undefined
          )?.sourceVideoId,
        }
      );
      const quality = assessRatingQuality({
        confidence: result.confidence,
        subtitleInfo,
      });
      if (quality.needsReview) {
        logQualityWarning({
          scope: "episode",
          label: `${title.title} S${episode.seasonNumber}E${episode.episodeNumber}`,
          confidence: result.confidence,
          subtitleStatus: subtitleInfo?.status,
          reasons: quality.reasons,
        });
      }

      // Save episode rating
      await ctx.runMutation(internal.episodes.saveEpisodeRating, {
        episodeId: args.episodeId,
        ratings: result.ratings,
        confidence: result.confidence,
        notes: result.notes,
        model,
        subtitleInfo,
        categoryEvidence: result.categoryEvidence as Record<string, { explanation: string; quote?: string }> | undefined,
      });

      // Update queue with metrics
      if (args.queueItemId) {
        await ctx.runMutation(internal.ratings.updateQueueStatusById, {
          queueItemId: args.queueItemId,
          status: "completed",
          completedAt: Date.now(),
          durationMs: pipelineMetrics.durationMs,
          tokenUsage: pipelineMetrics.tokenUsage,
          estimatedCostCents: pipelineMetrics.estimatedCostCents,
        });
      } else {
        await ctx.runMutation(internal.ratings.updateQueueStatus, {
          tmdbId: episode.tmdbShowId,
          status: "completed",
          completedAt: Date.now(),
          durationMs: pipelineMetrics.durationMs,
          tokenUsage: pipelineMetrics.tokenUsage,
          estimatedCostCents: pipelineMetrics.estimatedCostCents,
        });
      }

      // Aggregate show-level ratings from all rated episodes
      await ctx.runMutation(internal.titles.aggregateShowRatings, {
        titleId: episode.titleId,
      });

      // Queue episode-level overstimulation analysis (non-blocking).
      await ctx.scheduler.runAfter(0, api.healthRatings.analyzeEpisodeOverstimulation, {
        episodeId: args.episodeId,
      });
    } catch (e) {
      // Reset on failure
      await ctx.runMutation(internal.episodes.setEpisodeStatus, {
        episodeId: args.episodeId,
        status: "failed",
      });
      throw e;
    }
  },
});

function compareSeasonNumber(a: number, b: number): number {
  // Push season 0 specials behind regular seasons.
  const aSpecial = a === 0 ? 1 : 0;
  const bSpecial = b === 0 ? 1 : 0;
  if (aSpecial !== bSpecial) return aSpecial - bSpecial;
  return a - b;
}

async function rateFirstUnratedEpisodeForTvShow(
  ctx: ActionCtx,
  args: {
    tmdbId: number;
    queueTitle: string;
    queueItemId: Id<"ratingQueue">;
  }
): Promise<void> {
  const show = await ctx.runQuery(api.titles.getTitleByTmdbId, {
    tmdbId: args.tmdbId,
  });
  if (!show || show.type !== "tv") {
    console.log(
      "[processQueueItem] TV request fallback to title rating (missing/non-tv title):",
      JSON.stringify({ tmdbId: args.tmdbId, queueTitle: args.queueTitle })
    );
    await ctx.runAction(api.ratings.rateTitleOnDemand, {
      tmdbId: args.tmdbId,
      type: "tv",
      queueItemId: args.queueItemId,
    });
    return;
  }

  if (titleNeedsMetadataRefresh(show)) {
    try {
      await hydrateTitleMetadataFromTmdb(ctx, {
        titleId: show._id,
        tmdbId: args.tmdbId,
        type: "tv",
      });
    } catch (e) {
      console.warn(
        "[processQueueItem] TV metadata refresh failed (continuing with episode rating):",
        e
      );
    }
  }

  // Ensure season metadata exists before selecting the first unrated episode.
  if (!show.seasonData || show.seasonData.length === 0) {
    await ctx.runAction(api.titles.populateSeasonData, {
      titleId: show._id,
    });
  }

  const refreshedShow = await ctx.runQuery(api.titles.getTitle, {
    titleId: show._id,
  });
  if (!refreshedShow || refreshedShow.type !== "tv") {
    throw new Error("TV title not found after season metadata refresh");
  }

  const seasonsFromMetadata = (refreshedShow.seasonData ?? [])
    .map((s) => s.seasonNumber)
    .filter((n) => Number.isFinite(n))
    .sort(compareSeasonNumber);
  const fallbackSeasonCount = Math.max(refreshedShow.numberOfSeasons ?? 0, 0);
  const fallbackSeasonNumbers =
    fallbackSeasonCount > 0
      ? Array.from({ length: fallbackSeasonCount }, (_, i) => i + 1)
      : [];

  const orderedSeasonNumbers = Array.from(
    new Set(
      (seasonsFromMetadata.length > 0
        ? seasonsFromMetadata
        : fallbackSeasonNumbers
      ).sort(compareSeasonNumber)
    )
  );

  if (orderedSeasonNumbers.length === 0) {
    console.log(
      "[processQueueItem] TV request fallback to title rating (no seasons found):",
      JSON.stringify({ tmdbId: args.tmdbId, titleId: refreshedShow._id })
    );
    await ctx.runAction(api.ratings.rateTitleOnDemand, {
      tmdbId: args.tmdbId,
      type: "tv",
      queueItemId: args.queueItemId,
    });
    return;
  }

  const loadEpisodes = async () =>
    await ctx.runQuery(internal.admin.getEpisodesForTitleInternal, {
      titleId: refreshedShow._id,
    });

  let episodes = await loadEpisodes();
  const hasSeasonLoaded = (seasonNumber: number) =>
    episodes.some((ep) => ep.seasonNumber === seasonNumber);
  const findCandidate = (seasonNumber: number) =>
    episodes
      .filter(
        (ep) =>
          ep.seasonNumber === seasonNumber &&
          ep.status !== "rated" &&
          ep.status !== "rating"
      )
      .sort((a, b) => a.episodeNumber - b.episodeNumber)[0];

  for (const seasonNumber of orderedSeasonNumbers) {
    if (!hasSeasonLoaded(seasonNumber)) {
      try {
        await ctx.runAction(api.episodes.fetchSeasonEpisodes, {
          titleId: refreshedShow._id,
          tmdbShowId: refreshedShow.tmdbId,
          seasonNumber,
        });
      } catch (e) {
        console.error(
          `[processQueueItem] Failed loading season ${seasonNumber} for tmdbId=${args.tmdbId}:`,
          e
        );
      }
      episodes = await loadEpisodes();
    }

    const firstUnrated = findCandidate(seasonNumber);
    if (firstUnrated) {
      console.log(
        "[processQueueItem] TV request routed to first unrated episode:",
        JSON.stringify({
          tmdbId: args.tmdbId,
          titleId: refreshedShow._id,
          episodeId: firstUnrated._id,
          seasonNumber: firstUnrated.seasonNumber,
          episodeNumber: firstUnrated.episodeNumber,
        })
      );
      await ctx.runAction(api.ratings.rateEpisodeOnDemand, {
        episodeId: firstUnrated._id,
        queueItemId: args.queueItemId,
      });
      return;
    }
  }

  // All known episodes are already rated/in-progress. Keep show aggregate fresh.
  console.log(
    "[processQueueItem] TV request skipped (no unrated episodes found):",
    JSON.stringify({ tmdbId: args.tmdbId, titleId: refreshedShow._id })
  );
  await ctx.runMutation(internal.titles.aggregateShowRatings, {
    titleId: refreshedShow._id,
  });
}

/** Process a single queue item through the full rating pipeline. */
export const processQueueItem = action({
  args: { queueItemId: v.id("ratingQueue") },
  handler: async (ctx, args): Promise<void> => {
    const item = await ctx.runQuery(internal.ratings.getQueueItem, {
      queueItemId: args.queueItemId,
    });

    if (!item) {
      console.log("[processQueueItem] Item not found:", args.queueItemId);
      return;
    }
    console.log(
      "[processQueueItem] Loaded queue item:",
      JSON.stringify({
        queueItemId: item._id,
        tmdbId: item.tmdbId,
        type: item.type,
        source: item.source,
        status: item.status,
        episodeId: item.episodeId,
      })
    );
    if (item.status !== "queued") {
      console.log("[processQueueItem] Skipping, status is:", item.status, "for", item.title);
      return;
    }

    // Mark as processing
    await ctx.runMutation(internal.ratings.setQueueProcessing, {
      queueItemId: args.queueItemId,
    });

    const startTime = Date.now();
    try {
      if (item.type === "episode" && item.episodeId) {
        console.log("[processQueueItem] Rating episode:", item.title, "episodeId:", item.episodeId);
        await ctx.runAction(api.ratings.rateEpisodeOnDemand, {
          episodeId: item.episodeId,
          queueItemId: args.queueItemId,
        });
        console.log("[processQueueItem] Episode rating complete:", item.title);
      } else if (item.type === "tv" && item.source === "user_request") {
        console.log(
          "[processQueueItem] TV user request routing to first unrated episode:",
          item.title
        );
        await rateFirstUnratedEpisodeForTvShow(ctx, {
          tmdbId: item.tmdbId,
          queueTitle: item.title,
          queueItemId: args.queueItemId,
        });
        console.log(
          "[processQueueItem] TV user request episode routing complete:",
          item.title
        );
      } else if (item.source === "user_request" || item.source === "admin_rerate") {
        console.log("[processQueueItem] On-demand rating:", item.title, "source:", item.source);
        await ctx.runAction(api.ratings.rateTitleOnDemand, {
          tmdbId: item.tmdbId,
          type: item.type as "movie" | "tv",
          queueItemId: args.queueItemId,
        });
        console.log("[processQueueItem] On-demand rating complete:", item.title);
      } else {
        console.log("[processQueueItem] Batch rating:", item.title);
        await ctx.runAction(api.ratings.rateTitle, {
          tmdbId: item.tmdbId,
          type: item.type as "movie" | "tv",
          queueItemId: args.queueItemId,
        });
        console.log("[processQueueItem] Batch rating complete:", item.title);
      }

      // Ensure this specific queue item is marked completed (inner actions
      // use tmdbId-based lookup which can hit the wrong item for TV shows)
      await ctx.runMutation(internal.ratings.completeQueueItemById, {
        queueItemId: args.queueItemId,
        durationMs: Date.now() - startTime,
      });
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      const attempts = (item.attempts ?? 0) + 1;

      if (attempts >= 3) {
        await ctx.runMutation(internal.ratings.failQueueItem, {
          queueItemId: args.queueItemId,
          error: errorMsg,
          attempts,
        });
      } else {
        await ctx.runMutation(internal.ratings.retryQueueItem, {
          queueItemId: args.queueItemId,
          error: errorMsg,
          attempts,
        });

        // Ensure retries actually run promptly instead of waiting for a future
        // batch worker invocation.
        await ctx.scheduler.runAfter(10_000, api.ratings.processQueueItem, {
          queueItemId: args.queueItemId,
        });
      }
    }
  },
});

/** Nightly batch: fetch popular titles and queue unrated ones for processing. */
export const runNightlyBatch = action({
  args: {},
  handler: async (ctx): Promise<void> => {
    const tmdbKey = process.env.TMDB_API_KEY!;
    console.log("[NightlyBatch] Starting...");

    // Fetch popular movies and TV shows (page 1 = 20 results each)
    const [popularMovies, popularTV] = await Promise.all([
      (async () => {
        try {
          const { results } = await getPopularMovies(tmdbKey, 1);
          return results;
        } catch (e) {
          console.error("[NightlyBatch] Failed to fetch popular movies:", e);
          return [];
        }
      })(),
      (async () => {
        try {
          const { results } = await getPopularTV(tmdbKey, 1);
          return results;
        } catch (e) {
          console.error("[NightlyBatch] Failed to fetch popular TV:", e);
          return [];
        }
      })(),
    ]);

    let queued = 0;

    // Check and queue movies
    for (const movie of popularMovies) {
      const existing = await ctx.runQuery(api.titles.getTitleByTmdbId, {
        tmdbId: movie.id,
      });
      if (existing) continue;

      // Check if already in queue
      const inQueue = await ctx.runQuery(internal.ratings.isInQueue, {
        tmdbId: movie.id,
      });
      if (inQueue) continue;

      await ctx.runMutation(internal.ratings.addToQueue, {
        tmdbId: movie.id,
        title: movie.title,
        type: "movie",
        priority: 1,
        source: "batch",
      });
      queued++;
    }

    // Check and queue TV shows
    for (const show of popularTV) {
      const existing = await ctx.runQuery(api.titles.getTitleByTmdbId, {
        tmdbId: show.id,
      });
      if (existing) continue;

      const inQueue = await ctx.runQuery(internal.ratings.isInQueue, {
        tmdbId: show.id,
      });
      if (inQueue) continue;

      await ctx.runMutation(internal.ratings.addToQueue, {
        tmdbId: show.id,
        title: show.name,
        type: "tv",
        priority: 1,
        source: "batch",
      });
      queued++;
    }

    console.log(`[NightlyBatch] Queued ${queued} new titles`);

    // Process queue items one at a time (cost control)
    const queueItems = await ctx.runQuery(internal.ratings.getQueuedItems, {
      limit: 10,
    });

    let processed = 0;
    let failed = 0;

    for (const item of queueItems) {
      try {
        await ctx.runAction(api.ratings.processQueueItem, {
          queueItemId: item._id,
        });
        processed++;
        console.log(`[NightlyBatch] Rated: ${item.title}`);
      } catch (e) {
        failed++;
        console.error(`[NightlyBatch] Failed: ${item.title}`, e);
      }
    }

    console.log(
      `[NightlyBatch] Done. Processed: ${processed}, Failed: ${failed}`
    );
  },
});

// ── TMDB Search (for "not in DB" flow) ───────────────────

export const searchTMDB = action({
  args: { query: v.string() },
  handler: async (ctx, args): Promise<
    {
      tmdbId: number;
      title: string;
      type: "movie" | "tv";
      year: number;
      posterPath: string | null;
      overview: string;
      existingTitleId?: string;
      existingTitleSlug?: string;
      existingTitleStatus?: string;
      existingHasRatings?: boolean;
    }[]
  > => {
    const query = args.query.trim();
    if (query.length < 2) return [];
    if (query.length > 120) {
      throw new Error("Search query too long");
    }

    const tmdbKey = process.env.TMDB_API_KEY!;

    const [movies, tv] = await Promise.all([
      searchMovies(query, tmdbKey).catch(() => ({ results: [] })),
      searchTV(query, tmdbKey).catch(() => ({ results: [] })),
    ]);

    const results: {
      tmdbId: number;
      title: string;
      type: "movie" | "tv";
      year: number;
      posterPath: string | null;
      overview: string;
      popularity: number;
    }[] = [];

    for (const m of movies.results.slice(0, 10)) {
      results.push({
        tmdbId: m.id,
        title: m.title,
        type: "movie",
        year: m.release_date ? parseInt(m.release_date.slice(0, 4), 10) : 0,
        posterPath: m.poster_path,
        overview: m.overview,
        popularity: m.popularity,
      });
    }

    for (const s of tv.results.slice(0, 10)) {
      results.push({
        tmdbId: s.id,
        title: s.name,
        type: "tv",
        year: s.first_air_date ? parseInt(s.first_air_date.slice(0, 4), 10) : 0,
        posterPath: s.poster_path,
        overview: s.overview,
        popularity: s.popularity,
      });
    }

    // Sort by popularity descending, return top 12
    results.sort((a, b) => b.popularity - a.popularity);
    const topResults = results
      .slice(0, 12)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .map(({ popularity, ...rest }) => rest);

    const withExistingTitles = await Promise.all(
      topResults.map(async (result) => {
        const existing = await ctx.runQuery(api.titles.getTitleByTmdbId, {
          tmdbId: result.tmdbId,
        });

        if (!existing || existing.type !== result.type) {
          return result;
        }

        const existingHasRatings =
          existing.status === "rated" ||
          existing.status === "reviewed" ||
          existing.status === "disputed";

        return {
          ...result,
          existingTitleId: String(existing._id),
          existingTitleSlug: existing.slug,
          existingTitleStatus: existing.status,
          existingHasRatings,
        };
      })
    );

    return withExistingTitles;
  },
});

// ── On-demand request (public mutation) ──────────────────

export const requestOnDemandRating = mutation({
  args: {
    tmdbId: v.number(),
    title: v.string(),
    type: v.union(v.literal("movie"), v.literal("tv")),
  },
  handler: async (ctx, args) => {
    console.log(
      "[requestOnDemandRating] Request received:",
      JSON.stringify({
        tmdbId: args.tmdbId,
        title: args.title,
        requestedType: args.type,
      })
    );
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Sign in required");

    // Check if title already exists
    const existing = await ctx.db
      .query("titles")
      .withIndex("by_tmdbId", (q) => q.eq("tmdbId", args.tmdbId))
      .first();
    if (existing) {
      console.log(
        "[requestOnDemandRating] Existing title hit by tmdbId:",
        JSON.stringify({
          titleId: existing._id,
          existingType: existing.type,
          requestedType: args.type,
          status: existing.status,
          title: existing.title,
        })
      );
      if (existing.type !== args.type) {
        console.error(
          "[requestOnDemandRating] Type mismatch between request and existing title",
          JSON.stringify({
            tmdbId: args.tmdbId,
            requestedType: args.type,
            existingType: existing.type,
            titleId: existing._id,
            existingTitle: existing.title,
            requestedTitle: args.title,
          })
        );
      }
    }
    if (existing?.status === "rating") {
      return existing._id;
    }
    // If an existing pending title already has an active queue item, don't enqueue again.
    if (existing?.status === "pending") {
      const queueItems = await ctx.db
        .query("ratingQueue")
        .withIndex("by_tmdbId", (q) => q.eq("tmdbId", args.tmdbId))
        .collect();
      const hasActiveQueue = queueItems.some(
        (q) => q.status === "queued" || q.status === "processing"
      );
      if (hasActiveQueue) return existing._id;
    }

    // Check rate limits
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) throw new Error("User not found");

    const today = new Date().toISOString().split("T")[0];
    const tier = user?.tier ?? "free";
    const limit = tier === "paid" ? 10 : 3;
    const used =
      user?.onDemandRatingsDate === today
        ? user?.onDemandRatingsToday ?? 0
        : 0;

    const isAdmin = user?.isAdmin === true;
    const isCompletedRating =
      existing &&
      (existing.status === "rated" ||
        existing.status === "reviewed" ||
        existing.status === "disputed");

    // Re-running an already rated title is admin-only.
    if (isCompletedRating && !isAdmin) {
      return existing._id;
    }

    if (!isAdmin && used >= limit) {
      throw new Error("Daily on-demand rating limit reached");
    }

    // Update rate limit counter (skip for admins)
    if (!isAdmin) {
      await ctx.db.patch(user._id, {
        onDemandRatingsToday: used + 1,
        onDemandRatingsDate: today,
      });
    }

    let titleId = existing?._id;

    // Create pending title if missing
    if (!titleId) {
      let slug = generateTitleSlug(args.title, 0);
      const slugConflict = await ctx.db
        .query("titles")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .first();
      if (slugConflict) {
        let suffix = 2;
        while (true) {
          const candidate = `${slug}-${suffix}`;
          const check = await ctx.db
            .query("titles")
            .withIndex("by_slug", (q) => q.eq("slug", candidate))
            .first();
          if (!check) {
            slug = candidate;
            break;
          }
          suffix++;
        }
      }

      titleId = await ctx.db.insert("titles", {
        tmdbId: args.tmdbId,
        slug,
        title: args.title,
        type: args.type,
        year: 0,
        status: "pending",
      });
    } else if (existing && existing.status !== "pending") {
      await ctx.db.patch(titleId, { status: "pending" });
    }

    // Add to rating queue
    const queueItemId = await ctx.db.insert("ratingQueue", {
      tmdbId: args.tmdbId,
      titleId,
      title: args.title,
      type: args.type,
      priority: 10,
      source: "user_request",
      status: "queued",
      createdAt: Date.now(),
    });
    console.log(
      "[requestOnDemandRating] Queue item created:",
      JSON.stringify({
        queueItemId,
        tmdbId: args.tmdbId,
        type: args.type,
        source: "user_request",
      })
    );

    // Schedule the rating action to run immediately
    await ctx.scheduler.runAfter(0, api.ratings.processQueueItem, {
      queueItemId,
    });

    return titleId;
  },
});

// ── Internal Mutations (used by actions) ─────────────────

export const createTitleFromData = internalMutation({
  args: {
    tmdbId: v.number(),
    title: v.string(),
    type: v.union(v.literal("movie"), v.literal("tv")),
    year: v.number(),
    imdbId: v.optional(v.string()),
    ageRating: v.optional(v.string()),
    genre: v.optional(v.string()),
    overview: v.optional(v.string()),
    posterPath: v.optional(v.string()),
    runtime: v.optional(v.number()),
    streamingProviders: v.optional(
      v.array(v.object({ name: v.string(), logoPath: v.optional(v.string()) }))
    ),
    numberOfSeasons: v.optional(v.number()),
    seasonData: v.optional(
      v.array(
        v.object({
          seasonNumber: v.number(),
          episodeCount: v.number(),
          name: v.optional(v.string()),
          overview: v.optional(v.string()),
          posterPath: v.optional(v.string()),
          airDate: v.optional(v.string()),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    // Generate unique slug
    let slug = generateTitleSlug(args.title, args.year);
    const existing = await ctx.db
      .query("titles")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    if (existing) {
      let suffix = 2;
      while (true) {
        const candidate = `${slug}-${suffix}`;
        const check = await ctx.db
          .query("titles")
          .withIndex("by_slug", (q) => q.eq("slug", candidate))
          .first();
        if (!check) {
          slug = candidate;
          break;
        }
        suffix++;
      }
    }

    return await ctx.db.insert("titles", {
      tmdbId: args.tmdbId,
      slug,
      title: args.title,
      type: args.type,
      year: args.year,
      imdbId: args.imdbId,
      ageRating: args.ageRating,
      genre: args.genre,
      overview: args.overview,
      posterPath: args.posterPath,
      runtime: args.runtime,
      streamingProviders: args.streamingProviders?.map((p) => ({
        name: p.name,
        logoPath: p.logoPath,
      })),
      numberOfSeasons: args.numberOfSeasons,
      seasonData: args.seasonData,
      status: "pending",
    });
  },
});

export const updateTitleMetadata = internalMutation({
  args: {
    titleId: v.id("titles"),
    year: v.number(),
    imdbId: v.optional(v.string()),
    ageRating: v.optional(v.string()),
    genre: v.optional(v.string()),
    overview: v.optional(v.string()),
    posterPath: v.optional(v.string()),
    runtime: v.optional(v.number()),
    streamingProviders: v.optional(
      v.array(v.object({ name: v.string(), logoPath: v.optional(v.string()) }))
    ),
    numberOfSeasons: v.optional(v.number()),
    seasonData: v.optional(
      v.array(
        v.object({
          seasonNumber: v.number(),
          episodeCount: v.number(),
          name: v.optional(v.string()),
          overview: v.optional(v.string()),
          posterPath: v.optional(v.string()),
          airDate: v.optional(v.string()),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    const { titleId, streamingProviders } = args;
    const existingTitle = await ctx.db.get(titleId);
    if (!existingTitle) throw new Error("Title not found");

    const normalizedYear = args.year > 0 ? args.year : existingTitle.year;

    const mergedProviders =
      streamingProviders !== undefined
        ? mergeStreamingProvidersWithAffiliates(
            streamingProviders.map((p) => ({
              name: p.name,
              logoPath: p.logoPath,
            })),
            existingTitle.streamingProviders
          )
        : undefined;

    // Generate slug if missing. Also upgrade legacy unknown-year slugs
    // (for example "title-0") when we now have a real release year.
    let slug: string | undefined;
    const shouldRefreshUnknownYearSlug =
      normalizedYear > 0 &&
      !!existingTitle.slug &&
      isLegacyUnknownYearSlug(existingTitle.slug, existingTitle.title);

    if (!existingTitle.slug || shouldRefreshUnknownYearSlug) {
      slug = generateTitleSlug(existingTitle.title, normalizedYear > 0 ? normalizedYear : 0);
      const slugConflict = await ctx.db
        .query("titles")
        .withIndex("by_slug", (q) => q.eq("slug", slug!))
        .first();
      if (slugConflict && slugConflict._id !== titleId) {
        let suffix = 2;
        while (true) {
          const candidate = `${slug}-${suffix}`;
          const check = await ctx.db
            .query("titles")
            .withIndex("by_slug", (q) => q.eq("slug", candidate))
            .first();
          if (!check) {
            slug = candidate;
            break;
          }
          suffix++;
        }
      }
    }

    await ctx.db.patch(titleId, {
      year: normalizedYear,
      imdbId: args.imdbId ?? existingTitle.imdbId,
      ageRating: args.ageRating ?? existingTitle.ageRating,
      genre: args.genre ?? existingTitle.genre,
      overview: args.overview ?? existingTitle.overview,
      posterPath: args.posterPath ?? existingTitle.posterPath,
      runtime: args.runtime ?? existingTitle.runtime,
      numberOfSeasons: args.numberOfSeasons ?? existingTitle.numberOfSeasons,
      seasonData:
        args.seasonData && args.seasonData.length > 0
          ? args.seasonData
          : existingTitle.seasonData,
      streamingProviders: mergedProviders ?? existingTitle.streamingProviders,
      ...(slug ? { slug } : {}),
    });
  },
});

export const getQueueItem = internalQuery({
  args: { queueItemId: v.id("ratingQueue") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.queueItemId);
  },
});

export const setQueueProcessing = internalMutation({
  args: { queueItemId: v.id("ratingQueue") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.queueItemId, { status: "processing" });
  },
});

export const updateQueueStatus = internalMutation({
  args: {
    tmdbId: v.number(),
    status: v.union(v.literal("completed"), v.literal("failed")),
    error: v.optional(v.string()),
    completedAt: v.optional(v.number()),
    durationMs: v.optional(v.number()),
    tokenUsage: v.optional(v.object({
      promptTokens: v.number(),
      completionTokens: v.number(),
      totalTokens: v.number(),
    })),
    estimatedCostCents: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Find the most recent processing item for this tmdbId (not just .first()
    // which could hit an older completed item for the same show)
    const items = await ctx.db
      .query("ratingQueue")
      .withIndex("by_tmdbId", (q) => q.eq("tmdbId", args.tmdbId))
      .collect();
    const item = items.find((i) => i.status === "processing") ?? items[items.length - 1];
    if (item) {
      console.log(`[updateQueueStatus] Patching queue item ${item._id} (status: ${item.status}) with cost=${args.estimatedCostCents} tokens=${JSON.stringify(args.tokenUsage)} duration=${args.durationMs}`);
      await ctx.db.patch(item._id, {
        status: args.status,
        lastError: args.error,
        completedAt: args.completedAt,
        durationMs: args.durationMs,
        tokenUsage: args.tokenUsage,
        estimatedCostCents: args.estimatedCostCents,
      });
    } else {
      console.log(`[updateQueueStatus] No queue item found for tmdbId=${args.tmdbId} (${items.length} items total)`);
    }
  },
});

export const updateQueueStatusById = internalMutation({
  args: {
    queueItemId: v.id("ratingQueue"),
    status: v.union(v.literal("completed"), v.literal("failed")),
    error: v.optional(v.string()),
    completedAt: v.optional(v.number()),
    durationMs: v.optional(v.number()),
    tokenUsage: v.optional(v.object({
      promptTokens: v.number(),
      completionTokens: v.number(),
      totalTokens: v.number(),
    })),
    estimatedCostCents: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.queueItemId);
    if (!item) return;
    await ctx.db.patch(args.queueItemId, {
      status: args.status,
      lastError: args.error,
      completedAt: args.completedAt,
      durationMs: args.durationMs,
      tokenUsage: args.tokenUsage,
      estimatedCostCents: args.estimatedCostCents,
    });
  },
});

export const failQueueItem = internalMutation({
  args: {
    queueItemId: v.id("ratingQueue"),
    error: v.string(),
    attempts: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.queueItemId, {
      status: "failed",
      lastError: args.error,
      attempts: args.attempts,
    });
  },
});

export const retryQueueItem = internalMutation({
  args: {
    queueItemId: v.id("ratingQueue"),
    error: v.string(),
    attempts: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.queueItemId, {
      status: "queued",
      lastError: args.error,
      attempts: args.attempts,
    });
  },
});

export const completeQueueItemById = internalMutation({
  args: {
    queueItemId: v.id("ratingQueue"),
    durationMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.queueItemId);
    if (!item) return;

    // If updateQueueStatus already completed this item (with metrics), just
    // ensure durationMs is set if missing. Don't overwrite existing metrics.
    if (item.status === "completed") {
      if (args.durationMs != null && !item.durationMs) {
        await ctx.db.patch(args.queueItemId, { durationMs: args.durationMs });
      }
      return;
    }

    // If updateQueueStatus wrote metrics to a different item (tmdbId collision),
    // this item is still "processing" — complete it with what we have.
    await ctx.db.patch(args.queueItemId, {
      status: "completed",
      completedAt: Date.now(),
      ...(args.durationMs != null ? { durationMs: args.durationMs } : {}),
    });
  },
});

export const addToQueue = internalMutation({
  args: {
    tmdbId: v.number(),
    titleId: v.optional(v.id("titles")),
    title: v.string(),
    type: v.union(v.literal("movie"), v.literal("tv")),
    priority: v.number(),
    source: v.union(v.literal("batch"), v.literal("user_request")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("ratingQueue", {
      ...args,
      status: "queued",
      createdAt: Date.now(),
    });
  },
});

export const isInQueue = internalQuery({
  args: { tmdbId: v.number() },
  handler: async (ctx, args) => {
    const item = await ctx.db
      .query("ratingQueue")
      .withIndex("by_tmdbId", (q) => q.eq("tmdbId", args.tmdbId))
      .first();
    return item !== null;
  },
});

export const getQueuedItems = internalQuery({
  args: { limit: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("ratingQueue")
      .withIndex("by_status_priority", (q) => q.eq("status", "queued"))
      .take(args.limit);
  },
});
