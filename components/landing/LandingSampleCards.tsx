"use client";

import { RatingBreakdown } from "@/components/rating/RatingBreakdown";
import type { CategoryRatings } from "@/lib/scoring";

const SAMPLE_TITLES: {
  title: string;
  year: number;
  type: string;
  ageRating: string;
  genre: string;
  ratings: CategoryRatings;
  notes: string;
}[] = [
  {
    title: "Elemental",
    year: 2023,
    type: "Movie",
    ageRating: "PG",
    genre: "Animation · Family",
    ratings: {
      lgbtq: 0,
      climate: 1,
      racialIdentity: 3,
      genderRoles: 1,
      antiAuthority: 1,
      religious: 0,
      political: 2,
      sexuality: 0,
    },
    notes:
      "Racial identity / social justice is the strongest theme — the film is an extended allegory about immigration, assimilation, and prejudice between communities. Political messaging is woven into the same narrative. Other categories are minimal.",
  },
  {
    title: "Lightyear",
    year: 2022,
    type: "Movie",
    ageRating: "PG",
    genre: "Animation · Sci-Fi",
    ratings: {
      lgbtq: 2,
      climate: 0,
      racialIdentity: 0,
      genderRoles: 2,
      antiAuthority: 1,
      religious: 0,
      political: 0,
      sexuality: 0,
    },
    notes:
      'LGBT themes are notable — a same-sex couple with a kiss is part of the supporting story. Gender role commentary appears through the competent female commander trope. Anti-authority is brief with a "don\'t follow orders" subplot.',
  },
  {
    title: "Paw Patrol: The Movie",
    year: 2021,
    type: "Movie",
    ageRating: "G",
    genre: "Animation · Family",
    ratings: {
      lgbtq: 0,
      climate: 0,
      racialIdentity: 0,
      genderRoles: 0,
      antiAuthority: 1,
      religious: 0,
      political: 0,
      sexuality: 0,
    },
    notes:
      "Very clean content overall. The only minor flag is a brief anti-authority moment where the pups defy the mayor, played for light comedy. All other categories score zero.",
  },
];

export function LandingSampleCards() {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {SAMPLE_TITLES.map((sample) => (
        <div
          key={sample.title}
          className="rounded-2xl border bg-card p-5 space-y-4 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
        >
          {/* Title header */}
          <div>
            <h3 className="text-base font-bold leading-tight">
              {sample.title}
              <span className="ml-1 text-sm font-normal text-muted-foreground">
                ({sample.year})
              </span>
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {sample.type} · {sample.ageRating} · {sample.genre}
            </p>
          </div>

          {/* Rating breakdown */}
          <RatingBreakdown ratings={sample.ratings} notes={sample.notes} />
        </div>
      ))}
    </div>
  );
}
