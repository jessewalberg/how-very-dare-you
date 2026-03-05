package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"net/url"
	"os"
	"time"
)

type AnalysisRequest struct {
	VideoURL string `json:"video_url"`
	Title    string `json:"title"`
	Type     string `json:"type"` // "movie" or "tv"
}

type TimingInfo struct {
	DownloadMs       int64 `json:"download_ms"`
	SceneDetectionMs int64 `json:"scene_detection_ms"`
	ColorAnalysisMs  int64 `json:"color_analysis_ms"`
	TotalMs          int64 `json:"total_ms"`
}

type AnalysisResponse struct {
	CutsPerMinute      float64     `json:"cuts_per_minute"`
	AvgCutDuration     float64     `json:"avg_cut_duration_seconds"`
	TotalCuts          int         `json:"total_cuts"`
	TotalDuration      float64     `json:"total_duration_seconds"`
	AvgSaturation      float64     `json:"avg_saturation"`
	AvgBrightness      float64     `json:"avg_brightness"`
	MaxSaturation      float64     `json:"max_saturation"`
	BrightnessVariance float64     `json:"brightness_variance"`
	ColorChangeRate    float64     `json:"color_change_rate"`
	FlashCount         int         `json:"flash_count"`
	Timing             *TimingInfo `json:"timing,omitempty"`
}

type ErrorResponse struct {
	Error     string `json:"error"`
	Code      string `json:"code,omitempty"`
	Retryable *bool  `json:"retryable,omitempty"`
	RequestID string `json:"request_id,omitempty"`
}

func writeError(
	ctx context.Context,
	w http.ResponseWriter,
	msg string,
	statusCode int,
	errorCode string,
	retryable *bool,
) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	payload := ErrorResponse{
		Error:     msg,
		Code:      errorCode,
		Retryable: retryable,
	}
	if reqID := requestIDFromContext(ctx); reqID != "" {
		payload.RequestID = reqID
	}
	json.NewEncoder(w).Encode(payload)
}

func handleAnalyze(secret string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		log := logFor(r.Context())

		if r.Header.Get("Authorization") != "Bearer "+secret {
			writeError(r.Context(), w, "unauthorized", http.StatusUnauthorized, "unauthorized", nil)
			return
		}

		ctx, cancel := context.WithTimeout(r.Context(), 120*time.Second)
		defer cancel()

		var req AnalysisRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(
				r.Context(),
				w,
				"invalid request body: "+err.Error(),
				http.StatusBadRequest,
				"invalid_request",
				nil,
			)
			return
		}

		if req.VideoURL == "" {
			writeError(r.Context(), w, "video_url is required", http.StatusBadRequest, "invalid_request", nil)
			return
		}

		log.Info("analysis request payload",
			"video_url", req.VideoURL,
			"video_host", videoHost(req.VideoURL),
			"title", req.Title,
			"type", req.Type,
			"content_length", r.ContentLength,
			"user_agent", r.UserAgent(),
			"path", r.URL.Path,
		)
		log.Info("analysis started", "video_url", req.VideoURL, "title", req.Title, "type", req.Type)
		totalStart := time.Now()

		// Download
		dlStart := time.Now()
		videoPath, err := downloadVideo(ctx, req.VideoURL)
		dlMs := time.Since(dlStart).Milliseconds()
		if err != nil {
			var classified *downloadError
			if errors.As(err, &classified) {
				log.Error(
					"download failed",
					"video_url", req.VideoURL,
					"error", classified.Message,
					"code", classified.Code,
					"retryable", classified.Retryable,
					"duration_ms", dlMs,
				)
				retryable := classified.Retryable
				writeError(
					r.Context(),
					w,
					"download failed: "+classified.Message,
					http.StatusBadGateway,
					classified.Code,
					&retryable,
				)
				return
			}
			log.Error("download failed", "video_url", req.VideoURL, "error", err, "duration_ms", dlMs)
			writeError(
				r.Context(),
				w,
				"download failed: "+err.Error(),
				http.StatusInternalServerError,
				"download_failed",
				nil,
			)
			return
		}
		defer cleanup(videoPath)
		log.Info("download complete", "video_url", req.VideoURL, "duration_ms", dlMs)

		// Scene detection
		sceneStart := time.Now()
		cuts, err := detectSceneCuts(ctx, videoPath)
		sceneMs := time.Since(sceneStart).Milliseconds()
		if err != nil {
			log.Error("scene detection failed", "video_url", req.VideoURL, "error", err, "duration_ms", sceneMs)
			writeError(
				r.Context(),
				w,
				"scene detection failed: "+err.Error(),
				http.StatusInternalServerError,
				"scene_detection_failed",
				nil,
			)
			return
		}
		log.Info("scene detection complete", "video_url", req.VideoURL, "duration_ms", sceneMs, "total_cuts", cuts.Total)

		// Color analysis
		colorStart := time.Now()
		colors, err := analyzeColors(ctx, videoPath)
		colorMs := time.Since(colorStart).Milliseconds()
		if err != nil {
			log.Error("color analysis failed", "video_url", req.VideoURL, "error", err, "duration_ms", colorMs)
			writeError(
				r.Context(),
				w,
				"color analysis failed: "+err.Error(),
				http.StatusInternalServerError,
				"color_analysis_failed",
				nil,
			)
			return
		}
		log.Info("color analysis complete", "video_url", req.VideoURL, "duration_ms", colorMs)

		totalMs := time.Since(totalStart).Milliseconds()
		log.Info("analysis complete", "video_url", req.VideoURL, "total_ms", totalMs)

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
			Timing: &TimingInfo{
				DownloadMs:       dlMs,
				SceneDetectionMs: sceneMs,
				ColorAnalysisMs:  colorMs,
				TotalMs:          totalMs,
			},
		})
	}
}

func videoHost(rawURL string) string {
	parsed, err := url.Parse(rawURL)
	if err != nil {
		return "invalid_url"
	}
	if parsed.Host == "" {
		return fmt.Sprintf("path:%s", parsed.Path)
	}
	return parsed.Host
}

func main() {
	initLogger()

	secret := os.Getenv("API_SECRET")
	if secret == "" {
		slog.Error("API_SECRET environment variable is required")
		os.Exit(1)
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	mux := http.NewServeMux()

	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
	})

	mux.HandleFunc("GET /metrics", handleMetrics)
	mux.HandleFunc("POST /analyze", handleAnalyze(secret))
	mux.HandleFunc("POST /analyze-url", handleAnalyze(secret))

	slog.Info("starting video analysis service", "port", port)
	if err := http.ListenAndServe(":"+port, requestLogger(mux)); err != nil {
		slog.Error("server failed", "error", err)
		os.Exit(1)
	}
}
