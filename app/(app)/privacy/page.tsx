import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — How Very Dare You",
  description:
    "Privacy policy for How Very Dare You. Learn how we collect, use, and protect your data.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 py-4">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated: March 3, 2026
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-bold tracking-tight">Overview</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          How Very Dare You (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;)
          operates the howverydareyou.com website. This page informs you of our
          policies regarding the collection, use, and disclosure of personal
          information when you use our service.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold tracking-tight">
          Information We Collect
        </h2>
        <h3 className="text-base font-semibold">Account Information</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          When you create an account through Clerk (our authentication
          provider), we receive your email address and display name. This
          information is used to manage your account, track your on-demand
          rating usage, and communicate with you about your subscription.
        </p>
        <h3 className="text-base font-semibold">Payment Information</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Premium subscriptions are processed through Stripe. We do not store
          your credit card details. Stripe handles all payment processing and
          we only receive your Stripe customer ID and subscription status.
        </p>
        <h3 className="text-base font-semibold">Usage Analytics</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          We use PostHog for product analytics. This includes page views,
          searches performed, titles viewed, and feature usage. Analytics
          data is used to improve the product and is not sold to third parties.
        </p>
        <h3 className="text-base font-semibold">Correction Submissions</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          If you submit a rating correction, we store the category, suggested
          change, explanation, and any optional contact email you provide so we
          can review and potentially follow up on the submission.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold tracking-tight">Cookies</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          We use essential cookies for authentication (Clerk session cookies)
          and analytics (PostHog). We do not use advertising cookies or sell
          data to advertisers.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold tracking-tight">
          Third-Party Services
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          We integrate with the following third-party services:
        </p>
        <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
          <li>
            <strong>Clerk</strong> — Authentication and user management
          </li>
          <li>
            <strong>Stripe</strong> — Payment processing for Premium
            subscriptions
          </li>
          <li>
            <strong>Convex</strong> — Database and backend infrastructure
          </li>
          <li>
            <strong>PostHog</strong> — Product analytics
          </li>
          <li>
            <strong>OpenRouter / Anthropic</strong> — AI analysis of content
          </li>
          <li>
            <strong>TMDB</strong> — Movie and TV show metadata and images
          </li>
        </ul>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Each service has its own privacy policy. We encourage you to review
          their policies for details on how they handle data.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold tracking-tight">Data Retention</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Account data is retained for as long as your account is active. You
          may request account deletion by contacting us. Rating data and
          content advisories are retained indefinitely as part of our public
          database.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold tracking-tight">
          Children&apos;s Privacy
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Our service is intended for parents and guardians. We do not
          knowingly collect personal information from children under 13. If
          you believe we have collected information from a child, please
          contact us.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold tracking-tight">Contact</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          If you have questions about this privacy policy, please contact us
          at privacy@howverydareyou.com.
        </p>
      </section>
    </div>
  );
}
