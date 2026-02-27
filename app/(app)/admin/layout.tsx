"use client";

import { useConvexAuth } from "convex/react";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { api } from "@/convex/_generated/api";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoading: authLoading, isAuthenticated } = useConvexAuth();
  const isAdmin = useQuery(
    api.admin.isCurrentUserAdmin,
    isAuthenticated ? {} : "skip"
  );
  const router = useRouter();

  const loading = authLoading || (isAuthenticated && isAdmin === undefined);

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated || !isAdmin) {
      router.replace("/");
    }
  }, [loading, isAuthenticated, isAdmin, router]);

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
