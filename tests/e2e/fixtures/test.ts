import { test as base } from "@playwright/test";
import { LandingPage } from "../pages/landing-page";
import { AppShellPage } from "../pages/app-shell-page";

type Fixtures = {
  landingPage: LandingPage;
  appShellPage: AppShellPage;
};

export const test = base.extend<Fixtures>({
  landingPage: async ({ page }, runFixture) => {
    await runFixture(new LandingPage(page));
  },
  appShellPage: async ({ page }, runFixture) => {
    await runFixture(new AppShellPage(page));
  },
});

export { expect } from "@playwright/test";
