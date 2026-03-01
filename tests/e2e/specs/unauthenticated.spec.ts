import { test, expect } from "../fixtures/test";

test.describe("Unauthenticated access guards", () => {
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
