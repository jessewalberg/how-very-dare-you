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
}

/**
 * Composite = peak_weighted_score * 0.6 + average_weighted_scores * 0.4
 * Categories with weight 0 are excluded. Score is clamped to 0–4.
 */
export function calculateCompositeScore(
  ratings: CategoryRatings,
  weights: CategoryWeights = DEFAULT_WEIGHTS
): number {
  const categories = Object.keys(ratings) as CategoryKey[];
  const active = categories.filter((cat) => weights[cat] > 0);

  if (active.length === 0) return 0;

  const weightedScores = active.map((cat) => {
    const normalizedWeight = weights[cat] / 10;
    return ratings[cat] * normalizedWeight;
  });

  const peak = Math.max(...weightedScores);
  const avg =
    weightedScores.reduce((a, b) => a + b, 0) / weightedScores.length;

  const raw = peak * 0.6 + avg * 0.4;
  return Math.min(4, Math.max(0, Math.round(raw * 10) / 10));
}

/** Returns true if all 8 raw category scores are 0. */
export function isNoFlags(ratings: CategoryRatings): boolean {
  return Object.values(ratings).every((v) => v === 0);
}

/** Maps a 0–4 score to a severity label (e.g. "Notable"). */
export function getSeverityLabel(score: number): string {
  const clamped = Math.round(Math.min(4, Math.max(0, score))) as SeverityLevel;
  return SEVERITY_LEVELS[clamped].label;
}

/** Maps a 0–4 score to the Tailwind text color class. */
export function getSeverityColor(score: number): string {
  const clamped = Math.round(Math.min(4, Math.max(0, score))) as SeverityLevel;
  return SEVERITY_LEVELS[clamped].color;
}
