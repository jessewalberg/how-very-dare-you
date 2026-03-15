/**
 * Email templates for broadcast and transactional emails.
 *
 * Each template function returns { subject, htmlBody, textBody }.
 */

export function foundingMemberLaunchEmail(): {
  subject: string;
  htmlBody: string;
  textBody: string;
} {
  const subject = "You're a founding member of How Very Dare You";

  const htmlBody = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding:32px 32px 0;text-align:center;">
              <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#111827;">How Very Dare You</h1>
              <p style="margin:0;font-size:14px;color:#6b7280;">Content advisories for parents who give a damn</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#374151;">
                You signed up early, and that makes you a <strong>founding member</strong>. Thank you.
              </p>
              <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#374151;">
                We've been busy. Here's what's live right now:
              </p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td style="padding:12px 16px;background-color:#f3f4f6;border-radius:6px;">
                    <p style="margin:0 0 8px;font-size:15px;font-weight:600;color:#111827;">📊 200+ titles rated</p>
                    <p style="margin:0 0 0;font-size:14px;line-height:1.5;color:#4b5563;">
                      Movies and TV shows analyzed across <strong>8 categories</strong> — LGBTQ+ content, gender roles, political themes, religious messaging, and more.
                    </p>
                  </td>
                </tr>
                <tr><td style="height:8px;"></td></tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f3f4f6;border-radius:6px;">
                    <p style="margin:0 0 8px;font-size:15px;font-weight:600;color:#111827;">🤖 AI-powered analysis</p>
                    <p style="margin:0 0 0;font-size:14px;line-height:1.5;color:#4b5563;">
                      Every rating is backed by detailed evidence and quotes from the actual content — not just someone's opinion.
                    </p>
                  </td>
                </tr>
                <tr><td style="height:8px;"></td></tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f3f4f6;border-radius:6px;">
                    <p style="margin:0 0 8px;font-size:15px;font-weight:600;color:#111827;">⚖️ Personalized weights</p>
                    <p style="margin:0 0 0;font-size:14px;line-height:1.5;color:#4b5563;">
                      Adjust how much each category matters to <em>your</em> family. Your advisory scores reflect your values, not ours.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:8px 0 24px;">
                    <a href="https://howverydareyou.com/browse" style="display:inline-block;padding:12px 32px;background-color:#111827;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;border-radius:6px;">
                      Browse rated titles →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 16px;font-size:14px;line-height:1.5;color:#6b7280;">
                <strong>Premium members</strong> get unlimited on-demand ratings, personalized category weights, and early access to new features. Upgrade any time from your account settings.
              </p>

              <p style="margin:0;font-size:14px;line-height:1.5;color:#374151;">
                Thanks for trusting us with your family's screen time decisions.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 32px;border-top:1px solid #e5e7eb;">
              <p style="margin:0 0 8px;font-size:12px;color:#9ca3af;text-align:center;">
                How Very Dare You · howverydareyou.com
              </p>
              <p style="margin:0;font-size:11px;color:#9ca3af;text-align:center;">
                You're receiving this because you created an account or signed up for updates.
                To unsubscribe, reply to this email with "unsubscribe" in the subject line.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const textBody = `You're a founding member of How Very Dare You
============================================================

You signed up early, and that makes you a founding member. Thank you.

We've been busy. Here's what's live right now:

📊 200+ TITLES RATED
Movies and TV shows analyzed across 8 categories — LGBTQ+ content, gender roles, political themes, religious messaging, and more.

🤖 AI-POWERED ANALYSIS
Every rating is backed by detailed evidence and quotes from the actual content — not just someone's opinion.

⚖️ PERSONALIZED WEIGHTS
Adjust how much each category matters to your family. Your advisory scores reflect your values, not ours.

→ Browse rated titles: https://howverydareyou.com/browse

PREMIUM MEMBERS get unlimited on-demand ratings, personalized category weights, and early access to new features. Upgrade any time from your account settings.

Thanks for trusting us with your family's screen time decisions.

—
How Very Dare You · howverydareyou.com

You're receiving this because you created an account or signed up for updates.
To unsubscribe, reply to this email with "unsubscribe" in the subject line.`;

  return { subject, htmlBody, textBody };
}
