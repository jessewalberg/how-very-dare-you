"use client";

import { ConvexReactClient } from "convex/react";
import { ClerkProvider, useAuth, useUser } from "@clerk/nextjs";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ReactNode, useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/** Ensures the signed-in user has a record in the Convex DB. */
function UserSync() {
  const { isSignedIn, user } = useUser();
  const getOrCreateUser = useMutation(api.users.getOrCreateUser);
  const synced = useRef(false);

  useEffect(() => {
    if (!isSignedIn || !user || synced.current) return;
    synced.current = true;

    getOrCreateUser({
      clerkId: user.id,
      email: user.primaryEmailAddress?.emailAddress,
      name: user.fullName ?? undefined,
    }).catch((err) => {
      console.error("Failed to sync user to Convex:", err);
      synced.current = false;
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
