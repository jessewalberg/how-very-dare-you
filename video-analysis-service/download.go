package main

import (
	"context"
	"encoding/base64"
	"fmt"
	"log/slog"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
)

var (
	cookiesOnce sync.Once
	cookiesPath string
)

type downloadError struct {
	Code      string
	Message   string
	Retryable bool
}

func (e *downloadError) Error() string {
	return e.Message
}

func classifyYtDlpFailure(output string, fallbackErr error) *downloadError {
	normalized := strings.ToLower(output)

	switch {
	case strings.Contains(normalized, "sign in to confirm you're not a bot") ||
		strings.Contains(normalized, "sign in to confirm you’re not a bot") ||
		strings.Contains(normalized, "use --cookies-from-browser or --cookies"):
		return &downloadError{
			Code:      "youtube_auth_required",
			Message:   "youtube download blocked; authentication cookies are required",
			Retryable: false,
		}
	case strings.Contains(normalized, "http error 429") ||
		strings.Contains(normalized, "too many requests"):
		return &downloadError{
			Code:      "youtube_rate_limited",
			Message:   "youtube temporarily rate-limited this request",
			Retryable: true,
		}
	case strings.Contains(normalized, "this video is unavailable") ||
		strings.Contains(normalized, "video unavailable") ||
		strings.Contains(normalized, "private video"):
		return &downloadError{
			Code:      "youtube_unavailable",
			Message:   "youtube video is unavailable",
			Retryable: false,
		}
	default:
		return &downloadError{
			Code:      "download_failed",
			Message:   fmt.Sprintf("yt-dlp failed: %v", fallbackErr),
			Retryable: true,
		}
	}
}

func looksLikeCookiesFile(value string) bool {
	normalized := strings.ToLower(value)
	return strings.Contains(normalized, "youtube.com") && strings.Contains(value, "\t")
}

func decodeCookiesEnv(value string) ([]byte, string, error) {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return nil, "", fmt.Errorf("empty YOUTUBE_COOKIES")
	}

	if strings.HasPrefix(trimmed, "# Netscape HTTP Cookie File") || looksLikeCookiesFile(trimmed) {
		return []byte(trimmed), "raw", nil
	}

	compact := strings.Map(func(r rune) rune {
		switch r {
		case ' ', '\n', '\r', '\t':
			return -1
		default:
			return r
		}
	}, trimmed)

	decoded, err := base64.StdEncoding.DecodeString(compact)
	if err != nil {
		return nil, "", fmt.Errorf("invalid base64 cookie payload: %w", err)
	}

	decodedText := strings.TrimSpace(string(decoded))
	if !strings.HasPrefix(decodedText, "# Netscape HTTP Cookie File") && !looksLikeCookiesFile(decodedText) {
		return nil, "", fmt.Errorf("decoded payload is not a Netscape cookies file")
	}

	return []byte(decodedText), "base64", nil
}

// writeCookiesFile materializes YOUTUBE_COOKIES (base64 or raw Netscape cookies.txt)
// to a temp file once, and returns the path.
func writeCookiesFile() string {
	cookiesOnce.Do(func() {
		rawValue := os.Getenv("YOUTUBE_COOKIES")
		if strings.TrimSpace(rawValue) == "" {
			slog.Warn("YOUTUBE_COOKIES not set — yt-dlp will run without cookies and YouTube may block downloads")
			return
		}
		data, source, err := decodeCookiesEnv(rawValue)
		if err != nil {
			slog.Warn("failed to decode YOUTUBE_COOKIES", "error", err, "hint", "set base64 cookies.txt or raw Netscape cookies content")
			return
		}
		f, err := os.CreateTemp("", "yt-cookies-*.txt")
		if err != nil {
			slog.Warn("failed to create cookies file", "error", err)
			return
		}
		f.Write(data)
		f.Close()
		cookiesPath = f.Name()
		slog.Info("loaded YouTube cookies file", "bytes", len(data), "source", source)
	})
	return cookiesPath
}

func downloadVideo(ctx context.Context, videoURL string) (string, error) {
	log := logFor(ctx)
	tmpDir, err := os.MkdirTemp("", "video-*")
	if err != nil {
		return "", fmt.Errorf("failed to create temp dir: %w", err)
	}

	outputTemplate := filepath.Join(tmpDir, "video.%(ext)s")

	args := []string{
		"-f", "best[height<=480]/bestvideo[height<=480]+bestaudio/best",
		"-o", outputTemplate,
		"--no-playlist",
		"--merge-output-format", "mp4",
		"--js-runtimes", "node",
		"--remote-components", "ejs:github",
	}

	// Add cookies: prefer YOUTUBE_COOKIES env var, fall back to browser cookies
	if cp := writeCookiesFile(); cp != "" {
		args = append(args, "--cookies", cp)
	} else if browser := os.Getenv("YOUTUBE_COOKIES_BROWSER"); browser != "" {
		// e.g. YOUTUBE_COOKIES_BROWSER=chrome or chrome:~/.config/google-chrome
		args = append(args, "--cookies-from-browser", browser)
	}

	args = append(args, videoURL)
	log.Info("yt-dlp starting",
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
		log.Error("yt-dlp failed",
			"video_url", videoURL,
			"error", err,
			"failure_code", classified.Code,
			"retryable", classified.Retryable,
			"output", truncateForLog(outputStr, 4000),
		)
		os.RemoveAll(tmpDir)
		return "", classified
	}
	if len(output) > 0 {
		log.Info("yt-dlp output",
			"video_url", videoURL,
			"output", truncateForLog(string(output), 1200),
		)
	}

	entries, _ := os.ReadDir(tmpDir)
	for _, e := range entries {
		if strings.HasPrefix(e.Name(), "video.") {
			return filepath.Join(tmpDir, e.Name()), nil
		}
	}

	os.RemoveAll(tmpDir)
	return "", fmt.Errorf("no output file found after download")
}

func cleanup(videoPath string) {
	os.RemoveAll(filepath.Dir(videoPath))
}
