package main

import (
	"strings"
	"testing"
)

func TestExtractVTTDialogue(t *testing.T) {
	input := `WEBVTT

Kind: captions
Language: en

00:00:00.000 --> 00:00:02.000
<c>Welcome&nbsp;back.</c>

00:00:02.000 --> 00:00:04.000
[music]

00:00:04.000 --> 00:00:06.000
Welcome back.

00:00:06.000 --> 00:00:08.000
Let's go.

00:00:08.000 --> 00:00:10.000
Let's go.
`

	got := extractVTTDialogue(input, 50)
	want := "Welcome back.\nLet's go."
	if got != want {
		t.Fatalf("unexpected transcript\nwant:\n%s\n\ngot:\n%s", want, got)
	}
}

func TestLanguageFromCaptionFilename(t *testing.T) {
	if got := languageFromCaptionFilename("captions.en.vtt"); got != "en" {
		t.Fatalf("expected en, got %q", got)
	}
	if got := languageFromCaptionFilename("captions.en.auto.vtt"); got != "en" {
		t.Fatalf("expected en for auto captions, got %q", got)
	}
}

func TestCaptionSourceFromFilename(t *testing.T) {
	if got := captionSourceFromFilename("captions.en.auto.vtt"); got != "youtube_auto_captions" {
		t.Fatalf("expected youtube_auto_captions, got %q", got)
	}
	if got := captionSourceFromFilename("captions.en.vtt"); got != "youtube_captions" {
		t.Fatalf("expected youtube_captions, got %q", got)
	}
}

func TestCountDialogueLines(t *testing.T) {
	if got := countDialogueLines("line one\n\nline two\n"); got != 2 {
		t.Fatalf("expected 2 lines, got %d", got)
	}
	if got := countDialogueLines(strings.Repeat(" ", 10)); got != 0 {
		t.Fatalf("expected 0 lines for blank text, got %d", got)
	}
}
