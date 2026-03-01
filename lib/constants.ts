import {
  Heart,
  Leaf,
  Users,
  UserCog,
  ShieldOff,
  Church,
  Megaphone,
  AlertTriangle,
  Zap,
  type LucideIcon,
} from "lucide-react";

export type CategoryKey =
  | "lgbtq"
  | "climate"
  | "racialIdentity"
  | "genderRoles"
  | "antiAuthority"
  | "religious"
  | "political"
  | "sexuality"
  | "overstimulation";

export type CategoryGroup = "cultural" | "health";

export interface Category {
  key: CategoryKey;
  label: string;
  description: string;
  icon: LucideIcon;
  group: CategoryGroup;
}

export const CATEGORIES: Category[] = [
  {
    key: "lgbtq",
    label: "LGBT Themes",
    description:
      "Same-sex relationships, gender identity, transition storylines",
    icon: Heart,
    group: "cultural",
  },
  {
    key: "climate",
    label: "Environmental / Climate Messaging",
    description:
      'Climate activism, anti-industry messaging, "save the planet" storylines',
    icon: Leaf,
    group: "cultural",
  },
  {
    key: "racialIdentity",
    label: "Racial Identity / Social Justice",
    description:
      "Race-focused narratives, privilege themes, revisionist takes",
    icon: Users,
    group: "cultural",
  },
  {
    key: "genderRoles",
    label: "Gender Role Commentary",
    description:
      'Mocking traditional roles, "girl boss" tropes, "dads are dumb"',
    icon: UserCog,
    group: "cultural",
  },
  {
    key: "antiAuthority",
    label: "Anti-Authority / Anti-Tradition",
    description:
      "Parents portrayed negatively, institutions mocked, rebellion glorified",
    icon: ShieldOff,
    group: "cultural",
  },
  {
    key: "religious",
    label: "Religious Sensitivity",
    description:
      "Faith mocked, anti-religious messaging, occult/new-age normalized",
    icon: Church,
    group: "cultural",
  },
  {
    key: "political",
    label: "Political Messaging",
    description:
      "Overt left/right political themes, activist storylines",
    icon: Megaphone,
    group: "cultural",
  },
  {
    key: "sexuality",
    label: "Sexuality / Age-Inappropriate Content",
    description:
      "Sexualization, poorly-handled puberty themes, mature romantic content for young audiences",
    icon: AlertTriangle,
    group: "cultural",
  },
  {
    key: "overstimulation",
    label: "Overstimulation",
    description:
      "Rapid cuts, flashing colors, hyperstimulating visual pacing designed to hijack attention",
    icon: Zap,
    group: "health",
  },
] as const;

export type SeverityLevel = 0 | 1 | 2 | 3 | 4;

export interface SeverityConfig {
  label: string;
  color: string;
  bg: string;
  border: string;
}

export const SEVERITY_LEVELS: Record<SeverityLevel, SeverityConfig> = {
  0: {
    label: "None",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-500/30",
  },
  1: {
    label: "Brief",
    color: "text-lime-700",
    bg: "bg-lime-50",
    border: "border-lime-500/30",
  },
  2: {
    label: "Notable",
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-500/30",
  },
  3: {
    label: "Significant",
    color: "text-orange-700",
    bg: "bg-orange-50",
    border: "border-orange-500/30",
  },
  4: {
    label: "Core Theme",
    color: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-500/30",
  },
};

export const DEFAULT_WEIGHTS: Record<CategoryKey, number> = {
  lgbtq: 5,
  climate: 5,
  racialIdentity: 5,
  genderRoles: 5,
  antiAuthority: 5,
  religious: 5,
  political: 5,
  sexuality: 5,
  overstimulation: 5,
};

export const RATE_LIMITS = {
  free: 3,
  paid: 10,
} as const;
