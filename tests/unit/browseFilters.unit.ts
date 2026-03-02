import assert from "node:assert/strict";
import {
  applyBrowseClientFilters,
  hasMaxSeverityFilters,
  parseMaxSeverityFilters,
} from "../../lib/browseFilters";

function runCase(name: string, fn: () => void) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

const sampleTitles = [
  {
    ageRating: "PG",
    streamingProviders: [{ name: "Netflix" }, { name: "Hulu" }],
    ratings: { lgbtq: 1, climate: 2, overstimulation: 0 },
  },
  {
    ageRating: "PG-13",
    streamingProviders: [{ name: "Prime Video" }],
    ratings: { lgbtq: 3, climate: 1, overstimulation: 2 },
  },
  {
    ageRating: "TV-PG",
    streamingProviders: [{ name: "Disney+" }],
    ratings: { lgbtq: 0, climate: 0, overstimulation: 0 },
  },
];

runCase("parseMaxSeverityFilters accepts only integer values from 0 to 4", () => {
  const params = new URLSearchParams(
    "max_lgbtq=2&max_climate=0&max_political=9&max_genderRoles=abc&max_overstimulation=4"
  );
  const parsed = parseMaxSeverityFilters(params);

  assert.deepEqual(parsed, {
    lgbtq: 2,
    climate: 0,
    overstimulation: 4,
  });
});

runCase("hasMaxSeverityFilters returns true only when max filters exist", () => {
  assert.equal(hasMaxSeverityFilters({}), false);
  assert.equal(hasMaxSeverityFilters({ lgbtq: 1 }), true);
});

runCase("applyBrowseClientFilters filters by age, service, and max severity", () => {
  const filtered = applyBrowseClientFilters(sampleTitles, {
    ageFilters: ["PG"],
    serviceFilters: ["Netflix"],
    maxSeverityByCategory: { lgbtq: 1, climate: 2 },
  });

  assert.equal(filtered?.length, 1);
  assert.equal(filtered?.[0]?.ageRating, "PG");
});

runCase(
  "applyBrowseClientFilters rejects titles missing ratings when max filters are active",
  () => {
    const titles = [
      ...sampleTitles,
      {
        ageRating: "PG",
        streamingProviders: [{ name: "Netflix" }],
      },
    ];

    const filtered = applyBrowseClientFilters(titles, {
      ageFilters: [],
      serviceFilters: [],
      maxSeverityByCategory: { lgbtq: 1 },
    });

    assert.equal(filtered?.length, 2);
    assert.equal(filtered?.some((t) => !("ratings" in t)), false);
  }
);
