"use client";

import { useConvexConnectionState } from "convex/react";
import { WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

export function ConnectionBanner() {
  const connectionState = useConvexConnectionState();
  const reconnecting =
    connectionState.hasEverConnected && !connectionState.isWebSocketConnected;

  return (
    <div
      aria-live="polite"
      className={cn(
        "overflow-hidden transition-all duration-200",
        reconnecting ? "max-h-14 opacity-100" : "max-h-0 opacity-0"
      )}
    >
      {reconnecting && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">
          <div className="mx-auto flex max-w-7xl items-center gap-2">
            <WifiOff className="size-3.5 shrink-0" />
            Reconnecting...
          </div>
        </div>
      )}
    </div>
  );
}
