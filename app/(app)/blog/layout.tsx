import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog — How Very Dare You",
  description:
    "Content advisory insights, new release breakdowns, and parenting guides from How Very Dare You.",
  alternates: { canonical: "/blog" },
};

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
