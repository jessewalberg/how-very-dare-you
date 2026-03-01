"use client";

import { useQuery } from "convex/react";
import { useUser, RedirectToSignIn } from "@clerk/nextjs";
import dynamic from "next/dynamic";
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
  const { isSignedIn, isLoaded } = useUser();
  const profile = useQuery(api.users.getMyProfile);

  if (!isLoaded) {
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

  if (!isSignedIn) {
    return <RedirectToSignIn />;
  }

  if (profile === undefined) {
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

  const isPaid = profile?.tier === "paid";

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Customize your experience and manage your subscription.
        </p>
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
