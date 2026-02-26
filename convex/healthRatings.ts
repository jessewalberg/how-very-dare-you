import { action, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { searchTrailer, searchEpisodeClips } from "../lib/youtube";
import { chatCompletion, parseJSONResponse } from "../lib/openrouter";

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

interface OverstimResult {
  severity: number;
  confidence: number;
  note: string;
}

// ── Helpers ──────────────────────────────────────────────

/** Call the Go video analysis service for a single YouTube video. */
async function analyzeVideo(
  videoId: string,
  title: string,
  type: string,
  serviceUrl: string,
  apiSecret: string
): Promise<VideoAnalysisMetrics> {
  const videoUrl = `https://youtube.com/watch?v=${videoId}`;
  const res = await fetch(`${serviceUrl}/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiSecret}`,
    },
    body: JSON.stringify({ video_url: videoUrl, title, type }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Video analysis service error ${res.status}: ${errBody}`);
  }

  return res.json() as Promise<VideoAnalysisMetrics>;
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

  const result = parseJSONResponse<OverstimResult>(completion.content);

  if (typeof result.severity !== "number" || result.severity < 0 || result.severity > 4 || !Number.isInteger(result.severity)) {
    throw new Error(`Invalid overstimulation severity: ${result.severity}`);
  }

  return result;
}

// ── Actions ──────────────────────────────────────────────

/** Analyze a single title for overstimulation via video analysis pipeline. */
export const analyzeOverstimulation = action({
  args: { titleId: v.id("titles") },
  handler: async (ctx, args): Promise<void> => {
    const title = await ctx.runQuery(api.titles.getTitle, { titleId: args.titleId });
    if (!title) throw new Error("Title not found");

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
      return;
    }

    console.log(`[Overstim] Found trailer ${trailerId} for "${title.title}"`);
    const trailerMetrics = await analyzeVideo(trailerId, title.title, title.type, serviceUrl, apiSecret);
    console.log(`[Overstim] Trailer metrics for "${title.title}":`, JSON.stringify(trailerMetrics));
    const trailerResult = await rateMetrics(titleMeta, trailerMetrics, openRouterKey);

    let severity: number;
    let primaryVideoId = trailerId;

    if (title.type === "tv") {
      // 2. For TV: search for episode clips
      let episodeResults: OverstimResult[] = [];
      try {
        const episodeIds = await searchEpisodeClips(title.title, 2);
        console.log(`[Overstim] Found ${episodeIds.length} episode clips for "${title.title}"`);

        for (const epId of episodeIds) {
          try {
            const epMetrics = await analyzeVideo(epId, title.title, title.type, serviceUrl, apiSecret);
            const epResult = await rateMetrics(titleMeta, epMetrics, openRouterKey);
            episodeResults.push(epResult);
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
        const episodeAvg = episodeResults.reduce((sum, r) => sum + r.severity, 0) / episodeResults.length;
        severity = Math.round(episodeAvg * 0.7 + trailerResult.severity * 0.3);
        severity = Math.max(0, Math.min(4, severity));
        console.log(`[Overstim] TV weighted score: episodes=${episodeAvg.toFixed(1)} trailer=${trailerResult.severity} → ${severity}`);
      } else {
        // Trailer only — apply 0.7x bias correction
        severity = Math.max(0, Math.round(trailerResult.severity * 0.7));
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
      },
    });

    console.log(`[Overstim] Saved score ${severity} for "${title.title}"`);
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
    }),
  },
  handler: async (ctx, args) => {
    const title = await ctx.db.get(args.titleId);
    if (!title) throw new Error("Title not found");

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
