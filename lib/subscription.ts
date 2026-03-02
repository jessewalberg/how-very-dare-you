const PAID_SUBSCRIPTION_STATUSES = new Set(["active", "trialing", "past_due"]);

export function isPaidSubscriptionStatus(status: string | null | undefined) {
  if (!status) return false;
  return PAID_SUBSCRIPTION_STATUSES.has(status);
}
