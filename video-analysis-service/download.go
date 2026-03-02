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

// writeCookiesFile decodes the YOUTUBE_COOKIES env var (base64-encoded
// Netscape cookies.txt) to a temp file once, and returns the path.
func writeCookiesFile() string {
	cookiesOnce.Do(func() {
		encoded := os.Getenv("YOUTUBE_COOKIES")
		if encoded == "" {
			slog.Warn("YOUTUBE_COOKIES not set — yt-dlp will run without cookies and YouTube may block downloads")
			return
		}
		data, err := base64.StdEncoding.DecodeString(encoded)
		if err != nil {
			slog.Warn("failed to decode YOUTUBE_COOKIES", "error", err)
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
		slog.Info("loaded YouTube cookies file", "bytes", len(data))
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
		log.Error("yt-dlp failed",
			"video_url", videoURL,
			"error", err,
			"output", truncateForLog(string(output), 4000),
		)
		os.RemoveAll(tmpDir)
		return "", fmt.Errorf("yt-dlp failed: %w", err)
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
