import type { MetadataRoute } from "next";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";

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
      url: `${baseUrl}/browse/no-flags`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
  ];

  // Dynamic title pages
  let titlePages: MetadataRoute.Sitemap = [];
  try {
    const titles = await fetchQuery(api.titles.browse, {
      status: "rated",
    });

    titlePages = titles.map((title: (typeof titles)[number]) => ({
      url: `${baseUrl}/title/${title._id}`,
      lastModified: title.ratedAt ? new Date(title.ratedAt) : new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }));
  } catch {
    // Sitemap generation should not fail the build
  }

  return [...staticPages, ...titlePages];
}
