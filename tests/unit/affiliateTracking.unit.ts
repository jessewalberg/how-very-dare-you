import assert from "node:assert/strict";
import {
  buildWatchProviderClickFailedProperties,
  buildWatchProviderClickedProperties,
  buildWatchProviderRedirectUrl,
  parseAppPathFromReferer,
  resolveWatchProviderDestination,
  sanitizeDistinctId,
} from "@/lib/affiliateTracking";

function runCase(name: string, fn: () => void) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

runCase("buildWatchProviderRedirectUrl includes provider and surface", () => {
  const href = buildWatchProviderRedirectUrl({
    titleId: "abc123",
    providerName: "Amazon Prime Video",
    surface: "title_card",
    distinctId: "user_1",
  });

  assert.equal(
    href,
    "/go/abc123?provider=Amazon+Prime+Video&surface=title_card&ph_did=user_1"
  );
});

runCase("buildWatchProviderRedirectUrl omits anonymous distinct id", () => {
  const href = buildWatchProviderRedirectUrl({
    titleId: "abc123",
    providerName: "Netflix",
    distinctId: "   ",
  });

  assert.equal(href, "/go/abc123?provider=Netflix&surface=title_detail");
});

runCase("sanitizeDistinctId trims and falls back", () => {
  assert.equal(sanitizeDistinctId("  user-42  "), "user-42");
  assert.equal(sanitizeDistinctId(""), "anonymous");
  assert.equal(sanitizeDistinctId(undefined), "anonymous");
});

runCase("resolveWatchProviderDestination prefers affiliate url", () => {
  const result = resolveWatchProviderDestination({
    providerName: "Prime Video",
    providers: [
      {
        name: "Prime Video",
        affiliateUrl: "https://www.amazon.com/gp/video/detail/B000TEST?tag=hvdy-20",
        url: "https://www.amazon.com/gp/video/detail/B000TEST",
      },
    ],
    tmdbId: 100,
    titleType: "movie",
  });

  assert.equal(result.ok, true);
  if (!result.ok) {
    throw new Error("Expected destination to resolve.");
  }
  assert.equal(result.isAffiliate, true);
  assert.equal(result.destinationHost, "www.amazon.com");
});

runCase("resolveWatchProviderDestination falls back to direct provider url", () => {
  const result = resolveWatchProviderDestination({
    providerName: "Netflix",
    providers: [{ name: "Netflix", url: "https://www.netflix.com/title/80000000" }],
    tmdbId: 100,
    titleType: "movie",
  });

  assert.equal(result.ok, true);
  if (!result.ok) {
    throw new Error("Expected destination to resolve.");
  }
  assert.equal(result.isAffiliate, false);
  assert.equal(result.destinationHost, "www.netflix.com");
});

runCase("resolveWatchProviderDestination uses tmdb fallback when provider url missing", () => {
  const result = resolveWatchProviderDestination({
    providerName: "Paramount+",
    providers: [{ name: "Paramount+" }],
    tmdbId: 82728,
    titleType: "tv",
  });

  assert.equal(result.ok, true);
  if (!result.ok) {
    throw new Error("Expected destination to resolve.");
  }
  assert.equal(
    result.url,
    "https://www.themoviedb.org/tv/82728/watch?locale=US"
  );
});

runCase("resolveWatchProviderDestination reports provider_not_found", () => {
  const result = resolveWatchProviderDestination({
    providerName: "fuboTV",
    providers: [{ name: "Netflix" }],
    tmdbId: 100,
    titleType: "movie",
  });

  assert.equal(result.ok, false);
  if (result.ok) {
    throw new Error("Expected provider_not_found.");
  }
  assert.equal(result.reason, "provider_not_found");
});

runCase("resolveWatchProviderDestination reports invalid_url", () => {
  const result = resolveWatchProviderDestination({
    providerName: "Broken",
    providers: [{ name: "Broken", affiliateUrl: "javascript:alert(1)" }],
    tmdbId: 100,
    titleType: "movie",
  });

  assert.equal(result.ok, false);
  if (result.ok) {
    throw new Error("Expected invalid_url.");
  }
  assert.equal(result.reason, "invalid_url");
});

runCase("parseAppPathFromReferer extracts path and query", () => {
  const appPath = parseAppPathFromReferer(
    "https://howverydareyou.com/title/abc123?source=search"
  );
  assert.equal(appPath, "/title/abc123?source=search");
});

runCase("build event payload helpers return expected shape", () => {
  const clicked = buildWatchProviderClickedProperties({
    titleId: "abc123",
    tmdbId: 82728,
    titleType: "tv",
    providerName: "Netflix",
    surface: "title_detail",
    isAffiliate: false,
    destinationHost: "www.netflix.com",
    appPath: "/title/abc123",
  });
  const failed = buildWatchProviderClickFailedProperties({
    titleId: "abc123",
    providerName: "Netflix",
    reason: "missing_destination",
  });

  assert.equal(clicked.provider_name, "Netflix");
  assert.equal(clicked.destination_host, "www.netflix.com");
  assert.equal(failed.reason, "missing_destination");
});
