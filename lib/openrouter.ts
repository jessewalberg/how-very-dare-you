// OpenRouter API client
// Docs: https://openrouter.ai/docs

const BASE_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "anthropic/claude-sonnet-4";
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;
const DEFAULT_TEMPERATURE = resolveNumberInRange(
  process.env.OPENROUTER_TEMPERATURE,
  0,
  2,
  0
);
const DEFAULT_TOP_P = resolveOptionalNumberInRange(
  process.env.OPENROUTER_TOP_P,
  0,
  1
);
const DEFAULT_SEED = resolveOptionalInteger(process.env.OPENROUTER_SEED);

// ── Types ─────────────────────────────────────────────────

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OpenRouterChoice {
  index: number;
  message: {
    role: string;
    content: string;
  };
  finish_reason: string;
}

export interface OpenRouterUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface OpenRouterResponse {
  id: string;
  model: string;
  choices: OpenRouterChoice[];
  usage: OpenRouterUsage;
}

export interface ChatCompletionResult {
  content: string;
  model: string;
  usage: OpenRouterUsage;
}

// ── Public API ────────────────────────────────────────────

export async function chatCompletion(
  systemPrompt: string,
  userMessage: string,
  apiKey: string,
  options?: {
    model?: string;
    temperature?: number;
    topP?: number;
    seed?: number;
    maxTokens?: number;
    requestLabel?: string;
  }
): Promise<ChatCompletionResult> {
  const model = options?.model ?? DEFAULT_MODEL;
  const effectiveTemperature = resolveNumberInRange(
    options?.temperature === undefined
      ? undefined
      : String(options.temperature),
    0,
    2,
    DEFAULT_TEMPERATURE
  );
  const effectiveTopP =
    options?.topP === undefined
      ? DEFAULT_TOP_P
      : resolveOptionalNumberInRange(String(options.topP), 0, 1);
  const effectiveSeed =
    options?.seed === undefined
      ? DEFAULT_SEED
      : resolveOptionalInteger(String(options.seed));
  const effectiveMaxTokens = Math.max(1, Math.floor(options?.maxTokens ?? 4096));
  const labelSuffix = options?.requestLabel ? ` [${options.requestLabel}]` : "";
  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userMessage },
  ];

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const requestBody: Record<string, unknown> = {
        model,
        messages,
        temperature: effectiveTemperature,
        max_tokens: effectiveMaxTokens,
      };
      if (effectiveTopP !== undefined) {
        requestBody.top_p = effectiveTopP;
      }
      if (effectiveSeed !== undefined) {
        requestBody.seed = effectiveSeed;
      }

      if (attempt === 0) {
        console.log(
          `[OpenRouter] request${labelSuffix} model=${model} temperature=${effectiveTemperature} top_p=${effectiveTopP ?? "default"} seed=${effectiveSeed ?? "none"} max_tokens=${effectiveMaxTokens}`
        );
      }

      const res = await fetch(BASE_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://howverydareyou.com",
          "X-Title": "How Very Dare You",
        },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) {
        const errorBody = await res.text();

        // Retry on rate limits and server errors
        if (res.status === 429 || res.status >= 500) {
          console.warn(
            `[OpenRouter] retryable response${labelSuffix} status=${res.status} attempt=${attempt + 1}/${MAX_RETRIES}`
          );
          lastError = new Error(
            `OpenRouter ${res.status}: ${errorBody}`
          );
          await sleep(INITIAL_BACKOFF_MS * Math.pow(2, attempt));
          continue;
        }

        throw new Error(
          `OpenRouter API error ${res.status}: ${errorBody}`
        );
      }

      const data = (await res.json()) as OpenRouterResponse;

      if (!data.choices || data.choices.length === 0) {
        throw new Error("OpenRouter returned no choices");
      }

      console.log(
        `[OpenRouter] success${labelSuffix} model=${data.model || model} prompt_tokens=${data.usage?.prompt_tokens ?? 0} completion_tokens=${data.usage?.completion_tokens ?? 0}`
      );

      return {
        content: data.choices[0].message.content,
        model: data.model,
        usage: data.usage,
      };
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      console.error(
        `[OpenRouter] error${labelSuffix} attempt=${attempt + 1}/${MAX_RETRIES}: ${lastError.message}`
      );

      // Don't retry on non-retriable errors
      if (
        lastError.message.includes("API error 4") &&
        !lastError.message.includes("429")
      ) {
        throw lastError;
      }

      if (attempt < MAX_RETRIES - 1) {
        await sleep(INITIAL_BACKOFF_MS * Math.pow(2, attempt));
      }
    }
  }

  throw lastError ?? new Error("OpenRouter request failed after retries");
}

// ── JSON Parsing ──────────────────────────────────────────

/**
 * Parse a JSON response from the AI, handling markdown code blocks.
 * The AI often wraps JSON in ```json ... ``` blocks.
 */
export function parseJSONResponse<T>(content: string): T {
  let cleaned = content.trim();

  // Strip markdown code block wrappers
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1].trim();
  }

  return JSON.parse(cleaned) as T;
}

// ── Cost Estimation ───────────────────────────────────

/** Estimate cost in cents for a request (claude-sonnet-4 via OpenRouter pricing snapshot). */
export function estimateCostCents(usage: { prompt_tokens: number; completion_tokens: number }): number {
  const inputCost = (usage.prompt_tokens / 1_000_000) * 300;
  const outputCost = (usage.completion_tokens / 1_000_000) * 1500;
  return Math.round((inputCost + outputCost) * 100) / 100;
}

// ── Helpers ───────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolveNumberInRange(
  value: string | undefined,
  min: number,
  max: number,
  fallback: number
): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function resolveOptionalNumberInRange(
  value: string | undefined,
  min: number,
  max: number
): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  return Math.min(max, Math.max(min, parsed));
}

function resolveOptionalInteger(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return undefined;
  return parsed;
}
