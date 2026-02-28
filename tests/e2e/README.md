# E2E Testing (Playwright)

## Commands

- `bun run test:e2e` runs all end-to-end tests headlessly.
- `bun run test:e2e:headed` runs tests with a visible browser.
- `bun run test:e2e:ui` opens Playwright UI mode.
- `bun run test:e2e:install` installs browser binaries for local/CI use.

## Structure

- `fixtures/test.ts` contains shared fixtures.
- `pages/` contains page objects.
- `specs/` contains test cases only; keep business flows here, not selectors.

## Extending tests

- Add selectors and interactions in page objects first.
- Reuse fixtures so spec files remain short and readable.
- Prefer role and placeholder selectors to avoid brittle CSS coupling.

## Environment

- Default test server: `http://127.0.0.1:3000`.
- Override base URL with `PLAYWRIGHT_BASE_URL`.
- Set `PLAYWRIGHT_SKIP_WEBSERVER=1` when pointing at an already-running app.
