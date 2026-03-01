import { test, expect } from "../fixtures/test";

test.describe("App navigation", () => {
  test("shows primary app navigation on browse", async ({ appShellPage }) => {
    await appShellPage.gotoBrowse();
    await appShellPage.expectBrowseLoaded();
    await appShellPage.expectTopNavVisible();
  });

  test("loads no-flags route directly", async ({ appShellPage }) => {
    await appShellPage.gotoNoFlags();
    await appShellPage.expectNoFlagsLoaded();
  });

  test("watchlist route renders a valid access state", async ({ page }) => {
    await page.goto("/watchlist");

    const signedOutPrompt = page.getByRole("heading", {
      name: "Sign in to view your watchlist",
    });
    const premiumPrompt = page.getByRole("heading", {
      name: "Watchlist is a Premium feature",
    });
    const watchlistHeading = page.getByRole("heading", { name: "Watchlist" });
    const loadingSkeleton = page.locator("div.h-8.w-40.animate-pulse").first();

    await expect
      .poll(
        async () => {
          if (await signedOutPrompt.isVisible()) return "signed_out";
          if (await premiumPrompt.isVisible()) return "premium_prompt";
          if (await watchlistHeading.isVisible()) return "watchlist";
          if (await loadingSkeleton.isVisible()) return "loading";
          return "pending";
        },
        { timeout: 15_000 }
      )
      .not.toBe("pending");
  });
});
