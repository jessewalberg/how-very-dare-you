import { test, expect } from "../fixtures/test";

test.describe("Movie navigation", () => {
  test("movie cards open the title detail page", async ({ page }) => {
    await page.goto("/browse?type=movie");
    await expect(page.getByRole("heading", { name: "Browse Titles" })).toBeVisible();

    const titleLinks = page.locator('a[href^="/title/"]');
    const count = await titleLinks.count();
    test.skip(count === 0, "No movie cards available in this dataset");

    await titleLinks.first().click();
    await expect(page).toHaveURL(/\/title\/[^/]+$/);
  });
});
