package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"html"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
	"time"
)

type CaptionResponse struct {
	Transcript    string `json:"transcript"`
	Language      string `json:"language,omitempty"`
	Source        string `json:"source,omitempty"`
	DialogueLines int    `json:"dialogue_lines"`
	CharCount     int    `json:"char_count"`
}

type captionCandidate struct {
	transcript string
	language   string
	source     string
	lines      int
	chars      int
}

var (
	vttTagPattern      = regexp.MustCompile(`<[^>]+>`)
	vttBracketPattern  = regexp.MustCompile(`^\[[^\]]+\]$|^\([^\)]+\)$`)
	vttNumericCueToken = regexp.MustCompile(`^\d+$`)
)

func handleCaptions(secret string) http.HandlerFunc {
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

		log.Info(
			"caption request payload",
			"video_url", req.VideoURL,
			"video_host", videoHost(req.VideoURL),
			"title", req.Title,
			"type", req.Type,
		)

		transcript, language, source, err := downloadCaptions(ctx, req.VideoURL)
		if err != nil {
			var classified *downloadError
			if errors.As(err, &classified) {
				statusCode := http.StatusBadGateway
				if classified.Code == "youtube_captions_unavailable" {
					statusCode = http.StatusNotFound
				}
				retryable := classified.Retryable
				writeError(
					r.Context(),
					w,
					"caption fetch failed: "+classified.Message,
					statusCode,
					classified.Code,
					&retryable,
				)
				return
			}
			writeError(
				r.Context(),
				w,
				"caption fetch failed: "+err.Error(),
				http.StatusInternalServerError,
				"captions_failed",
				nil,
			)
			return
		}

		dialogueLines := countDialogueLines(transcript)
		log.Info(
			"caption fetch complete",
			"video_url", req.VideoURL,
			"language", language,
			"source", source,
			"dialogue_lines", dialogueLines,
			"char_count", len(transcript),
		)

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(CaptionResponse{
			Transcript:    transcript,
			Language:      language,
			Source:        source,
			DialogueLines: dialogueLines,
			CharCount:     len(transcript),
		})
	}
}

func downloadCaptions(ctx context.Context, videoURL string) (string, string, string, error) {
	log := logFor(ctx)
	tmpDir, err := os.MkdirTemp("", "captions-*")
	if err != nil {
		return "", "", "", fmt.Errorf("failed to create temp dir: %w", err)
	}
	defer os.RemoveAll(tmpDir)

	outputTemplate := filepath.Join(tmpDir, "captions.%(ext)s")

	args := []string{
		"--skip-download",
		"--write-subs",
		"--write-auto-subs",
		"--sub-langs", "en.*,en,-live_chat",
		"--sub-format", "vtt",
		"-o", outputTemplate,
		"--no-playlist",
		"--js-runtimes", "node",
		"--remote-components", "ejs:github",
	}

	// Add cookies: prefer YOUTUBE_COOKIES env var, fall back to browser cookies.
	if cp := writeCookiesFile(); cp != "" {
		args = append(args, "--cookies", cp)
	} else if browser := os.Getenv("YOUTUBE_COOKIES_BROWSER"); browser != "" {
		args = append(args, "--cookies-from-browser", browser)
	}

	args = append(args, videoURL)

	log.Info("yt-dlp captions starting",
		"video_url", videoURL,
		"tmp_dir", tmpDir,
		"use_cookie_file", cookiesPath != "",
		"use_cookie_browser", os.Getenv("YOUTUBE_COOKIES_BROWSER") != "",
		"arg_count", len(args),
	)

	cmd := exec.CommandContext(ctx, "yt-dlp", args...)
	output, err := cmd.CombinedOutput()
	if err != nil {
		outputStr := string(output)
		classified := classifyYtDlpFailure(outputStr, err)
		log.Error("yt-dlp captions failed",
			"video_url", videoURL,
			"error", err,
			"failure_code", classified.Code,
			"retryable", classified.Retryable,
			"output", truncateForLog(outputStr, 4000),
		)
		return "", "", "", classified
	}
	if len(output) > 0 {
		log.Info("yt-dlp captions output",
			"video_url", videoURL,
			"output", truncateForLog(string(output), 1200),
		)
	}

	candidate, err := selectBestCaptionCandidate(tmpDir)
	if err != nil {
		return "", "", "", err
	}

	return candidate.transcript, candidate.language, candidate.source, nil
}

func selectBestCaptionCandidate(tmpDir string) (*captionCandidate, error) {
	entries, err := os.ReadDir(tmpDir)
	if err != nil {
		return nil, fmt.Errorf("failed to read caption directory: %w", err)
	}

	var best *captionCandidate
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}

		name := entry.Name()
		if !strings.HasSuffix(strings.ToLower(name), ".vtt") {
			continue
		}

		raw, readErr := os.ReadFile(filepath.Join(tmpDir, name))
		if readErr != nil {
			continue
		}

		transcript := extractVTTDialogue(string(raw), 2500)
		if strings.TrimSpace(transcript) == "" {
			continue
		}

		candidate := &captionCandidate{
			transcript: transcript,
			language:   languageFromCaptionFilename(name),
			source:     captionSourceFromFilename(name),
			lines:      countDialogueLines(transcript),
			chars:      len(transcript),
		}

		if best == nil ||
			candidate.lines > best.lines ||
			(candidate.lines == best.lines && candidate.chars > best.chars) {
			best = candidate
		}
	}

	if best == nil {
		return nil, &downloadError{
			Code:      "youtube_captions_unavailable",
			Message:   "youtube captions unavailable for this video",
			Retryable: false,
		}
	}

	return best, nil
}

func captionSourceFromFilename(filename string) string {
	lower := strings.ToLower(filename)
	if strings.Contains(lower, ".auto.") || strings.Contains(lower, ".asr.") {
		return "youtube_auto_captions"
	}
	return "youtube_captions"
}

func languageFromCaptionFilename(filename string) string {
	trimmed := strings.TrimSuffix(filename, filepath.Ext(filename))
	parts := strings.Split(trimmed, ".")
	if len(parts) == 0 {
		return ""
	}

	label := parts[len(parts)-1]
	switch label {
	case "auto", "asr", "orig":
		if len(parts) >= 2 {
			label = parts[len(parts)-2]
		}
	}
	if label == "captions" {
		return ""
	}
	return label
}

func extractVTTDialogue(vttText string, maxLines int) string {
	if maxLines <= 0 {
		maxLines = 2500
	}

	rawLines := strings.Split(vttText, "\n")
	dialogue := make([]string, 0, maxLines)
	lastLine := ""

	for _, raw := range rawLines {
		trimmed := strings.TrimSpace(strings.TrimSuffix(raw, "\r"))
		if trimmed == "" {
			continue
		}

		upper := strings.ToUpper(trimmed)
		if strings.HasPrefix(upper, "WEBVTT") ||
			strings.HasPrefix(upper, "NOTE") ||
			strings.HasPrefix(upper, "STYLE") ||
			strings.HasPrefix(upper, "REGION") ||
			strings.HasPrefix(upper, "KIND:") ||
			strings.HasPrefix(upper, "LANGUAGE:") ||
			strings.HasPrefix(upper, "X-TIMESTAMP-MAP") {
			continue
		}

		if strings.Contains(trimmed, "-->") || vttNumericCueToken.MatchString(trimmed) {
			continue
		}

		cleaned := vttTagPattern.ReplaceAllString(trimmed, "")
		cleaned = html.UnescapeString(cleaned)
		cleaned = strings.TrimSpace(strings.Join(strings.Fields(cleaned), " "))
		if cleaned == "" || vttBracketPattern.MatchString(cleaned) {
			continue
		}

		if cleaned == lastLine {
			continue
		}

		dialogue = append(dialogue, cleaned)
		lastLine = cleaned
		if len(dialogue) >= maxLines {
			break
		}
	}

	return strings.Join(dialogue, "\n")
}

func countDialogueLines(transcript string) int {
	if strings.TrimSpace(transcript) == "" {
		return 0
	}
	lines := 0
	for _, line := range strings.Split(transcript, "\n") {
		if strings.TrimSpace(line) != "" {
			lines++
		}
	}
	return lines
}
