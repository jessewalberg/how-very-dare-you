"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { SEVERITY_LEVELS, type SeverityLevel } from "@/lib/constants";

interface RatingBadgeProps {
  severity: SeverityLevel;
  compact?: boolean;
}

export function RatingBadge({ severity, compact = false }: RatingBadgeProps) {
  const config = SEVERITY_LEVELS[severity];

  return (
    <Badge
      variant="outline"
      role="status"
      aria-label={`Severity: ${config.label}`}
      className={cn(
        config.border,
        config.color,
        config.bg,
        "font-semibold tracking-tight transition-all duration-200",
        "hover:shadow-sm hover:scale-[1.04]",
        compact
          ? "text-[10px] leading-tight px-1.5 py-0"
          : "text-xs px-2.5 py-0.5"
      )}
    >
      {config.label}
    </Badge>
  );
}
