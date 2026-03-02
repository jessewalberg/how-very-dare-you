import assert from "node:assert/strict";
import { mergeStreamingProvidersWithAffiliates } from "@/lib/streamingProviders";

function runCase(name: string, fn: () => void) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

runCase("preserves existing affiliateUrl when provider names match", () => {
  const merged = mergeStreamingProvidersWithAffiliates(
    [
      { name: "Netflix", logoPath: "/netflix.png" },
      { name: "Amazon Prime Video", logoPath: "/prime.png" },
    ],
    [
      {
        name: "Amazon Prime Video",
        logoPath: "/old-prime.png",
        affiliateUrl: "https://amazon.com/?tag=hvdy-20",
      },
    ]
  );

  assert.equal(merged.length, 2);
  assert.equal(merged[1].affiliateUrl, "https://amazon.com/?tag=hvdy-20");
  assert.equal(merged[1].logoPath, "/prime.png");
});

runCase("matching is case-insensitive and trims whitespace", () => {
  const merged = mergeStreamingProvidersWithAffiliates(
    [{ name: "Paramount+ ", logoPath: "/new.png" }],
    [{ name: "paramount+", affiliateUrl: "https://example.com/paramount" }]
  );

  assert.equal(merged[0].affiliateUrl, "https://example.com/paramount");
});

runCase("incoming affiliateUrl wins over existing one", () => {
  const merged = mergeStreamingProvidersWithAffiliates(
    [
      {
        name: "fuboTV",
        logoPath: "/fubo.png",
        affiliateUrl: "https://new.example/fubo",
      },
    ],
    [{ name: "fubotv", affiliateUrl: "https://old.example/fubo" }]
  );

  assert.equal(merged[0].affiliateUrl, "https://new.example/fubo");
});

runCase("providers not in incoming list are dropped", () => {
  const merged = mergeStreamingProvidersWithAffiliates(
    [{ name: "Netflix", logoPath: "/n.png" }],
    [{ name: "Philo", affiliateUrl: "https://example.com/philo" }]
  );

  assert.equal(merged.length, 1);
  assert.equal(merged[0].name, "Netflix");
  assert.equal(merged[0].affiliateUrl, undefined);
});
