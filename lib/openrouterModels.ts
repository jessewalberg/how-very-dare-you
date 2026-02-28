export const SUPPORTED_MODEL_PROVIDERS = [
  "anthropic",
  "google",
  "openai",
  "x-ai",
] as const;

export type SupportedModelProvider =
  (typeof SUPPORTED_MODEL_PROVIDERS)[number];

export const MODEL_PROVIDER_LABELS: Record<SupportedModelProvider, string> = {
  anthropic: "Anthropic",
  google: "Google / Gemini",
  openai: "OpenAI",
  "x-ai": "Grok (xAI)",
};

export interface OpenRouterCatalogModel {
  id: string;
  provider: SupportedModelProvider;
  name: string;
  description?: string;
  contextLength: number;
  promptPricePerToken: number | null;
  completionPricePerToken: number | null;
  inputModalities: string[];
  outputModalities: string[];
  supportedParameters: string[];
  isModerated: boolean;
  created: number | null;
  isActive: boolean;
}

function asObject(
  value: unknown
): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asNumberLike(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function resolveProvider(modelId: string): SupportedModelProvider | null {
  const [provider] = modelId.split("/", 1);
  if (!provider) return null;
  const normalized = provider.toLowerCase();
  if (
    SUPPORTED_MODEL_PROVIDERS.includes(
      normalized as SupportedModelProvider
    )
  ) {
    return normalized as SupportedModelProvider;
  }
  return null;
}

function isModelActive(expirationDate: unknown): boolean {
  if (expirationDate == null) return true;
  const expiresAt = asNumberLike(expirationDate);
  if (expiresAt != null) {
    // OpenRouter commonly uses epoch seconds.
    const nowSeconds = Math.floor(Date.now() / 1000);
    return expiresAt > nowSeconds;
  }
  if (typeof expirationDate === "string") {
    const parsedDate = Date.parse(expirationDate);
    if (Number.isFinite(parsedDate)) {
      return parsedDate > Date.now();
    }
  }
  return true;
}

function parseModelEntry(entry: unknown): OpenRouterCatalogModel | null {
  const model = asObject(entry);
  if (!model) return null;

  const id = asString(model.id);
  if (!id) return null;

  const provider = resolveProvider(id);
  if (!provider) return null;

  const name = asString(model.name) ?? id;
  const description = asString(model.description) ?? undefined;
  const contextLength = asNumber(model.context_length) ?? 0;
  const supportedParameters = asStringArray(model.supported_parameters);
  const isModerated = model.is_moderated === true;
  const created = asNumber(model.created);

  const architecture = asObject(model.architecture);
  const inputModalities = asStringArray(architecture?.input_modalities);
  const outputModalities = asStringArray(architecture?.output_modalities);

  const pricing = asObject(model.pricing);
  const promptPricePerToken = asNumberLike(pricing?.prompt);
  const completionPricePerToken = asNumberLike(pricing?.completion);

  const isActive = isModelActive(model.expiration_date);

  return {
    id,
    provider,
    name,
    description,
    contextLength,
    promptPricePerToken,
    completionPricePerToken,
    inputModalities,
    outputModalities,
    supportedParameters,
    isModerated,
    created,
    isActive,
  };
}

export function extractSupportedCatalogModels(
  payload: unknown
): OpenRouterCatalogModel[] {
  const root = asObject(payload);
  const data = Array.isArray(root?.data) ? root.data : [];
  const parsed = data
    .map(parseModelEntry)
    .filter((m): m is OpenRouterCatalogModel => m !== null)
    .filter((m) => m.isActive);

  return parsed.sort((a, b) => {
    if (a.provider !== b.provider) {
      return a.provider.localeCompare(b.provider);
    }
    return a.name.localeCompare(b.name);
  });
}

export function formatPricePerMillion(
  pricePerToken: number | null
): string {
  if (pricePerToken == null) return "N/A";
  const perMillion = pricePerToken * 1_000_000;
  if (!Number.isFinite(perMillion)) return "N/A";
  return `$${perMillion.toFixed(2)}/1M`;
}
