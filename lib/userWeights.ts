import { DEFAULT_WEIGHTS, type CategoryKey } from "@/lib/constants";
import type { CategoryWeights } from "@/lib/scoring";

type Tier = "free" | "paid";

export interface WeightProfileLike {
  tier?: Tier | null;
  categoryWeights?: Partial<Record<CategoryKey, number>> | null;
}

const WEIGHT_KEYS = Object.keys(DEFAULT_WEIGHTS) as CategoryKey[];

export function normalizeCategoryWeights(
  weights?: Partial<Record<CategoryKey, number>> | null
): CategoryWeights {
  const normalized = { ...DEFAULT_WEIGHTS };

  if (!weights) {
    return normalized as CategoryWeights;
  }

  for (const key of WEIGHT_KEYS) {
    const value = weights[key];
    if (typeof value === "number") {
      normalized[key] = value;
    }
  }

  return normalized as CategoryWeights;
}

export function getEffectiveCategoryWeights(
  profile?: WeightProfileLike | null
): CategoryWeights {
  if (!profile || profile.tier !== "paid") {
    return { ...DEFAULT_WEIGHTS } as CategoryWeights;
  }

  return normalizeCategoryWeights(profile.categoryWeights);
}

export function serializeCategoryWeights(weights: CategoryWeights): string {
  return WEIGHT_KEYS.map((key) => `${key}:${weights[key]}`).join("|");
}

export function areCategoryWeightsEqual(
  a: CategoryWeights,
  b: CategoryWeights
): boolean {
  return WEIGHT_KEYS.every((key) => a[key] === b[key]);
}
