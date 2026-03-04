import { Badge } from "@/components/ui/badge";
import { SEVERITY_LEVELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Film, Sparkles } from "lucide-react";

const PREVIEW_ROWS: Array<{ label: string; severity: 0 | 1 | 2 | 3 | 4 }> = [
  { label: "LGBT Themes", severity: 0 },
  { label: "Political Messaging", severity: 2 },
  { label: "Gender Role Commentary", severity: 1 },
  { label: "Overstimulation", severity: 2 },
];

export function LandingHeroAdvisoryPreview() {
  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
      <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-muted/40 px-2.5 py-1">
        <Sparkles className="size-3 text-muted-foreground" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Sample advisory output
        </span>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <Film className="size-4 text-muted-foreground" />
          <h2 className="text-base font-bold tracking-tight">
            Inside Out 2 <span className="font-medium text-muted-foreground">(2024)</span>
          </h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Overall advisory score: <span className="font-semibold text-foreground">1.6 / 4 (Notable)</span>
        </p>
      </div>

      <div className="mt-4 space-y-2">
        {PREVIEW_ROWS.map((row) => {
          const config = SEVERITY_LEVELS[row.severity];
          return (
            <div
              key={row.label}
              className="flex items-center justify-between gap-3 rounded-lg border border-border/40 bg-muted/20 px-3 py-2"
            >
              <span className="text-xs font-medium text-foreground">{row.label}</span>
              <Badge
                variant="outline"
                className={cn(
                  config.border,
                  config.color,
                  config.bg,
                  "px-2 py-0.5 text-[11px] font-semibold"
                )}
              >
                {config.label}
              </Badge>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
        Every rated title includes this 8-category breakdown, plus notes explaining
        why each category was scored.
      </p>
    </div>
  );
}
