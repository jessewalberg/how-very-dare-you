import type { Metadata } from "next";
import Link from "next/link";
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
import { LandingSearch } from "@/components/landing/LandingSearch";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const HOME_JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      name: "How Very Dare You",
      url: process.env.NEXT_PUBLIC_APP_URL ?? "https://howverydareyou.com",
      description:
        "AI-powered content advisory ratings for movies and TV shows. Cultural and ideological theme breakdowns for parents.",
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://howverydareyou.com"}/search?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "Organization",
      name: "How Very Dare You",
      url: process.env.NEXT_PUBLIC_APP_URL ?? "https://howverydareyou.com",
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
              AI-powered ratings across 8 cultural and ideological categories.
              See detailed breakdowns, find clean content, and make confident
              decisions for your family.
            </p>

            {/* Search bar */}
            <div className="mx-auto mt-8 max-w-lg">
              <LandingSearch />
            </div>

            <p className="mt-3 text-xs text-muted-foreground/60">
              Search any movie or TV show — free, no account required
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
                  "Look up any movie or TV show. If it's not in our database, we'll rate it on the spot.",
              },
              {
                icon: Eye,
                step: "2",
                title: "See Ratings",
                description:
                  "Get a detailed breakdown across 8 categories — from LGBT themes to age-inappropriate content.",
              },
              {
                icon: CheckCircle2,
                step: "3",
                title: "Decide",
                description:
                  "Make confident choices for your family with clear, at-a-glance severity ratings.",
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

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: "Paddington 2",
                year: 2017,
                type: "Movie",
                ageRating: "PG",
                genre: "Family · Comedy",
              },
              {
                title: "Bluey",
                year: 2018,
                type: "TV Show",
                ageRating: "TV-Y",
                genre: "Animation · Family",
              },
              {
                title: "The Mitchells vs the Machines",
                year: 2021,
                type: "Movie",
                ageRating: "PG",
                genre: "Animation · Comedy",
              },
              {
                title: "Shaun the Sheep",
                year: 2007,
                type: "TV Show",
                ageRating: "TV-Y",
                genre: "Animation · Comedy",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="group flex items-center gap-3 rounded-xl border border-emerald-200/60 bg-emerald-50/30 p-3 transition-all duration-200 hover:border-emerald-300/80 hover:shadow-sm"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                  <CheckCircle2 className="size-5" strokeWidth={2} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-tight truncate">
                    {item.title}
                    <span className="ml-1 font-normal text-muted-foreground">
                      ({item.year})
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.type} · {item.ageRating} · {item.genre}
                  </p>
                </div>
              </div>
            ))}
          </div>

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
                  "3 on-demand ratings/day",
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
                <Link href="/sign-up">Get Premium</Link>
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
            Search thousands of rated titles or request a rating for any movie
            or show — completely free.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Button
              size="lg"
              variant="secondary"
              className="min-w-[160px]"
              asChild
            >
              <Link href="/browse">Browse Titles</Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="min-w-[160px] border-background/20 text-background hover:bg-background/10 hover:text-background"
              asChild
            >
              <Link href="/sign-up">Create Account</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Shield className="size-4" strokeWidth={2} />
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
