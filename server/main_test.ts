import { CONTENT_SECURITY_POLICY } from "./headers.ts";
import { getKv } from "./kv.ts";
import { handler } from "./main.ts";
import { ADMIN_PASSWORD_KEY, createPasswordHash } from "./password.ts";

function assertEquals<T>(actual: T, expected: T, message?: string): void {
  if (actual !== expected) {
    throw new Error(message ?? `Expected ${expected}, got ${actual}`);
  }
}

async function read(response: Response): Promise<void> {
  await response.arrayBuffer();
}

function waitlistPayload(email: string): Record<string, string> {
  return {
    businessName: "Guerrero Market",
    contactName: "Pedro Dominguez",
    email,
    phone: "555-123-4567",
    need: "A fast website and lead capture system.",
  };
}

function jsonRequest(path: string, body: unknown): Request {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

Deno.test("handler serves pages with strict security headers", async () => {
  const response = await handler(new Request("http://localhost/"));
  await read(response);

  assertEquals(response.status, 200);
  assertEquals(
    response.headers.get("Content-Security-Policy"),
    CONTENT_SECURITY_POLICY,
  );
  assertEquals(response.headers.get("X-Frame-Options"), "DENY");
});

Deno.test("handler returns security headers on method errors", async () => {
  const response = await handler(
    new Request("http://localhost/", { method: "POST" }),
  );
  await read(response);

  assertEquals(response.status, 405);
  assertEquals(response.headers.get("Allow"), "GET, HEAD");
  assertEquals(
    response.headers.get("Content-Security-Policy"),
    CONTENT_SECURITY_POLICY,
  );
});

Deno.test("handler accepts waitlist submissions and rejects duplicates", async () => {
  const email = `waitlist-${crypto.randomUUID()}@example.com`;
  const response = await handler(
    jsonRequest("/api/waitlist", waitlistPayload(email)),
  );
  const body = await response.json();

  assertEquals(response.status, 200);
  assertEquals(body.ok, true);
  if (typeof body.id !== "string" || body.id.length === 0) {
    throw new Error("Expected waitlist id");
  }

  const duplicate = await handler(
    jsonRequest("/api/waitlist", waitlistPayload(email.toUpperCase())),
  );
  const duplicateBody = await duplicate.json();

  assertEquals(duplicate.status, 409);
  assertEquals(duplicateBody.error.code, "duplicate_email");
});

Deno.test("handler validates waitlist payloads and body size", async () => {
  const invalid = await handler(
    jsonRequest("/api/waitlist", { ...waitlistPayload("bad"), email: "bad" }),
  );
  await read(invalid);
  assertEquals(invalid.status, 400);

  const tooLarge = await handler(
    jsonRequest("/api/waitlist", {
      ...waitlistPayload(`large-${crypto.randomUUID()}@example.com`),
      need: "x".repeat(9000),
    }),
  );
  await read(tooLarge);
  assertEquals(tooLarge.status, 413);
});

Deno.test("admin login and waitlist export require a valid token", async () => {
  Deno.env.set(
    "ADMIN_SESSION_SECRET",
    "test-admin-session-secret-minimum-32-bytes",
  );

  const kv = await getKv();
  await kv.set(
    ADMIN_PASSWORD_KEY,
    await createPasswordHash("correct horse battery", { iterations: 1_000 }),
  );

  const blocked = await handler(
    new Request("http://localhost/api/admin/waitlist"),
  );
  await read(blocked);
  assertEquals(blocked.status, 401);

  const badLogin = await handler(
    jsonRequest("/api/admin/login", { password: "wrong password" }),
  );
  await read(badLogin);
  assertEquals(badLogin.status, 401);

  const login = await handler(
    jsonRequest("/api/admin/login", { password: "correct horse battery" }),
  );
  const loginBody = await login.json();
  assertEquals(login.status, 200);
  assertEquals(loginBody.ok, true);

  const token = String(loginBody.token);
  const list = await handler(
    new Request("http://localhost/api/admin/waitlist", {
      headers: { authorization: `Bearer ${token}` },
    }),
  );
  const listBody = await list.json();
  assertEquals(list.status, 200);
  assertEquals(listBody.ok, true);

  const csv = await handler(
    new Request("http://localhost/api/admin/waitlist.csv", {
      headers: { authorization: `Bearer ${token}` },
    }),
  );
  const csvBody = await csv.text();
  assertEquals(csv.status, 200);
  assertEquals(csv.headers.get("Content-Type"), "text/csv; charset=utf-8");
  if (
    !csvBody.startsWith("createdAt,businessName,contactName,email,phone,need")
  ) {
    throw new Error("CSV header missing");
  }
});

Deno.test("handler rejects untrusted hosts before routing", async () => {
  const response = await handler(new Request("http://evil.example/"));
  await read(response);

  assertEquals(response.status, 400);
  assertEquals(response.headers.get("Cache-Control"), "no-store");
  assertEquals(
    response.headers.get("Content-Security-Policy"),
    CONTENT_SECURITY_POLICY,
  );
});

Deno.test("handler rejects GET requests with request bodies", async () => {
  const response = await handler(
    new Request("http://localhost/", {
      headers: { "content-length": "1" },
    }),
  );
  await read(response);

  assertEquals(response.status, 400);
  assertEquals(response.headers.get("Cache-Control"), "no-store");
});

Deno.test("handler returns a headered 404 for rejected paths", async () => {
  const response = await handler(
    new Request("http://localhost/vendor%2ffonts/fonts.css"),
  );
  await read(response);

  assertEquals(response.status, 404);
  assertEquals(
    response.headers.get("Content-Security-Policy"),
    CONTENT_SECURITY_POLICY,
  );
});
