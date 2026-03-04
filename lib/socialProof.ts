export const MIN_PARENT_SIGNUPS = 105;

export function getDisplayParentSignupCount(userCount?: number | null): number {
  return Math.max(userCount ?? 0, MIN_PARENT_SIGNUPS);
}

export function formatDisplayParentSignupCount(userCount?: number | null): string {
  return `${getDisplayParentSignupCount(userCount)}+`;
}
