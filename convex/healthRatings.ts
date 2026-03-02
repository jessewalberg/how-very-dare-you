import { action, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import type { ActionCtx } from "./_generated/server";
import { searchTrailer, searchEpisodeClips, searchEpisodeVideo } from "../lib/youtube";
import { chatCompletion, parseJSONResponse } from "../lib/openrouter";
import { assertConfidence, assertSeverityScore } from "./lib/ratingValidation";

// ── Overstimulation Prompt ───────────────────────────────

function constructOverstimPrompt(title: {
  title: string;
  type: "movie" | "tv" | "youtube";
  year: number;
  ageRating?: string;
}, metrics: VideoAnalysisMetrics): string {
  return `You are rating a ${title.type === "tv" ? "TV show" : "movie"} called "${title.title}" (${title.year}) for overstimulation level.

Here are the measured video metrics:
- Cuts per minute: ${metrics.cuts_per_minute}
- Average cut duration: ${metrics.avg_cut_duration_seconds} seconds
- Average color saturation: ${metrics.avg_saturation}/255
- Brightness variance: ${metrics.brightness_variance}
- Color change rate (avg frame-to-frame delta): ${metrics.color_change_rate}
- Flash count (significant brightness jumps): ${metrics.flash_count}
- Total video duration analyzed: ${metrics.total_duration_seconds} seconds

For reference, here are typical ranges for kids content:
- Slow-paced shows (Bluey, Daniel Tiger): 5-10 cuts/min, avg 6-12 sec per scene
- Moderate shows (Paw Patrol, Peppa Pig): 10-18 cuts/min, avg 3-6 sec per scene
- Fast-paced shows (Cocomelon, YouTube kids): 20-40+ cuts/min, avg 1.5-3 sec per scene

Also consider the target age rating: ${title.ageRating ?? "Unknown"}
Content aimed at younger children (TV-Y, G) should be judged more strictly.

Rate overstimulation on this scale:
- 0 None: Gentle pacing, natural colors, long scenes. Suitable visual rhythm for the target age.
- 1 Brief: Mostly calm with occasional faster sequences.
- 2 Notable: Moderately fast editing or saturated colors throughout. Noticeable stimulation.
- 3 Significant: Rapid cuts, highly saturated/bright colors, frequent visual changes. Designed to capture and hold attention through stimulation.
- 4 Core Theme: Extremely rapid editing, constant flashing/movement, hyperstimulating. The visual style IS the content strategy.

Respond with JSON only:
{
  "severity": <0-4>,
  "confidence": <0.0-1.0>,
  "note": "<1-2 sentence explanation citing specific metrics>"
}`;
}

// ── Types ────────────────────────────────────────────────

interface VideoAnalysisMetrics {
  cuts_per_minute: number;
  avg_cut_duration_seconds: number;
  total_cuts: number;
  total_duration_seconds: number;
  avg_saturation: number;
  avg_brightness: number;
  max_saturation: number;
  brightness_variance: number;
  color_change_rate: number;
  flash_count: number;
}

interface OverstimLLMResult {
  severity: number;
  confidence: number;
  note: string;
}

interface OverstimResult extends OverstimLLMResult {
  model: string;
}

const OVERSTIM_METHOD_VERSION = "overstim-v1";
const OVERSTIM_MAX_ATTEMPTS = 3;
const OVERSTIM_RETRY_DELAYS_MS = [30_000, 120_000];

// ── Helpers ──────────────────────────────────────────────

interface VideoAnalysisTiming {
  download_ms: number;
  scene_detection_ms: number;
  color_analysis_ms: number;
  total_ms: number;
}

interface VideoAnalysisResponse extends VideoAnalysisMetrics {
  timing?: VideoAnalysisTiming;
}

interface VideoAnalysisErrorResponse {
  error?: string;
  request_id?: string;
}

/** Call the Go video analysis service for a single YouTube video. */
async function analyzeVideo(
  videoId: string,
  title: string,
  type: string,
  serviceUrl: string,
  apiSecret: string
): Promise<VideoAnalysisMetrics> {
  const videoUrl = `https://youtube.com/watch?v=${videoId}`;
  const requestId = `convex-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const res = await fetch(`${serviceUrl}/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiSecret}`,
      "X-Request-ID": requestId,
    },
    body: JSON.stringify({ video_url: videoUrl, title, type }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    let requestId: string | undefined;
    let message = errBody;
    try {
      const parsed = JSON.parse(errBody) as VideoAnalysisErrorResponse;
      message = parsed.error ?? errBody;
      requestId = parsed.request_id;
    } catch {
      // Keep raw body if not JSON.
    }

    throw new Error(
      `Video analysis service error ${res.status}: ${message}${requestId ? ` (request_id=${requestId})` : ""}`
    );
  }

  const data = await res.json() as VideoAnalysisResponse;

  if (data.timing) {
    console.log(`[VideoAnalysis] ${title} (${videoId}) timing: download=${data.timing.download_ms}ms scene=${data.timing.scene_detection_ms}ms color=${data.timing.color_analysis_ms}ms total=${data.timing.total_ms}ms request_id=${requestId}`);
  }

  return data;
}

/** Send video metrics to AI for a 0-4 overstimulation rating. */
async function rateMetrics(
  title: { title: string; type: "movie" | "tv" | "youtube"; year: number; ageRating?: string },
  metrics: VideoAnalysisMetrics,
  openRouterKey: string
): Promise<OverstimResult> {
  const completion = await chatCompletion(
    "You are a developmental health content analyst. Rate video overstimulation based on measured metrics. Respond with JSON only.",
    constructOverstimPrompt(title, metrics),
    openRouterKey,
    { temperature: 0.3, maxTokens: 512 }
  );

  const result = parseJSONResponse<OverstimLLMResult>(completion.content);

  assertSeverityScore(result.severity, "overstimulation severity");
  assertConfidence(result.confidence, "overstimulation confidence");
  if (typeof result.note !== "string" || result.note.trim().length === 0) {
    throw new Error("Missing overstimulation note");
  }

  return {
    ...result,
    note: result.note.trim(),
    model: completion.model,
  };
}

// ── Actions ──────────────────────────────────────────────

async function runOverstimulationForTitle(
  ctx: ActionCtx,
  args: { titleId: Id<"titles">; force?: boolean }
): Promise<"analyzed" | "skipped_already_analyzed" | "skipped_no_trailer"> {
  const title = await ctx.runQuery(api.titles.getTitle, { titleId: args.titleId });
  if (!title) throw new Error("Title not found");

  // Skip redundant analyses unless explicitly forced (e.g. admin re-rate).
  if (!args.force && title.videoAnalysis && title.ratings?.overstimulation !== undefined) {
    console.log(`[Overstim] Skipping "${title.title}" (already analyzed)`);
    return "skipped_already_analyzed";
  }

  const serviceUrl = process.env.VIDEO_ANALYSIS_SERVICE_URL;
  const apiSecret = process.env.VIDEO_ANALYSIS_API_SECRET;
  const openRouterKey = process.env.OPENROUTER_API_KEY!;

  if (!serviceUrl || !apiSecret) {
    throw new Error("VIDEO_ANALYSIS_SERVICE_URL or VIDEO_ANALYSIS_API_SECRET not set");
  }

  const titleMeta = {
    title: title.title,
    type: title.type as "movie" | "tv" | "youtube",
    year: title.year,
    ageRating: title.ageRating,
  };

  // 1. Find and analyze trailer
  const trailerId = await searchTrailer(title.title, title.year, title.type as "movie" | "tv");
  if (!trailerId) {
    console.log(`[Overstim] No trailer found for "${title.title}" — skipping`);
    return "skipped_no_trailer";
  }

  console.log(`[Overstim] Found trailer ${trailerId} for "${title.title}"`);
  const trailerMetrics = await analyzeVideo(trailerId, title.title, title.type, serviceUrl, apiSecret);
  console.log(`[Overstim] Trailer metrics for "${title.title}":`, JSON.stringify(trailerMetrics));
  const trailerResult = await rateMetrics(titleMeta, trailerMetrics, openRouterKey);

  let severity: number;
  let sourceType: "movie_trailer" | "tv_weighted" | "tv_trailer_fallback" =
    "movie_trailer";
  let formula = "round(clamp(trailer, 0, 4))";
  let computedScore = trailerResult.severity;
  let primaryVideoId = trailerId;
  let episodeSampleDetails:
    | {
        requestedCount: number;
        analyzedCount: number;
        videoIds: string[];
        severities: number[];
        averageSeverity?: number;
      }
    | undefined;

  if (title.type === "tv") {
    // 2. For TV: search for episode clips
    const episodeResults: Array<{ videoId: string; result: OverstimResult }> = [];
    let requestedEpisodeCount = 0;
    try {
      const episodeIds = await searchEpisodeClips(title.title, 2);
      requestedEpisodeCount = episodeIds.length;
      console.log(`[Overstim] Found ${episodeIds.length} episode clips for "${title.title}"`);

      for (const epId of episodeIds) {
        try {
          const epMetrics = await analyzeVideo(epId, title.title, title.type, serviceUrl, apiSecret);
          const epResult = await rateMetrics(titleMeta, epMetrics, openRouterKey);
          episodeResults.push({ videoId: epId, result: epResult });
        } catch (e) {
          console.error(`[Overstim] Episode clip ${epId} analysis failed (non-fatal):`, e instanceof Error ? e.message : e);
        }
      }

      if (episodeIds.length > 0) {
        primaryVideoId = episodeIds[0];
      }
    } catch (e) {
      console.error(`[Overstim] Episode clip search failed (non-fatal):`, e instanceof Error ? e.message : e);
    }

    if (episodeResults.length > 0) {
      // Weighted average: 70% episodes / 30% trailer (per spec)
      const episodeAvg =
        episodeResults.reduce((sum, r) => sum + r.result.severity, 0) /
        episodeResults.length;
      computedScore = episodeAvg * 0.7 + trailerResult.severity * 0.3;
      severity = Math.round(computedScore);
      severity = Math.max(0, Math.min(4, severity));
      sourceType = "tv_weighted";
      formula = "round(clamp((episode_avg*0.7)+(trailer*0.3), 0, 4))";
      episodeSampleDetails = {
        requestedCount: requestedEpisodeCount,
        analyzedCount: episodeResults.length,
        videoIds: episodeResults.map((r) => r.videoId),
        severities: episodeResults.map((r) => r.result.severity),
        averageSeverity: episodeAvg,
      };
      console.log(`[Overstim] TV weighted score: episodes=${episodeAvg.toFixed(1)} trailer=${trailerResult.severity} → ${severity}`);
    } else {
      // Trailer only — apply 0.7x bias correction
      computedScore = trailerResult.severity * 0.7;
      severity = Math.max(0, Math.round(computedScore));
      sourceType = "tv_trailer_fallback";
      formula = "round(clamp(trailer*0.7, 0, 4))";
      episodeSampleDetails = {
        requestedCount: requestedEpisodeCount,
        analyzedCount: 0,
        videoIds: [],
        severities: [],
      };
      console.log(`[Overstim] TV bias correction (no episodes): ${trailerResult.severity} → ${severity}`);
    }
  } else {
    // Movies: use trailer score directly
    severity = trailerResult.severity;
  }

  // 3. Save to database
  await ctx.runMutation(internal.healthRatings.saveOverstimulation, {
    titleId: args.titleId,
    overstimulation: severity,
    videoAnalysis: {
      youtubeVideoId: primaryVideoId,
      analyzedAt: Date.now(),
      cutsPerMinute: trailerMetrics.cuts_per_minute,
      avgCutDuration: trailerMetrics.avg_cut_duration_seconds,
      avgSaturation: trailerMetrics.avg_saturation,
      avgBrightness: trailerMetrics.avg_brightness,
      brightnessVariance: trailerMetrics.brightness_variance,
      flashCount: trailerMetrics.flash_count,
      trailerBiasCorrected: title.type === "tv",
      derivation: {
        methodVersion: OVERSTIM_METHOD_VERSION,
        sourceType,
        formula,
        computedScore,
        trailer: {
          videoId: trailerId,
          severity: trailerResult.severity,
          confidence: trailerResult.confidence,
          note: trailerResult.note,
          model: trailerResult.model,
        },
        episodeSamples: episodeSampleDetails,
      },
    },
  });

  console.log(`[Overstim] Saved score ${severity} for "${title.title}"`);
  return "analyzed";
}

async function runOverstimulationForEpisode(
  ctx: ActionCtx,
  args: { episodeId: Id<"episodes"> }
): Promise<
  "analyzed" | "skipped_episode_unrated" | "skipped_no_episode_video"
> {
  const episode = await ctx.runQuery(internal.episodes.getEpisodeInternal, {
    episodeId: args.episodeId,
  });
  if (!episode) throw new Error("Episode not found");

  const title = await ctx.runQuery(api.titles.getTitle, {
    titleId: episode.titleId,
  });
  if (!title) throw new Error("Parent title not found");
  if (!episode.ratings) return "skipped_episode_unrated";

  const serviceUrl = process.env.VIDEO_ANALYSIS_SERVICE_URL;
  const apiSecret = process.env.VIDEO_ANALYSIS_API_SECRET;
  const openRouterKey = process.env.OPENROUTER_API_KEY!;

  if (!serviceUrl || !apiSecret) {
    throw new Error("VIDEO_ANALYSIS_SERVICE_URL or VIDEO_ANALYSIS_API_SECRET not set");
  }

  const videoId = await searchEpisodeVideo(
    title.title,
    episode.seasonNumber,
    episode.episodeNumber,
    episode.name ?? undefined
  );
  if (!videoId) {
    console.log(`[Overstim] No episode video found for "${title.title}" S${episode.seasonNumber}E${episode.episodeNumber}`);
    return "skipped_no_episode_video";
  }

  const label = `${title.title} S${episode.seasonNumber}E${episode.episodeNumber}`;
  const metrics = await analyzeVideo(videoId, label, title.type, serviceUrl, apiSecret);
  const result = await rateMetrics(
    {
      title: label,
      type: title.type as "movie" | "tv" | "youtube",
      year: title.year,
      ageRating: title.ageRating,
    },
    metrics,
    openRouterKey
  );

  await ctx.runMutation(internal.episodes.saveEpisodeOverstimulation, {
    episodeId: args.episodeId,
    overstimulation: result.severity,
    analysis: {
      methodVersion: OVERSTIM_METHOD_VERSION,
      videoId,
      analyzedAt: Date.now(),
      metrics: {
        cutsPerMinute: metrics.cuts_per_minute,
        avgCutDuration: metrics.avg_cut_duration_seconds,
        avgSaturation: metrics.avg_saturation,
        avgBrightness: metrics.avg_brightness,
        brightnessVariance: metrics.brightness_variance,
        flashCount: metrics.flash_count,
      },
      ai: {
        severity: result.severity,
        confidence: result.confidence,
        note: result.note,
        model: result.model,
      },
    },
  });

  // Recompute show-level ratings from the updated episode set.
  await ctx.runMutation(internal.titles.aggregateShowRatings, {
    titleId: episode.titleId,
  });

  console.log(`[Overstim] Saved episode score ${result.severity} for "${label}"`);
  return "analyzed";
}

/** Public entrypoint: enqueue title overstimulation analysis for background processing. */
export const analyzeOverstimulation = action({
  args: { titleId: v.id("titles"), force: v.optional(v.boolean()) },
  handler: async (ctx, args): Promise<void> => {
    const jobId = await ctx.runMutation(internal.healthRatings.enqueueOverstimulationJob, {
      titleId: args.titleId,
      force: args.force,
    });
    await ctx.scheduler.runAfter(0, api.healthRatings.processOverstimulationJob, {
      jobId,
    });
  },
});

/** Worker action for queued title overstimulation jobs. */
export const processOverstimulationJob = action({
  args: { jobId: v.id("overstimulationQueue") },
  handler: async (ctx, args): Promise<void> => {
    const job = await ctx.runQuery(internal.healthRatings.getOverstimulationJob, {
      jobId: args.jobId,
    });
    if (!job || job.status !== "queued") return;

    const attempts = job.attempts ?? 0;
    await ctx.runMutation(internal.healthRatings.markOverstimulationJobProcessing, {
      jobId: args.jobId,
      attempts: attempts + 1,
    });

    try {
      const result = job.episodeId
        ? await runOverstimulationForEpisode(ctx, {
          episodeId: job.episodeId,
        })
        : await runOverstimulationForTitle(ctx, {
          titleId: job.titleId,
          force: job.force,
        });
      if (result === "analyzed") {
        await ctx.runMutation(internal.healthRatings.markOverstimulationJobCompleted, {
          jobId: args.jobId,
        });
      } else {
        await ctx.runMutation(internal.healthRatings.markOverstimulationJobSkipped, {
          jobId: args.jobId,
          reason: (() => {
            if (result === "skipped_already_analyzed") {
              return "Skipped: title already has overstimulation analysis";
            }
            if (result === "skipped_no_trailer") {
              return "Skipped: no trailer found";
            }
            if (result === "skipped_episode_unrated") {
              return "Skipped: episode is not rated yet";
            }
            return "Skipped: no episode video found";
          })(),
        });
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      if (attempts + 1 >= OVERSTIM_MAX_ATTEMPTS) {
        await ctx.runMutation(internal.healthRatings.markOverstimulationJobFailed, {
          jobId: args.jobId,
          error: errorMessage,
        });
        throw e;
      }

      const delayMs = OVERSTIM_RETRY_DELAYS_MS[Math.min(attempts, OVERSTIM_RETRY_DELAYS_MS.length - 1)];
      await ctx.runMutation(internal.healthRatings.markOverstimulationJobQueued, {
        jobId: args.jobId,
        error: errorMessage,
      });
      await ctx.scheduler.runAfter(delayMs, api.healthRatings.processOverstimulationJob, {
        jobId: args.jobId,
      });
    }
  },
});

/** Analyze a specific episode for overstimulation and merge into episode ratings. */
export const analyzeEpisodeOverstimulation = action({
  args: { episodeId: v.id("episodes") },
  handler: async (ctx, args): Promise<void> => {
    const jobId = await ctx.runMutation(
      internal.healthRatings.enqueueEpisodeOverstimulationJob,
      {
        episodeId: args.episodeId,
      }
    );
    await ctx.scheduler.runAfter(0, api.healthRatings.processOverstimulationJob, {
      jobId,
    });
  },
});

/** Batch: process rated titles that don't have overstimulation scores yet. */
export const runOverstimulationBatch = action({
  args: {},
  handler: async (ctx): Promise<void> => {
    console.log("[OverstimBatch] Starting...");

    const titles = await ctx.runQuery(internal.healthRatings.getTitlesNeedingOverstim, {});

    if (titles.length === 0) {
      console.log("[OverstimBatch] No titles need overstimulation analysis");
      return;
    }

    console.log(`[OverstimBatch] Found ${titles.length} titles needing analysis (processing max 50)`);

    let processed = 0;
    let failed = 0;

    for (const title of titles.slice(0, 50)) {
      try {
        await ctx.runAction(api.healthRatings.analyzeOverstimulation, {
          titleId: title._id,
        });
        processed++;
        console.log(`[OverstimBatch] ✓ ${title.title} (${processed}/${Math.min(titles.length, 50)})`);
      } catch (e) {
        failed++;
        console.error(`[OverstimBatch] ✗ ${title.title}:`, e instanceof Error ? e.message : e);
      }
    }

    console.log(`[OverstimBatch] Done. Processed: ${processed}, Failed: ${failed}`);
  },
});

// ── Internal Mutations ───────────────────────────────────

export const enqueueOverstimulationJob = internalMutation({
  args: {
    titleId: v.id("titles"),
    force: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("overstimulationQueue")
      .withIndex("by_titleId", (q) => q.eq("titleId", args.titleId))
      .collect();
    const activeJob = existing.find(
      (job) =>
        job.episodeId === undefined &&
        (job.status === "queued" || job.status === "processing")
    );
    if (activeJob) {
      if (args.force && !activeJob.force) {
        await ctx.db.patch(activeJob._id, {
          force: true,
          updatedAt: Date.now(),
        });
      }
      return activeJob._id;
    }

    const now = Date.now();
    return await ctx.db.insert("overstimulationQueue", {
      titleId: args.titleId,
      targetType: "title",
      force: args.force,
      status: "queued",
      attempts: 0,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const enqueueEpisodeOverstimulationJob = internalMutation({
  args: { episodeId: v.id("episodes") },
  handler: async (ctx, args) => {
    const episode = await ctx.db.get(args.episodeId);
    if (!episode) throw new Error("Episode not found");

    const existing = await ctx.db
      .query("overstimulationQueue")
      .withIndex("by_episodeId", (q) => q.eq("episodeId", args.episodeId))
      .collect();
    const activeJob = existing.find(
      (job) => job.status === "queued" || job.status === "processing"
    );
    if (activeJob) {
      return activeJob._id;
    }

    const now = Date.now();
    return await ctx.db.insert("overstimulationQueue", {
      titleId: episode.titleId,
      episodeId: args.episodeId,
      targetType: "episode",
      status: "queued",
      attempts: 0,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const getOverstimulationJob = internalQuery({
  args: { jobId: v.id("overstimulationQueue") },
  handler: async (ctx, args) => await ctx.db.get(args.jobId),
});

export const markOverstimulationJobProcessing = internalMutation({
  args: {
    jobId: v.id("overstimulationQueue"),
    attempts: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      status: "processing",
      attempts: args.attempts,
      startedAt: Date.now(),
      updatedAt: Date.now(),
      lastError: undefined,
    });
  },
});

export const markOverstimulationJobCompleted = internalMutation({
  args: { jobId: v.id("overstimulationQueue") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      status: "completed",
      completedAt: Date.now(),
      updatedAt: Date.now(),
      lastError: undefined,
    });
  },
});

export const markOverstimulationJobSkipped = internalMutation({
  args: {
    jobId: v.id("overstimulationQueue"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      status: "skipped",
      completedAt: Date.now(),
      updatedAt: Date.now(),
      lastError: args.reason,
    });
  },
});

export const markOverstimulationJobQueued = internalMutation({
  args: {
    jobId: v.id("overstimulationQueue"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      status: "queued",
      lastError: args.error,
      updatedAt: Date.now(),
    });
  },
});

export const markOverstimulationJobFailed = internalMutation({
  args: {
    jobId: v.id("overstimulationQueue"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      status: "failed",
      completedAt: Date.now(),
      updatedAt: Date.now(),
      lastError: args.error,
    });
  },
});

export const saveOverstimulation = internalMutation({
  args: {
    titleId: v.id("titles"),
    overstimulation: v.number(),
    videoAnalysis: v.object({
      youtubeVideoId: v.string(),
      analyzedAt: v.number(),
      cutsPerMinute: v.number(),
      avgCutDuration: v.number(),
      avgSaturation: v.number(),
      avgBrightness: v.number(),
      brightnessVariance: v.number(),
      flashCount: v.number(),
      trailerBiasCorrected: v.boolean(),
      derivation: v.optional(v.object({
        methodVersion: v.string(),
        sourceType: v.union(
          v.literal("movie_trailer"),
          v.literal("tv_weighted"),
          v.literal("tv_trailer_fallback")
        ),
        formula: v.string(),
        computedScore: v.number(),
        trailer: v.object({
          videoId: v.string(),
          severity: v.number(),
          confidence: v.number(),
          note: v.string(),
          model: v.string(),
        }),
        episodeSamples: v.optional(v.object({
          requestedCount: v.number(),
          analyzedCount: v.number(),
          videoIds: v.array(v.string()),
          severities: v.array(v.number()),
          averageSeverity: v.optional(v.number()),
        })),
      })),
    }),
  },
  handler: async (ctx, args) => {
    const title = await ctx.db.get(args.titleId);
    if (!title) throw new Error("Title not found");
    assertSeverityScore(args.overstimulation, "title overstimulation");
    if (args.videoAnalysis.derivation) {
      assertSeverityScore(
        args.videoAnalysis.derivation.trailer.severity,
        "title overstimulation trailer severity"
      );
      assertConfidence(
        args.videoAnalysis.derivation.trailer.confidence,
        "title overstimulation trailer confidence"
      );
    }

    // Merge overstimulation into existing ratings
    const existingRatings = title.ratings;
    if (existingRatings) {
      await ctx.db.patch(args.titleId, {
        ratings: {
          ...existingRatings,
          overstimulation: args.overstimulation,
        },
        videoAnalysis: args.videoAnalysis,
      });
    } else {
      // Title has no cultural ratings yet — save placeholder ratings with overstimulation
      await ctx.db.patch(args.titleId, {
        ratings: {
          lgbtq: 0,
          climate: 0,
          racialIdentity: 0,
          genderRoles: 0,
          antiAuthority: 0,
          religious: 0,
          political: 0,
          sexuality: 0,
          overstimulation: args.overstimulation,
        },
        videoAnalysis: args.videoAnalysis,
      });
    }
  },
});

/** Find rated titles that don't have an overstimulation score yet. */
export const getTitlesNeedingOverstim = internalQuery({
  args: {},
  handler: async (ctx) => {
    const titles = await ctx.db
      .query("titles")
      .withIndex("by_status", (q) => q.eq("status", "rated"))
      .collect();

    return titles.filter((t) => {
      // Skip if already has video analysis
      if (t.videoAnalysis) return false;
      // Only process titles that have cultural ratings
      if (!t.ratings) return false;
      // Skip if overstimulation already set
      if (t.ratings.overstimulation !== undefined) return false;
      return true;
    });
  },
});
