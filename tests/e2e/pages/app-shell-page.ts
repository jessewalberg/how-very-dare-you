import { expect, type Page } from "@playwright/test";

export class AppShellPage {
  constructor(private readonly page: Page) {}

  async gotoBrowse() {
    await this.page.goto("/browse");
  }

  async gotoLowScores() {
    await this.page.goto("/browse/low-scores");
  }

  async expectBrowseLoaded() {
    await expect(
      this.page.getByRole("heading", { name: "Browse Titles" })
    ).toBeVisible();
  }

  async expectLowScoresLoaded() {
    await expect(
      this.page.getByRole("heading", { name: "Low Advisory Picks" })
    ).toBeVisible();
  }

  async expectTopNavVisible() {
    const topHeader = this.page.locator("header").first();
    await expect(
      topHeader.getByRole("link", { name: "Browse", exact: true })
    ).toBeVisible();
    await expect(
      topHeader.getByRole("link", { name: "Low Advisory", exact: true })
    ).toBeVisible();
    await expect(
      topHeader.getByRole("link", { name: "Watchlist", exact: true })
    ).toBeVisible();
  }
}
