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

Deno.test("handler serves admin login and dashboard pages", async () => {
  const login = await handler(new Request("http://localhost/admin/login"));
  const loginBody = await login.text();
  assertEquals(login.status, 200);
  if (!loginBody.includes('id="login-form"')) {
    throw new Error("Admin login form missing");
  }

  const dashboard = await handler(new Request("http://localhost/admin"));
  const dashboardBody = await dashboard.text();
  assertEquals(dashboard.status, 200);
  if (
    !dashboardBody.includes('id="waitlist-body"') ||
    !dashboardBody.includes('id="export-button"')
  ) {
    throw new Error("Admin dashboard controls missing");
  }

  assertEquals(
    dashboard.headers.get("Content-Security-Policy"),
    CONTENT_SECURITY_POLICY,
  );
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

Deno.test("health endpoint returns browser JSON and terminal text on request", async () => {
  const browser = await handler(
    new Request("http://localhost/api/health", {
      headers: {
        accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "user-agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36",
      },
    }),
  );
  const browserBody = await browser.json();
  assertEquals(browser.status, 200);
  assertEquals(
    browser.headers.get("Content-Type"),
    "application/json; charset=utf-8",
  );
  assertEquals(browserBody.status, "ok");
  assertEquals(browserBody.service, "praxedis-technologies-website");

  const terminal = await handler(
    new Request("http://localhost/api/health", {
      headers: {
        accept: "text/plain",
        "user-agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36",
      },
    }),
  );
  const terminalBody = await terminal.text();
  assertEquals(terminal.status, 200);
  assertEquals(
    terminal.headers.get("Content-Type"),
    "text/plain; charset=utf-8",
  );
  if (!terminalBody.includes("PRAXEDIS TECHNOLOGIES")) {
    throw new Error("Expected terminal health panel");
  }

  const curl = await handler(
    new Request("http://localhost/api/health", {
      headers: { "user-agent": "curl/8.9.1" },
    }),
  );
  const curlBody = await curl.text();
  assertEquals(curl.status, 200);
  assertEquals(curl.headers.get("Content-Type"), "text/plain; charset=utf-8");
  if (!curlBody.includes("system integrity confirmed")) {
    throw new Error("Expected curl health output");
  }
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
