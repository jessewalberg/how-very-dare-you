"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import {
  Crown,
  Check,
  CreditCard,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface SubscriptionCardProps {
  tier: "free" | "paid";
  subscriptionExpiresAt?: number;
}

const PREMIUM_FEATURES = [
  "Custom category weights",
  "Personalized composite score",
  "Advanced browse filters",
  "Save to watchlist",
  "10 on-demand ratings/day",
];

export function SubscriptionCard({
  tier,
  subscriptionExpiresAt,
}: SubscriptionCardProps) {
  const createCheckout = useAction(api.stripe.createCheckoutSession);
  const createPortal = useAction(api.stripe.createPortalSession);
  const [loading, setLoading] = useState(false);

  async function handleUpgrade() {
    setLoading(true);
    try {
      const url = await createCheckout();
      if (url) window.location.href = url;
    } catch {
      setLoading(false);
    }
  }

  async function handleManage() {
    setLoading(true);
    try {
      const url = await createPortal();
      if (url) window.location.href = url;
    } catch {
      setLoading(false);
    }
  }

  const nextBilling = subscriptionExpiresAt
    ? new Date(subscriptionExpiresAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold tracking-tight" id="subscription">
          Subscription
        </h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Manage your plan and billing.
        </p>
      </div>

      <div
        className={cn(
          "rounded-2xl border p-6 space-y-5",
          tier === "paid" ? "border-foreground/20" : "border-border"
        )}
      >
        {/* Plan badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className={cn(
                "flex size-10 items-center justify-center rounded-xl",
                tier === "paid"
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground"
              )}
            >
              <Crown className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold">
                  {tier === "paid" ? "Premium" : "Free"}
                </h3>
                <Badge
                  variant={tier === "paid" ? "default" : "secondary"}
                  className="text-[10px] px-1.5 py-0"
                >
                  {tier === "paid" ? "Active" : "Current Plan"}
                </Badge>
              </div>
              {tier === "paid" ? (
                <p className="text-xs text-muted-foreground">
                  $4.99/month
                  {nextBilling && ` · Next billing: ${nextBilling}`}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Free forever — upgrade anytime
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Feature list (show for free users as upsell) */}
        {tier === "free" && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Premium includes
            </p>
            <ul className="space-y-1.5">
              {PREMIUM_FEATURES.map((feature) => (
                <li
                  key={feature}
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <Check className="size-3.5 shrink-0 text-emerald-500" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action button */}
        {tier === "free" ? (
          <Button
            onClick={handleUpgrade}
            disabled={loading}
            className="w-full gap-1.5"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Crown className="size-4" />
            )}
            Upgrade to Premium — $4.99/mo
          </Button>
        ) : (
          <Button
            variant="outline"
            onClick={handleManage}
            disabled={loading}
            className="gap-1.5"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <CreditCard className="size-4" />
            )}
            Manage Subscription
            <ExternalLink className="size-3 text-muted-foreground" />
          </Button>
        )}
      </div>
    </div>
  );
}
