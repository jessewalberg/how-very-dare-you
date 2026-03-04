import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Safe Movies for Kids — Low Advisory Picks | How Very Dare You",
  description:
    "Find safe movies and TV shows for kids with low advisory scores across tracked categories. AI-powered family-friendly picks with transparent category breakdowns.",
  keywords: [
    "safe movies for kids",
    "family friendly low concern movies",
    "safe TV shows for children",
    "kid safe movies",
    "low advisory movies",
    "clean movies for families",
    "appropriate movies for kids",
  ],
  alternates: { canonical: "/safe-movies-for-kids" },
};

export default function SafeMoviesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
