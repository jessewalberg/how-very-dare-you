import type { Metadata } from "next";
import SearchPageClient from "./SearchPageClient";

export async function generateMetadata(props: {
  searchParams: Promise<{ q?: string }>;
}): Promise<Metadata> {
  const { q } = await props.searchParams;
  const query = q?.trim();

  if (query) {
    return {
      title: `"${query}" Content Advisory Search Results`,
      description: `Search results for "${query}". Find AI-powered content advisories and parental guides.`,
      robots: {
        index: false,
        follow: true,
      },
    };
  }

  return {
    title: "Search Content Advisories",
    description:
      "Search for any movie or TV show to see its AI-powered content advisory ratings.",
    robots: {
      index: false,
      follow: true,
    },
  };
}

export default function SearchPage() {
  return <SearchPageClient />;
}
