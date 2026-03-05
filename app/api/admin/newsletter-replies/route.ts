import { NextRequest, NextResponse } from "next/server";
import { getPostHogClient } from "@/lib/posthog-server";
import {
  buildNewsletterReplyDistinctId,
  parseNewsletterReplyPayload,
} from "@/lib/newsletterAnalytics";

export async function POST(request: NextRequest) {
  const adminToken = process.env.NEWSLETTER_REPLY_INGEST_TOKEN;
  const sentToken = request.headers.get("x-newsletter-ingest-token");

  if (!adminToken || sentToken !== adminToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = parseNewsletterReplyPayload(await request.json().catch(() => null));
  if (!parsed) {
    return NextResponse.json(
      {
        error:
          "Invalid payload. Required: campaign, weekStart, theme, count (non-negative integer).",
      },
      { status: 400 }
    );
  }

  const posthog = getPostHogClient();
  if (!posthog) {
    return NextResponse.json(
      { error: "PostHog not configured" },
      { status: 503 }
    );
  }

  posthog.capture({
    distinctId: buildNewsletterReplyDistinctId(parsed),
    event: "newsletter_reply_received",
    properties: {
      campaign: parsed.campaign,
      week_start: parsed.weekStart,
      theme: parsed.theme,
      count: parsed.count,
      source: "manual_ingest_api",
    },
  });

  return NextResponse.json({ success: true });
}
