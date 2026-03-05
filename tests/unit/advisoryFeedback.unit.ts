import assert from "node:assert/strict";
import {
  MAX_ADVISORY_FEEDBACK_COMMENT_LENGTH,
  buildAdvisoryFeedbackEventProperties,
  normalizeAdvisoryFeedbackComment,
  normalizeAdvisoryFeedbackReasonTag,
  normalizeAdvisoryFeedbackSurface,
} from "@/lib/advisoryFeedback";

function runCase(name: string, fn: () => void) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

runCase("normalizes valid reason tags", () => {
  assert.equal(normalizeAdvisoryFeedbackReasonTag(" too_strict "), "too_strict");
  assert.equal(normalizeAdvisoryFeedbackReasonTag("MISSING_CONTEXT"), "missing_context");
});

runCase("rejects invalid reason tags", () => {
  assert.equal(normalizeAdvisoryFeedbackReasonTag("other"), undefined);
  assert.equal(normalizeAdvisoryFeedbackReasonTag(undefined), undefined);
});

runCase("normalizes feedback surface with safe default", () => {
  assert.equal(normalizeAdvisoryFeedbackSurface("title_card"), "title_card");
  assert.equal(normalizeAdvisoryFeedbackSurface("unknown"), "title_detail");
  assert.equal(normalizeAdvisoryFeedbackSurface(undefined), "title_detail");
});

runCase("normalizes and truncates comment length", () => {
  const long = "x".repeat(MAX_ADVISORY_FEEDBACK_COMMENT_LENGTH + 25);
  const normalized = normalizeAdvisoryFeedbackComment(`   ${long}   `);
  assert.equal(normalized?.length, MAX_ADVISORY_FEEDBACK_COMMENT_LENGTH);
});

runCase("builds advisory feedback event properties", () => {
  const props = buildAdvisoryFeedbackEventProperties({
    titleId: "abc123",
    helpful: false,
    surface: "title_detail",
    reasonTag: "unclear",
    signedIn: false,
  });
  assert.equal(props.title_id, "abc123");
  assert.equal(props.helpful, false);
  assert.equal(props.reason_tag, "unclear");
  assert.equal(props.signed_in, false);
});
