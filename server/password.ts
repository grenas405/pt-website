const DEFAULT_ITERATIONS = 310_000;
const HASH_BYTES = 32;

export const ADMIN_PASSWORD_KEY = ["admin", "password"] as const;

export interface AdminPasswordRecord {
  algorithm: "PBKDF2-SHA-256";
  iterations: number;
  salt: string;
  hash: string;
  createdAt: string;
}

interface HashOptions {
  iterations?: number;
  salt?: Uint8Array;
}

const encoder = new TextEncoder();

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  let diff = a.length ^ b.length;
  const max = Math.max(a.length, b.length);

  for (let i = 0; i < max; i++) {
    diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  }

  return diff === 0;
}

async function derivePasswordHash(
  password: string,
  salt: Uint8Array,
  iterations: number,
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: toArrayBuffer(salt),
      iterations,
    },
    key,
    HASH_BYTES * 8,
  );

  return new Uint8Array(bits);
}

export async function createPasswordHash(
  password: string,
  options: HashOptions = {},
): Promise<AdminPasswordRecord> {
  const salt = options.salt ?? crypto.getRandomValues(new Uint8Array(16));
  const iterations = options.iterations ?? DEFAULT_ITERATIONS;
  const hash = await derivePasswordHash(password, salt, iterations);

  return {
    algorithm: "PBKDF2-SHA-256",
    iterations,
    salt: toBase64(salt),
    hash: toBase64(hash),
    createdAt: new Date().toISOString(),
  };
}

export async function verifyPassword(
  password: string,
  record: AdminPasswordRecord,
): Promise<boolean> {
  if (record.algorithm !== "PBKDF2-SHA-256" || record.iterations < 1) {
    return false;
  }

  const salt = fromBase64(record.salt);
  const expected = fromBase64(record.hash);
  const actual = await derivePasswordHash(password, salt, record.iterations);

  return timingSafeEqual(actual, expected);
}
