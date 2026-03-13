export function generateTitleSlug(title: string, year: number): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return `${base || "untitled"}-${year}`;
}

export function isUnknownYearSlug(slug: string | undefined): boolean {
  return typeof slug === "string" && /-0(?:-\d+)?$/.test(slug);
}

export function resolveTitlePath(
  id: string,
  slug?: string,
  title?: string,
  year?: number
): string {
  if (slug && !isUnknownYearSlug(slug)) {
    return slug;
  }

  if (title && typeof year === "number" && year > 0) {
    return generateTitleSlug(title, year);
  }

  return id;
}
