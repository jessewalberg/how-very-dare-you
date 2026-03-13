import type { Metadata } from "next";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://howverydareyou.com";

export const metadata: Metadata = {
  title: "Corrections & Updates",
  description:
    "Track reviewed advisory corrections and updates so families can see how How Very Dare You responds to community feedback.",
  alternates: { canonical: "/corrections" },
  openGraph: {
    title: "Corrections & Updates | How Very Dare You",
    description:
      "Track reviewed advisory corrections and updates from the How Very Dare You community.",
    url: `${baseUrl}/corrections`,
  },
};

export default function CorrectionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
