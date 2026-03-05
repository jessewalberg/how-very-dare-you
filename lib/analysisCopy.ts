export const SIGN_IN_DAILY_ANALYSIS_PROMPT =
  "Sign in to request up to 3 AI analyses per day.";
export const REQUEST_DAILY_ANALYSIS_SUFFIX =
  "to request up to 3 AI analyses per day.";

export function getEpisodeAnalysisActionLabel(isSignedIn: boolean): string {
  return isSignedIn ? "Request AI Analysis" : "Sign In to Request";
}

export function getTitleAnalysisActionLabel(canReAnalyze: boolean): string {
  return canReAnalyze ? "Re-Run AI Analysis" : "Request AI Analysis";
}

export function formatRemainingAnalyses(remaining: number, limit: number): string {
  return `${remaining} of ${limit} on-demand AI analyses remaining today`;
}

export function formatUsageResetCopy(
  used: number,
  limit: number,
  tier: "free" | "paid"
): string {
  if (tier === "free") {
    return `You've used ${used}/${limit} free analyses today. Resets at midnight.`;
  }
  return `You've used ${used}/${limit} analyses today. Resets at midnight.`;
}
