package main

import (
	"context"
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

func detectSceneCuts(ctx context.Context, videoPath string) (CutResult, error) {
	log := logFor(ctx)
	log.Info("ffmpeg scene detection starting", "video_path", videoPath)

	cmd := exec.CommandContext(ctx, "ffmpeg",
		"-i", videoPath,
		"-vf", "select='gt(scene,0.3)',showinfo",
		"-vsync", "vfr",
		"-f", "null", "-",
	)

	output, err := cmd.CombinedOutput()
	if err != nil {
		// ffmpeg returns non-zero even on success sometimes; check if we got output
		if len(output) == 0 {
			log.Error("ffmpeg scene detection command failed",
				"video_path", videoPath,
				"error", err,
			)
			return CutResult{}, fmt.Errorf("ffmpeg scene detection failed: %w", err)
		}
	}

	lines := strings.Split(string(output), "\n")
	cutCount := 0
	for _, line := range lines {
		if strings.Contains(line, "pts_time:") {
			cutCount++
		}
	}

	duration, err := getVideoDuration(ctx, videoPath)
	if err != nil {
		log.Error("ffprobe duration lookup failed",
			"video_path", videoPath,
			"error", err,
		)
		return CutResult{}, fmt.Errorf("failed to get video duration: %w", err)
	}

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

func getVideoDuration(ctx context.Context, videoPath string) (float64, error) {
	log := logFor(ctx)
	log.Info("ffprobe duration lookup starting", "video_path", videoPath)

	cmd := exec.CommandContext(ctx, "ffprobe",
		"-v", "quiet",
		"-show_entries", "format=duration",
		"-of", "json",
		videoPath,
	)

	out, err := cmd.Output()
	if err != nil {
		log.Error("ffprobe failed",
			"video_path", videoPath,
			"error", err,
		)
		return 0, fmt.Errorf("ffprobe failed: %w", err)
	}

	var result struct {
		Format struct {
			Duration string `json:"duration"`
		} `json:"format"`
	}
	if err := json.Unmarshal(out, &result); err != nil {
		log.Error("ffprobe output parse failed",
			"video_path", videoPath,
			"output", truncateForLog(string(out), 1000),
			"error", err,
		)
		return 0, fmt.Errorf("failed to parse ffprobe output: %w", err)
	}

	var duration float64
	fmt.Sscanf(result.Format.Duration, "%f", &duration)
	if duration <= 0 {
		log.Error("ffprobe returned invalid duration",
			"video_path", videoPath,
			"duration_raw", result.Format.Duration,
		)
		return 0, fmt.Errorf("invalid duration: %s", result.Format.Duration)
	}

	return duration, nil
}
