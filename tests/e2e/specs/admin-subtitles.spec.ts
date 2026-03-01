import { test, expect } from "../fixtures/test";

test.describe("Admin subtitle viewer", () => {
  test("opens subtitle archive dialog from title rows and standalone sidebar", async ({
    page,
  }) => {
    await page.goto("/admin/titles");

    const adminHeading = page.getByRole("heading", { name: "Title Management" });
    const hasAdminPage = await adminHeading.isVisible().catch(() => false);
    test.skip(!hasAdminPage, "Admin page is not accessible in this environment");

    const rowSubtitleButtons = page.getByTestId("admin-title-view-subtitles");
    const rowButtonCount = await rowSubtitleButtons.count();
    test.skip(rowButtonCount === 0, "No titles available to test subtitle viewer");

    await rowSubtitleButtons.first().click();
    await expect(page.getByTestId("admin-subtitle-viewer-dialog")).toBeVisible();
    await page.getByRole("button", { name: "Close" }).click();
    await expect(page.getByTestId("admin-subtitle-viewer-dialog")).toBeHidden();

    const standaloneRows = page
      .locator('div[role="button"]')
      .filter({ has: page.getByTestId("admin-title-view-subtitles") });
    const standaloneRowCount = await standaloneRows.count();
    test.skip(
      standaloneRowCount === 0,
      "No standalone title rows available to test sidebar subtitle button"
    );

    await standaloneRows.first().click();
    const sidebarSubtitleButton = page.getByTestId("admin-standalone-view-subtitles");
    await expect(sidebarSubtitleButton).toBeVisible();
    await sidebarSubtitleButton.click();
    await expect(page.getByTestId("admin-subtitle-viewer-dialog")).toBeVisible();
  });
});
