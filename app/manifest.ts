import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "How Very Dare You",
    short_name: "HVDY",
    description:
      "AI-powered content advisory ratings for movies and TV shows for parents.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0a0a0a",
    icons: [
      {
        src: "/brand/howverydareyou-mark-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/brand/howverydareyou-mark-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
