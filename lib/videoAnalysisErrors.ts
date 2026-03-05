const CODE_PATTERN = /\[code=([a-z0-9_:-]+)\]/i;

const NON_RETRYABLE_CODE_REASON: Record<string, string> = {
  youtube_auth_required: "Skipped: YouTube blocked download (auth required)",
  youtube_unavailable: "Skipped: YouTube video unavailable",
};

export function extractVideoAnalysisErrorCode(errorMessage: string): string | null {
  const match = CODE_PATTERN.exec(errorMessage);
  if (!match) return null;
  return match[1].toLowerCase();
}

export function getNonRetryableVideoAnalysisReason(
  errorMessage: string
): string | null {
  const code = extractVideoAnalysisErrorCode(errorMessage);
  if (code && NON_RETRYABLE_CODE_REASON[code]) {
    return NON_RETRYABLE_CODE_REASON[code];
  }

  const normalized = errorMessage.toLowerCase();
  if (
    normalized.includes("sign in to confirm you're not a bot") ||
    normalized.includes("sign in to confirm you’re not a bot") ||
    normalized.includes("cookies are required")
  ) {
    return NON_RETRYABLE_CODE_REASON.youtube_auth_required;
  }

  if (
    normalized.includes("video unavailable") ||
    normalized.includes("private video")
  ) {
    return NON_RETRYABLE_CODE_REASON.youtube_unavailable;
  }

  return null;
}
