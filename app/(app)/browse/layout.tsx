import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Browse Content Advisories for Movies & TV Shows",
  description:
    "Browse AI-powered content advisory ratings. Filter by content type, age rating, streaming service, and cultural theme categories. Find safe movies and shows for your family.",
  alternates: {
    canonical: "/browse",
  },
  openGraph: {
    title: "Browse Content Advisories | How Very Dare You",
    description:
      "Filter and browse content advisories for movies and TV shows by age rating, streaming service, and theme categories.",
  },
};

export default function BrowseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
