import Link from "next/link";
import { Shield } from "lucide-react";

const FOOTER_LINKS = [
  { href: "/about", label: "About" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
] as const;

export function Footer() {
  return (
    <footer className="border-t border-border/40 bg-muted/20">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          {/* Brand */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Shield className="size-4" strokeWidth={2} />
            <span className="text-sm font-medium">Woke Rater</span>
          </div>

          {/* Links */}
          <nav className="flex items-center gap-4">
            {FOOTER_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Affiliate disclosure + copyright */}
        <div className="mt-6 space-y-2 text-center sm:text-left">
          <p className="text-[11px] leading-relaxed text-muted-foreground/60">
            Some streaming links may contain affiliate links. We may earn a
            small commission at no extra cost to you.
          </p>
          <p className="text-[11px] text-muted-foreground/50">
            &copy; {new Date().getFullYear()} Woke Rater. All rights reserved.
            Ratings are AI-generated and should be used as a guide, not a
            definitive assessment.
          </p>
        </div>
      </div>
    </footer>
  );
}
