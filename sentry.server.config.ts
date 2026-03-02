// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

const defaultTraceSampleRate = process.env.NODE_ENV === "production" ? 0.1 : 1;
const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

function parseNumberEnv(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment:
    process.env.SENTRY_ENVIRONMENT ??
    process.env.VERCEL_ENV ??
    process.env.NODE_ENV,
  tracesSampleRate: parseNumberEnv(
    process.env.SENTRY_TRACES_SAMPLE_RATE ??
      process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE,
    defaultTraceSampleRate,
  ),
  enableLogs:
    (process.env.SENTRY_ENABLE_LOGS ??
      process.env.NEXT_PUBLIC_SENTRY_ENABLE_LOGS) === "true",

  // Enable sending user PII (Personally Identifiable Information)
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii:
    (process.env.SENTRY_SEND_DEFAULT_PII ??
      process.env.NEXT_PUBLIC_SENTRY_SEND_DEFAULT_PII) === "true",
});
