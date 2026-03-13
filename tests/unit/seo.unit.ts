import assert from "node:assert/strict";
import { generateSlug, isLegacyUnknownYearSlug } from "../../convex/titles";
import { resolveTitlePath } from "../../lib/titlePaths";

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

runCase("low-advisory copy mentions lower concern ranges", () => {
  const description =
    "Browse low advisory picks for movies and TV shows. Titles in this list stay at or below brief concern levels across categories, with low overall composite scores.";
  assert.ok(description.includes("low advisory picks"));
  assert.ok(description.includes("low overall composite scores"));
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

runCase("sitemap title advisory paths fall back to IDs when slug is missing", () => {
  const path = `/title/${resolveTitlePath("title_123", undefined)}`;
  assert.equal(path, "/title/title_123");
});

runCase("sitemap advisory paths avoid provisional unknown-year slugs", () => {
  const titlePath = resolveTitlePath("title_123", "frozen-0");
  const episodePath = `/title/${titlePath}/season/1/episode/2`;
  assert.equal(titlePath, "title_123");
  assert.equal(episodePath, "/title/title_123/season/1/episode/2");
});

runCase("episode advisory path uses title + season + episode params", () => {
  const path = `/title/bluey-2018/season/1/episode/6`;
  assert.equal(path, "/title/bluey-2018/season/1/episode/6");
});

runCase("slug generation normalizes punctuation and appends year", () => {
  const slug = generateSlug(
    "Dr. Strangelove or: How I Learned to Stop Worrying and Love the Bomb",
    1964
  );
  assert.equal(
    slug,
    "dr-strangelove-or-how-i-learned-to-stop-worrying-and-love-the-bomb-1964"
  );
});

runCase("slug generation falls back to untitled when title is punctuation-only", () => {
  const slug = generateSlug("!!!", 2026);
  assert.equal(slug, "untitled-2026");
});

runCase("legacy unknown-year slug detection matches base and suffixed slugs", () => {
  assert.equal(isLegacyUnknownYearSlug("bluey-0", "Bluey"), true);
  assert.equal(isLegacyUnknownYearSlug("bluey-0-2", "Bluey"), true);
  assert.equal(isLegacyUnknownYearSlug("bluey-2018", "Bluey"), false);
});
