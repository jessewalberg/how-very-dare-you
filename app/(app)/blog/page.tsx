import Link from "next/link";
import { BLOG_POSTS, getCategoryLabel } from "@/lib/blog";

export default function BlogIndexPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 py-4">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Blog</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Content advisory insights, new release breakdowns, and parenting
          guides.
        </p>
      </div>

      {BLOG_POSTS.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No posts yet. Check back soon.
        </p>
      ) : (
        <div className="space-y-6">
          {BLOG_POSTS.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="block rounded-2xl border border-border/60 bg-card p-6 transition-all duration-200 hover:border-border hover:shadow-sm"
            >
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="rounded-full border border-border/50 bg-muted/40 px-2 py-0.5 font-semibold uppercase tracking-wider">
                  {getCategoryLabel(post.category)}
                </span>
                <time dateTime={post.date}>
                  {new Date(post.date).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </time>
              </div>
              <h2 className="mt-2 text-lg font-bold tracking-tight">
                {post.title}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {post.description}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
