import { expect, type Page } from "@playwright/test";

export class LandingPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto("/");
  }

  async expectLoaded() {
    await expect(
      this.page.getByRole("heading", {
        name: "Know what your kids are watching before they watch it",
      })
    ).toBeVisible();
    await expect(
      this.page.getByRole("button", { name: "Search" })
    ).toBeVisible();
  }

  async searchFor(title: string) {
    await this.page
      .getByPlaceholder("Search any movie or TV show...")
      .fill(title);
    await this.page.getByRole("button", { name: "Search" }).click();
  }

  async openBrowse() {
    await this.page.getByRole("link", { name: "Browse Titles" }).first().click();
  }

  async expectSeoBasics() {
    const h1Count = await this.page.locator("h1").count();
    expect(h1Count).toBe(1);

    const metaDesc = this.page.locator('meta[name="description"]');
    await expect(metaDesc).toHaveAttribute("content", /.+/);

    const canonical = this.page.locator('link[rel="canonical"]');
    await expect(canonical).toBeAttached();
  }
}
