import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  Shield,
  Search,
  BarChart3,
  CheckCircle2,
  Eye,
  Sparkles,
  ArrowRight,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LandingSampleCards } from "@/components/landing/LandingSampleCards";
import { LandingNoFlagsPreview } from "@/components/landing/LandingNoFlagsPreview";
import { LandingSearch } from "@/components/landing/LandingSearch";
import { LandingAuthButtons, LandingNavAuth } from "@/components/landing/LandingAuthButtons";

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
            <div className="flex size-10 items-center justify-center rounded-xl border border-border/50 bg-muted/40">
              <Image
                src="/brand/howverydareyou-mark-192.png"
                alt=""
                width={32}
                height={32}
                className="size-8 rounded-lg object-cover transition-transform duration-200 group-hover:scale-105"
                priority
              />
            </div>
            <span className="text-base font-bold tracking-tight">
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

        <div className="relative mx-auto max-w-7xl px-4 py-20 md:py-28 lg:py-32">
          <div className="mx-auto max-w-3xl text-center">
            {/* Badge */}
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

            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Get a clear 0-4 advisory score plus category-by-category flags
              before your kids watch. Fast, parent-first guidance for movies
              and TV shows.
            </p>

            {/* Search bar */}
            <div className="mx-auto mt-8 max-w-lg">
              <LandingSearch />
            </div>

            <p className="mt-3 text-xs text-muted-foreground/60">
              Search rated titles instantly with no account. Sign in to request up
              to 3 new ratings per day.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="border-b border-border/30 bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 py-16 md:py-20">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              How It Works
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Three steps to informed viewing decisions
            </p>
          </div>

          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {[
              {
                icon: Search,
                step: "1",
                title: "Search",
                description:
                  "Look up any movie or show. If it isn't in our database yet, sign in to request an on-demand rating.",
              },
              {
                icon: Eye,
                step: "2",
                title: "See Ratings",
                description:
                  "See the overall score plus category-level themes like political messaging, sexuality, and overstimulation.",
              },
              {
                icon: CheckCircle2,
                step: "3",
                title: "Decide",
                description:
                  "Decide faster with simple labels from None to Core Theme and detailed notes when you need context.",
              },
            ].map((item) => (
              <div key={item.step} className="flex flex-col items-center text-center">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-foreground text-background">
                  <item.icon className="size-6" strokeWidth={1.8} />
                </div>
                <span className="mt-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Step {item.step}
                </span>
                <h3 className="mt-1.5 text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
              </div>
            ))}
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
              Every movie and show is rated across 8 categories on a 0–4
              severity scale. No surprises.
            </p>
          </div>

          <div className="mt-12">
            <LandingSampleCards />
          </div>
        </div>
      </section>

      {/* No Flags Showcase */}
      <section className="border-b border-border/30 bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 py-16 md:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1">
              <CheckCircle2
                className="size-3.5 text-emerald-600"
                strokeWidth={2.5}
              />
              <span className="text-xs font-semibold text-emerald-700 tracking-wide">
                No Flags
              </span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Find Content You Can Trust
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
              Titles with zero flags across all 8 categories.
              Pure entertainment — no disclaimers needed.
            </p>
          </div>

          <LandingNoFlagsPreview />

          <div className="mt-8 text-center">
            <Button variant="outline" asChild>
              <Link href="/browse/no-flags">
                Browse All No Flags Titles
                <ArrowRight className="ml-1.5 size-4" />
              </Link>
            </Button>
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
                  "Browse No Flags content",
                  "Filter by age range",
                  "3 on-demand ratings/day (with free account)",
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
                  Personalized ratings tailored to your family.
                </p>
              </div>
              <ul className="space-y-2.5">
                {[
                  "Everything in Free",
                  "Custom category weights",
                  "Personalized composite score",
                  "Advanced filters",
                  "Save to watchlist",
                  "10 on-demand ratings/day",
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
              <Button className="w-full" asChild>
                <Link href="/settings">Get Premium</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-foreground text-background">
        <div className="mx-auto max-w-7xl px-4 py-16 md:py-20 text-center">
          <Sparkles className="mx-auto size-8 opacity-60" />
          <h2 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
            Start Making Informed Decisions Today
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed opacity-70">
            Search thousands of rated titles with no account, then sign in when
            you want to request up to 3 new ratings per day.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <LandingAuthButtons />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-2.5 text-muted-foreground">
              <div className="flex size-8 items-center justify-center rounded-lg border border-border/50 bg-muted/40">
                <Image
                  src="/brand/howverydareyou-mark-192.png"
                  alt=""
                  width={24}
                  height={24}
                  className="size-6 rounded-md object-cover"
                />
              </div>
              <span className="text-sm font-medium">How Very Dare You</span>
            </div>
            <nav className="flex items-center gap-4">
              {["About", "Privacy", "Terms"].map((link) => (
                <Link
                  key={link}
                  href={`/${link.toLowerCase()}`}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {link}
                </Link>
              ))}
            </nav>
          </div>
          <div className="mt-6 space-y-2 text-center sm:text-left">
            <p className="text-[11px] leading-relaxed text-muted-foreground/60">
              Some streaming links may contain affiliate links. We may earn a
              small commission at no extra cost to you.
            </p>
            <p className="text-[11px] text-muted-foreground/50">
              &copy; {new Date().getFullYear()} How Very Dare You. All rights
              reserved. Ratings are AI-generated and should be used as a guide,
              not a definitive assessment.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
