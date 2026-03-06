export function isUnknownYearSlug(slug: string | undefined): boolean {
  return typeof slug === "string" && /-0(?:-\d+)?$/.test(slug);
}

export function resolveTitlePath(id: string, slug?: string): string {
  return slug && !isUnknownYearSlug(slug) ? slug : id;
}
