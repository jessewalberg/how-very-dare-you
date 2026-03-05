import assert from "node:assert/strict";
import {
  buildNewsletterReplyDistinctId,
  parseNewsletterReplyPayload,
} from "@/lib/newsletterAnalytics";

function runCase(name: string, fn: () => void) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

runCase("parses valid payload", () => {
  const payload = parseNewsletterReplyPayload({
    campaign: "weekly-roundup",
    weekStart: "2026-03-02",
    theme: "requested_titles",
    count: 12,
  });

  assert.ok(payload);
  assert.equal(payload?.campaign, "weekly-roundup");
  assert.equal(payload?.weekStart, "2026-03-02");
  assert.equal(payload?.theme, "requested_titles");
  assert.equal(payload?.count, 12);
});

runCase("normalizes count and weekStart", () => {
  const payload = parseNewsletterReplyPayload({
    campaign: "  weekly-roundup  ",
    weekStart: "2026-03-05T12:13:14.000Z",
    theme: " title_requests ",
    count: "7",
  });

  assert.ok(payload);
  assert.equal(payload?.campaign, "weekly-roundup");
  assert.equal(payload?.weekStart, "2026-03-05");
  assert.equal(payload?.theme, "title_requests");
  assert.equal(payload?.count, 7);
});

runCase("rejects invalid payload", () => {
  assert.equal(
    parseNewsletterReplyPayload({
      campaign: "",
      weekStart: "not-a-date",
      theme: "",
      count: -1,
    }),
    null
  );
});

runCase("builds deterministic distinct id", () => {
  const distinctId = buildNewsletterReplyDistinctId({
    campaign: "weekly-roundup",
    weekStart: "2026-03-02",
    theme: "requested_titles",
    count: 10,
  });

  assert.equal(
    distinctId,
    "newsletter:weekly-roundup:2026-03-02:requested_titles"
  );
});
