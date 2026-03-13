import type { Metadata } from "next";
import { BrowseHubPage } from "@/components/browse/BrowseHubPage";
import { BROWSE_HUBS } from "@/lib/browseHubs";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://howverydareyou.com";
const hub = BROWSE_HUBS.tv;

export const revalidate = 3600;

export const metadata: Metadata = {
  title: hub.pageTitle,
  description: hub.description,
  alternates: {
    canonical: hub.href,
  },
  openGraph: {
    title: `${hub.heading} | How Very Dare You`,
    description: hub.description,
    url: `${baseUrl}${hub.href}`,
  },
};

export default async function BrowseTvPage() {
  return <BrowseHubPage hubType="tv" />;
}
