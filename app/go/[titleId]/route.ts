import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  buildWatchProviderClickedProperties,
  buildWatchProviderClickFailedProperties,
  parseAppPathFromReferer,
  resolveWatchProviderDestination,
  sanitizeDistinctId,
  type WatchProviderFailureReason,
  type WatchProviderSurface,
} from "@/lib/affiliateTracking";
import { getPostHogClient } from "@/lib/posthog-server";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

function normalizeSurface(surface: string | null): WatchProviderSurface {
  return surface === "title_card" ? "title_card" : "title_detail";
}

function trackFailure(
  distinctId: string,
  titleId: string,
  providerName: string,
  reason: WatchProviderFailureReason
) {
  const posthog = getPostHogClient();
  posthog?.capture({
    distinctId,
    event: "watch_provider_click_failed",
    properties: buildWatchProviderClickFailedProperties({
      titleId,
      providerName,
      reason,
    }),
  });
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ titleId: string }> }
) {
  const { titleId } = await context.params;
  const providerName = request.nextUrl.searchParams.get("provider")?.trim() ?? "";
  const surface = normalizeSurface(request.nextUrl.searchParams.get("surface"));
  const distinctId = sanitizeDistinctId(request.nextUrl.searchParams.get("ph_did"));

  if (!providerName) {
    trackFailure(distinctId, titleId, "unknown", "provider_not_found");
    return NextResponse.json({ error: "Provider not found." }, { status: 404 });
  }

  const title = await convex.query(api.titles.getTitle, {
    titleId: titleId as Id<"titles">,
  });

  if (!title) {
    trackFailure(distinctId, titleId, providerName, "title_not_found");
    return NextResponse.json({ error: "Title not found." }, { status: 404 });
  }

  const destination = resolveWatchProviderDestination({
    providerName,
    providers: (title.streamingProviders ?? []).map((provider) => ({
      name: provider.name,
      affiliateUrl: provider.affiliateUrl,
      url: (provider as { url?: string }).url,
    })),
    tmdbId: title.tmdbId,
    titleType: title.type,
  });

  if (!destination.ok) {
    trackFailure(distinctId, titleId, providerName, destination.reason);
    return NextResponse.json({ error: "Provider not available." }, { status: 404 });
  }

  const posthog = getPostHogClient();
  posthog?.capture({
    distinctId,
    event: "watch_provider_clicked",
    properties: buildWatchProviderClickedProperties({
      titleId,
      tmdbId: title.tmdbId,
      titleType: title.type,
      providerName,
      surface,
      isAffiliate: destination.isAffiliate,
      destinationHost: destination.destinationHost,
      appPath: parseAppPathFromReferer(request.headers.get("referer")),
    }),
  });

  const response = NextResponse.redirect(destination.url, { status: 302 });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
