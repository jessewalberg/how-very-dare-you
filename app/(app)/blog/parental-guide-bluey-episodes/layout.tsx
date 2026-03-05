import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bluey Parental Guide: Episode-Level Content Advisory Tips — How Very Dare You",
  description:
    "How to use episode-level advisories for Bluey so parents can make faster decisions with less guesswork.",
  alternates: { canonical: "/blog/parental-guide-bluey-episodes" },
};

export default function PostLayout({ children }: { children: React.ReactNode }) {
  return children;
}
