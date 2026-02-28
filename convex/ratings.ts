import { action, mutation, internalMutation, internalQuery } from "./_generated/server";
import type { ActionCtx } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import {
  getMovieDetails,
  getTVDetails,
  extractMovieAgeRating,
  extractTVAgeRating,
  extractStreamingProviders,
} from "../lib/tmdb";
import { getByImdbId, parseRuntime } from "../lib/omdb";
import {
  searchSubtitles,
  downloadSubtitle,
  extractDialogue,
  pickBestSubtitle,
  gatherTVEpisodeDialogue,
} from "../lib/opensubtitles";
import { chatCompletion, parseJSONResponse, estimateCostCents } from "../lib/openrouter";
import { uploadTextToR2, type R2TranscriptStorage } from "../lib/r2";
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
    "lgbtq": <0-4>,
    "climate": <0-4>,
    "racialIdentity": <0-4>,
    "genderRoles": <0-4>,
    "antiAuthority": <0-4>,
    "religious": <0-4>,
    "political": <0-4>,
    "sexuality": <0-4>
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
      "severity": <0-4>,
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

function slugForKey(input: string): string {
  const slug = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const capped = slug.slice(0, 80);
  return capped || "untitled";
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

async function gatherMovieData(
  tmdbId: number,
  options: { includeSubtitles: boolean }
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

  // Fetch subtitles for dialogue analysis (8s timeout so it never blocks the pipeline)
  if (options.includeSubtitles && subtitlesKey && tmdb.imdb_id) {
    try {
      const SUBTITLE_TIMEOUT = 8000;
      const subtitleResult = await Promise.race([
        (async () => {
          const searchResults = await searchSubtitles(tmdb.imdb_id!, subtitlesKey);
          const best = pickBestSubtitle(searchResults);
          if (best) {
            const srtText = await downloadSubtitle(best.fileId, subtitlesKey);
            const transcript = extractDialogue(srtText, MAX_ARCHIVED_SUBTITLE_LINES);
            const dialogue = transcript
              ? toTranscriptExcerpt(transcript)
              : extractDialogue(srtText, MAX_PROMPT_SUBTITLE_LINES);
            const lines = transcript ? transcript.split("\n").length : 0;
            return { dialogue, transcript, language: best.language, lines };
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
      data.subtitleInfo = { status: "failed" };
    }
  } else if (!options.includeSubtitles) {
    data.subtitleInfo = { status: "skipped" };
  }

  return data;
}

async function gatherTVData(
  tmdbId: number,
  options: { includeSubtitles: boolean }
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
      data.subtitleInfo = { status: "failed" };
    }
  } else if (!options.includeSubtitles) {
    data.subtitleInfo = { status: "skipped" };
  }

  return data;
}

// ── Core Rating Function ─────────────────────────────────

interface PipelineMetrics {
  durationMs: number;
  tokenUsage: { promptTokens: number; completionTokens: number; totalTokens: number };
  estimatedCostCents: number;
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

  // 1. Gather data
  const data =
    type === "movie"
      ? await gatherMovieData(tmdbId, options)
      : await gatherTVData(tmdbId, options);

  if (data.subtitleTranscript) {
    const transcriptStorage = await maybeArchiveTranscript(
      buildTitleTranscriptKey({
        tmdbId,
        type,
        title: data.title,
      }),
      data.subtitleTranscript
    );
    if (transcriptStorage) {
      data.subtitleInfo = {
        ...(data.subtitleInfo ?? { status: "success" }),
        transcriptStorage,
      };
    }
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
    { model: configuredModel, temperature: 0.3, maxTokens: 6144 }
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

Use the same 8-category rubric (lgbtq, climate, racialIdentity, genderRoles, antiAuthority, religious, political, sexuality) with 0-4 severity scale.

Category overlap is allowed for episodes too. If the episode shows on-screen romantic affection/relationship content (kiss, dating, spouse/partner dynamics), \`sexuality\` should be at least 1, even when age-appropriate.

## Output Format

Respond with ONLY a JSON object. No preamble, no markdown fences, no explanation outside the JSON.

{
  "ratings": {
    "lgbtq": <0-4>,
    "climate": <0-4>,
    "racialIdentity": <0-4>,
    "genderRoles": <0-4>,
    "antiAuthority": <0-4>,
    "religious": <0-4>,
    "political": <0-4>,
    "sexuality": <0-4>
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
  }
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
  if (subtitlesKey && showContext.imdbId) {
    try {
      const { gatherSingleEpisodeDialogue } = await import("../lib/opensubtitles");
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
      subtitleInfo = { status: "failed" };
    }
  } else {
    subtitleInfo = { status: "skipped" };
  }

  if (subtitleTranscript) {
    const transcriptStorage = await maybeArchiveTranscript(
      buildEpisodeTranscriptKey({
        tmdbShowId: showContext.tmdbShowId,
        seasonNumber: episodeData.seasonNumber,
        episodeNumber: episodeData.episodeNumber,
        showTitle: showContext.title,
      }),
      subtitleTranscript
    );
    if (transcriptStorage) {
      subtitleInfo = {
        ...(subtitleInfo ?? { status: "success" }),
        transcriptStorage,
      };
    }
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
    { model: configuredModel, temperature: 0.3, maxTokens: 3072 }
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
  },
  handler: async (ctx, args): Promise<void> => {
    const { data, result, model, pipelineMetrics } = await runRatingPipeline(
      ctx,
      args.tmdbId,
      args.type,
      { includeSubtitles: true }
    );

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
    await ctx.runMutation(internal.ratings.updateQueueStatus, {
      tmdbId: args.tmdbId,
      status: "completed",
      completedAt: Date.now(),
      durationMs: pipelineMetrics.durationMs,
      tokenUsage: pipelineMetrics.tokenUsage,
      estimatedCostCents: pipelineMetrics.estimatedCostCents,
    });

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
  },
  handler: async (ctx, args): Promise<void> => {
    // Check if already rated
    const existing = await ctx.runQuery(api.titles.getTitleByTmdbId, {
      tmdbId: args.tmdbId,
    });
    if (existing?.status === "rated" || existing?.status === "reviewed") {
      return; // Already done
    }

    // Update status to "rating" so UI shows loading state
    if (existing) {
      await ctx.runMutation(internal.titles.updateStatus, {
        titleId: existing._id,
        status: "rating",
      });
    }

    try {
      // Run pipeline with subtitles (timeout-protected so they don't block)
      const { data, result, model, pipelineMetrics } = await runRatingPipeline(
        ctx,
        args.tmdbId,
        args.type,
        { includeSubtitles: true }
      );

      // Update title metadata if it was created as a stub
      if (existing && existing.year === 0) {
        await ctx.runMutation(internal.ratings.updateTitleMetadata, {
          titleId: existing._id,
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
      await ctx.runMutation(internal.ratings.updateQueueStatus, {
        tmdbId: args.tmdbId,
        status: "completed",
        completedAt: Date.now(),
        durationMs: pipelineMetrics.durationMs,
        tokenUsage: pipelineMetrics.tokenUsage,
        estimatedCostCents: pipelineMetrics.estimatedCostCents,
      });

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
      await ctx.runMutation(internal.ratings.updateQueueStatus, {
        tmdbId: args.tmdbId,
        status: "failed",
        error: errorMsg,
      });

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
  args: { episodeId: v.id("episodes") },
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
        }
      );

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
      await ctx.runMutation(internal.ratings.updateQueueStatus, {
        tmdbId: episode.tmdbShowId,
        status: "completed",
        completedAt: Date.now(),
        durationMs: pipelineMetrics.durationMs,
        tokenUsage: pipelineMetrics.tokenUsage,
        estimatedCostCents: pipelineMetrics.estimatedCostCents,
      });

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
        });
        console.log("[processQueueItem] Episode rating complete:", item.title);
      } else if (item.source === "user_request" || item.source === "admin_rerate") {
        console.log("[processQueueItem] On-demand rating:", item.title, "source:", item.source);
        await ctx.runAction(api.ratings.rateTitleOnDemand, {
          tmdbId: item.tmdbId,
          type: item.type as "movie" | "tv",
        });
        console.log("[processQueueItem] On-demand rating complete:", item.title);
      } else {
        console.log("[processQueueItem] Batch rating:", item.title);
        await ctx.runAction(api.ratings.rateTitle, {
          tmdbId: item.tmdbId,
          type: item.type as "movie" | "tv",
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
          const { results } = await import("../lib/tmdb").then((m) =>
            m.getPopularMovies(tmdbKey, 1)
          );
          return results;
        } catch (e) {
          console.error("[NightlyBatch] Failed to fetch popular movies:", e);
          return [];
        }
      })(),
      (async () => {
        try {
          const { results } = await import("../lib/tmdb").then((m) =>
            m.getPopularTV(tmdbKey, 1)
          );
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
  handler: async (_ctx, args): Promise<
    {
      tmdbId: number;
      title: string;
      type: "movie" | "tv";
      year: number;
      posterPath: string | null;
      overview: string;
    }[]
  > => {
    const query = args.query.trim();
    if (query.length < 2) return [];
    if (query.length > 120) {
      throw new Error("Search query too long");
    }

    const tmdbKey = process.env.TMDB_API_KEY!;
    const { searchMovies, searchTV } = await import("../lib/tmdb");

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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return results.slice(0, 12).map(({ popularity, ...rest }) => rest);
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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Sign in required");

    // Check if title already exists
    const existing = await ctx.db
      .query("titles")
      .withIndex("by_tmdbId", (q) => q.eq("tmdbId", args.tmdbId))
      .first();
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
      titleId = await ctx.db.insert("titles", {
        tmdbId: args.tmdbId,
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
      title: args.title,
      type: args.type,
      priority: 10,
      source: "user_request",
      status: "queued",
      createdAt: Date.now(),
    });

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
    return await ctx.db.insert("titles", {
      tmdbId: args.tmdbId,
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
    const { titleId, ...fields } = args;
    await ctx.db.patch(titleId, {
      ...fields,
      streamingProviders: fields.streamingProviders?.map((p) => ({
        name: p.name,
        logoPath: p.logoPath,
      })),
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
