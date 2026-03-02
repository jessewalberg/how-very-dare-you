import assert from "node:assert/strict";
import { isPaidSubscriptionStatus } from "../../lib/subscription";

function runCase(name: string, fn: () => void) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

runCase("paid subscription statuses are recognized", () => {
  assert.equal(isPaidSubscriptionStatus("active"), true);
  assert.equal(isPaidSubscriptionStatus("trialing"), true);
  assert.equal(isPaidSubscriptionStatus("past_due"), true);
});

runCase("non-paid subscription statuses are rejected", () => {
  assert.equal(isPaidSubscriptionStatus("canceled"), false);
  assert.equal(isPaidSubscriptionStatus("incomplete"), false);
  assert.equal(isPaidSubscriptionStatus("unpaid"), false);
  assert.equal(isPaidSubscriptionStatus(undefined), false);
  assert.equal(isPaidSubscriptionStatus(null), false);
});
