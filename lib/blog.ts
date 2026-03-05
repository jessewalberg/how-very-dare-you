interface BlogPostBase {
  slug: string;
  title: string;
  description: string;
  date: string;
}

interface AdvisoryBlogPost extends BlogPostBase {
  category: "advisory";
  linkedTitleSlug: string;
}

interface NonAdvisoryBlogPost extends BlogPostBase {
  category: "guide" | "update";
  linkedTitleSlug?: string;
}

export type BlogPost = AdvisoryBlogPost | NonAdvisoryBlogPost;

export function getLinkedTitlePath(post: BlogPost): string | undefined {
  return post.linkedTitleSlug ? `/title/${post.linkedTitleSlug}` : undefined;
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "is-paw-patrol-appropriate-for-kids",
    title: "Is Paw Patrol Appropriate for Kids? Parent Advisory Guide",
    description:
      "A practical parent advisory guide for Paw Patrol, including what to check in category-level content ratings before family viewing.",
    date: "2026-03-05",
    category: "advisory",
    linkedTitleSlug: "paw-patrol-2013",
  },
  {
    slug: "parental-guide-bluey-episodes",
    title: "Bluey Parental Guide: Episode-Level Advisory Tips for Parents",
    description:
      "How to use episode-level advisories for Bluey so parents can make faster decisions with less guesswork.",
    date: "2026-03-05",
    category: "advisory",
    linkedTitleSlug: "bluey-2018",
  },
  {
    slug: "best-low-advisory-movies-for-family-night",
    title: "Best Low-Advisory Movies for Family Night (Parent Workflow)",
    description:
      "A practical system for choosing low-advisory family movie night picks with category-level confidence.",
    date: "2026-03-05",
    category: "guide",
  },
  {
    slug: "is-strange-world-appropriate-for-kids",
    title: "Is Strange World Appropriate for Kids? What Parents Should Know",
    description:
      "A parent-focused breakdown of Strange World with practical guidance on how to use category-level advisories before family movie night.",
    date: "2026-03-04",
    category: "advisory",
    linkedTitleSlug: "strange-world-2022",
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
    category: "guide",
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
