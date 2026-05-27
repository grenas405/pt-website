import { getKv } from "./kv.ts";

const MAX_BUSINESS_NAME = 120;
const MAX_CONTACT_NAME = 120;
const MAX_EMAIL = 254;
const MAX_PHONE = 40;
const MAX_NEED = 600;

export interface WaitlistEntry {
  id: string;
  businessName: string;
  contactName: string;
  email: string;
  normalizedEmail: string;
  phone: string;
  need: string;
  createdAt: string;
  source: "homepage";
}

interface ValidationError {
  code: string;
  message: string;
  status: number;
}

type ValidationResult =
  | { ok: true; value: Omit<WaitlistEntry, "id" | "createdAt" | "source"> }
  | { ok: false; error: ValidationError };

export type WaitlistCreateResult =
  | { ok: true; entry: WaitlistEntry }
  | { ok: false; error: ValidationError };

const WAITLIST_PREFIX = ["waitlist"] as const;
const WAITLIST_BY_CREATED_AT_PREFIX = ["waitlist_by_created_at"] as const;
const WAITLIST_BY_EMAIL_PREFIX = ["waitlist_by_email"] as const;

function cleanText(value: unknown): string {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function validateLength(
  value: string,
  field: string,
  max: number,
  min = 1,
): ValidationError | null {
  if (value.length < min) {
    return {
      code: "missing_field",
      message: `${field} is required.`,
      status: 400,
    };
  }

  if (value.length > max) {
    return {
      code: "field_too_long",
      message: `${field} is too long.`,
      status: 400,
    };
  }

  return null;
}

export function validateWaitlistSubmission(data: unknown): ValidationResult {
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return {
      ok: false,
      error: {
        code: "invalid_payload",
        message: "Submit a JSON object.",
        status: 400,
      },
    };
  }

  const record = data as Record<string, unknown>;
  const businessName = cleanText(record.businessName);
  const contactName = cleanText(record.contactName);
  const email = cleanText(record.email).toLowerCase();
  const phone = cleanText(record.phone);
  const need = cleanText(record.need);

  for (
    const [field, value, max, min] of [
      ["Business name", businessName, MAX_BUSINESS_NAME, 2],
      ["Contact name", contactName, MAX_CONTACT_NAME, 2],
      ["Email", email, MAX_EMAIL, 5],
      ["Phone", phone, MAX_PHONE, 7],
      ["Project need", need, MAX_NEED, 5],
    ] as const
  ) {
    const error = validateLength(value, field, max, min);
    if (error !== null) return { ok: false, error };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return {
      ok: false,
      error: {
        code: "invalid_email",
        message: "Enter a valid email address.",
        status: 400,
      },
    };
  }

  return {
    ok: true,
    value: {
      businessName,
      contactName,
      email,
      normalizedEmail: email,
      phone,
      need,
    },
  };
}

export async function createWaitlistEntry(
  data: unknown,
): Promise<WaitlistCreateResult> {
  const validated = validateWaitlistSubmission(data);
  if (!validated.ok) return validated;

  const kv = await getKv();
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const entry: WaitlistEntry = {
    id,
    ...validated.value,
    createdAt,
    source: "homepage",
  };
  const emailKey = [...WAITLIST_BY_EMAIL_PREFIX, entry.normalizedEmail];

  const result = await kv.atomic()
    .check({ key: emailKey, versionstamp: null })
    .set([...WAITLIST_PREFIX, id], entry)
    .set([...WAITLIST_BY_CREATED_AT_PREFIX, createdAt, id], id)
    .set(emailKey, id)
    .commit();

  if (!result.ok) {
    return {
      ok: false,
      error: {
        code: "duplicate_email",
        message: "That email is already on the waitlist.",
        status: 409,
      },
    };
  }

  return { ok: true, entry };
}

export async function listWaitlistEntries(
  limit = 100,
): Promise<WaitlistEntry[]> {
  const kv = await getKv();
  const boundedLimit = Math.max(1, Math.min(limit, 500));
  const entries: WaitlistEntry[] = [];

  for await (
    const item of kv.list<string>(
      { prefix: WAITLIST_BY_CREATED_AT_PREFIX },
      { limit: boundedLimit, reverse: true },
    )
  ) {
    const id = item.value ?? String(item.key[item.key.length - 1]);
    const entry = await kv.get<WaitlistEntry>([...WAITLIST_PREFIX, id]);
    if (entry.value !== null) entries.push(entry.value);
  }

  return entries;
}

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export function waitlistEntriesToCsv(entries: WaitlistEntry[]): string {
  const header = [
    "createdAt",
    "businessName",
    "contactName",
    "email",
    "phone",
    "need",
  ];
  const rows = entries.map((entry) =>
    [
      entry.createdAt,
      entry.businessName,
      entry.contactName,
      entry.email,
      entry.phone,
      entry.need,
    ].map(csvCell).join(",")
  );

  return [header.join(","), ...rows].join("\n") + "\n";
}
