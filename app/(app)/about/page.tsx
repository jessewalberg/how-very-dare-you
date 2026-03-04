import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About — How Very Dare You",
  description:
    "Learn how How Very Dare You uses AI to rate movies and TV shows across 8 cultural and ideological categories. Transparent, independent content advisories for parents.",
  alternates: { canonical: "/about" },
};

const CATEGORIES = [
  {
    name: "LGBTQ+ Content",
    description:
      "Romantic or identity-related themes involving LGBTQ+ characters or relationships.",
  },
  {
    name: "Climate & Environmental Messaging",
    description:
      "Environmental activism, climate change messaging, or ecological themes presented as moral imperatives.",
  },
  {
    name: "Racial Identity & Critical Race Theory",
    description:
      "Themes around systemic racism, racial identity politics, or critical race frameworks.",
  },
  {
    name: "Gender Roles & Identity",
    description:
      "Content challenging or reinforcing traditional gender roles, or exploring gender identity themes.",
  },
  {
    name: "Anti-Authority & Anti-Institutional",
    description:
      "Themes portraying authority figures, institutions, or traditions as corrupt or oppressive.",
  },
  {
    name: "Religious Content",
    description:
      "Religious themes, imagery, or messaging — including both promotion and criticism of faith.",
  },
  {
    name: "Political Messaging",
    description:
      "Overt political messaging, partisan themes, or politically charged storylines.",
  },
  {
    name: "Sexuality & Adult Content",
    description:
      "Sexual content, nudity, or mature romantic themes beyond age-appropriate norms.",
  },
];

const FAQ_ITEMS = [
  {
    question: "How are the ratings generated?",
    answer:
      "We use Claude (via OpenRouter) to analyze subtitle transcripts and metadata for each title. The AI evaluates dialogue, themes, and narrative context across all 8 categories, assigning a severity score from 0 (None) to 4 (Core Theme).",
  },
  {
    question: "Are the ratings always accurate?",
    answer:
      "AI-generated ratings are a guide, not a definitive assessment. While our system is consistent and transparent, it can occasionally miss nuance or context that a human reviewer would catch. We encourage users to submit corrections when they disagree with a rating.",
  },
  {
    question: "What does the 0-4 scale mean?",
    answer:
      "0 = None (no detectable content), 1 = Minimal (brief or subtle references), 2 = Moderate (noticeable recurring themes), 3 = Significant (prominent, hard to miss), 4 = Core Theme (central to the story).",
  },
  {
    question: "How is this different from MPAA or Common Sense Media?",
    answer:
      "MPAA ratings use 5 vague labels controlled by the industry. Common Sense Media relies on human reviewers with subjective opinions and a metered paywall. How Very Dare You provides instant, AI-powered analysis across 8 specific categories with a consistent 0-4 scale — free to search, with no editorial bias.",
  },
  {
    question: "Can I request a title that hasn't been rated yet?",
    answer:
      "Yes! Sign in with a free account and you can request up to 3 on-demand AI analyses per day. Premium subscribers get 10 per day.",
  },
];

const FAQ_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ_ITEMS.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-12 py-4">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSON_LD) }}
      />

      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">
          About How Very Dare You
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
          How Very Dare You is an independent content advisory platform that
          helps parents make informed viewing decisions. We use AI to analyze
          movies and TV shows across 8 cultural and ideological categories,
          giving you a clear, detailed breakdown before your family watches.
        </p>
      </div>

      {/* Mission */}
      <section className="space-y-3">
        <h2 className="text-xl font-bold tracking-tight">Our Mission</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Traditional rating systems give you a single label — PG, PG-13, TV-14
          — with little explanation of <em>what</em> cultural or ideological
          themes are actually present. We believe parents deserve more detail
          and more transparency.
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          How Very Dare You doesn&apos;t tell you what to watch or what to avoid.
          We give you the information so <em>you</em> can decide based on your
          own family&apos;s values and preferences.
        </p>
      </section>

      {/* How It Works */}
      <section className="space-y-3">
        <h2 className="text-xl font-bold tracking-tight">
          How AI Analysis Works
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Every title is analyzed by Claude, an advanced AI model, accessed
          through OpenRouter. The AI reads subtitle transcripts and evaluates
          the dialogue, themes, and narrative context against each of our 8
          categories. For TV shows, we analyze individual episodes and
          aggregate the results for a show-level score.
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Each category receives a severity score from 0 (None) to 4 (Core
          Theme), plus explanatory notes describing what the AI found. A
          composite score is calculated using a formula that weights both the
          peak severity and the average across categories.
        </p>
      </section>

      {/* The 8 Categories */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold tracking-tight">The 8 Categories</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {CATEGORIES.map((cat) => (
            <div
              key={cat.name}
              className="rounded-xl border border-border/50 bg-card p-4 space-y-1"
            >
              <h3 className="text-sm font-semibold">{cat.name}</h3>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {cat.description}
              </p>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Some titles also receive an <strong>Overstimulation</strong> score
          based on video analysis of editing pace, color saturation, and flash
          frequency — especially relevant for younger viewers.
        </p>
      </section>

      {/* Transparency */}
      <section className="space-y-3">
        <h2 className="text-xl font-bold tracking-tight">
          Transparency & Limitations
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          AI analysis is consistent and fast, but it has limitations. Subtle
          visual themes, cultural context that isn&apos;t present in dialogue,
          and rapidly evolving cultural norms can all affect accuracy. We
          publish the AI model used and confidence score for every rating so
          you can judge for yourself.
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          We also accept community corrections — if you think a rating is
          wrong, you can submit a correction with your reasoning. This helps
          improve the platform for everyone.
        </p>
      </section>

      {/* FAQ */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold tracking-tight">
          Frequently Asked Questions
        </h2>
        <div className="space-y-4">
          {FAQ_ITEMS.map((item) => (
            <div key={item.question} className="space-y-1.5">
              <h3 className="text-sm font-semibold">{item.question}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {item.answer}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
