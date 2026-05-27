import {
  buildHeaders,
  buildJsonHeaders,
  buildTextHeaders,
  CONTENT_SECURITY_POLICY,
} from "./headers.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEquals<T>(actual: T, expected: T, message?: string): void {
  if (actual !== expected) {
    throw new Error(message ?? `Expected ${expected}, got ${actual}`);
  }
}

const REQUIRED_SECURITY_HEADERS = [
  "Content-Security-Policy",
  "Cross-Origin-Opener-Policy",
  "Cross-Origin-Resource-Policy",
  "Origin-Agent-Cluster",
  "Permissions-Policy",
  "Strict-Transport-Security",
  "X-Content-Type-Options",
  "X-Frame-Options",
  "X-Permitted-Cross-Domain-Policies",
  "X-XSS-Protection",
  "Referrer-Policy",
];

Deno.test("all header builders apply the baseline security headers", () => {
  const headers = [
    buildHeaders({
      contentType: "text/html; charset=utf-8",
      size: 100,
      mtime: new Date(0),
    }),
    buildJsonHeaders(2),
    buildTextHeaders(2),
  ];

  for (const h of headers) {
    for (const name of REQUIRED_SECURITY_HEADERS) {
      assert(h.has(name), `${name} missing`);
    }
  }
});

Deno.test("content security policy is same-origin and blocks inline code", () => {
  assertEquals(
    CONTENT_SECURITY_POLICY,
    "default-src 'self'; base-uri 'self'; connect-src 'self'; font-src 'self'; form-action 'self'; frame-ancestors 'none'; img-src 'self' data:; object-src 'none'; script-src 'self'; style-src 'self'",
  );
  assert(
    !CONTENT_SECURITY_POLICY.includes("'unsafe-inline'"),
    "inline allowed",
  );
  assert(!CONTENT_SECURITY_POLICY.includes("https:"), "external https allowed");
});

Deno.test("cache policy separates HTML, long-lived assets, and no-store responses", () => {
  assertEquals(
    buildHeaders({
      contentType: "text/html; charset=utf-8",
      size: 1,
      mtime: null,
    }).get("Cache-Control"),
    "no-cache, must-revalidate",
  );
  assertEquals(
    buildHeaders({ contentType: "font/woff2", size: 1, mtime: null }).get(
      "Cache-Control",
    ),
    "public, max-age=31536000, immutable",
  );
  assertEquals(buildTextHeaders(1).get("Cache-Control"), "no-store");
});
