export interface StreamingProviderRecord {
  name: string;
  logoPath?: string;
  affiliateUrl?: string;
}

function normalizeProviderName(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Preserve existing affiliate URLs when provider metadata refreshes from TMDB.
 * Matching is done by normalized provider name.
 */
export function mergeStreamingProvidersWithAffiliates(
  incoming: StreamingProviderRecord[],
  existing?: StreamingProviderRecord[]
): StreamingProviderRecord[] {
  const existingByName = new Map<string, StreamingProviderRecord>();

  for (const provider of existing ?? []) {
    existingByName.set(normalizeProviderName(provider.name), provider);
  }

  return incoming.map((provider) => {
    const existingMatch = existingByName.get(
      normalizeProviderName(provider.name)
    );

    return {
      name: provider.name,
      logoPath: provider.logoPath,
      affiliateUrl: provider.affiliateUrl ?? existingMatch?.affiliateUrl,
    };
  });
}
