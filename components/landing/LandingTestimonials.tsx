import { Quote } from "lucide-react";

const TESTIMONIALS = [
  {
    quote:
      "I can finally check a title in under a minute instead of reading three different parent forums.",
    byline: "Parent of two (ages 6 and 9)",
  },
  {
    quote:
      "The category breakdown is what we were missing. A single PG label never told us enough.",
    byline: "Parent of three (ages 4, 8, and 11)",
  },
  {
    quote:
      "Low Advisory picks have become our default movie-night list when we need something low-friction and safe.",
    byline: "Homeschool family, two kids",
  },
];

export function LandingTestimonials() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
          What Parents Are Saying
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Early feedback from families using How Very Dare You weekly.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {TESTIMONIALS.map((item) => (
          <blockquote
            key={item.quote}
            className="rounded-2xl border border-border/60 bg-card p-5"
          >
            <Quote className="size-4 text-muted-foreground/50" />
            <p className="mt-3 text-sm leading-relaxed text-foreground">
              “{item.quote}”
            </p>
            <footer className="mt-3 text-xs font-medium text-muted-foreground">
              {item.byline}
            </footer>
          </blockquote>
        ))}
      </div>
    </div>
  );
}
