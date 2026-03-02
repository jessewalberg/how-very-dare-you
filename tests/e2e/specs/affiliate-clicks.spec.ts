import { test, expect, type Page } from "@playwright/test";

async function openFirstTitleDetail(page: Page) {
  await page.goto("/browse");
  const titleLinks = page.locator('a[href^="/title/"]');
  const count = await titleLinks.count();
  if (count === 0) {
    test.skip(true, "Requires at least one rated title in browse.");
  }

  const href = await titleLinks.first().getAttribute("href");
  if (!href) {
    test.skip(true, "Could not determine a title URL from browse.");
  }

  await titleLinks.first().click();
  await page.waitForLoadState("networkidle");
  return href!;
}

function extractTitleIdFromHref(href: string): string | null {
  const match = href.match(/^\/title\/([^/?#]+)/);
  return match?.[1] ?? null;
}

test.describe("Affiliate click redirect tracking", () => {
  test("title detail provider links route through /go", async ({ page, request }) => {
    await openFirstTitleDetail(page);

    const providerLinks = page.locator('a[href^="/go/"]');
    const count = await providerLinks.count();
    if (count === 0) {
      test.skip(
        true,
        "No streaming providers available on this title to validate /go redirects."
      );
    }

    const href = await providerLinks.first().getAttribute("href");
    expect(href).toBeTruthy();
    expect(href!).toMatch(/^\/go\/[^?]+\?provider=/);

    const response = await request.get(href!, { maxRedirects: 0 });
    expect(response.status()).toBe(302);

    const location = response.headers()["location"];
    expect(location).toBeTruthy();
    expect(location).toMatch(/^https?:\/\//);
  });

  test("invalid provider requests return 404", async ({ page, request }) => {
    const titleHref = await openFirstTitleDetail(page);
    const titleId = extractTitleIdFromHref(titleHref);
    if (!titleId) {
      test.skip(true, "Unable to parse title id from detail URL.");
    }

    const response = await request.get(
      `/go/${encodeURIComponent(titleId!)}?provider=DefinitelyNotAProvider&surface=title_detail`,
      { maxRedirects: 0 }
    );
    expect(response.status()).toBe(404);
  });
});
