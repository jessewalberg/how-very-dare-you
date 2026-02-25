# V2: Developmental Health — Video Analysis Architecture

## Overview

The developmental health category (Overstimulation) requires analyzing **actual video content**, not just text metadata. This document specifies the architecture for automated video analysis that runs alongside the existing text-based AI rating pipeline.

---

## Architecture

```
                     ┌──────────────────────┐
                     │   Convex Cron/Action  │
                     │   (orchestrator)      │
                     └──────────┬───────────┘
                                │
                     ┌──────────▼───────────┐
                     │  1. Find trailer on   │
                     │     YouTube via API    │
                     └──────────┬───────────┘
                                │
                     ┌──────────▼───────────┐
                     │  2. Send video URL to  │
                     │     analysis service   │
                     └──────────┬───────────┘
                                │
              ┌─────────────────┼─────────────────┐
              │                 │                 │
    ┌─────────▼────────┐ ┌─────▼──────┐         │
    │ Scene Cut         │ │ Color      │         │
    │ Detection         │ │ Analysis   │         │
    │ (FFmpeg scene     │ │ (FFmpeg    │         │
    │  filter + Go)     │ │  + Go img) │         │
    └─────────┬────────┘ └─────┬──────┘         │
              │                │                 │
              └─────────────────┼─────────────────┘
                                │
                     ┌──────────▼───────────┐
                     │  3. Aggregate metrics  │
                     │     into structured    │
                     │     analysis report    │
                     └──────────┬───────────┘
                                │
                     ┌──────────▼───────────┐
                     │  4. Send metrics to    │
                     │     Claude via         │
                     │     OpenRouter to map  │
                     │     to 0-4 scale       │
                     └──────────┬───────────┘
                                │
                     ┌──────────▼───────────┐
                     │  5. Save to Convex    │
                     │     titles table      │
                     └──────────────────────┘
```

---

## Video Source: YouTube Trailers + Clips

### Finding Videos

Use the **YouTube Data API v3** to search for trailers and clips:

```typescript
// Search for official trailer
const query = `${title} ${year} official trailer`;
const response = await fetch(
  `https://www.googleapis.com/youtube/v3/search?` +
  `part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=3` +
  `&key=${YOUTUBE_API_KEY}`
);

// For TV shows, also search for full episode clips
const clipQuery = `${title} full episode`;
```

### Downloading for Analysis

Use `yt-dlp` (open source, widely used) to download the video:

```bash
# Download at 480p (sufficient for analysis, saves bandwidth)
yt-dlp -f "bestvideo[height<=480]+bestaudio/best[height<=480]" \
  -o "%(id)s.%(ext)s" --no-playlist \
  "https://youtube.com/watch?v=VIDEO_ID"
```

### Trailer Bias Correction

Trailers are edited to be more exciting than actual content. Apply a correction factor:

- **Movies:** Trailer analysis is reasonably representative — trailers reflect the movie's visual style
- **TV shows:** Trailers/promos are significantly more stimulating than episodes. Apply a **0.7x multiplier** to the overstimulation score (e.g., raw score 3.2 → corrected 2.2)
- **If full episode clips are available:** Weight them 70% and trailer 30%

---

## Analysis Service

Convex actions can't run heavy compute (FFmpeg, video decoding). You need an external service.

### Recommended: Go API on Railway/Fly.io

A lightweight Go HTTP service that accepts a video URL, runs analysis via FFmpeg, and returns structured metrics. Go is ideal here — fast startup, tiny memory footprint, single binary deployment, excellent exec for shelling out to FFmpeg/yt-dlp.

Estimated cost: $5-15/mo on Railway.

**External tools required in the Docker image:** `ffmpeg`, `ffprobe`, `yt-dlp` (installed via apt/pip in the Dockerfile). The Go binary shells out to these.

```go
// main.go
package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
)

type AnalysisRequest struct {
	VideoURL string `json:"video_url"`
	Title    string `json:"title"`
	Type     string `json:"type"` // "movie" or "tv"
}

type AnalysisResponse struct {
	CutsPerMinute      float64 `json:"cuts_per_minute"`
	AvgCutDuration     float64 `json:"avg_cut_duration_seconds"`
	TotalCuts          int     `json:"total_cuts"`
	TotalDuration      float64 `json:"total_duration_seconds"`
	AvgSaturation      float64 `json:"avg_saturation"`
	AvgBrightness      float64 `json:"avg_brightness"`
	MaxSaturation      float64 `json:"max_saturation"`
	BrightnessVariance float64 `json:"brightness_variance"`
	ColorChangeRate    float64 `json:"color_change_rate"`
	FlashCount         int     `json:"flash_count"`
}

func main() {
	secret := os.Getenv("API_SECRET")
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	mux := http.NewServeMux()

	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
	})

	mux.HandleFunc("POST /analyze", func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer "+secret {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		var req AnalysisRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		videoPath, err := downloadVideo(req.VideoURL)
		if err != nil {
			http.Error(w, "download failed: "+err.Error(), http.StatusInternalServerError)
			return
		}
		defer cleanup(videoPath)

		cuts, err := detectSceneCuts(videoPath)
		if err != nil {
			http.Error(w, "scene detection failed: "+err.Error(), http.StatusInternalServerError)
			return
		}

		colors, err := analyzeColors(videoPath)
		if err != nil {
			http.Error(w, "color analysis failed: "+err.Error(), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(AnalysisResponse{
			CutsPerMinute:      cuts.PerMinute,
			AvgCutDuration:     cuts.AvgDuration,
			TotalCuts:          cuts.Total,
			TotalDuration:      cuts.Duration,
			AvgSaturation:      colors.AvgSaturation,
			AvgBrightness:      colors.AvgBrightness,
			MaxSaturation:      colors.MaxSaturation,
			BrightnessVariance: colors.BrightnessVariance,
			ColorChangeRate:    colors.ColorChangeRate,
			FlashCount:         colors.FlashCount,
		})
	})

	log.Printf("Starting server on :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, mux))
}
```

### Video Download (yt-dlp via exec)

```go
// download.go
package main

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

func downloadVideo(videoURL string) (string, error) {
	tmpDir, err := os.MkdirTemp("", "video-*")
	if err != nil {
		return "", err
	}

	outputTemplate := filepath.Join(tmpDir, "video.%(ext)s")

	cmd := exec.Command("yt-dlp",
		"-f", "bestvideo[height<=480]+bestaudio/best[height<=480]",
		"-o", outputTemplate,
		"--no-playlist",
		"--merge-output-format", "mp4",
		videoURL,
	)
	cmd.Stderr = os.Stderr

	if err := cmd.Run(); err != nil {
		os.RemoveAll(tmpDir)
		return "", fmt.Errorf("yt-dlp failed: %w", err)
	}

	entries, _ := os.ReadDir(tmpDir)
	for _, e := range entries {
		if strings.HasPrefix(e.Name(), "video.") {
			return filepath.Join(tmpDir, e.Name()), nil
		}
	}

	os.RemoveAll(tmpDir)
	return "", fmt.Errorf("no output file found")
}

func cleanup(videoPath string) {
	os.RemoveAll(filepath.Dir(videoPath))
}
```

### Scene Cut Detection (FFprobe scene filter)

Uses FFmpeg's built-in scene detection. No Python libraries needed.

```go
// scene_cuts.go
package main

import (
	"encoding/json"
	"fmt"
	"math"
	"os/exec"
	"strings"
)

type CutResult struct {
	PerMinute   float64
	AvgDuration float64
	Total       int
	Duration    float64
}

func detectSceneCuts(videoPath string) (CutResult, error) {
	// Use ffmpeg select filter to detect scene changes, count via showinfo
	cmd := exec.Command("ffmpeg",
		"-i", videoPath,
		"-vf", "select='gt(scene,0.3)',showinfo",
		"-vsync", "vfr",
		"-f", "null", "-",
	)

	output, _ := cmd.CombinedOutput()

	// Count lines containing "pts_time:" — each is a detected scene change
	lines := strings.Split(string(output), "\n")
	cutCount := 0
	for _, line := range lines {
		if strings.Contains(line, "pts_time:") {
			cutCount++
		}
	}

	duration := getVideoDuration(videoPath)
	durationMinutes := duration / 60

	cutsPerMinute := 0.0
	avgDuration := 0.0
	if cutCount > 0 && durationMinutes > 0 {
		cutsPerMinute = float64(cutCount) / durationMinutes
		avgDuration = duration / float64(cutCount+1)
	}

	return CutResult{
		PerMinute:   math.Round(cutsPerMinute*10) / 10,
		AvgDuration: math.Round(avgDuration*100) / 100,
		Total:       cutCount,
		Duration:    math.Round(duration*10) / 10,
	}, nil
}

func getVideoDuration(videoPath string) float64 {
	cmd := exec.Command("ffprobe",
		"-v", "quiet",
		"-show_entries", "format=duration",
		"-of", "json",
		videoPath,
	)

	out, err := cmd.Output()
	if err != nil {
		return 0
	}

	var result struct {
		Format struct {
			Duration string `json:"duration"`
		} `json:"format"`
	}
	json.Unmarshal(out, &result)

	var duration float64
	fmt.Sscanf(result.Format.Duration, "%f", &duration)
	return duration
}
```

### Color & Brightness Analysis (FFmpeg frame extraction + Go image decoding)

Extract frames with FFmpeg at 4fps, decode JPEGs with Go's standard `image` package, compute HSV in pure Go. Zero CGo, zero OpenCV.

```go
// color_analysis.go
package main

import (
	"fmt"
	"image"
	_ "image/jpeg"
	"math"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
)

type ColorResult struct {
	AvgSaturation      float64
	AvgBrightness      float64
	MaxSaturation      float64
	BrightnessVariance float64
	ColorChangeRate    float64
	FlashCount         int
}

func analyzeColors(videoPath string) (ColorResult, error) {
	frameDir, err := os.MkdirTemp("", "frames-*")
	if err != nil {
		return ColorResult{}, err
	}
	defer os.RemoveAll(frameDir)

	// Extract frames at 4fps as JPEG
	cmd := exec.Command("ffmpeg",
		"-i", videoPath,
		"-vf", "fps=4",
		"-q:v", "5",
		filepath.Join(frameDir, "frame_%04d.jpg"),
	)
	if err := cmd.Run(); err != nil {
		return ColorResult{}, fmt.Errorf("frame extraction failed: %w", err)
	}

	entries, _ := os.ReadDir(frameDir)
	sort.Slice(entries, func(i, j int) bool {
		return entries[i].Name() < entries[j].Name()
	})

	var saturations, brightnesses, colorDeltas []float64
	var prevBrightness float64
	flashCount := 0
	first := true

	for _, entry := range entries {
		if filepath.Ext(entry.Name()) != ".jpg" {
			continue
		}

		f, err := os.Open(filepath.Join(frameDir, entry.Name()))
		if err != nil {
			continue
		}
		img, _, err := image.Decode(f)
		f.Close()
		if err != nil {
			continue
		}

		sat, bri := frameSaturationBrightness(img)
		saturations = append(saturations, sat)
		brightnesses = append(brightnesses, bri)

		if !first {
			delta := math.Abs(bri - prevBrightness)
			colorDeltas = append(colorDeltas, delta)
			if delta > 80 {
				flashCount++
			}
		}
		prevBrightness = bri
		first = false
	}

	if len(saturations) == 0 {
		return ColorResult{}, fmt.Errorf("no frames analyzed")
	}

	return ColorResult{
		AvgSaturation:      round1(mean(saturations)),
		AvgBrightness:      round1(mean(brightnesses)),
		MaxSaturation:      round1(sliceMax(saturations)),
		BrightnessVariance: round1(stddev(brightnesses)),
		ColorChangeRate:    round1(mean(colorDeltas)),
		FlashCount:         flashCount,
	}, nil
}

// frameSaturationBrightness computes mean S and V (HSV) across sampled pixels.
func frameSaturationBrightness(img image.Image) (float64, float64) {
	bounds := img.Bounds()
	var totalSat, totalBri float64
	count := 0

	// Sample every 4th pixel for speed
	for y := bounds.Min.Y; y < bounds.Max.Y; y += 4 {
		for x := bounds.Min.X; x < bounds.Max.X; x += 4 {
			r, g, b, _ := img.At(x, y).RGBA()
			rf := float64(r>>8) / 255.0
			gf := float64(g>>8) / 255.0
			bf := float64(b>>8) / 255.0

			cmax := math.Max(rf, math.Max(gf, bf))
			cmin := math.Min(rf, math.Min(gf, bf))
			delta := cmax - cmin

			sat := 0.0
			if cmax > 0 {
				sat = (delta / cmax) * 255
			}
			bri := cmax * 255

			totalSat += sat
			totalBri += bri
			count++
		}
	}

	if count == 0 {
		return 0, 0
	}
	return totalSat / float64(count), totalBri / float64(count)
}

func mean(v []float64) float64 {
	if len(v) == 0 { return 0 }
	s := 0.0
	for _, x := range v { s += x }
	return s / float64(len(v))
}

func sliceMax(v []float64) float64 {
	if len(v) == 0 { return 0 }
	m := v[0]
	for _, x := range v { if x > m { m = x } }
	return m
}

func stddev(v []float64) float64 {
	if len(v) == 0 { return 0 }
	m := mean(v)
	s := 0.0
	for _, x := range v { s += (x - m) * (x - m) }
	return math.Sqrt(s / float64(len(v)))
}

func round1(f float64) float64 { return math.Round(f*10) / 10 }
```

### Dockerfile

```dockerfile
FROM golang:1.23-bookworm AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY *.go ./
RUN CGO_ENABLED=0 go build -o /video-analyzer .

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg python3-pip \
    && pip3 install --break-system-packages yt-dlp \
    && apt-get clean && rm -rf /var/lib/apt/lists/*
COPY --from=builder /video-analyzer /video-analyzer
EXPOSE 8080
CMD ["/video-analyzer"]
```

---

## Mapping Metrics to 0–4 Severity Scale

### Overstimulation Thresholds

After collecting raw metrics, send them to Claude via OpenRouter for intelligent mapping:

```
You are rating a {type} called "{title}" ({year}) for overstimulation level.

Here are the measured video metrics:
- Cuts per minute: {cuts_per_minute}
- Average cut duration: {avg_cut_duration_seconds} seconds
- Average color saturation: {avg_saturation}/255
- Brightness variance: {brightness_variance}
- Color change rate (avg frame-to-frame delta): {color_change_rate}
- Flash count (significant brightness jumps): {flash_count}
- Total video duration analyzed: {total_duration_seconds} seconds

For reference, here are typical ranges for kids content:
- Slow-paced shows (Bluey, Daniel Tiger): 5-10 cuts/min, avg 6-12 sec per scene
- Moderate shows (Paw Patrol, Peppa Pig): 10-18 cuts/min, avg 3-6 sec per scene
- Fast-paced shows (Cocomelon, YouTube kids): 20-40+ cuts/min, avg 1.5-3 sec per scene

Also consider the target age rating: {ageRating}
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
}
```

---

## Convex Integration

### Schema Extension (Non-Breaking)

Add optional fields to the existing `ratings` object in `titles` table:

```typescript
// Add to the existing ratings object in schema.ts
ratings: v.optional(v.object({
  // ... existing 8 cultural categories ...
  lgbtq: v.number(),
  climate: v.number(),
  racialIdentity: v.number(),
  genderRoles: v.number(),
  antiAuthority: v.number(),
  religious: v.number(),
  political: v.number(),
  sexuality: v.number(),

  // V2: Developmental health category
  overstimulation: v.optional(v.number()),   // 0-4
})),

// Add video analysis metadata
videoAnalysis: v.optional(v.object({
  youtubeVideoId: v.string(),
  analyzedAt: v.number(),
  cutsPerMinute: v.number(),
  avgCutDuration: v.number(),
  avgSaturation: v.number(),
  avgBrightness: v.number(),
  brightnessVariance: v.number(),
  flashCount: v.number(),
  trailerBiasCorrected: v.boolean(),
})),
```

### Pipeline Flow

```typescript
// convex/healthRatings.ts

export const analyzeVideoHealth = action({
  args: { titleId: v.id("titles") },
  handler: async (ctx, args) => {
    const title = await ctx.runQuery(api.titles.getTitle, { titleId: args.titleId });
    if (!title) throw new Error("Title not found");

    // 1. Find trailer on YouTube
    const videoId = await findTrailerOnYouTube(title.title, title.year);
    if (!videoId) {
      // No trailer found — skip video analysis, flag for manual review
      return;
    }

    // 2. Call external video analysis service
    const metrics = await fetch(`${VIDEO_ANALYSIS_SERVICE_URL}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        video_url: `https://youtube.com/watch?v=${videoId}`,
        title: title.title,
        type: title.type,
      }),
    }).then(r => r.json());

    // 3. Send metrics to Claude for overstimulation rating
    const overstimResult = await callOpenRouter(
      OVERSTIM_SYSTEM_PROMPT,
      constructOverstimPrompt(title, metrics)
    );

    // 4. Apply trailer bias correction for TV shows
    let overstimSeverity = overstimResult.severity;
    if (title.type === "tv") {
      overstimSeverity = Math.round(overstimSeverity * 0.7);
    }

    // 5. Save to database
    await ctx.runMutation(api.titles.saveHealthRatings, {
      titleId: args.titleId,
      overstimulation: overstimSeverity,
      videoAnalysis: {
        youtubeVideoId: videoId,
        analyzedAt: Date.now(),
        cutsPerMinute: metrics.cuts_per_minute,
        avgCutDuration: metrics.avg_cut_duration_seconds,
        avgSaturation: metrics.avg_saturation,
        avgBrightness: metrics.avg_brightness,
        brightnessVariance: metrics.brightness_variance,
        flashCount: metrics.flash_count,
        trailerBiasCorrected: title.type === "tv",
      },
    });
  },
});
```

---

## Cost Estimates (V2 Addition)

| Item | Cost |
|------|------|
| YouTube Data API | Free (10,000 units/day) |
| Video analysis service (Railway) | $5-15/mo |
| yt-dlp | Free (open source) |
| OpenRouter — overstimulation rating | ~$0.01 per title |
| **Additional monthly cost** | **~$10-25 on top of V1 costs** |

---

## Calibration Benchmarks

Test with these known titles to validate thresholds:

| Title | Expected Overstim | Why |
|-------|-------------------|-----|
| Bluey | 0 (None) | Slow pacing, natural colors |
| Daniel Tiger | 0 (None) | Intentionally slow, educational |
| Paw Patrol | 1 (Brief) | Moderate pacing, some fast action sequences |
| Cocomelon | 3 (Significant) | Very fast cuts, bright saturated colors |
| Ryan's World (YouTube) | 3 (Significant) | Fast editing, bright colors, constant movement |
| Peppa Pig | 1 (Brief) | Moderate pace, simple visuals |
| Baby Shark (Pinkfong) | 4 (Core Theme) | Hyperstimulating, rapid flashing, constant motion |
| Numberblocks | 0 (None) | Calm pacing, gentle colors |

---

## Implementation Order

1. Build the Go video analysis service (Go stdlib + FFmpeg + yt-dlp)
2. Deploy on Railway
3. Add YouTube Data API key to Convex env vars
4. Extend Convex schema with optional overstimulation field
5. Build the `analyzeVideoHealth` Convex action
6. Add overstimulation prompt to the AI rubric
7. Update the UI: add "Developmental Health" section to detail page
8. Update composite score calculation to include overstimulation
9. Extend user weights with 1 new slider
10. Run calibration benchmarks and adjust thresholds
11. Add to nightly batch pipeline (run after cultural ratings complete)