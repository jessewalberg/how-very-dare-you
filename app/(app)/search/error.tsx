"use client";

import { useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SearchError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-red-50">
        <AlertCircle className="size-6 text-red-600" />
      </div>
      <h1 className="mt-4 text-2xl font-bold tracking-tight">Search failed to load</h1>
      <p className="mt-1.5 max-w-md text-sm text-muted-foreground">
        Something went wrong. Please try again.
      </p>
      <Button className="mt-6" onClick={reset}>
        Retry
      </Button>
    </div>
  );
}
