type ExternalApiRequestLog = {
  safeUrl: string;
  startedAtMs: number;
};

const SENSITIVE_QUERY_KEYS = new Set([
  "api_key",
  "apikey",
  "api-key",
  "token",
  "access_token",
  "auth",
  "authorization",
  "signature",
  "sig",
  "key",
]);

function redactValue(value: string): string {
  if (!value) return "";
  return "REDACTED";
}

export function toSafeUrl(rawUrl: string | URL): string {
  let parsed: URL;
  try {
    parsed = rawUrl instanceof URL ? new URL(rawUrl.toString()) : new URL(rawUrl);
  } catch {
    return String(rawUrl);
  }

  for (const key of SENSITIVE_QUERY_KEYS) {
    if (parsed.searchParams.has(key)) {
      parsed.searchParams.set(key, redactValue(parsed.searchParams.get(key) ?? ""));
    }
  }

  return parsed.toString();
}

export function logExternalRequest(
  service: string,
  method: string,
  rawUrl: string | URL
): ExternalApiRequestLog {
  const safeUrl = toSafeUrl(rawUrl);
  console.info(`[${service}] ${method.toUpperCase()} ${safeUrl}`);
  return {
    safeUrl,
    startedAtMs: Date.now(),
  };
}

export function logExternalResponse(
  service: string,
  request: ExternalApiRequestLog,
  status: number,
  statusText: string
): void {
  const durationMs = Date.now() - request.startedAtMs;
  const level = status >= 400 ? "error" : "info";
  const message = `[${service}] ${status} ${statusText} ${request.safeUrl} (${durationMs}ms)`;
  if (level === "error") {
    console.error(message);
    return;
  }
  console.info(message);
}

