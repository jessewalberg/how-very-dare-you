"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { SEVERITY_LEVELS } from "@/lib/constants";
import { toSeverityLevel } from "@/lib/scoring";

interface RatingBadgeProps {
  severity: number;
  compact?: boolean;
  showValue?: boolean;
  ariaLabel?: string;
}

export function RatingBadge({
  severity,
  compact = false,
  showValue = false,
  ariaLabel,
}: RatingBadgeProps) {
  const safeSeverity = Number.isFinite(severity) ? severity : 0;
  const normalizedSeverity = Math.min(4, Math.max(0, safeSeverity));
  const level = toSeverityLevel(normalizedSeverity);
  const config = SEVERITY_LEVELS[level];
  const severityValue = `${normalizedSeverity.toFixed(1)}/4`;
  const label = showValue ? `${config.label} (${severityValue})` : config.label;

  return (
    <Badge
      variant="outline"
      role="status"
      aria-label={ariaLabel ?? `Severity: ${label}`}
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
      {label}
    </Badge>
  );
}
