import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "No Flags Content — Movies & TV Shows With No Cultural Themes",
  description:
    "Movies and TV shows with zero cultural or ideological content flags. Verified safe for all audiences by AI-powered content analysis.",
  alternates: {
    canonical: "/browse/no-flags",
  },
};

export default function NoFlagsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
