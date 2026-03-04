import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Low Advisory Picks — Movies & TV Shows With Lower Concern Scores",
  description:
    "Browse low advisory picks for movies and TV shows. Titles in this list stay at or below brief concern levels across categories, with low overall composite scores.",
  alternates: {
    canonical: "/browse/low-scores",
  },
};

export default function LowScoresLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
