# Project Design System — Content Advisory Platform

## Relationship to Official Claude Frontend-Design Skill

This file is NOT the official Claude frontend-design skill. The official skill lives at `/mnt/skills/public/frontend-design/SKILL.md` and should be read FIRST for general design philosophy (bold aesthetics, typography choices, avoiding generic AI look).

This file defines the **project-specific** design system: severity colors, component wireframes, typography choices, and layout rules for this particular product. Use both together — the official skill for *how to design well*, this file for *what this product should look like*.

## Design Direction

This is a **parental content advisory tool**. The design should feel: trustworthy, clean, fast to scan, and serious without being cold. Parents are making decisions for their kids — the UI should respect their time and give them confidence.

**Tone:** Professional utility. Think "Consumer Reports for kids content" — not a culture war product, not a kids' app. Clean, neutral, informative.

**Anti-patterns to avoid:**
- Political/culture-war aesthetics (red/blue, aggressive, us-vs-them)
- Kids' app aesthetics (bubbly, cartoonish, rainbow)
- Generic SaaS dashboard (bland, corporate)

**Aspirational references:**
- Common Sense Media's clean layout (but with better at-a-glance scoring)
- Letterboxd's card-based browse (but for parents, not cinephiles)
- Apple's Health app severity coloring (green → red gradient)

---

## Color System

### Severity Scale (Most Important — Must Be Instant to Read)

```css
/* These colors are the core visual language of the product */
--severity-0: #10b981; /* emerald-500 — None */
--severity-1: #84cc16; /* lime-500 — Brief */
--severity-2: #f59e0b; /* amber-500 — Notable */
--severity-3: #f97316; /* orange-500 — Significant */
--severity-4: #ef4444; /* red-500 — Core Theme */

/* Background variants for badges */
--severity-0-bg: #ecfdf5; /* emerald-50 */
--severity-1-bg: #f7fee7; /* lime-50 */
--severity-2-bg: #fffbeb; /* amber-50 */
--severity-3-bg: #fff7ed; /* orange-50 */
--severity-4-bg: #fef2f2; /* red-50 */
```

### Brand Colors

Choose during implementation. Recommendations:
- **Option A:** Deep navy (#1e293b) + emerald accent — feels trustworthy, institutional
- **Option B:** Warm gray (#44403c) + sage green — feels calm, family-oriented
- **Option C:** Slate (#334155) + teal accent — feels modern, clean

### No Flags Badge

```css
/* Special treatment — this is the hero element */
--no-flags-bg: #d1fae5;    /* emerald-100 */
--no-flags-text: #065f46;  /* emerald-800 */
--no-flags-border: #6ee7b7; /* emerald-300 */
```

---

## Typography

### Font Recommendations

- **Headings:** "Plus Jakarta Sans" (Google Fonts) — geometric, modern, friendly without being childish
- **Body:** "Inter" or system font stack — maximum readability at small sizes
- **Monospace (scores):** "JetBrains Mono" or "Tabular Nums" — for rating numbers to align

```css
/* Tailwind config */
fontFamily: {
  sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
  mono: ['JetBrains Mono', 'monospace'],
}
```

---

## Key UI Components

### 1. Title Card (Browse/Search Results)

The most-seen component. Must communicate max info in min space.

```
┌──────────────────────────────────┐
│  ┌──────┐                        │
│  │      │  Title (2023)    PG    │
│  │poster│  Movie · Animation     │
│  │      │                        │
│  │      │  ██ 2.4  or  ✓ No Flags│
│  └──────┘                        │
│  Netflix · Disney+ · Prime       │
└──────────────────────────────────┘

The composite score bar:
- Horizontal bar, colored by severity (green → red gradient)
- Number displayed prominently
- OR "No Flags" badge if all zeros (this is the hero state)
```

**Design principles:**
- Poster image dominates (visual recognition)
- Composite score or No Flags badge visible without hovering
- Streaming availability shown as small icons
- Click → detail page

### 2. Rating Breakdown (Detail Page)

The core informational display. 8 categories, each with severity badge.

```
┌─────────────────────────────────────────┐
│  Content Advisory                        │
│                                          │
│  Overall: ██████░░░░ 2.4 Notable        │
│                                          │
│  LGBT Themes          [None]             │
│  Climate Messaging    [Notable]          │
│  Racial Identity      [Brief]           │
│  Gender Roles         [Significant]      │
│  Anti-Authority       [Notable]          │
│  Religious Sensitivity [None]            │
│  Political Messaging  [Brief]            │
│  Sexuality            [None]             │
│                                          │
│  AI Notes: "Gender role commentary is    │
│  the strongest theme, with the female    │
│  lead's arc explicitly challenging..."   │
└─────────────────────────────────────────┘
```

**Design principles:**
- Each row = category label (left) + severity badge (right)
- Badges use severity colors (instant visual scanning)
- Categories with "None" should be visually quieter (lower opacity or gray)
- Categories with high scores should draw the eye
- Notes section below in a subtle callout box

### 3. Composite Score Display

```
┌──────────┐
│          │
│   2.4    │  ← Large number, colored by severity
│ Notable  │  ← Label below
│          │
└──────────┘

- Circle or rounded rectangle
- Background tinted by severity color
- Compact variant for cards: just the number + small bar
```

### 4. Filter Sidebar (Browse Page)

```
┌──────────────────────┐
│  Filters              │
│                       │
│  Content Type         │
│  ○ All  ○ Movies  ○ TV│
│                       │
│  Age Range            │
│  [G] [PG] [PG-13] [R]│
│                       │
│  Streaming Service    │
│  ☑ Netflix  ☑ Disney+ │
│  ☑ Prime   ☑ Hulu    │
│                       │
│  Max Severity ──────  │
│  (per category)       │
│                       │
│  LGBT:     [None ▼]   │
│  Climate:  [Any  ▼]   │
│  Gender:   [Brief ▼]  │
│  ...                  │
│                       │
│  [Show No Flags Only] │
└──────────────────────┘

- On desktop: fixed left sidebar
- On mobile: Sheet (slide-in from left)
- Category threshold filters are PAID feature → show lock icon for free users
```

### 5. Rating Loading State (On-Demand)

When AI is rating a title in real-time:

```
┌─────────────────────────────────────────┐
│  ┌──────┐                                │
│  │      │  Strange World (2022)          │
│  │poster│  Movie · Animation · PG        │
│  │      │                                │
│  └──────┘  Analyzing content...          │
│                                          │
│  ┌─ Generating Rating ────────────────┐  │
│  │  ░░░░░░░░░░░░░░░░░░░░ 45%        │  │
│  │                                    │  │
│  │  LGBT Themes          [  ···  ]    │  │
│  │  Climate Messaging    [  ···  ]    │  │
│  │  Racial Identity      [  ···  ]    │  │
│  │  Gender Roles         [  ···  ]    │  │
│  │  Anti-Authority       [  ···  ]    │  │
│  │  Religious Sensitivity [  ···  ]   │  │
│  │  Political Messaging  [  ···  ]    │  │
│  │  Sexuality            [  ···  ]    │  │
│  └────────────────────────────────────┘  │
└─────────────────────────────────────────┘

- Show metadata immediately (poster, title, year, age rating)
- Animate a progress bar or pulse animation
- Each category row shows skeleton/dots
- When rating comes in, badges animate in one by one (staggered)
```

### 6. Weight Customization (Paid Feature)

```
┌─────────────────────────────────────────┐
│  Customize Your Priorities               │
│                                          │
│  Drag sliders to set how much each       │
│  category affects your composite score.  │
│  Set to 0 to ignore a category.          │
│                                          │
│  LGBT Themes                             │
│  ○──────────●──── 7/10                   │
│                                          │
│  Climate Messaging                       │
│  ○────●────────── 3/10                   │
│                                          │
│  ...                                     │
│                                          │
│  Preview: "Frozen II" would score 1.8    │
│  instead of 2.4 with your weights        │
│                                          │
│  [Save Preferences]                      │
└─────────────────────────────────────────┘

- shadcn Slider components
- Live preview showing how weights change a known title's score
- Accessible — keyboard navigation for sliders
```

---

## Responsive Breakpoints

```
Mobile (< 640px):
- Single column title cards
- Filter sidebar = Sheet overlay
- Compact rating badges
- Composite score in card header

Tablet (640px – 1024px):
- 2-column title grid
- Filter sidebar still overlay

Desktop (> 1024px):
- 3-4 column title grid
- Filter sidebar fixed on left
- Full rating breakdown visible
```

---

## Animation Guidelines

- **Page transitions:** None (fast, utilitarian)
- **Rating badges appearing:** Fade in with slight scale (0.95 → 1.0), staggered 50ms each
- **Composite score on load:** Count up from 0 to final value (500ms)
- **Skeleton loading:** Standard pulse animation
- **Filter changes:** Instant (no animation — parents want speed)
- **"No Flags" badge:** Subtle shimmer or green pulse on first appearance

---

## Accessibility

- All severity colors must pass WCAG AA contrast on their backgrounds
- Severity is communicated via text label, not just color
- Keyboard navigation for all interactive elements
- Screen reader: "LGBT Themes: rated None. Climate Messaging: rated Notable."
- Focus indicators on all interactive elements
