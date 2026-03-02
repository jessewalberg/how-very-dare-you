import assert from "node:assert/strict";
import {
  SIGN_IN_DAILY_ANALYSIS_PROMPT,
  REQUEST_DAILY_ANALYSIS_SUFFIX,
  getEpisodeAnalysisActionLabel,
  getTitleAnalysisActionLabel,
  formatRemainingAnalyses,
  formatUsageResetCopy,
} from "@/lib/analysisCopy";

function runCase(name: string, fn: () => void) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

runCase("daily sign-in prompt uses AI analysis wording", () => {
  assert.equal(
    SIGN_IN_DAILY_ANALYSIS_PROMPT,
    "Sign in to request up to 3 AI analyses per day."
  );
  assert.equal(
    REQUEST_DAILY_ANALYSIS_SUFFIX,
    "to request up to 3 AI analyses per day."
  );
});

runCase("episode action label is gated by auth state", () => {
  assert.equal(getEpisodeAnalysisActionLabel(true), "Analyze Episode");
  assert.equal(getEpisodeAnalysisActionLabel(false), "Sign In to Analyze");
});

runCase("title action label distinguishes initial vs re-analysis", () => {
  assert.equal(getTitleAnalysisActionLabel(false), "Analyze This Title");
  assert.equal(getTitleAnalysisActionLabel(true), "Re-Analyze Title");
});

runCase("remaining analysis quota text is formatted", () => {
  assert.equal(
    formatRemainingAnalyses(2, 3),
    "2 of 3 on-demand AI analyses remaining today"
  );
});

runCase("usage reset copy is tier-aware", () => {
  assert.equal(
    formatUsageResetCopy(3, 3, "free"),
    "You've used 3/3 free analyses today. Resets at midnight."
  );
  assert.equal(
    formatUsageResetCopy(10, 10, "paid"),
    "You've used 10/10 analyses today. Resets at midnight."
  );
});
