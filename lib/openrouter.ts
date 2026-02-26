// OpenRouter API client
// Docs: https://openrouter.ai/docs

const BASE_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "anthropic/claude-sonnet-4";
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;

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
    maxTokens?: number;
  }
): Promise<ChatCompletionResult> {
  const model = options?.model ?? DEFAULT_MODEL;
  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userMessage },
  ];

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(BASE_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://howverydareyou.com",
          "X-Title": "How Very Dare You",
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: options?.temperature ?? 0.3,
          max_tokens: options?.maxTokens ?? 4096,
        }),
      });

      if (!res.ok) {
        const errorBody = await res.text();

        // Retry on rate limits and server errors
        if (res.status === 429 || res.status >= 500) {
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

      return {
        content: data.choices[0].message.content,
        model: data.model,
        usage: data.usage,
      };
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));

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

// ── Helpers ───────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
