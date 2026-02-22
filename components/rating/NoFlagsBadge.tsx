"use client";

import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface NoFlagsBadgeProps {
  compact?: boolean;
}

export function NoFlagsBadge({ compact = false }: NoFlagsBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "border-emerald-300 bg-emerald-100 text-emerald-800",
        "font-semibold tracking-tight",
        "hover:bg-emerald-100 hover:shadow-sm hover:shadow-emerald-200/50",
        "transition-all duration-200",
        compact
          ? "text-[10px] leading-tight px-1.5 py-0 gap-0.5"
          : "text-xs px-2.5 py-0.5 gap-1"
      )}
    >
      <CheckCircle2
        className={cn(compact ? "size-2.5" : "size-3")}
        strokeWidth={2.5}
      />
      No Flags
    </Badge>
  );
}
