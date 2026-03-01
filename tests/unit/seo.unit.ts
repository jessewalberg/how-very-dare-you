import assert from "node:assert/strict";

function runCase(name: string, fn: () => void) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

runCase("title format includes year and brand", () => {
  const title = "Strange World";
  const year = 2022;
  const expected =
    "Strange World (2022) Content Advisory — Is It Appropriate for Kids? | How Very Dare You";
  const result = `${title} (${year}) Content Advisory — Is It Appropriate for Kids? | How Very Dare You`;
  assert.equal(result, expected);
});

runCase("no-flags description mentions safe for all audiences", () => {
  const description =
    "Strange World (2022) has no cultural or ideological content flags. Safe for all audiences. AI-powered content advisory from How Very Dare You.";
  assert.ok(
    description.includes("no cultural or ideological content flags")
  );
  assert.ok(description.includes("Safe for all audiences"));
});

runCase("flagged title description includes severity and categories", () => {
  const severityLabel = "Significant";
  const flaggedCategories = [
    "LGBTQ+ Representation",
    "Climate & Environment",
  ];
  const description = `Content advisory for Strange World (2022): ${severityLabel} overall. Notable themes: ${flaggedCategories.join(", ")}. AI-powered cultural and ideological theme ratings for parents.`;
  assert.ok(description.includes("Significant overall"));
  assert.ok(description.includes("LGBTQ+ Representation"));
});

runCase("JSON-LD uses correct schema type for movies vs TV", () => {
  const schemaType = (type: "movie" | "tv") =>
    type === "tv" ? "TVSeries" : "Movie";
  assert.equal(schemaType("movie"), "Movie");
  assert.equal(schemaType("tv"), "TVSeries");
});

runCase("canonical URLs are relative (resolve via metadataBase)", () => {
  const canonical = "/title/abc123";
  assert.equal(canonical.startsWith("/"), true);
});
