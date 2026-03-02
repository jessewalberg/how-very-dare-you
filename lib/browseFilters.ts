import { CATEGORIES, type CategoryKey } from "@/lib/constants";

type MaxSeverityByCategory = Partial<Record<CategoryKey, number>>;

interface BrowseFilterOptions {
  ageFilters: string[];
  serviceFilters: string[];
  maxSeverityByCategory: MaxSeverityByCategory;
}

interface FilterableTitle {
  ageRating?: string;
  streamingProviders?: ReadonlyArray<{ name: string }>;
  ratings?: Partial<Record<CategoryKey, number>>;
}

export function parseMaxSeverityFilters(
  searchParams: URLSearchParams
): MaxSeverityByCategory {
  const maxSeverityByCategory: MaxSeverityByCategory = {};

  for (const category of CATEGORIES) {
    const raw = searchParams.get(`max_${category.key}`);
    if (raw === null || raw === "") continue;

    const parsed = Number(raw);
    if (!Number.isInteger(parsed) || parsed < 0 || parsed > 4) continue;

    maxSeverityByCategory[category.key] = parsed;
  }

  return maxSeverityByCategory;
}

export function hasMaxSeverityFilters(
  maxSeverityByCategory: MaxSeverityByCategory
): boolean {
  return Object.keys(maxSeverityByCategory).length > 0;
}

export function applyBrowseClientFilters<T extends FilterableTitle>(
  titles: T[] | undefined,
  options: BrowseFilterOptions
): T[] | undefined {
  if (!titles) return titles;

  const { ageFilters, serviceFilters, maxSeverityByCategory } = options;
  const hasMaxSeverity = hasMaxSeverityFilters(maxSeverityByCategory);

  return titles.filter((title) => {
    if (
      ageFilters.length > 0 &&
      (!title.ageRating || !ageFilters.includes(title.ageRating))
    ) {
      return false;
    }

    if (serviceFilters.length > 0) {
      const titleServices = title.streamingProviders?.map((p) => p.name) ?? [];
      if (!serviceFilters.some((service) => titleServices.includes(service))) {
        return false;
      }
    }

    if (hasMaxSeverity) {
      if (!title.ratings) return false;

      for (const [categoryKey, maxSeverity] of Object.entries(
        maxSeverityByCategory
      ) as Array<[CategoryKey, number]>) {
        const value = title.ratings[categoryKey];
        if (value === undefined || value > maxSeverity) {
          return false;
        }
      }
    }

    return true;
  });
}
