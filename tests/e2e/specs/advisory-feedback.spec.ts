import { test, expect } from "../fixtures/test";

const BLUEY_TITLE_ID = "jd757f8t23d7twhmv2q1nbmkds81qmnq";

test.describe("Advisory feedback", () => {
  test("signed-out users can submit title advisory feedback", async ({ page }) => {
    await page.goto(`/title/${BLUEY_TITLE_ID}`);

    const titleNotFound = page.getByRole("heading", { name: "Title Not Found" });
    if (await titleNotFound.isVisible()) {
      test.skip(true, "Bluey fixture title is unavailable in this environment.");
    }

    const prompt = page.getByText("Was this AI-analyzed advisory helpful?");
    await expect(prompt).toBeVisible();

    await page.getByRole("button", { name: "Needs work" }).click();
    await page.getByRole("button", { name: "Unclear explanation" }).click();
    await page.getByPlaceholder("Optional details...").fill("Breakdown note is too short.");
    await page.getByRole("button", { name: "Submit feedback" }).click();

    await expect(
      page.getByText("Thanks, your feedback helps improve future advisories.")
    ).toBeVisible();
  });
});
