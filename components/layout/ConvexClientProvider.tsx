"use client";

import { ConvexReactClient } from "convex/react";
import { ClerkProvider, useAuth, useUser } from "@clerk/nextjs";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ReactNode, useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import posthog from "posthog-js";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/** Ensures the signed-in user has a record in the Convex DB. */
function UserSync() {
  const { isSignedIn, user } = useUser();
  const getOrCreateUser = useMutation(api.users.getOrCreateUser);
  const syncedForUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!isSignedIn || !user) {
      if (syncedForUserId.current !== null) {
        posthog.reset();
        syncedForUserId.current = null;
      }
      return;
    }

    if (syncedForUserId.current === user.id) return;
    syncedForUserId.current = user.id;

    // Identify the signed-in user in PostHog
    posthog.identify(user.id, {
      email: user.primaryEmailAddress?.emailAddress,
      name: user.fullName ?? undefined,
      clerk_id: user.id,
    });
    posthog.capture("user_signed_in", {
      clerk_id: user.id,
    });

    getOrCreateUser({
      clerkId: user.id,
      email: user.primaryEmailAddress?.emailAddress,
      name: user.fullName ?? undefined,
    }).catch((err) => {
      console.error("Failed to sync user to Convex:", err);
      syncedForUserId.current = null;
    });
  }, [isSignedIn, user, getOrCreateUser]);

  return null;
}

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <UserSync />
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
