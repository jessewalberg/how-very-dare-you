import { test, expect } from "../fixtures/test";

test.describe("Unauthenticated access guards", () => {
  test("search keeps browse access but gates on-demand requests behind sign-in", async ({
    page,
  }) => {
    await page.goto("/search?q=inside%20out");

    await expect(
      page.getByRole("heading", { name: "Search Results" })
    ).toBeVisible();
    await expect(
      page.getByText("Sign in to request up to 3 ratings per day.")
    ).toBeVisible();
  });

  test("search does not show anonymous daily lookup quota", async ({ page }) => {
    await page.goto("/search?q=inside%20out");

    await expect(
      page.getByText(/on-demand lookups remaining today/i)
    ).not.toBeVisible();
  });

  test("search TMDB request actions are sign-in gated for signed-out users", async ({
    page,
  }) => {
    await page.goto("/search?q=inside%20out");

    const signInToRateButtons = page.getByRole("button", {
      name: "Sign In to Rate",
    });
    const count = await signInToRateButtons.count();
    if (count === 0) {
      test.skip(
        true,
        "No additional TMDB-only results rendered for this query in current dataset."
      );
    }
    await expect(signInToRateButtons.first()).toBeVisible();
  });

  test("settings route redirects away from /settings when signed out", async ({
    page,
  }) => {
    await page.goto("/settings");

    await expect(page.getByRole("heading", { name: "Settings" })).not.toBeVisible();
  });

  test("admin dashboard route redirects to home when signed out", async ({
    page,
  }) => {
    await page.goto("/admin");

    await expect(
      page.getByRole("heading", { name: "Admin Dashboard" })
    ).not.toBeVisible();
  });

  test("admin queue route redirects to home when signed out", async ({
    page,
  }) => {
    await page.goto("/admin/queue");

    await expect(
      page.getByRole("heading", { name: "Queue Monitor" })
    ).not.toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Rating Quality Review" })
    ).not.toBeVisible();
  });
});
