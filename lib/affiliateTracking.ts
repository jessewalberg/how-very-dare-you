export type WatchProviderSurface = "title_detail" | "title_card";

export type WatchProviderFailureReason =
  | "title_not_found"
  | "provider_not_found"
  | "missing_destination"
  | "invalid_url";

export type WatchableTitleType = "movie" | "tv" | "youtube";

export interface WatchProviderLink {
  name: string;
  affiliateUrl?: string;
  url?: string;
}

interface BuildRedirectUrlArgs {
  titleId: string;
  providerName: string;
  surface?: WatchProviderSurface;
  distinctId?: string | null;
}

interface ResolveDestinationArgs {
  providerName: string;
  providers: WatchProviderLink[];
  tmdbId?: number;
  titleType: WatchableTitleType;
}

interface ResolveDestinationSuccess {
  ok: true;
  url: string;
  isAffiliate: boolean;
  destinationHost: string;
}

interface ResolveDestinationFailure {
  ok: false;
  reason: WatchProviderFailureReason;
}

export type ResolveDestinationResult =
  | ResolveDestinationSuccess
  | ResolveDestinationFailure;

const DEFAULT_DISTINCT_ID = "anonymous";

function buildTmdbWatchFallbackUrl(
  tmdbId: number | undefined,
  titleType: WatchableTitleType
): string | undefined {
  if (!tmdbId || tmdbId <= 0) return undefined;
  if (titleType !== "movie" && titleType !== "tv") return undefined;

  const segment = titleType === "tv" ? "tv" : "movie";
  return `https://www.themoviedb.org/${segment}/${tmdbId}/watch?locale=US`;
}

export function sanitizeDistinctId(distinctId: string | null | undefined): string {
  const trimmed = distinctId?.trim();
  if (!trimmed) return DEFAULT_DISTINCT_ID;

  return trimmed.length > 200 ? trimmed.slice(0, 200) : trimmed;
}

export function buildWatchProviderRedirectUrl({
  titleId,
  providerName,
  surface = "title_detail",
  distinctId,
}: BuildRedirectUrlArgs): string {
  const params = new URLSearchParams({
    provider: providerName,
    surface,
  });

  const cleanedDistinctId = sanitizeDistinctId(distinctId);
  if (cleanedDistinctId !== DEFAULT_DISTINCT_ID) {
    params.set("ph_did", cleanedDistinctId);
  }

  return `/go/${encodeURIComponent(titleId)}?${params.toString()}`;
}

export function parseAppPathFromReferer(
  refererHeader: string | null
): string | null {
  if (!refererHeader) return null;

  try {
    const parsed = new URL(refererHeader);
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return null;
  }
}

export function resolveWatchProviderDestination({
  providerName,
  providers,
  tmdbId,
  titleType,
}: ResolveDestinationArgs): ResolveDestinationResult {
  const provider = providers.find((entry) => entry.name === providerName);
  if (!provider) {
    return {
      ok: false,
      reason: "provider_not_found",
    };
  }

  const fallbackUrl = buildTmdbWatchFallbackUrl(tmdbId, titleType);
  const rawDestination = provider.affiliateUrl ?? provider.url ?? fallbackUrl;
  if (!rawDestination) {
    return {
      ok: false,
      reason: "missing_destination",
    };
  }

  try {
    const parsed = new URL(rawDestination);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return {
        ok: false,
        reason: "invalid_url",
      };
    }

    return {
      ok: true,
      url: parsed.toString(),
      isAffiliate: Boolean(provider.affiliateUrl),
      destinationHost: parsed.host,
    };
  } catch {
    return {
      ok: false,
      reason: "invalid_url",
    };
  }
}

interface BuildClickedEventPropertiesArgs {
  titleId: string;
  tmdbId?: number;
  titleType: WatchableTitleType;
  providerName: string;
  surface: WatchProviderSurface;
  isAffiliate: boolean;
  destinationHost: string;
  appPath: string | null;
}

export function buildWatchProviderClickedProperties({
  titleId,
  tmdbId,
  titleType,
  providerName,
  surface,
  isAffiliate,
  destinationHost,
  appPath,
}: BuildClickedEventPropertiesArgs) {
  return {
    title_id: titleId,
    tmdb_id: tmdbId,
    title_type: titleType,
    provider_name: providerName,
    surface,
    is_affiliate: isAffiliate,
    destination_host: destinationHost,
    app_path: appPath,
  };
}

interface BuildFailedEventPropertiesArgs {
  titleId: string;
  providerName: string;
  reason: WatchProviderFailureReason;
}

export function buildWatchProviderClickFailedProperties({
  titleId,
  providerName,
  reason,
}: BuildFailedEventPropertiesArgs) {
  return {
    title_id: titleId,
    provider_name: providerName,
    reason,
  };
}
