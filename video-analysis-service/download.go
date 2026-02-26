package main

import (
	"context"
	"encoding/base64"
	"fmt"
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
			return
		}
		data, err := base64.StdEncoding.DecodeString(encoded)
		if err != nil {
			fmt.Fprintf(os.Stderr, "warning: failed to decode YOUTUBE_COOKIES: %v\n", err)
			return
		}
		f, err := os.CreateTemp("", "yt-cookies-*.txt")
		if err != nil {
			fmt.Fprintf(os.Stderr, "warning: failed to create cookies file: %v\n", err)
			return
		}
		f.Write(data)
		f.Close()
		cookiesPath = f.Name()
		fmt.Fprintf(os.Stderr, "info: loaded YouTube cookies file (%d bytes)\n", len(data))
	})
	return cookiesPath
}

func downloadVideo(ctx context.Context, videoURL string) (string, error) {
	tmpDir, err := os.MkdirTemp("", "video-*")
	if err != nil {
		return "", fmt.Errorf("failed to create temp dir: %w", err)
	}

	outputTemplate := filepath.Join(tmpDir, "video.%(ext)s")

	args := []string{
		"-f", "bestvideo[height<=480]+bestaudio/best[height<=480]",
		"-o", outputTemplate,
		"--no-playlist",
		"--merge-output-format", "mp4",
		"--extractor-args", "youtube:player_client=mediaconnect",
	}

	// Add cookies if available
	if cp := writeCookiesFile(); cp != "" {
		args = append(args, "--cookies", cp)
	}

	args = append(args, videoURL)

	cmd := exec.CommandContext(ctx, "yt-dlp", args...)
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
	return "", fmt.Errorf("no output file found after download")
}

func cleanup(videoPath string) {
	os.RemoveAll(filepath.Dir(videoPath))
}
