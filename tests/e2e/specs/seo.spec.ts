import { test, expect } from "@playwright/test";

function extractSitemapLocations(xml: string): string[] {
  return Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g)).map((match) => match[1]);
}

test.describe("SEO — meta tags and structured data", () => {
  test("home page has correct title and meta description", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/How Very Dare You/);

    const metaDesc = page.locator('meta[name="description"]');
    await expect(metaDesc).toHaveAttribute(
      "content",
      /content advisory|parental guide|AI-powered/i
    );
  });

  test("home page has JSON-LD structured data", async ({ page }) => {
    await page.goto("/");
    const jsonLd = page.locator('script[type="application/ld+json"]');
    const count = await jsonLd.count();
    expect(count).toBeGreaterThanOrEqual(1);

    const content = await jsonLd.first().textContent();
    const parsed = JSON.parse(content!);

    const graph = parsed["@graph"] ?? [parsed];
    const webSite = graph.find((item: { "@type"?: string }) => item["@type"] === "WebSite");
    expect(webSite).toBeTruthy();
    expect(webSite.name).toBe("How Very Dare You");
  });

  test("home page has canonical URL", async ({ page }) => {
    await page.goto("/");
    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveAttribute("href", /howverydareyou\.com\/?$/);
  });

  test("browse page has correct metadata", async ({ page }) => {
    await page.goto("/browse");
    await expect(page).toHaveTitle(/Browse.*Content/i);

    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveAttribute("href", /\/browse$/);
  });

  test("browse page has exactly one h1", async ({ page }) => {
    await page.goto("/browse");
    const h1Count = await page.locator("h1").count();
    expect(h1Count).toBe(1);
  });

  test("low-scores page has correct metadata", async ({ page }) => {
    await page.goto("/browse/low-scores");
    await expect(page).toHaveTitle(/Low Advisory/i);
  });

  test("search page has noindex", async ({ page }) => {
    await page.goto("/search?q=test");
    const robots = page.locator('meta[name="robots"]');
    const content = await robots.getAttribute("content");
    expect(content).toContain("noindex");
  });

  test("landing page hero is an h1", async ({ page }) => {
    await page.goto("/");
    const h1 = page.locator("h1");
    await expect(h1.first()).toBeVisible();
    const h1Count = await h1.count();
    expect(h1Count).toBe(1);
  });

  test("all poster images have descriptive alt text", async ({ page }) => {
    await page.goto("/browse");
    await page.waitForTimeout(2000);

    const images = page.locator("img[src*='tmdb']");
    const count = await images.count();

    if (count > 0) {
      for (let i = 0; i < Math.min(count, 5); i++) {
        const alt = await images.nth(i).getAttribute("alt");
        expect(alt).toBeTruthy();
        expect(alt!.length).toBeGreaterThan(5);
      }
    }
  });

  test("robots.txt is accessible and blocks /api/", async ({ page }) => {
    const response = await page.goto("/robots.txt");
    expect(response?.status()).toBe(200);
    const text = await response!.text();
    expect(text).toContain("Disallow: /api/");
    expect(text).toContain("Sitemap:");
  });

  test("sitemap.xml is accessible and contains URLs", async ({ page }) => {
    const response = await page.goto("/sitemap.xml");
    expect(response?.status()).toBe(200);
    const text = await response!.text();
    expect(text).toContain("<urlset");
    expect(text).toContain("howverydareyou.com");
  });

  test("sitemap contains title advisory URLs", async ({ page }) => {
    const response = await page.goto("/sitemap.xml");
    expect(response?.status()).toBe(200);
    const text = await response!.text();
    const locations = extractSitemapLocations(text);
    const titleUrls = locations.filter((url) =>
      /\/title\/[^/]+$/.test(new URL(url).pathname)
    );

    expect(titleUrls.length).toBeGreaterThan(0);
  });

  test("episode advisory URLs from sitemap resolve when present", async ({ page }) => {
    const response = await page.goto("/sitemap.xml");
    expect(response?.status()).toBe(200);
    const text = await response!.text();
    const locations = extractSitemapLocations(text);
    const episodeUrl = locations.find((url) =>
      /\/title\/[^/]+\/season\/\d+\/episode\/\d+$/.test(new URL(url).pathname)
    );

    test.skip(!episodeUrl, "No rated episode advisory URLs in this dataset");

    const path = new URL(episodeUrl!).pathname;
    const episodeResponse = await page.goto(path);
    expect(episodeResponse?.status()).toBe(200);

    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveAttribute("href", new RegExp(`${path}$`));

    const h1 = page.locator("h1").first();
    await expect(h1).toBeVisible();
    await expect(h1).toContainText(/S\d{2}E\d{2}/);
  });
});
