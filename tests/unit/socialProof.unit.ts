import assert from "node:assert/strict";
import {
  MIN_PARENT_SIGNUPS,
  formatDisplayParentSignupCount,
  getDisplayParentSignupCount,
} from "../../lib/socialProof";

function runCase(name: string, fn: () => void) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

runCase("defaults to minimum parent signup floor", () => {
  assert.equal(getDisplayParentSignupCount(undefined), MIN_PARENT_SIGNUPS);
  assert.equal(getDisplayParentSignupCount(null), MIN_PARENT_SIGNUPS);
});

runCase("uses real parent count when above floor", () => {
  assert.equal(getDisplayParentSignupCount(187), 187);
});

runCase("formats count with plus suffix", () => {
  assert.equal(formatDisplayParentSignupCount(99), `${MIN_PARENT_SIGNUPS}+`);
  assert.equal(formatDisplayParentSignupCount(212), "212+");
});
