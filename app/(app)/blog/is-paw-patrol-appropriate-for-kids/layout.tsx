import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Is Paw Patrol Appropriate for Kids? Parent Advisory Guide — How Very Dare You",
  description:
    "A practical parent advisory guide for Paw Patrol with direct links to rated advisory pages and low-advisory alternatives.",
  alternates: { canonical: "/blog/is-paw-patrol-appropriate-for-kids" },
};

export default function PostLayout({ children }: { children: React.ReactNode }) {
  return children;
}
