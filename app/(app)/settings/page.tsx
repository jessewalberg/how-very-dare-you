"use client";

import { Suspense, useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { useAction } from "convex/react";
import { useUser, RedirectToSignIn } from "@clerk/nextjs";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { WeightSlidersSkeleton } from "@/components/settings/WeightSlidersSkeleton";
import { SubscriptionCard } from "@/components/settings/SubscriptionCard";
import type { CategoryKey } from "@/lib/constants";

const WeightSliders = dynamic(
  () =>
    import("@/components/settings/WeightSliders").then((mod) => mod.WeightSliders),
  {
    loading: () => <WeightSlidersSkeleton />,
  }
);

export default function SettingsPage() {
  return (
    <Suspense fallback={<SettingsPageSkeleton />}>
      <SettingsPageContent />
    </Suspense>
  );
}

function SettingsPageSkeleton() {
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <Skeleton className="h-7 w-32" />
        <Skeleton className="mt-1 h-4 w-64" />
      </div>
      <WeightSlidersSkeleton />
      <Skeleton className="h-48 w-full rounded-2xl" />
    </div>
  );
}

function SettingsPageContent() {
  const { isSignedIn, isLoaded } = useUser();
  const profile = useQuery(api.users.getMyProfile);
  const syncMySubscriptionStatus = useAction(api.stripe.syncMySubscriptionStatus);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [syncingCheckout, setSyncingCheckout] = useState(false);
  const checkoutState = searchParams.get("checkout");

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    if (checkoutState === "cancelled") {
      toast.message("Checkout cancelled.");
      router.replace("/settings");
      return;
    }

    if (checkoutState !== "success") return;

    let cancelled = false;

    const sync = async () => {
      setSyncingCheckout(true);
      try {
        const result = await syncMySubscriptionStatus();
        if (cancelled) return;
        if (result.tier === "paid") {
          toast.success("Premium activated.");
        } else {
          toast.message("Checkout completed. Subscription is still syncing.");
        }
      } catch {
        if (!cancelled) {
          toast.error("Couldn't verify subscription yet. Please refresh shortly.");
        }
      } finally {
        if (!cancelled) {
          setSyncingCheckout(false);
          router.replace("/settings");
        }
      }
    };

    void sync();

    return () => {
      cancelled = true;
    };
  }, [checkoutState, isLoaded, isSignedIn, router, syncMySubscriptionStatus]);

  if (!isLoaded) {
    return <SettingsPageSkeleton />;
  }

  if (!isSignedIn) {
    return <RedirectToSignIn />;
  }

  if (profile === undefined) {
    return <SettingsPageSkeleton />;
  }

  const isPaid = profile?.tier === "paid";

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Customize your experience and manage your subscription.
        </p>
        {syncingCheckout && (
          <p className="mt-2 text-xs text-muted-foreground">
            Confirming your checkout and updating premium access...
          </p>
        )}
      </div>

      <WeightSliders
        isPaid={isPaid}
        currentWeights={
          profile?.categoryWeights as Record<CategoryKey, number> | undefined
        }
      />

      <Separator />

      <SubscriptionCard
        tier={profile?.tier ?? "free"}
        subscriptionExpiresAt={profile?.subscriptionExpiresAt ?? undefined}
      />
    </div>
  );
}
