const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const MIN_SECRET_LENGTH = 32;

interface AdminSessionPayload {
  exp: number;
  iat: number;
  jti: string;
}

const encoder = new TextEncoder();

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(
    /=+$/,
    "",
  );
}

function base64UrlDecode(value: string): Uint8Array | null {
  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    return null;
  }
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  let diff = a.length ^ b.length;
  const max = Math.max(a.length, b.length);

  for (let i = 0; i < max; i++) {
    diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  }

  return diff === 0;
}

function getAdminSecret(): string | null {
  const secret = Deno.env.get("ADMIN_SESSION_SECRET") ?? "";
  return secret.length >= MIN_SECRET_LENGTH ? secret : null;
}

async function sign(data: string, secret: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  return new Uint8Array(
    await crypto.subtle.sign("HMAC", key, encoder.encode(data)),
  );
}

export function isAdminSessionConfigured(): boolean {
  return getAdminSecret() !== null;
}

export async function createAdminSessionToken(): Promise<string | null> {
  const secret = getAdminSecret();
  if (secret === null) return null;

  const now = Date.now();
  const payload: AdminSessionPayload = {
    iat: now,
    exp: now + SESSION_TTL_MS,
    jti: crypto.randomUUID(),
  };
  const encodedPayload = base64UrlEncode(
    encoder.encode(JSON.stringify(payload)),
  );
  const signature = await sign(encodedPayload, secret);

  return `${encodedPayload}.${base64UrlEncode(signature)}`;
}

export async function verifyAdminSessionToken(token: string): Promise<boolean> {
  const secret = getAdminSecret();
  if (secret === null) return false;

  const parts = token.split(".");
  if (parts.length !== 2 || parts[0] === "" || parts[1] === "") return false;

  const expectedSignature = await sign(parts[0], secret);
  const actualSignature = base64UrlDecode(parts[1]);
  if (
    actualSignature === null ||
    !timingSafeEqual(actualSignature, expectedSignature)
  ) {
    return false;
  }

  const payloadBytes = base64UrlDecode(parts[0]);
  if (payloadBytes === null) return false;

  try {
    const payload = JSON.parse(
      new TextDecoder().decode(payloadBytes),
    ) as AdminSessionPayload;
    return Number.isFinite(payload.exp) && payload.exp > Date.now();
  } catch {
    return false;
  }
}
