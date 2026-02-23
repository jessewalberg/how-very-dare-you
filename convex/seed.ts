import { mutation } from "./_generated/server";

// ── Seed Data ────────────────────────────────────────────

const SEED_TITLES = [
  {
    tmdbId: 675445,
    imdbId: "tt11832046",
    title: "PAW Patrol: The Movie",
    type: "movie" as const,
    year: 2021,
    ageRating: "G",
    genre: "Animation, Action, Adventure, Comedy, Family",
    overview:
      "Ryder and the pups are called to Adventure City to stop Mayor Humdinger from turning the bustling metropolis into a state of chaos.",
    posterPath: "/ic0intvXZSfBlYPIvWXpU1ivUCO.jpg",
    runtime: 86,
    streamingProviders: [
      { name: "Paramount+" },
    ],
    ratings: {
      lgbtq: 0,
      climate: 0,
      racialIdentity: 0,
      genderRoles: 0,
      antiAuthority: 0,
      religious: 0,
      political: 0,
      sexuality: 0,
    },
    confidence: 0.85,
    notes:
      "No flags detected. Standard animated kids fare with a simple hero vs. villain rescue plot. No cultural or ideological messaging beyond generic teamwork themes.",
  },
  {
    tmdbId: 114718,
    imdbId: "tt12427840",
    title: "Cocomelon",
    type: "tv" as const,
    year: 2020,
    ageRating: "TV-Y",
    genre: "Animation, Kids",
    overview:
      "JJ and his family sing and dance their way through fun adventures, learning about letters, numbers, animals, colors, and more through catchy nursery rhymes.",
    posterPath: "/7gliOqwY7YwFAxrjfMVcryuvnW.jpg",
    runtime: 3,
    streamingProviders: [
      { name: "Netflix" },
    ],
    ratings: {
      lgbtq: 0,
      climate: 0,
      racialIdentity: 0,
      genderRoles: 0,
      antiAuthority: 0,
      religious: 0,
      political: 0,
      sexuality: 0,
    },
    confidence: 0.9,
    notes:
      "No flags detected. Simple nursery rhyme content for toddlers. No storylines, cultural messaging, or ideological themes of any kind.",
  },
  {
    tmdbId: 82728,
    imdbId: "tt7678620",
    title: "Bluey",
    type: "tv" as const,
    year: 2018,
    ageRating: "TV-Y",
    genre: "Animation, Comedy, Kids",
    overview:
      "An inexhaustible six-year-old Blue Heeler dog loves to play and turns everyday family life into extraordinary adventures.",
    posterPath: "/b9mY0X5T20ZM073hoa5n0dgmbfN.jpg",
    runtime: 7,
    streamingProviders: [
      { name: "Disney+" },
    ],
    ratings: {
      lgbtq: 0,
      climate: 0,
      racialIdentity: 0,
      genderRoles: 1,
      antiAuthority: 0,
      religious: 0,
      political: 0,
      sexuality: 0,
    },
    confidence: 0.85,
    notes:
      "Minimal flags. Bandit (the dad) is frequently shown as the primary caregiver and playmate, occasionally subverting traditional fatherhood expectations in a positive, organic way. Not a deliberate commentary — just a modern family dynamic.",
  },
  {
    tmdbId: 502356,
    imdbId: "tt6718170",
    title: "The Super Mario Bros. Movie",
    type: "movie" as const,
    year: 2023,
    ageRating: "PG",
    genre: "Animation, Adventure, Comedy, Family, Fantasy",
    overview:
      "While working underground to fix a water main, Brooklyn plumbers Mario and Luigi are transported down a mysterious pipe into a magical new world.",
    posterPath: "/qNBAXBIQlnOThrVvA6mA2B5ggV6.jpg",
    runtime: 93,
    streamingProviders: [
      { name: "Peacock" },
    ],
    ratings: {
      lgbtq: 0,
      climate: 0,
      racialIdentity: 0,
      genderRoles: 1,
      antiAuthority: 0,
      religious: 0,
      political: 0,
      sexuality: 0,
    },
    confidence: 0.9,
    notes:
      "Mostly clean. Princess Peach is portrayed as a competent warrior-leader rather than a damsel, which is a single brief gender-role subversion moment. Otherwise a straightforward video game adventure with no messaging.",
  },
  {
    tmdbId: 330457,
    imdbId: "tt4520988",
    title: "Frozen II",
    type: "movie" as const,
    year: 2019,
    ageRating: "PG",
    genre: "Animation, Adventure, Comedy, Family, Fantasy",
    overview:
      "Elsa, Anna, Kristoff and Olaf head far into the forest to learn the truth about an ancient mystery of their kingdom.",
    posterPath: "/mINJaa34MtknCYl5AjtNJzWj8cD.jpg",
    runtime: 103,
    streamingProviders: [
      { name: "Disney+" },
    ],
    ratings: {
      lgbtq: 0,
      climate: 2,
      racialIdentity: 0,
      genderRoles: 2,
      antiAuthority: 0,
      religious: 0,
      political: 0,
      sexuality: 0,
    },
    confidence: 0.9,
    notes:
      "Climate themes are notable — the enchanted forest subplot involves nature out of balance due to a past wrong against indigenous people, with nature's restoration as the resolution. Gender role commentary is also notable: Elsa's solo journey of self-discovery and Anna's leadership arc both consistently emphasize female empowerment throughout.",
  },
  {
    tmdbId: 718789,
    imdbId: "tt10298810",
    title: "Lightyear",
    type: "movie" as const,
    year: 2022,
    ageRating: "PG",
    genre: "Animation, Science Fiction, Family, Adventure",
    overview:
      "Legendary Space Ranger Buzz Lightyear embarks on an intergalactic adventure alongside a group of ambitious recruits and his robot companion Sox.",
    posterPath: "/b9t3w1loraDh7hjdWmpc9ZsaYns.jpg",
    runtime: 105,
    streamingProviders: [
      { name: "Disney+" },
    ],
    ratings: {
      lgbtq: 2,
      climate: 0,
      racialIdentity: 0,
      genderRoles: 0,
      antiAuthority: 0,
      religious: 0,
      political: 0,
      sexuality: 0,
    },
    confidence: 0.95,
    notes:
      "Buzz's commander Alisha Hawthorne is in a same-sex relationship shown through multiple scenes across a time-skip montage, including a brief kiss. The relationship is not a plot point but is clearly depicted with recurring screen time.",
  },
  {
    tmdbId: 877269,
    imdbId: "tt10298840",
    title: "Strange World",
    type: "movie" as const,
    year: 2022,
    ageRating: "PG",
    genre: "Animation, Family, Adventure, Science Fiction, Fantasy",
    overview:
      "A journey deep into an uncharted and treacherous land, where fantastical creatures await the legendary Clades — a family of explorers whose differences threaten to topple their latest mission.",
    posterPath: "/jXGMJUq9zcrScs02qkQuCtmWwaI.jpg",
    runtime: 102,
    streamingProviders: [
      { name: "Disney+" },
    ],
    ratings: {
      lgbtq: 3,
      climate: 3,
      racialIdentity: 0,
      genderRoles: 0,
      antiAuthority: 1,
      religious: 0,
      political: 2,
      sexuality: 0,
    },
    confidence: 0.95,
    notes:
      "Ethan Clade's same-sex crush is a meaningful subplot — he flirts with and clearly has romantic feelings for another boy, which his family acknowledges naturally. The central plot is an environmental allegory: the Clades' civilization depends on a resource that is harming the living world beneath them, with the resolution requiring them to abandon the resource. Political messaging overlaps with the environmental theme — industry vs. ecological responsibility.",
  },
  {
    tmdbId: 508947,
    imdbId: "tt8097030",
    title: "Turning Red",
    type: "movie" as const,
    year: 2022,
    ageRating: "PG",
    genre: "Animation, Family, Comedy, Fantasy",
    overview:
      "Thirteen-year-old Mei is experiencing the awkwardness of being a teenager with a twist — when she gets too excited, she transforms into a giant red panda.",
    posterPath: "/qsdjk9oAKSQMWs0Vt5Pyfh6O4GZ.jpg",
    runtime: 100,
    streamingProviders: [
      { name: "Disney+" },
    ],
    ratings: {
      lgbtq: 0,
      climate: 0,
      racialIdentity: 2,
      genderRoles: 2,
      antiAuthority: 1,
      religious: 1,
      political: 0,
      sexuality: 1,
    },
    confidence: 0.9,
    notes:
      "The Chinese-Canadian identity experience is explored in multiple scenes — Mei navigates between her traditional family expectations and her Canadian tween social life. Gender role commentary is notable: the film explicitly addresses puberty, female bodily autonomy, and mother-daughter generational expectations. The red panda transformation serves as a puberty metaphor. Mild religious sensitivity around the family's temple rituals.",
  },
  {
    tmdbId: 976573,
    imdbId: "tt15789038",
    title: "Elemental",
    type: "movie" as const,
    year: 2023,
    ageRating: "PG",
    genre: "Animation, Family, Fantasy, Comedy, Romance",
    overview:
      "In a city where fire, water, land and air residents live together, a fiery young woman and a go-with-the-flow guy discover something elemental: how much they have in common.",
    posterPath: "/4Y1WNkd88JXmGfhtWR7dmDAo1T2.jpg",
    runtime: 102,
    streamingProviders: [
      { name: "Disney+" },
    ],
    ratings: {
      lgbtq: 0,
      climate: 0,
      racialIdentity: 3,
      genderRoles: 0,
      antiAuthority: 1,
      religious: 0,
      political: 2,
      sexuality: 0,
    },
    confidence: 0.95,
    notes:
      "The entire film is an immigration allegory — Ember's fire-element family are immigrants facing prejudice, living in a segregated neighborhood, running an ethnic shop, navigating cultural identity. The romance between Ember (fire) and Wade (water) mirrors an interracial relationship that both families initially resist. Political messaging overlaps through housing discrimination and systemic barriers.",
  },
  {
    tmdbId: 1022796,
    imdbId: "tt11304740",
    title: "Wish",
    type: "movie" as const,
    year: 2023,
    ageRating: "PG",
    genre: "Animation, Family, Fantasy, Adventure",
    overview:
      "Asha, a sharp-witted idealist, makes a wish so powerful that it is answered by a cosmic force — a little ball of boundless energy called Star. Together, they confront the ruler of Rosas, King Magnifico.",
    posterPath: "/AcoVfiv1rrWOmAdpnAMnM56ki19.jpg",
    runtime: 95,
    streamingProviders: [
      { name: "Disney+" },
    ],
    ratings: {
      lgbtq: 0,
      climate: 0,
      racialIdentity: 0,
      genderRoles: 1,
      antiAuthority: 2,
      religious: 1,
      political: 2,
      sexuality: 0,
    },
    confidence: 0.85,
    notes:
      "Political messaging is notable — King Magnifico hoards the wishes of his citizens under the guise of protection, serving as a commentary on authoritarian control and collective action. Anti-authority themes run throughout as Asha rallies the populace against the king. The wish-granting magic system has mild religious overtones. Asha is a capable female lead but gender is not the narrative focus.",
  },
];

// ── Seed Mutation ────────────────────────────────────────

export const seedTitles = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if already seeded
    const existing = await ctx.db
      .query("titles")
      .withIndex("by_tmdbId", (q) => q.eq("tmdbId", 675445))
      .first();

    if (existing) {
      console.log("Database already seeded — skipping");
      return { seeded: 0, skipped: true };
    }

    let count = 0;
    for (const t of SEED_TITLES) {
      await ctx.db.insert("titles", {
        tmdbId: t.tmdbId,
        imdbId: t.imdbId,
        title: t.title,
        type: t.type,
        year: t.year,
        ageRating: t.ageRating,
        genre: t.genre,
        overview: t.overview,
        posterPath: t.posterPath,
        runtime: t.runtime,
        streamingProviders: t.streamingProviders.map((p) => ({ name: p.name })),
        ratings: t.ratings,
        ratingConfidence: t.confidence,
        ratingNotes: t.notes,
        ratingModel: "seed-data",
        ratedAt: Date.now(),
        status: "rated",
      });
      count++;
    }

    console.log(`Seeded ${count} titles`);
    return { seeded: count, skipped: false };
  },
});

// ── Seed Demo Users ──────────────────────────────────────

export const seedDemoUsers = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if already seeded
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", "demo_conservative_parent"))
      .first();

    if (existing) {
      console.log("Demo users already seeded — skipping");
      return { seeded: 0, skipped: true };
    }

    // Demo user 1: Conservative parent — high weight on LGBT, religious, sexuality
    await ctx.db.insert("users", {
      clerkId: "demo_conservative_parent",
      email: "demo-conservative@example.com",
      name: "Demo Conservative Parent",
      tier: "paid",
      categoryWeights: {
        lgbtq: 10,
        climate: 3,
        racialIdentity: 2,
        genderRoles: 6,
        antiAuthority: 5,
        religious: 9,
        political: 7,
        sexuality: 10,
      },
    });

    // Demo user 2: Progressive parent — cares mostly about sexuality, not cultural themes
    await ctx.db.insert("users", {
      clerkId: "demo_progressive_parent",
      email: "demo-progressive@example.com",
      name: "Demo Progressive Parent",
      tier: "paid",
      categoryWeights: {
        lgbtq: 0,
        climate: 0,
        racialIdentity: 0,
        genderRoles: 0,
        antiAuthority: 2,
        religious: 1,
        political: 0,
        sexuality: 8,
      },
    });

    // Demo user 3: Default weights — free tier
    await ctx.db.insert("users", {
      clerkId: "demo_default_user",
      email: "demo-default@example.com",
      name: "Demo Default User",
      tier: "free",
    });

    console.log("Seeded 3 demo users");
    return { seeded: 3, skipped: false };
  },
});

// ── Clear Seed Data ──────────────────────────────────────

export const clearSeedData = mutation({
  args: {},
  handler: async (ctx) => {
    let deleted = 0;

    // Delete seeded titles
    for (const t of SEED_TITLES) {
      const title = await ctx.db
        .query("titles")
        .withIndex("by_tmdbId", (q) => q.eq("tmdbId", t.tmdbId))
        .first();
      if (title) {
        await ctx.db.delete(title._id);
        deleted++;
      }
    }

    // Delete demo users
    for (const clerkId of [
      "demo_conservative_parent",
      "demo_progressive_parent",
      "demo_default_user",
    ]) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
        .first();
      if (user) {
        await ctx.db.delete(user._id);
        deleted++;
      }
    }

    console.log(`Cleared ${deleted} seed records`);
    return { deleted };
  },
});
