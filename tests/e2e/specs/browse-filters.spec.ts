import { expect, test } from "@playwright/test";

test.describe("Browse filters", () => {
  test("content type and low-advisory filters update URL and heading", async ({ page }) => {
    await page.goto("/browse");

    await page.getByRole("button", { name: "Movies" }).click();
    await expect(page).toHaveURL(/\/browse\?.*type=movie/);

    await page.getByRole("button", { name: "Show Low Advisory Only" }).click();
    await expect(page).toHaveURL(/\/browse\?.*lowScores=true/);
    expect(page.url()).toContain("type=movie");
    await expect(
      page.getByRole("heading", { level: 1, name: "Low Advisory Picks" })
    ).toBeVisible();

    await page.getByRole("button", { name: /Clear all/i }).click();
    await expect(page).toHaveURL(/\/browse$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Browse Titles" })
    ).toBeVisible();
  });

  test("age and streaming service filters append expected params", async ({
    page,
  }) => {
    await page.goto("/browse");

    await page.getByRole("button", { name: "PG-13" }).click();
    await expect(page).toHaveURL(/\/browse\?.*age=PG-13/);
    await page.getByRole("button", { name: "Netflix" }).click();

    await expect(page).toHaveURL(/\/browse\?.*service=Netflix/);
    const currentUrl = page.url();
    expect(currentUrl).toContain("age=PG-13");
    expect(currentUrl).toContain("service=Netflix");
  });

  test("max severity query params are treated as active filters and can be cleared", async ({
    page,
  }) => {
    await page.goto("/browse?max_lgbtq=0");

    await expect(page.getByRole("button", { name: /Clear all/i })).toBeVisible();
    await page.getByRole("button", { name: /Clear all/i }).click();
    await expect(page).toHaveURL(/\/browse$/);
  });
});
