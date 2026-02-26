package main

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"log/slog"
	"net/http"
	"os"
	"sync/atomic"
	"time"
)

// ── Atomic Counters ──────────────────────────────────────

var (
	requestCount  atomic.Int64
	errorCount    atomic.Int64
	activeRequests atomic.Int64
)

// ── Context Key ──────────────────────────────────────────

type ctxKey int

const requestIDKey ctxKey = iota

// ── Init ─────────────────────────────────────────────────

func initLogger() {
	handler := slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	})
	slog.SetDefault(slog.New(handler))
}

// ── Request ID ───────────────────────────────────────────

func generateRequestID() string {
	b := make([]byte, 8)
	rand.Read(b)
	return hex.EncodeToString(b)
}

func requestIDFromContext(ctx context.Context) string {
	if id, ok := ctx.Value(requestIDKey).(string); ok {
		return id
	}
	return ""
}

// logFor returns a logger with the request_id from context.
func logFor(ctx context.Context) *slog.Logger {
	if id := requestIDFromContext(ctx); id != "" {
		return slog.With("request_id", id)
	}
	return slog.Default()
}

// ── Status Writer ────────────────────────────────────────

type statusWriter struct {
	http.ResponseWriter
	status int
}

func (w *statusWriter) WriteHeader(code int) {
	w.status = code
	w.ResponseWriter.WriteHeader(code)
}

// ── Middleware ────────────────────────────────────────────

func requestLogger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		// Get or generate request ID
		reqID := r.Header.Get("X-Request-ID")
		if reqID == "" {
			reqID = generateRequestID()
		}

		// Store in context
		ctx := context.WithValue(r.Context(), requestIDKey, reqID)
		r = r.WithContext(ctx)

		// Set response header
		w.Header().Set("X-Request-ID", reqID)

		// Track active requests
		activeRequests.Add(1)
		requestCount.Add(1)

		sw := &statusWriter{ResponseWriter: w, status: http.StatusOK}

		next.ServeHTTP(sw, r)

		activeRequests.Add(-1)
		duration := time.Since(start)

		if sw.status >= 400 {
			errorCount.Add(1)
		}

		slog.Info("request",
			"method", r.Method,
			"path", r.URL.Path,
			"status", sw.status,
			"duration_ms", duration.Milliseconds(),
			"request_id", reqID,
		)
	})
}

// ── Metrics Endpoint ─────────────────────────────────────

func handleMetrics(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]int64{
		"total_requests":  requestCount.Load(),
		"total_errors":    errorCount.Load(),
		"active_requests": activeRequests.Load(),
	})
}
