export const CATEGORY_KEYS = [
  "lgbtq",
  "climate",
  "racialIdentity",
  "genderRoles",
  "antiAuthority",
  "religious",
  "political",
  "sexuality",
] as const;

export type CategoryKey = (typeof CATEGORY_KEYS)[number];

export interface CategoryEvidenceEntry {
  explanation: string;
  quote?: string;
}

export interface EpisodeFlag {
  season: number;
  episode: number;
  episodeTitle?: string;
  category: CategoryKey;
  severity: number;
  note: string;
}

export function isSeverityScore(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 4
  );
}

export function assertSeverityScore(value: unknown, label: string): asserts value is number {
  if (!isSeverityScore(value)) {
    throw new Error(`Invalid ${label}: ${String(value)}`);
  }
}

export function assertConfidence(
  value: unknown,
  label = "confidence"
): asserts value is number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(`Invalid ${label}: ${String(value)}`);
  }
}

export function assertCategoryRatings(
  ratings: unknown,
  label = "ratings"
): asserts ratings is Record<CategoryKey, number> {
  if (!ratings || typeof ratings !== "object") {
    throw new Error(`Missing ${label}`);
  }

  const typed = ratings as Record<string, unknown>;
  for (const key of CATEGORY_KEYS) {
    assertSeverityScore(typed[key], `${label}.${key}`);
  }
}

export function sanitizeCategoryEvidence(
  evidence: unknown,
  ratings?: Partial<Record<CategoryKey, number>>
): Partial<Record<CategoryKey, CategoryEvidenceEntry>> | undefined {
  if (!evidence || typeof evidence !== "object") return undefined;

  const out: Partial<Record<CategoryKey, CategoryEvidenceEntry>> = {};
  const input = evidence as Record<string, unknown>;

  for (const key of CATEGORY_KEYS) {
    const raw = input[key];
    if (!raw || typeof raw !== "object") continue;

    if (ratings && (ratings[key] ?? 0) <= 0) continue;

    const entry = raw as Record<string, unknown>;
    const explanation =
      typeof entry.explanation === "string" ? entry.explanation.trim() : "";
    if (!explanation) continue;

    const quote =
      typeof entry.quote === "string" && entry.quote.trim().length > 0
        ? entry.quote.trim()
        : undefined;

    out[key] = quote ? { explanation, quote } : { explanation };
  }

  return Object.keys(out).length > 0 ? out : undefined;
}

export function sanitizeEpisodeFlags(flags: unknown): EpisodeFlag[] | undefined {
  if (flags === undefined) return undefined;
  if (!Array.isArray(flags)) {
    throw new Error("episodeFlags must be an array");
  }

  const out: EpisodeFlag[] = [];
  for (const raw of flags) {
    if (!raw || typeof raw !== "object") {
      throw new Error("Invalid episode flag: expected object");
    }

    const flag = raw as Record<string, unknown>;
    if (
      typeof flag.season !== "number" ||
      !Number.isInteger(flag.season) ||
      flag.season < 0
    ) {
      throw new Error("Invalid episode flag season");
    }
    if (
      typeof flag.episode !== "number" ||
      !Number.isInteger(flag.episode) ||
      flag.episode < 1
    ) {
      throw new Error("Invalid episode flag episode");
    }

    if (typeof flag.category !== "string" || !CATEGORY_KEYS.includes(flag.category as CategoryKey)) {
      throw new Error(`Invalid episode flag category: ${String(flag.category)}`);
    }

    assertSeverityScore(flag.severity, "episode flag severity");

    const note = typeof flag.note === "string" ? flag.note.trim() : "";
    if (!note) {
      throw new Error("Invalid episode flag note");
    }

    const episodeTitle =
      typeof flag.episodeTitle === "string" && flag.episodeTitle.trim().length > 0
        ? flag.episodeTitle.trim()
        : undefined;

    out.push({
      season: flag.season,
      episode: flag.episode,
      episodeTitle,
      category: flag.category as CategoryKey,
      severity: flag.severity,
      note,
    });
  }

  return out.length > 0 ? out : undefined;
}
