import assert from "node:assert/strict";
import {
  extractVideoAnalysisErrorCode,
  getNonRetryableVideoAnalysisReason,
} from "../../lib/videoAnalysisErrors";

function runCase(name: string, fn: () => void) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

runCase("extracts error code marker from service error", () => {
  const message =
    "Video analysis service error 502 [code=youtube_auth_required]: blocked";
  assert.equal(extractVideoAnalysisErrorCode(message), "youtube_auth_required");
});

runCase("returns null when no code marker exists", () => {
  assert.equal(extractVideoAnalysisErrorCode("plain failure"), null);
});

runCase("maps non-retryable auth failures", () => {
  const reason = getNonRetryableVideoAnalysisReason(
    "Video analysis service error 502 [code=youtube_auth_required]: youtube download blocked; authentication cookies are required"
  );
  assert.equal(reason, "Skipped: YouTube blocked download (auth required)");
});

runCase("maps fallback auth text when code is missing", () => {
  const reason = getNonRetryableVideoAnalysisReason(
    "ERROR: Sign in to confirm you're not a bot. Use --cookies-from-browser or --cookies for the authentication."
  );
  assert.equal(reason, "Skipped: YouTube blocked download (auth required)");
});

runCase("keeps unknown failures retryable", () => {
  const reason = getNonRetryableVideoAnalysisReason(
    "Video analysis service error 500: temporary upstream timeout"
  );
  assert.equal(reason, null);
});
