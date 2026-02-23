import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Browse Content Ratings",
  description:
    "Browse AI-powered content advisory ratings for movies and TV shows. Filter by content type, age rating, and cultural theme categories.",
  alternates: {
    canonical: "/browse",
  },
};

export default function BrowseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
