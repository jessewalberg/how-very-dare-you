import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Best Low-Advisory Movies for Family Night — Parent Picks — How Very Dare You",
  description:
    "A practical system for choosing low-advisory family movie night picks with category-level confidence.",
  alternates: { canonical: "/blog/best-low-advisory-movies-for-family-night" },
};

export default function PostLayout({ children }: { children: React.ReactNode }) {
  return children;
}
