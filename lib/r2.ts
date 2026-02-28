interface R2Config {
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint: string;
  prefix: string;
}

export interface R2TranscriptStorage {
  provider: "r2";
  bucket: string;
  key: string;
  bytes: number;
  sha256: string;
  uploadedAt: number;
}

interface UploadTextToR2Args {
  key: string;
  text: string;
  contentType?: string;
}

const REQUIRED_R2_ENV_KEYS = [
  "R2_ACCOUNT_ID",
  "R2_BUCKET",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
] as const;

let missingConfigLogged = false;

function getMissingR2EnvVars(): string[] {
  return REQUIRED_R2_ENV_KEYS.filter((key) => {
    const value = process.env[key];
    return !value || value.trim().length === 0;
  });
}

function getR2Config(): R2Config | null {
  const missingKeys = getMissingR2EnvVars();
  if (missingKeys.length > 0) {
    if (!missingConfigLogged) {
      console.error(
        `[R2] Transcript archival disabled: missing env vars: ${missingKeys.join(", ")}`
      );
      missingConfigLogged = true;
    }
    return null;
  }

  const accountId = process.env.R2_ACCOUNT_ID!;
  const bucket = process.env.R2_BUCKET!;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID!;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY!;

  const endpoint =
    process.env.R2_ENDPOINT?.replace(/\/+$/, "") ??
    `https://${accountId}.r2.cloudflarestorage.com`;
  const prefix = (process.env.R2_PREFIX ?? "subtitles").replace(
    /^\/+|\/+$/g,
    ""
  );

  return {
    bucket,
    accessKeyId,
    secretAccessKey,
    endpoint,
    prefix,
  };
}

function toAmzDate(date: Date): string {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, "");
}

function encodePathSegment(segment: string): string {
  return encodeURIComponent(segment).replace(
    /[!'()*]/g,
    (ch) => `%${ch.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

const textEncoder = new TextEncoder();

function toBytes(text: string): Uint8Array {
  return textEncoder.encode(text);
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  ) as ArrayBuffer;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", toArrayBuffer(toBytes(input)));
  return toHex(new Uint8Array(digest));
}

async function hmacSha256(
  key: Uint8Array | string,
  data: string
): Promise<Uint8Array> {
  const rawKey = typeof key === "string" ? toBytes(key) : key;
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    toArrayBuffer(rawKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    toArrayBuffer(toBytes(data))
  );
  return new Uint8Array(signature);
}

function buildObjectKey(prefix: string, key: string): string {
  const trimmed = key.replace(/^\/+/, "");
  return prefix ? `${prefix}/${trimmed}` : trimmed;
}

export function isR2Configured(): boolean {
  return getR2Config() !== null;
}

export async function uploadTextToR2(
  args: UploadTextToR2Args
): Promise<R2TranscriptStorage | null> {
  const config = getR2Config();
  if (!config) return null;

  const objectKey = buildObjectKey(config.prefix, args.key);
  const encodedKey = objectKey.split("/").map(encodePathSegment).join("/");
  const encodedBucket = encodePathSegment(config.bucket);
  const endpointUrl = new URL(config.endpoint);
  const host = endpointUrl.host;
  const requestPath = `/${encodedBucket}/${encodedKey}`;
  const requestUrl = `${config.endpoint}${requestPath}`;

  const payloadHash = await sha256Hex(args.text);
  const contentType = args.contentType ?? "text/plain; charset=utf-8";

  const now = new Date();
  const amzDate = toAmzDate(now);
  const dateStamp = amzDate.slice(0, 8);
  const credentialScope = `${dateStamp}/auto/s3/aws4_request`;

  const canonicalHeaders = [
    `content-type:${contentType}\n`,
    `host:${host}\n`,
    `x-amz-content-sha256:${payloadHash}\n`,
    `x-amz-date:${amzDate}\n`,
  ].join("");
  const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = [
    "PUT",
    requestPath,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    await sha256Hex(canonicalRequest),
  ].join("\n");

  const kDate = await hmacSha256(`AWS4${config.secretAccessKey}`, dateStamp);
  const kRegion = await hmacSha256(kDate, "auto");
  const kService = await hmacSha256(kRegion, "s3");
  const kSigning = await hmacSha256(kService, "aws4_request");
  const signature = toHex(await hmacSha256(kSigning, stringToSign));

  const authorization = [
    `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}`,
    `SignedHeaders=${signedHeaders}`,
    `Signature=${signature}`,
  ].join(", ");

  const res = await fetch(requestUrl, {
    method: "PUT",
    headers: {
      Authorization: authorization,
      "Content-Type": contentType,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
    },
    body: args.text,
  });

  if (!res.ok) {
    const responseText = await res.text().catch(() => "");
    const details = responseText ? ` ${responseText.slice(0, 300)}` : "";
    throw new Error(
      `R2 upload failed: ${res.status} ${res.statusText}.${details}`
    );
  }

  return {
    provider: "r2",
    bucket: config.bucket,
    key: objectKey,
    bytes: toBytes(args.text).byteLength,
    sha256: payloadHash,
    uploadedAt: Date.now(),
  };
}
