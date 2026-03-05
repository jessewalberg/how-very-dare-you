export const ADVISORY_FEEDBACK_SURFACES = [
  "title_detail",
  "title_card",
] as const;

export type AdvisoryFeedbackSurface =
  (typeof ADVISORY_FEEDBACK_SURFACES)[number];

export const ADVISORY_FEEDBACK_REASON_TAGS = [
  "unclear",
  "too_strict",
  "too_lenient",
  "missing_context",
] as const;

export type AdvisoryFeedbackReasonTag =
  (typeof ADVISORY_FEEDBACK_REASON_TAGS)[number];

export const ADVISORY_FEEDBACK_REASON_LABELS: Record<
  AdvisoryFeedbackReasonTag,
  string
> = {
  unclear: "Unclear explanation",
  too_strict: "Too strict",
  too_lenient: "Too lenient",
  missing_context: "Missing context",
};

export const MAX_ADVISORY_FEEDBACK_COMMENT_LENGTH = 600;

const reasonTagSet = new Set<string>(ADVISORY_FEEDBACK_REASON_TAGS);
const surfaceSet = new Set<string>(ADVISORY_FEEDBACK_SURFACES);

export function normalizeAdvisoryFeedbackReasonTag(
  value?: string | null
): AdvisoryFeedbackReasonTag | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  if (!reasonTagSet.has(normalized)) return undefined;
  return normalized as AdvisoryFeedbackReasonTag;
}

export function normalizeAdvisoryFeedbackSurface(
  value?: string | null
): AdvisoryFeedbackSurface {
  if (!value) return "title_detail";
  const normalized = value.trim().toLowerCase();
  if (!surfaceSet.has(normalized)) return "title_detail";
  return normalized as AdvisoryFeedbackSurface;
}

export function normalizeAdvisoryFeedbackComment(
  value?: string | null
): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed.length <= MAX_ADVISORY_FEEDBACK_COMMENT_LENGTH) {
    return trimmed;
  }
  return trimmed.slice(0, MAX_ADVISORY_FEEDBACK_COMMENT_LENGTH);
}

export function buildAdvisoryFeedbackEventProperties(args: {
  titleId: string;
  helpful: boolean;
  surface: AdvisoryFeedbackSurface;
  reasonTag?: AdvisoryFeedbackReasonTag;
  signedIn: boolean;
}) {
  return {
    title_id: args.titleId,
    helpful: args.helpful,
    surface: args.surface,
    reason_tag: args.reasonTag,
    signed_in: args.signedIn,
  };
}
