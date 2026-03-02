import assert from "node:assert/strict";
import { DEFAULT_WEIGHTS } from "../../lib/constants";
import { calculateCompositeScore, type CategoryRatings } from "../../lib/scoring";
import {
  normalizeCategoryWeights,
  getEffectiveCategoryWeights,
  areCategoryWeightsEqual,
} from "../../lib/userWeights";

function runCase(name: string, fn: () => void) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

const sampleRatings: CategoryRatings = {
  lgbtq: 4,
  climate: 4,
  racialIdentity: 0,
  genderRoles: 0,
  antiAuthority: 0,
  religious: 0,
  political: 0,
  sexuality: 0,
  overstimulation: 0,
};

runCase("normalizeCategoryWeights merges partial values with defaults", () => {
  const normalized = normalizeCategoryWeights({ lgbtq: 10, climate: 0 });
  assert.equal(normalized.lgbtq, 10);
  assert.equal(normalized.climate, 0);
  assert.equal(normalized.political, DEFAULT_WEIGHTS.political);
});

runCase("getEffectiveCategoryWeights returns defaults for free users", () => {
  const effective = getEffectiveCategoryWeights({
    tier: "free",
    categoryWeights: { lgbtq: 0, climate: 0, political: 0 },
  });
  assert.deepEqual(effective, DEFAULT_WEIGHTS);
});

runCase("getEffectiveCategoryWeights returns merged custom weights for paid users", () => {
  const effective = getEffectiveCategoryWeights({
    tier: "paid",
    categoryWeights: { lgbtq: 10, climate: 0 },
  });
  assert.equal(effective.lgbtq, 10);
  assert.equal(effective.climate, 0);
  assert.equal(effective.genderRoles, DEFAULT_WEIGHTS.genderRoles);
});

runCase("areCategoryWeightsEqual compares by value, not reference", () => {
  const a = normalizeCategoryWeights({ lgbtq: 6 });
  const b = normalizeCategoryWeights({ lgbtq: 6 });
  const c = normalizeCategoryWeights({ lgbtq: 5 });
  assert.equal(areCategoryWeightsEqual(a, b), true);
  assert.equal(areCategoryWeightsEqual(a, c), false);
});

runCase("effective paid weights change composite score from defaults", () => {
  const defaultScore = calculateCompositeScore(sampleRatings, DEFAULT_WEIGHTS);
  const paidWeights = getEffectiveCategoryWeights({
    tier: "paid",
    categoryWeights: {
      lgbtq: 10,
      climate: 10,
      racialIdentity: 0,
      genderRoles: 0,
      antiAuthority: 0,
      religious: 0,
      political: 0,
      sexuality: 0,
      overstimulation: 0,
    },
  });
  const weightedScore = calculateCompositeScore(sampleRatings, paidWeights);
  assert.equal(weightedScore > defaultScore, true);
});
