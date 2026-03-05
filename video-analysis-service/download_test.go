package main

import (
	"encoding/base64"
	"testing"
)

const testCookies = "# Netscape HTTP Cookie File\n.youtube.com\tTRUE\t/\tTRUE\t2147483647\tSID\tabc123\n"

func TestClassifyYtDlpFailureAuthRequired(t *testing.T) {
	err := classifyYtDlpFailure(
		"ERROR: Sign in to confirm you're not a bot. Use --cookies-from-browser or --cookies for the authentication.",
		nil,
	)

	if err.Code != "youtube_auth_required" {
		t.Fatalf("expected youtube_auth_required, got %s", err.Code)
	}
	if err.Retryable {
		t.Fatal("expected auth-required failure to be non-retryable")
	}
}

func TestClassifyYtDlpFailureRateLimited(t *testing.T) {
	err := classifyYtDlpFailure("HTTP Error 429: Too Many Requests", nil)

	if err.Code != "youtube_rate_limited" {
		t.Fatalf("expected youtube_rate_limited, got %s", err.Code)
	}
	if !err.Retryable {
		t.Fatal("expected rate-limited failure to be retryable")
	}
}

func TestClassifyYtDlpFailureCaptionsUnavailable(t *testing.T) {
	err := classifyYtDlpFailure(
		"ERROR: There are no subtitles for the requested languages",
		nil,
	)

	if err.Code != "youtube_captions_unavailable" {
		t.Fatalf("expected youtube_captions_unavailable, got %s", err.Code)
	}
	if err.Retryable {
		t.Fatal("expected captions-unavailable failure to be non-retryable")
	}
}

func TestDecodeCookiesEnvRaw(t *testing.T) {
	data, source, err := decodeCookiesEnv(testCookies)
	if err != nil {
		t.Fatalf("expected no error for raw cookie text, got %v", err)
	}
	if source != "raw" {
		t.Fatalf("expected raw source, got %s", source)
	}
	if string(data) != testCookies[:len(testCookies)-1] {
		t.Fatalf("unexpected raw cookie payload: %q", string(data))
	}
}

func TestDecodeCookiesEnvBase64(t *testing.T) {
	encoded := base64.StdEncoding.EncodeToString([]byte(testCookies))
	data, source, err := decodeCookiesEnv(encoded)
	if err != nil {
		t.Fatalf("expected no error for base64 cookie text, got %v", err)
	}
	if source != "base64" {
		t.Fatalf("expected base64 source, got %s", source)
	}
	if string(data) != testCookies[:len(testCookies)-1] {
		t.Fatalf("unexpected decoded cookie payload: %q", string(data))
	}
}

func TestDecodeCookiesEnvRejectsGarbage(t *testing.T) {
	_, _, err := decodeCookiesEnv("not-cookies")
	if err == nil {
		t.Fatal("expected error for invalid cookies payload")
	}
}
