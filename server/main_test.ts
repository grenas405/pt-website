import { CONTENT_SECURITY_POLICY } from "./headers.ts";
import { handler } from "./main.ts";

function assertEquals<T>(actual: T, expected: T, message?: string): void {
  if (actual !== expected) {
    throw new Error(message ?? `Expected ${expected}, got ${actual}`);
  }
}

async function read(response: Response): Promise<void> {
  await response.arrayBuffer();
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
