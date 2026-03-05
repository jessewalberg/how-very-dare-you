import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { getPostHogClient } from "@/lib/posthog-server";

const resend = new Resend(process.env.RESEND_API_KEY);

const AUDIENCE_ID = process.env.RESEND_AUDIENCE_ID;

export async function POST(request: NextRequest) {
  const posthog = getPostHogClient();
  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string" || !email.includes("@")) {
      posthog?.capture({
        distinctId: "newsletter:anonymous",
        event: "newsletter_subscribe_failed",
        properties: {
          reason: "invalid_email",
        },
      });
      return NextResponse.json(
        { error: "Valid email address is required." },
        { status: 400 }
      );
    }

    if (!process.env.RESEND_API_KEY) {
      console.error("[Newsletter] RESEND_API_KEY not configured");
      posthog?.capture({
        distinctId: `newsletter:${email}`,
        event: "newsletter_subscribe_failed",
        properties: {
          reason: "resend_not_configured",
        },
      });
      return NextResponse.json(
        { error: "Newsletter signup is temporarily unavailable." },
        { status: 503 }
      );
    }

    if (AUDIENCE_ID) {
      // Add to Resend audience (contact list)
      await resend.contacts.create({
        email,
        audienceId: AUDIENCE_ID,
      });
    } else {
      // No audience configured — send a welcome email instead
      await resend.emails.send({
        from: "How Very Dare You <noreply@howverydareyou.com>",
        to: email,
        subject: "Welcome to How Very Dare You",
        html: `
          <h2>Thanks for signing up!</h2>
          <p>You'll receive content advisory updates, new feature announcements, and parenting insights from How Very Dare You.</p>
          <p>In the meantime, <a href="https://howverydareyou.com/browse">browse our rated titles</a> or <a href="https://howverydareyou.com/blog">read our blog</a>.</p>
          <p style="color: #888; font-size: 12px;">You're receiving this because you signed up at howverydareyou.com.</p>
        `,
      });
    }

    posthog?.capture({
      distinctId: `newsletter:${email}`,
      event: "newsletter_subscribed",
      properties: {
        email_domain: email.includes("@") ? email.split("@")[1]?.toLowerCase() : undefined,
        has_audience: Boolean(AUDIENCE_ID),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Newsletter] Signup failed:", error);
    posthog?.capture({
      distinctId: "newsletter:anonymous",
      event: "newsletter_subscribe_failed",
      properties: {
        reason: "request_error",
      },
    });
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
