import type { MetadataRoute } from "next";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { BLOG_POSTS } from "@/lib/blog";
import { resolveTitlePath } from "@/lib/titlePaths";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://howverydareyou.com";

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/browse`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/browse/movies`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.85,
    },
    {
      url: `${baseUrl}/browse/tv`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.85,
    },
    {
      url: `${baseUrl}/browse/low-scores`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/safe-movies-for-kids`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  // Dynamic title pages
  let titlePages: MetadataRoute.Sitemap = [];
  let episodePages: MetadataRoute.Sitemap = [];
  try {
    const titles = await fetchQuery(api.titles.browse, {
      status: "rated",
    });

    titlePages = titles
      .map((title: (typeof titles)[number]) => ({
        url: `${baseUrl}/title/${resolveTitlePath(
          String(title._id),
          title.slug,
          title.title,
          title.year
        )}`,
        lastModified: title.ratedAt ? new Date(title.ratedAt) : new Date(),
        changeFrequency: "monthly" as const,
        priority: 0.7,
      }));

    const episodes = await fetchQuery(api.episodes.listRatedForSeo, {});
    episodePages = episodes
      .map((episode: (typeof episodes)[number]) => ({
        url: `${baseUrl}/title/${resolveTitlePath(
          episode.titleId,
          episode.titleSlug,
          episode.titleName,
          episode.titleYear
        )}/season/${episode.seasonNumber}/episode/${episode.episodeNumber}`,
        lastModified: episode.ratedAt ? new Date(episode.ratedAt) : new Date(),
        changeFrequency: "monthly" as const,
        priority: 0.6,
      }));
  } catch {
    // Sitemap generation should not fail the build
  }

  // Blog posts
  const blogPages: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    ...BLOG_POSTS.map((post) => ({
      url: `${baseUrl}/blog/${post.slug}`,
      lastModified: new Date(post.date),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];

  return [...staticPages, ...blogPages, ...titlePages, ...episodePages];
}
