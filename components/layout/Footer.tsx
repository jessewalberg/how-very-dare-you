import Link from "next/link";
import { BrandMark } from "@/components/layout/BrandMark";

const BROWSE_LINKS = [
  { href: "/browse", label: "All Titles" },
  { href: "/browse/low-scores", label: "Low Advisory Picks" },
  { href: "/browse?type=movie", label: "Movies" },
  { href: "/browse?type=tv", label: "TV Shows" },
] as const;

const COMPANY_LINKS = [
  { href: "/about", label: "About" },
  { href: "/blog", label: "Blog" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
] as const;

export function Footer() {
  return (
    <footer className="border-t border-border/40 bg-muted/20">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid gap-8 sm:grid-cols-3">
          {/* Brand */}
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <BrandMark size={36} />
              <span className="text-sm font-semibold text-foreground">
                How Very Dare You
              </span>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              AI-powered content advisories for movies and TV shows. Know what
              your kids are watching.
            </p>
          </div>

          {/* Browse */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Browse
            </h4>
            <nav className="mt-2 flex flex-col gap-1.5">
              {BROWSE_LINKS.map((link) => (
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

          {/* Company */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Company
            </h4>
            <nav className="mt-2 flex flex-col gap-1.5">
              {COMPANY_LINKS.map((link) => (
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
        </div>

        {/* Affiliate disclosure + copyright */}
        <div className="mt-8 space-y-2 border-t border-border/30 pt-6 text-center sm:text-left">
          <p className="text-[11px] leading-relaxed text-muted-foreground/60">
            Some streaming links may contain affiliate links. We may earn a
            small commission at no extra cost to you.
          </p>
          <p className="text-[11px] text-muted-foreground/50">
            &copy; {new Date().getFullYear()} How Very Dare You. All rights reserved.
            Ratings are AI-generated and should be used as a guide, not a
            definitive assessment.
          </p>
        </div>
      </div>
    </footer>
  );
}
