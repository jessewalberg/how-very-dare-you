import {
  SEVERITY_LEVELS,
  DEFAULT_WEIGHTS,
  type CategoryKey,
  type SeverityLevel,
} from "./constants";

export interface CategoryRatings {
  lgbtq: number;
  climate: number;
  racialIdentity: number;
  genderRoles: number;
  antiAuthority: number;
  religious: number;
  political: number;
  sexuality: number;
  overstimulation?: number;
}

export interface CategoryWeights {
  lgbtq: number;
  climate: number;
  racialIdentity: number;
  genderRoles: number;
  antiAuthority: number;
  religious: number;
  political: number;
  sexuality: number;
  overstimulation: number;
}

export function toSeverityLevel(score: number): SeverityLevel {
  const safeScore = Number.isFinite(score) ? score : 0;
  return Math.round(Math.min(4, Math.max(0, safeScore))) as SeverityLevel;
}

/**
 * Composite = peak_weighted_score * 0.6 + average_weighted_scores * 0.4
 * Categories with weight 0 are excluded. Score is clamped to 0–4.
 * If overstimulation is undefined (not yet rated), it's excluded entirely.
 */
export function calculateCompositeScore(
  ratings: CategoryRatings,
  weights: CategoryWeights = DEFAULT_WEIGHTS
): number {
  const categories = Object.keys(ratings) as CategoryKey[];
  const active = categories.filter((cat) => {
    // Exclude overstimulation if it hasn't been rated yet
    if (cat === "overstimulation" && ratings.overstimulation === undefined) {
      return false;
    }
    return weights[cat] > 0;
  });

  if (active.length === 0) return 0;

  const weightedScores = active.map((cat) => {
    const normalizedWeight = weights[cat] / 10;
    return (ratings[cat as keyof CategoryRatings] as number) * normalizedWeight;
  });

  const peak = Math.max(...weightedScores);
  const avg =
    weightedScores.reduce((a, b) => a + b, 0) / weightedScores.length;

  const raw = peak * 0.6 + avg * 0.4;
  return Math.min(4, Math.max(0, Math.round(raw * 10) / 10));
}

/**
 * Returns true if all rated category scores are 0.
 * Overstimulation: undefined = ignored, 0 = passes, >0 = fails.
 */
export function isNoFlags(ratings: CategoryRatings): boolean {
  const { overstimulation, ...cultural } = ratings;
  const culturalClean = Object.values(cultural).every((v) => v === 0);
  if (!culturalClean) return false;
  // If overstimulation is undefined (not yet rated), don't count it against
  if (overstimulation === undefined) return true;
  return overstimulation === 0;
}

/** Maps a 0–4 score to a severity label (e.g. "Notable"). */
export function getSeverityLabel(score: number): string {
  const clamped = toSeverityLevel(score);
  return SEVERITY_LEVELS[clamped].label;
}

/** Maps a 0–4 score to the Tailwind text color class. */
export function getSeverityColor(score: number): string {
  const clamped = toSeverityLevel(score);
  return SEVERITY_LEVELS[clamped].color;
}
