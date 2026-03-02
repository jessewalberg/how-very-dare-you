import { test, expect } from "../fixtures/test";
import type { Page } from "@playwright/test";

const WEIGHT_KEYS = [
  "lgbtq",
  "climate",
  "racialIdentity",
  "genderRoles",
  "antiAuthority",
  "religious",
  "political",
  "sexuality",
  "overstimulation",
] as const;

async function ensurePaidSettingsOrSkip(page: Page) {
  await page.goto("/settings");
  await page.waitForLoadState("networkidle");

  if (page.url().includes("/sign-in")) {
    test.skip(true, "Requires a signed-in session to test weight customization.");
  }

  const settingsHeading = page.getByRole("heading", { name: "Settings" });
  const hasSettingsHeading = await settingsHeading
    .isVisible({ timeout: 1500 })
    .catch(() => false);
  if (!hasSettingsHeading) {
    test.skip(
      true,
      "Requires an authenticated session that can render the settings page."
    );
  }

  const premiumGate = page.getByText("Premium Feature", { exact: false });
  if (await premiumGate.isVisible()) {
    test.skip(true, "Requires a premium user to test custom weights.");
  }
}

async function setAllWeightsToMin(page: Page) {
  for (const key of WEIGHT_KEYS) {
    const sliderThumb = page
      .getByTestId(`weight-slider-${key}`)
      .locator('[role="slider"]')
      .first();
    await sliderThumb.focus();
    await sliderThumb.press("Home");
  }
}

async function resetWeights(page: Page) {
  await page.getByRole("button", { name: "Reset to Defaults" }).click();
  await page.waitForTimeout(1200);
}

test.describe.serial("Settings weights", () => {
  test("live preview score updates when slider values change", async ({ page }) => {
    await ensurePaidSettingsOrSkip(page);

    const scoreValue = page
      .getByTestId("weights-preview-your-score")
      .getByTestId("composite-score-value-compact");
    const lgbtqSliderThumb = page
      .getByTestId("weight-slider-lgbtq")
      .locator('[role="slider"]')
      .first();

    const initialScore = (await scoreValue.textContent())?.trim();
    expect(initialScore).toBeTruthy();

    const currentValue = Number(
      (await lgbtqSliderThumb.getAttribute("aria-valuenow")) ?? "0"
    );
    await lgbtqSliderThumb.focus();
    await lgbtqSliderThumb.press(currentValue > 0 ? "Home" : "End");

    await expect
      .poll(async () => (await scoreValue.textContent())?.trim())
      .not.toBe(initialScore);

    await resetWeights(page);
  });

  test("browse card composite scores reflect saved custom weights", async ({ page }) => {
    await ensurePaidSettingsOrSkip(page);

    await page.goto("/browse");
    await expect(page.getByRole("heading", { name: "Browse Titles" })).toBeVisible();

    const scoreValuesBefore = await page
      .getByTestId("composite-score-value-compact")
      .allTextContents();
    const hasNonZeroBefore = scoreValuesBefore.some(
      (value) => value.trim() !== "0.0/4"
    );
    if (!hasNonZeroBefore) {
      test.skip(
        true,
        "Needs at least one non-zero composite card score in browse data."
      );
    }

    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    await setAllWeightsToMin(page);
    await page.waitForTimeout(1200);

    await page.goto("/browse");
    await expect(page.getByRole("heading", { name: "Browse Titles" })).toBeVisible();

    const scoreValuesAfter = await page
      .getByTestId("composite-score-value-compact")
      .allTextContents();
    expect(scoreValuesAfter.length).toBeGreaterThan(0);
    for (const value of scoreValuesAfter.slice(0, 12)) {
      expect(value.trim()).toBe("0.0/4");
    }

    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    await resetWeights(page);
  });
});
