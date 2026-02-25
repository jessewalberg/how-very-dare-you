package main

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

func downloadVideo(ctx context.Context, videoURL string) (string, error) {
	tmpDir, err := os.MkdirTemp("", "video-*")
	if err != nil {
		return "", fmt.Errorf("failed to create temp dir: %w", err)
	}

	outputTemplate := filepath.Join(tmpDir, "video.%(ext)s")

	cmd := exec.CommandContext(ctx, "yt-dlp",
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
	return "", fmt.Errorf("no output file found after download")
}

func cleanup(videoPath string) {
	os.RemoveAll(filepath.Dir(videoPath))
}
