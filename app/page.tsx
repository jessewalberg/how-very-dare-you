import type { Metadata } from "next";
import Link from "next/link";
import {
  Shield,
  BarChart3,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LandingSampleCards } from "@/components/landing/LandingSampleCards";
import { LandingLowAdvisoryPreview } from "@/components/landing/LandingNoFlagsPreview";
import { LandingSearch } from "@/components/landing/LandingSearch";
import { LandingTrendingTitles } from "@/components/landing/LandingTrendingTitles";
import { LandingSocialProof } from "@/components/landing/LandingSocialProof";
import { LandingTestimonials } from "@/components/landing/LandingTestimonials";
import { LandingEmailCapture } from "@/components/landing/LandingEmailCapture";
import { LandingAuthButtons, LandingNavAuth } from "@/components/landing/LandingAuthButtons";
import { LandingHeroAdvisoryPreview } from "@/components/landing/LandingHeroAdvisoryPreview";
import { BrandMark } from "@/components/layout/BrandMark";
import { Footer } from "@/components/layout/Footer";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://howverydareyou.com";

export const metadata: Metadata = {
  title: {
    absolute: "How Very Dare You — AI Content Advisories for Movies & TV Shows",
  },
  description:
    "Know what your kids are watching before they watch it. AI-powered cultural and ideological theme ratings across 8 categories. Free content advisories for parents.",
  keywords: [
    "content advisory",
    "parental guide",
    "movie ratings for parents",
    "TV show content warnings",
    "is it appropriate for kids",
    "cultural themes in movies",
    "ideological content ratings",
    "family movie guide",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    title: "How Very Dare You — Know What Your Kids Are Watching",
    description:
      "AI-powered content advisories for movies and TV shows. Cultural and ideological theme ratings across 8 categories.",
    url: BASE_URL,
    siteName: "How Very Dare You",
    images: [
      {
        url: `${BASE_URL}/og-default.png`,
        width: 1200,
        height: 630,
        alt: "How Very Dare You — AI Content Advisories",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "How Very Dare You — AI Content Advisories for Parents",
    description:
      "Know what your kids are watching. AI-powered cultural and ideological theme ratings for movies and TV shows.",
    images: [`${BASE_URL}/og-default.png`],
  },
  other: {
    "impact-site-verification": "556d8bcd-bfcb-4603-a870-b1b7a574f618",
  },
};

const HOME_JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      name: "How Very Dare You",
      url: BASE_URL,
      description:
        "AI-powered content advisory ratings for movies and TV shows. Cultural and ideological theme breakdowns for parents.",
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${BASE_URL}/search?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "Organization",
      name: "How Very Dare You",
      url: BASE_URL,
      description:
        "Parental content advisory platform providing AI-powered cultural and ideological theme ratings for movies and TV shows.",
    },
  ],
};

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(HOME_JSON_LD) }}
      />

      {/* Top nav */}
      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <Link href="/" aria-label="How Very Dare You home" className="flex items-center gap-2.5 group">
            <BrandMark
              size={52}
              priority
              className="transition-transform duration-200 group-hover:scale-105"
            />
            <span className="text-lg font-extrabold tracking-tight">
              How Very Dare You
            </span>
          </Link>
          <LandingNavAuth />
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/30">
        {/* Subtle grid background */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        <div className="relative mx-auto max-w-7xl px-4 py-14 md:py-20 lg:py-24">
          <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-12">
            <div className="mx-auto max-w-2xl text-center lg:mx-0 lg:text-left">
              <div className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1">
                <Shield className="size-3.5 text-emerald-600" strokeWidth={2.5} />
                <span className="text-xs font-semibold text-emerald-700 tracking-wide">
                  Content Advisory for Parents
                </span>
              </div>

              <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Know what your kids are watching{" "}
                <span className="text-muted-foreground">
                  before they watch it
                </span>
              </h1>

              <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg lg:mx-0">
                AI-analyzed movie content warnings and TV parental guide ratings,
                with an 8-category breakdown on a transparent 0-4 severity
                scale.
              </p>

              <div className="mx-auto mt-8 max-w-lg lg:mx-0">
                <LandingSearch />
              </div>

              <p className="mt-3 text-xs text-muted-foreground/60">
                Search analyzed titles instantly with no account. Sign in to
                request up to 3 new AI analyses per day.
              </p>

              <div className="mt-6">
                <LandingTrendingTitles />
              </div>
            </div>

            <div className="lg:pt-4">
              <LandingHeroAdvisoryPreview />
            </div>
          </div>
        </div>
      </section>

      {/* What Is HVDY — SEO copy */}
      <section className="border-b border-border/30">
        <div className="mx-auto max-w-7xl px-4 py-16 md:py-20">
          <div className="mx-auto max-w-3xl space-y-4">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              What Is How Very Dare You?
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              How Very Dare You is a free content advisory platform that gives
              parents clear, detailed breakdowns of cultural and ideological
              themes in movies and TV shows. Unlike traditional rating systems
              that reduce complex content to a single label, we analyze every
              title across 8 specific categories — including LGBTQ+ content,
              political messaging, religious themes, sexuality, gender roles,
              racial identity, anti-authority narratives, and climate messaging
              — each scored on a transparent 0-4 severity scale.
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Every rating is generated by AI analysis of actual subtitle
              transcripts, not marketing summaries or user opinions. The result
              is fast, consistent, and independent — no editorial board, no
              industry influence, and no paywall on search results. Whether you
              want to find family-friendly movies with zero flags or understand
              exactly what themes a trending show contains, How Very Dare You
              gives you the information you need to decide for your family.
            </p>
          </div>
        </div>
      </section>

      {/* Concrete flow */}
      <section className="border-b border-border/30 bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 py-16 md:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              How a Real Advisory Works
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Example: a parent searches a title, reviews the breakdown, and
              decides in under a minute.
            </p>
          </div>

          <div className="mx-auto mt-10 grid max-w-5xl gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-border/60 bg-card p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                1. Search
              </p>
              <h3 className="mt-2 text-base font-bold">Find a title fast</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Search by movie or show name and open its advisory page
                instantly.
              </p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-card p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                2. Review the breakdown
              </p>
              <h3 className="mt-2 text-base font-bold">
                Read category-level flags
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Example output: Overall 1.6/4, with Political Messaging at
                Notable and Gender Role Commentary at Brief.
              </p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-card p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                3. Decide
              </p>
              <h3 className="mt-2 text-base font-bold">
                Choose what fits your family
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Use the Low Advisory collection, filter by age rating, or request a
                new AI analysis if a title is missing.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Parents Choose HVDY — Competitor comparison */}
      <section className="border-b border-border/30 bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 py-16 md:py-20">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Why Parents Choose How Very Dare You
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              See how we compare to traditional rating systems
            </p>
          </div>

          <div className="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-2">
            {/* MPAA comparison */}
            <div className="rounded-2xl border border-border/60 bg-card p-6 space-y-4">
              <h3 className="text-base font-bold">vs. MPAA Ratings</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <X className="mt-0.5 size-4 shrink-0 text-red-400" />
                  <span className="text-muted-foreground">
                    5 vague labels (G, PG, PG-13, R, NC-17) with no detail
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                  <span>
                    8 specific categories, each scored 0-4 with explanations
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <X className="mt-0.5 size-4 shrink-0 text-red-400" />
                  <span className="text-muted-foreground">
                    Industry-controlled — studios influence their own ratings
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                  <span>
                    Independent AI analysis — no editorial or industry bias
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <X className="mt-0.5 size-4 shrink-0 text-red-400" />
                  <span className="text-muted-foreground">
                    Same rating for every family regardless of values
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                  <span>
                    Premium users weight categories to match their priorities
                  </span>
                </div>
              </div>
            </div>

            {/* CSM comparison */}
            <div className="rounded-2xl border border-border/60 bg-card p-6 space-y-4">
              <h3 className="text-base font-bold">vs. Common Sense Media</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <X className="mt-0.5 size-4 shrink-0 text-red-400" />
                  <span className="text-muted-foreground">
                    Human reviewers take days or weeks to publish
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                  <span>
                    AI-analyzed instantly — request any title, get results fast
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <X className="mt-0.5 size-4 shrink-0 text-red-400" />
                  <span className="text-muted-foreground">
                    Subjective, editorial reviews vary by reviewer
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                  <span>
                    Consistent 0-4 scale — same methodology every time
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <X className="mt-0.5 size-4 shrink-0 text-red-400" />
                  <span className="text-muted-foreground">
                    Metered paywall limits how much you can see
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                  <span>
                    Free to search — no account needed to view ratings
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <X className="mt-0.5 size-4 shrink-0 text-red-400" />
                  <span className="text-muted-foreground">
                    No dedicated political or overstimulation categories
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                  <span>
                    Explicit political messaging and overstimulation tracking
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sample Ratings */}
      <section className="border-b border-border/30">
        <div className="mx-auto max-w-7xl px-4 py-16 md:py-20">
          <div className="text-center">
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-muted/40 px-3 py-1">
              <BarChart3 className="size-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground tracking-wide">
                Detailed Breakdowns
              </span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              See Exactly What&apos;s in Every Title
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
              Every movie and show is AI analyzed across 8 categories on a 0–4
              severity scale. No surprises.
            </p>
          </div>

          <div className="mt-12">
            <LandingSampleCards />
          </div>
        </div>
      </section>

      {/* Low advisory showcase */}
      <section className="border-b border-border/30 bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 py-16 md:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1">
              <CheckCircle2
                className="size-3.5 text-emerald-600"
                strokeWidth={2.5}
              />
              <span className="text-xs font-semibold text-emerald-700 tracking-wide">
                Low Advisory
              </span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Find Content You Can Trust
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
              Titles with lower concern scores and low-severity category
              profiles across our tracked categories.
            </p>
          </div>

          <LandingLowAdvisoryPreview />

          <div className="mt-8 text-center">
            <Button variant="outline" asChild>
              <Link href="/browse/low-scores">
                Browse Low Advisory Picks
                <ArrowRight className="ml-1.5 size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Social proof + stats */}
      <section className="border-b border-border/30">
        <div className="mx-auto max-w-7xl px-4 py-16 md:py-20">
          <LandingSocialProof />
        </div>
      </section>

      {/* Testimonials */}
      <section className="border-b border-border/30 bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 py-16 md:py-20">
          <LandingTestimonials />
        </div>
      </section>

      {/* CTA + Pricing combined */}
      <section id="newsletter" className="bg-foreground text-background">
        <div className="mx-auto max-w-7xl px-4 py-16 md:py-20 text-center">
          <Sparkles className="mx-auto size-8 opacity-60" />
          <h2 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
            Start Making Informed Decisions Today
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed opacity-70">
            Search thousands of analyzed titles with no account, then sign in when
            you want to request up to 3 new AI analyses per day.
          </p>
          <div className="mt-8">
            <LandingAuthButtons />
          </div>
          <div className="mx-auto mt-10 max-w-sm">
            <p className="mb-3 text-xs font-medium opacity-60">
              Or get updates delivered to your inbox
            </p>
            <LandingEmailCapture />
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="border-b border-border/30">
        <div className="mx-auto max-w-7xl px-4 py-16 md:py-20">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Simple, Transparent Pricing
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Most features are free. Upgrade for personalization.
            </p>
          </div>

          <div className="mx-auto mt-12 grid max-w-3xl gap-6 sm:grid-cols-2">
            {/* Free */}
            <div className="rounded-2xl border border-border/60 bg-card p-6 space-y-5">
              <div>
                <h3 className="text-lg font-bold">Free</h3>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold tracking-tight">
                    $0
                  </span>
                  <span className="text-sm text-muted-foreground">/month</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Everything you need to make informed decisions.
                </p>
              </div>
              <ul className="space-y-2.5">
                {[
                  "Search any title",
                  "Full 8-category breakdown",
                  "Browse low advisory picks",
                  "Filter by age range",
                  "3 on-demand AI analyses/day (with free account)",
                ].map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-sm"
                  >
                    <Check className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/browse">Start Browsing</Link>
              </Button>
            </div>

            {/* Premium */}
            <div className="relative rounded-2xl border-2 border-foreground bg-card p-6 space-y-5">
              <div className="absolute -top-3 right-4 rounded-full bg-foreground px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest text-background">
                Pro
              </div>
              <div>
                <h3 className="text-lg font-bold">Premium</h3>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold tracking-tight">
                    $4.99
                  </span>
                  <span className="text-sm text-muted-foreground">/month</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Scores tuned to your family&apos;s priorities.
                </p>
              </div>
              <ul className="space-y-2.5">
                {[
                  "Everything in Free",
                  "Weight categories that matter most to your family",
                  "Get a single score tuned to your values",
                  "Advanced filters",
                  "Save to watchlist",
                  "10 on-demand AI analyses/day",
                ].map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-sm"
                  >
                    <Check className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                    {feature}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">
                For families who want to prioritize specific categories — like
                sexuality high and political lower — and get a personalized
                composite score.
                {" "}
                <Link
                  href="/settings#weights"
                  className="font-medium underline underline-offset-2"
                >
                  See weighting controls
                </Link>
                .
              </p>
              <Button className="w-full" asChild>
                <Link href="/settings#weights">Get Premium</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
