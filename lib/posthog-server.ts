import { PostHog } from "posthog-node";

let posthogClient: PostHog | null = null;

export function getPostHogClient(): PostHog | null {
  const apiKey = process.env.POSTHOG_API_KEY ?? process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const publicHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;
  const host =
    process.env.POSTHOG_HOST ??
    (publicHost && publicHost.startsWith("http")
      ? publicHost
      : "https://us.i.posthog.com");

  if (!apiKey) {
    return null;
  }

  if (!posthogClient) {
    posthogClient = new PostHog(apiKey, {
      host,
      flushAt: 1,
      flushInterval: 0,
    });
  }
  return posthogClient;
}

export async function shutdownPostHog(): Promise<void> {
  if (posthogClient) {
    await posthogClient.shutdown();
  }
}
