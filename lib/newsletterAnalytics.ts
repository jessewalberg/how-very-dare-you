const MAX_FIELD_LENGTH = 120;

export interface NewsletterReplyPayload {
  campaign: string;
  weekStart: string;
  theme: string;
  count: number;
}

function normalizeTextField(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, MAX_FIELD_LENGTH);
}

function normalizeCount(value: unknown): number | null {
  const numeric =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseInt(value, 10)
        : NaN;
  if (!Number.isFinite(numeric)) return null;
  const rounded = Math.floor(numeric);
  if (rounded < 0) return null;
  return rounded;
}

function normalizeWeekStart(value: unknown): string {
  const raw = normalizeTextField(value);
  if (!raw) return "";
  const parsed = Date.parse(raw);
  if (Number.isNaN(parsed)) return "";
  return new Date(parsed).toISOString().slice(0, 10);
}

export function parseNewsletterReplyPayload(
  raw: unknown
): NewsletterReplyPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const input = raw as Record<string, unknown>;
  const campaign = normalizeTextField(input.campaign);
  const weekStart = normalizeWeekStart(input.weekStart);
  const theme = normalizeTextField(input.theme);
  const count = normalizeCount(input.count);

  if (!campaign || !weekStart || !theme || count === null) {
    return null;
  }

  return { campaign, weekStart, theme, count };
}

export function buildNewsletterReplyDistinctId(payload: NewsletterReplyPayload): string {
  return `newsletter:${payload.campaign}:${payload.weekStart}:${payload.theme}`;
}
