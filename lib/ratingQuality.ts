export type SubtitleStatus = "success" | "failed" | "skipped" | "timeout";

export interface SubtitleInfoLike {
  status?: SubtitleStatus;
  dialogueLines?: number;
  transcriptStorage?: unknown;
}

export type QualitySeverity = "none" | "warning" | "critical";

export interface RatingQualityAssessment {
  needsReview: boolean;
  severity: QualitySeverity;
  reasonCodes: string[];
  reasons: string[];
}

const REVIEW_CONFIDENCE_THRESHOLD = 0.7;
const CRITICAL_CONFIDENCE_THRESHOLD = 0.5;
const MIN_DIALOGUE_LINES = 40;

function severityRank(severity: QualitySeverity): number {
  if (severity === "critical") return 2;
  if (severity === "warning") return 1;
  return 0;
}

function maxSeverity(a: QualitySeverity, b: QualitySeverity): QualitySeverity {
  return severityRank(a) >= severityRank(b) ? a : b;
}

export function assessRatingQuality(args: {
  confidence?: number;
  subtitleInfo?: SubtitleInfoLike;
}): RatingQualityAssessment {
  let severity: QualitySeverity = "none";
  const reasonCodes: string[] = [];
  const reasons: string[] = [];

  const confidence = args.confidence;
  const subtitleStatus = args.subtitleInfo?.status;
  const dialogueLines = args.subtitleInfo?.dialogueLines;

  if (confidence == null) {
    severity = maxSeverity(severity, "warning");
    reasonCodes.push("missing_confidence");
    reasons.push("Model confidence is missing.");
  } else if (confidence < CRITICAL_CONFIDENCE_THRESHOLD) {
    severity = maxSeverity(severity, "critical");
    reasonCodes.push("critical_low_confidence");
    reasons.push(
      `Very low confidence (${Math.round(confidence * 100)}%).`
    );
  } else if (confidence < REVIEW_CONFIDENCE_THRESHOLD) {
    severity = maxSeverity(severity, "warning");
    reasonCodes.push("low_confidence");
    reasons.push(`Low confidence (${Math.round(confidence * 100)}%).`);
  }

  if (!subtitleStatus) {
    severity = maxSeverity(severity, "warning");
    reasonCodes.push("missing_subtitle_source");
    reasons.push("No subtitle/script source was captured.");
  } else if (subtitleStatus !== "success") {
    severity = maxSeverity(severity, "warning");
    reasonCodes.push(`subtitle_${subtitleStatus}`);
    reasons.push(
      subtitleStatus === "failed"
        ? "Subtitle/script fetch failed."
        : subtitleStatus === "timeout"
          ? "Subtitle/script fetch timed out."
          : "Subtitle/script fetch was skipped."
    );
  }

  if (subtitleStatus === "success" && !args.subtitleInfo?.transcriptStorage) {
    severity = maxSeverity(severity, "warning");
    reasonCodes.push("subtitle_not_archived");
    reasons.push("Subtitle text was used but not archived to R2.");
  }

  if (
    subtitleStatus === "success" &&
    typeof dialogueLines === "number" &&
    dialogueLines > 0 &&
    dialogueLines < MIN_DIALOGUE_LINES
  ) {
    severity = maxSeverity(severity, "warning");
    reasonCodes.push("short_dialogue_sample");
    reasons.push(`Very short dialogue sample (${dialogueLines} lines).`);
  }

  if (
    confidence != null &&
    confidence < REVIEW_CONFIDENCE_THRESHOLD &&
    subtitleStatus !== "success"
  ) {
    severity = maxSeverity(severity, "critical");
    reasonCodes.push("low_confidence_without_transcript");
    reasons.push("Low confidence combined with missing transcript evidence.");
  }

  return {
    needsReview: severity !== "none",
    severity,
    reasonCodes,
    reasons,
  };
}
