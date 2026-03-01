import { test, expect } from "@playwright/test";

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

  test("no-flags page has correct metadata", async ({ page }) => {
    await page.goto("/browse/no-flags");
    await expect(page).toHaveTitle(/No Flags/i);
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
});
