import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Low Advisory Picks",
  description: "Redirecting to low advisory picks.",
  alternates: {
    canonical: "/browse/low-scores",
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function NoFlagsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
