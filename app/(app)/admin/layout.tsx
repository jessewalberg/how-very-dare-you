"use client";

import { useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { api } from "@/convex/_generated/api";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoaded: clerkLoaded, isSignedIn } = useUser();
  const isAdmin = useQuery(api.admin.isCurrentUserAdmin);
  const router = useRouter();

  // undefined = query still loading, null = no auth token yet, false = not admin, true = admin
  const loading = !clerkLoaded || isAdmin === undefined || (isSignedIn && isAdmin === null);

  useEffect(() => {
    if (loading) return;
    if (!isSignedIn || isAdmin === false) {
      router.replace("/");
    }
  }, [loading, isSignedIn, isAdmin, router]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return <>{children}</>;
}
