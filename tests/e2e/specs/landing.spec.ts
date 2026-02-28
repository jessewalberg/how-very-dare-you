import { test, expect } from "../fixtures/test";

test.describe("Landing page", () => {
  test("loads core homepage content", async ({ landingPage }) => {
    await landingPage.goto();
    await landingPage.expectLoaded();
  });

  test("search form routes to search results page", async ({
    landingPage,
    page,
  }) => {
    await landingPage.goto();
    await landingPage.searchFor("Bluey");

    await expect(page).toHaveURL(/\/search\?q=Bluey/);
    await expect(
      page.getByRole("heading", { name: "Search Results" })
    ).toBeVisible();
  });

  test("browse CTA opens the browse page", async ({ landingPage, page }) => {
    await landingPage.goto();
    await landingPage.openBrowse();

    await expect(page).toHaveURL(/\/browse/);
    await expect(
      page.getByRole("heading", { name: "Browse Titles" })
    ).toBeVisible();
  });
});
