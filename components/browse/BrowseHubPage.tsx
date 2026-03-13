import { fetchQuery } from "convex/nextjs";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { BROWSE_HUBS, type BrowseHubType } from "@/lib/browseHubs";
import { Breadcrumbs } from "@/components/navigation/Breadcrumbs";
import { TitleGrid } from "@/components/browse/TitleGrid";
import { Button } from "@/components/ui/button";

interface BrowseHubPageProps {
  hubType: BrowseHubType;
}

export async function BrowseHubPage({ hubType }: BrowseHubPageProps) {
  const hub = BROWSE_HUBS[hubType];
  const siblingHub = hubType === "movie" ? BROWSE_HUBS.tv : BROWSE_HUBS.movie;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://howverydareyou.com";
  const titles = await fetchQuery(api.titles.browse, {
    type: hubType,
    status: "rated",
    limit: 60,
  });

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: hub.heading,
        description: hub.description,
        url: `${baseUrl}${hub.href}`,
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
            name: hub.label,
            item: `${baseUrl}${hub.href}`,
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
          { label: hub.label },
        ]}
      />

      <section className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          <span>Browse Hub</span>
          <span className="h-1 w-1 rounded-full bg-muted-foreground/50" />
          <span>{hub.label}</span>
        </div>
        <div className="max-w-3xl space-y-3">
          <h1 className="text-3xl font-extrabold tracking-tight">{hub.heading}</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {hub.intro}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href={siblingHub.href}>
              Browse {siblingHub.label}
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
      </section>

      <TitleGrid
        titles={titles}
        emptyState={{
          title: `No ${hub.label.toLowerCase()} available yet`,
          description:
            "We are still analyzing this section. Check back soon for more advisories.",
          ctaLabel: "Browse all titles",
          ctaHref: "/browse",
        }}
      />
    </div>
  );
}
