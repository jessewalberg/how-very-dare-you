export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  category: "advisory" | "guide" | "update";
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "is-strange-world-appropriate-for-kids",
    title: "Is Strange World Appropriate for Kids? What Parents Should Know",
    description:
      "A parent-focused breakdown of Strange World with practical guidance on how to use category-level advisories before family movie night.",
    date: "2026-03-04",
    category: "advisory",
  },
  {
    slug: "movie-content-ratings-beyond-mpaa",
    title: "Movie Content Ratings Beyond MPAA: A Better Parent Guide",
    description:
      "Why MPAA labels alone are often too broad, and how category-level advisories help parents make faster decisions.",
    date: "2026-03-04",
    category: "guide",
  },
  {
    slug: "best-low-advisory-shows-for-younger-kids",
    title: "Best Low-Advisory Shows for Younger Kids (How to Build a Safe Rotation)",
    description:
      "How to use low-advisory lists and low-severity filters to build reliable watch rotations for younger viewers.",
    date: "2026-03-04",
    category: "advisory",
  },
  {
    slug: "how-ai-content-ratings-work",
    title: "How AI Content Ratings Work: Inside Our Analysis Process",
    description:
      "A deep dive into how How Very Dare You uses AI to analyze movies and TV shows across 8 cultural and ideological categories.",
    date: "2026-03-03",
    category: "guide",
  },
];

export function getPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}

const CATEGORY_LABELS: Record<BlogPost["category"], string> = {
  advisory: "Advisory",
  guide: "Guide",
  update: "Update",
};

export function getCategoryLabel(category: BlogPost["category"]): string {
  return CATEGORY_LABELS[category];
}
