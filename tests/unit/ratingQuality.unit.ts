import assert from "node:assert/strict";
import { assessRatingQuality } from "../../lib/ratingQuality";

function runCase(name: string, fn: () => void) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

runCase("no review needed for high confidence with archived subtitles", () => {
  const result = assessRatingQuality({
    confidence: 0.91,
    subtitleInfo: {
      status: "success",
      dialogueLines: 220,
      transcriptStorage: { provider: "r2" },
    },
  });
  assert.equal(result.needsReview, false);
  assert.equal(result.severity, "none");
  assert.deepEqual(result.reasonCodes, []);
});

runCase("low confidence is warning", () => {
  const result = assessRatingQuality({
    confidence: 0.62,
    subtitleInfo: {
      status: "success",
      dialogueLines: 180,
      transcriptStorage: { provider: "r2" },
    },
  });
  assert.equal(result.needsReview, true);
  assert.equal(result.severity, "warning");
  assert.ok(result.reasonCodes.includes("low_confidence"));
});

runCase("low confidence without transcript is critical", () => {
  const result = assessRatingQuality({
    confidence: 0.41,
    subtitleInfo: {
      status: "failed",
      dialogueLines: 0,
    },
  });
  assert.equal(result.needsReview, true);
  assert.equal(result.severity, "critical");
  assert.ok(result.reasonCodes.includes("critical_low_confidence"));
  assert.ok(result.reasonCodes.includes("low_confidence_without_transcript"));
});

runCase("success without archive is warning", () => {
  const result = assessRatingQuality({
    confidence: 0.88,
    subtitleInfo: {
      status: "success",
      dialogueLines: 100,
    },
  });
  assert.equal(result.needsReview, true);
  assert.equal(result.severity, "warning");
  assert.ok(result.reasonCodes.includes("subtitle_not_archived"));
});

runCase("short dialogue sample is warning", () => {
  const result = assessRatingQuality({
    confidence: 0.84,
    subtitleInfo: {
      status: "success",
      dialogueLines: 12,
      transcriptStorage: { provider: "r2" },
    },
  });
  assert.equal(result.needsReview, true);
  assert.equal(result.severity, "warning");
  assert.ok(result.reasonCodes.includes("short_dialogue_sample"));
});
