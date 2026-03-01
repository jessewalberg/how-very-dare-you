"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TitlePageError({
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
      <h1 className="mt-4 text-2xl font-bold tracking-tight">
        Title details failed to load
      </h1>
      <p className="mt-1.5 max-w-md text-sm text-muted-foreground">
        Something went wrong. Please try again.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button onClick={reset}>Retry</Button>
        <Button variant="outline" asChild>
          <Link href="/browse">Back to Browse</Link>
        </Button>
      </div>
    </div>
  );
}
