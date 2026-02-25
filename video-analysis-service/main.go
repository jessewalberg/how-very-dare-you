package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"time"
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

type ErrorResponse struct {
	Error string `json:"error"`
}

func writeError(w http.ResponseWriter, msg string, code int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(ErrorResponse{Error: msg})
}

func handleAnalyze(secret string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer "+secret {
			writeError(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		ctx, cancel := context.WithTimeout(r.Context(), 120*time.Second)
		defer cancel()

		var req AnalysisRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, "invalid request body: "+err.Error(), http.StatusBadRequest)
			return
		}

		if req.VideoURL == "" {
			writeError(w, "video_url is required", http.StatusBadRequest)
			return
		}

		videoPath, err := downloadVideo(ctx, req.VideoURL)
		if err != nil {
			writeError(w, "download failed: "+err.Error(), http.StatusInternalServerError)
			return
		}
		defer cleanup(videoPath)

		cuts, err := detectSceneCuts(ctx, videoPath)
		if err != nil {
			writeError(w, "scene detection failed: "+err.Error(), http.StatusInternalServerError)
			return
		}

		colors, err := analyzeColors(ctx, videoPath)
		if err != nil {
			writeError(w, "color analysis failed: "+err.Error(), http.StatusInternalServerError)
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
	}
}

func main() {
	secret := os.Getenv("API_SECRET")
	if secret == "" {
		log.Fatal("API_SECRET environment variable is required")
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

	mux.HandleFunc("POST /analyze", handleAnalyze(secret))
	mux.HandleFunc("POST /analyze-url", handleAnalyze(secret))

	log.Printf("Starting video analysis service on :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, mux))
}
