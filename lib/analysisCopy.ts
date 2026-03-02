export const SIGN_IN_DAILY_ANALYSIS_PROMPT =
  "Sign in to request up to 3 AI analyses per day.";
export const REQUEST_DAILY_ANALYSIS_SUFFIX =
  "to request up to 3 AI analyses per day.";

export function getEpisodeAnalysisActionLabel(isSignedIn: boolean): string {
  return isSignedIn ? "Analyze Episode" : "Sign In to Analyze";
}

export function getTitleAnalysisActionLabel(canReAnalyze: boolean): string {
  return canReAnalyze ? "Re-Analyze Title" : "Analyze This Title";
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
