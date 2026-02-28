import type { Doc } from "../_generated/dataModel";

const DEMO_CLERK_IDS = new Set([
  "demo_conservative_parent",
  "demo_progressive_parent",
  "demo_default_user",
]);

export type SeedTitleReason =
  | "rating_model_seed_data"
  | "video_analysis_seed_marker";

export function getSeedTitleReasons(title: Doc<"titles">): SeedTitleReason[] {
  const reasons: SeedTitleReason[] = [];

  if (title.ratingModel === "seed-data") {
    reasons.push("rating_model_seed_data");
  }

  if (title.videoAnalysis?.youtubeVideoId?.startsWith("seed-")) {
    reasons.push("video_analysis_seed_marker");
  }

  return reasons;
}

export function isSeedTitle(title: Doc<"titles">): boolean {
  return getSeedTitleReasons(title).length > 0;
}

export function isDemoUser(user: Doc<"users">): boolean {
  return DEMO_CLERK_IDS.has(user.clerkId);
}
