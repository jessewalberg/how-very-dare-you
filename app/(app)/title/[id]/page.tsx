import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchQuery, preloadQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { calculateCompositeScore, getSeverityLabel } from "@/lib/scoring";
import { DEFAULT_WEIGHTS } from "@/lib/constants";
import { TitleDetail } from "@/components/title/TitleDetail";

export async function generateMetadata(props: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await props.params;

  let title;
  try {
    title = await fetchQuery(api.titles.getTitle, {
      titleId: id as Id<"titles">,
    });
  } catch {
    return { title: "Title Not Found | Woke Rater" };
  }

  if (!title) return { title: "Title Not Found | Woke Rater" };

  const hasRatings = title.ratings && title.status === "rated";
  const composite = hasRatings
    ? calculateCompositeScore(title.ratings!, DEFAULT_WEIGHTS)
    : null;
  const severity = composite !== null ? getSeverityLabel(composite) : "Pending";

  return {
    title: `${title.title} (${title.year}) - Content Advisory | Woke Rater`,
    description: `Content advisory for ${title.title}: ${severity} overall. See detailed breakdown of cultural and ideological themes for parents.`,
    openGraph: {
      title: `${title.title} - Parent Content Advisory`,
      description: title.ratingNotes || title.overview || "",
      images: title.posterPath
        ? [`https://image.tmdb.org/t/p/w500${title.posterPath}`]
        : [],
    },
  };
}

export default async function TitlePage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;

  let preloadedTitle;
  try {
    preloadedTitle = await preloadQuery(api.titles.getTitle, {
      titleId: id as Id<"titles">,
    });
  } catch {
    notFound();
  }

  return <TitleDetail preloadedTitle={preloadedTitle} />;
}
