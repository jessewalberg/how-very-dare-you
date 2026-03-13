import { fetchQuery } from "convex/nextjs";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Breadcrumbs } from "@/components/navigation/Breadcrumbs";
import { TitleGrid } from "@/components/browse/TitleGrid";
import { Button } from "@/components/ui/button";
import {
  MOVIE_AGE_RATING_PAGES,
  type MovieAgeRatingPageSlug,
} from "@/lib/ageRatingBrowse";

interface AgeRatingBrowsePageProps {
  ratingSlug: MovieAgeRatingPageSlug;
}

export async function AgeRatingBrowsePage({
  ratingSlug,
}: AgeRatingBrowsePageProps) {
  const page = MOVIE_AGE_RATING_PAGES[ratingSlug];
  const siblingPages = Object.entries(MOVIE_AGE_RATING_PAGES).filter(
    ([slug]) => slug !== ratingSlug
  );
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://howverydareyou.com";
  const titles = await fetchQuery(api.titles.browse, {
    type: "movie",
    ageRating: page.rating,
    status: "rated",
    limit: 60,
  });

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: page.heading,
        description: page.description,
        url: `${baseUrl}${page.href}`,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: baseUrl,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Browse",
            item: `${baseUrl}/browse`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: "Movies",
            item: `${baseUrl}/browse/movies`,
          },
          {
            "@type": "ListItem",
            position: 4,
            name: `${page.label} Movies`,
            item: `${baseUrl}${page.href}`,
          },
        ],
      },
    ],
  };

  return (
    <div className="space-y-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Browse", href: "/browse" },
          { label: "Movies", href: "/browse/movies" },
          { label: `${page.label} Movies` },
        ]}
      />

      <section className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          <span>Age Rating</span>
          <span className="h-1 w-1 rounded-full bg-muted-foreground/50" />
          <span>{page.label}</span>
        </div>
        <div className="max-w-3xl space-y-3">
          <h1 className="text-3xl font-extrabold tracking-tight">{page.heading}</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {page.intro}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href="/browse/movies">
              Browse all movies
              <ArrowRight className="ml-1.5 size-4" />
            </Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/browse/low-scores">Low Advisory Picks</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/browse">All Filters</Link>
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {siblingPages.map(([slug, sibling]) => (
            <Button key={slug} variant="outline" size="sm" asChild>
              <Link href={sibling.href}>{sibling.label} movies</Link>
            </Button>
          ))}
        </div>
      </section>

      <TitleGrid
        titles={titles}
        emptyState={{
          title: `No ${page.label} movies available yet`,
          description:
            "We are still analyzing titles in this age-rating bucket. Check back soon for more advisories.",
          ctaLabel: "Browse all movies",
          ctaHref: "/browse/movies",
        }}
      />
    </div>
  );
}
