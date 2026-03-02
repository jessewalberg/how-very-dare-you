package main

import (
	"context"
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

func analyzeColors(ctx context.Context, videoPath string) (ColorResult, error) {
	log := logFor(ctx)
	frameDir, err := os.MkdirTemp("", "frames-*")
	if err != nil {
		return ColorResult{}, fmt.Errorf("failed to create frame temp dir: %w", err)
	}
	defer os.RemoveAll(frameDir)
	log.Info("color analysis frame extraction starting", "video_path", videoPath, "frame_dir", frameDir)

	cmd := exec.CommandContext(ctx, "ffmpeg",
		"-i", videoPath,
		"-vf", "fps=4",
		"-q:v", "5",
		filepath.Join(frameDir, "frame_%04d.jpg"),
	)
	if err := cmd.Run(); err != nil {
		log.Error("color analysis frame extraction failed", "video_path", videoPath, "error", err)
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
		log.Error("color analysis found no frames", "video_path", videoPath)
		return ColorResult{}, fmt.Errorf("no frames analyzed")
	}

	log.Info("color analysis frame extraction complete",
		"video_path", videoPath,
		"frame_count", len(saturations),
	)

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
	if len(v) == 0 {
		return 0
	}
	s := 0.0
	for _, x := range v {
		s += x
	}
	return s / float64(len(v))
}

func sliceMax(v []float64) float64 {
	if len(v) == 0 {
		return 0
	}
	m := v[0]
	for _, x := range v {
		if x > m {
			m = x
		}
	}
	return m
}

func stddev(v []float64) float64 {
	if len(v) == 0 {
		return 0
	}
	m := mean(v)
	s := 0.0
	for _, x := range v {
		s += (x - m) * (x - m)
	}
	return math.Sqrt(s / float64(len(v)))
}

func round1(f float64) float64 {
	return math.Round(f*10) / 10
}
