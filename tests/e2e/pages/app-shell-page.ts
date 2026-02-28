import { expect, type Page } from "@playwright/test";

export class AppShellPage {
  constructor(private readonly page: Page) {}

  async gotoBrowse() {
    await this.page.goto("/browse");
  }

  async gotoNoFlags() {
    await this.page.goto("/browse/no-flags");
  }

  async expectBrowseLoaded() {
    await expect(
      this.page.getByRole("heading", { name: "Browse Titles" })
    ).toBeVisible();
  }

  async expectNoFlagsLoaded() {
    await expect(
      this.page.getByRole("heading", { name: "No Flags Content" })
    ).toBeVisible();
  }

  async expectTopNavVisible() {
    await expect(this.page.getByRole("link", { name: "Browse" })).toBeVisible();
    await expect(this.page.getByRole("link", { name: "No Flags" })).toBeVisible();
    await expect(this.page.getByRole("link", { name: "Watchlist" })).toBeVisible();
  }
}
