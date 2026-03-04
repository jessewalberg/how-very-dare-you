import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function BlogPostLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl py-4">
      <Link
        href="/blog"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-3.5" />
        All Posts
      </Link>
      <article className="prose-custom">{children}</article>
    </div>
  );
}
