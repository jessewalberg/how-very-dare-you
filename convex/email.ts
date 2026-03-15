import { action, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { Resend } from "resend";

const FROM_ADDRESS = "How Very Dare You <noreply@howverydareyou.com>";

// ── Internal queries ──────────────────────────────────────

export const getAllUserEmails = internalQuery({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    return users
      .map((u) => u.email)
      .filter((e): e is string => typeof e === "string" && e.includes("@"));
  },
});

// ── Actions ───────────────────────────────────────────────

/**
 * Admin-only action: broadcast an email to all users and Resend audience contacts.
 */
export const broadcastEmail = action({
  args: {
    subject: v.string(),
    htmlBody: v.string(),
    textBody: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Admin auth check (same pattern as convex/admin.ts actions)
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    await ctx.runQuery(internal.admin.getAdminUser, {
      clerkId: identity.subject,
    });

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("RESEND_API_KEY not configured");
    const resend = new Resend(apiKey);

    // 1. Collect emails from Convex users table
    const userEmails: string[] = await ctx.runQuery(
      internal.email.getAllUserEmails,
      {}
    );

    // 2. Collect emails from Resend audience (if configured)
    const audienceId = process.env.RESEND_AUDIENCE_ID;
    const audienceEmails: string[] = [];

    if (audienceId) {
      try {
        const contacts = await resend.contacts.list({ audienceId });
        if (contacts.data?.data) {
          for (const contact of contacts.data.data) {
            if (contact.email) {
              audienceEmails.push(contact.email);
            }
          }
        }
      } catch (err) {
        console.warn("[broadcastEmail] Failed to fetch Resend audience:", err);
        // Continue with user emails only
      }
    }

    // 3. Deduplicate
    const allEmails = [
      ...new Set(
        [...userEmails, ...audienceEmails].map((e) => e.toLowerCase().trim())
      ),
    ];

    if (allEmails.length === 0) {
      return { total: 0, sent: 0, failed: 0 };
    }

    // 4. Send in batches of 100 (Resend batch API limit)
    let sent = 0;
    let failed = 0;
    const BATCH_SIZE = 100;

    for (let i = 0; i < allEmails.length; i += BATCH_SIZE) {
      const batch = allEmails.slice(i, i + BATCH_SIZE);
      const batchPayload = batch.map((email) => ({
        from: FROM_ADDRESS,
        to: [email],
        subject: args.subject,
        html: args.htmlBody,
        ...(args.textBody ? { text: args.textBody } : {}),
      }));

      try {
        const result = await resend.batch.send(batchPayload);

        if (result.data?.data) {
          sent += result.data.data.length;
        } else {
          // If batch call succeeded but returned unexpected shape, count as sent
          sent += batch.length;
        }
      } catch (err) {
        console.error(
          `[broadcastEmail] Batch ${i / BATCH_SIZE + 1} failed:`,
          err
        );
        failed += batch.length;
      }

      // Brief delay between batches to be respectful of rate limits
      if (i + BATCH_SIZE < allEmails.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    console.log(
      `[broadcastEmail] Complete: ${allEmails.length} recipients, ${sent} sent, ${failed} failed`
    );

    return { total: allEmails.length, sent, failed };
  },
});

/**
 * Send a single transactional email via Resend.
 */
export const sendTransactionalEmail = action({
  args: {
    to: v.string(),
    subject: v.string(),
    htmlBody: v.string(),
    textBody: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("RESEND_API_KEY not configured");

    // Suppress unused variable warning — ctx is required by Convex action signature
    void ctx;

    const resend = new Resend(apiKey);

    const result = await resend.emails.send({
      from: FROM_ADDRESS,
      to: [args.to],
      subject: args.subject,
      html: args.htmlBody,
      ...(args.textBody ? { text: args.textBody } : {}),
    });

    if (result.error) {
      throw new Error(
        `Failed to send email to ${args.to}: ${result.error.message}`
      );
    }

    return { success: true, id: result.data?.id };
  },
});
