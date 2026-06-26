import { resolve } from "./router.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function route(path: string) {
  return await resolve(new URL(`http://localhost${path}`));
}

Deno.test("router resolves explicit pages and known static assets", async () => {
  assert((await route("/")).kind === "page", "home route failed");
  assert((await route("/about")).kind === "page", "about route failed");
  assert((await route("/case-study")).kind === "page", "case-study failed");
  assert((await route("/mission")).kind === "page", "mission route failed");
  assert((await route("/mexico")).kind === "page", "mexico route failed");
  assert(
    (await route("/mexico-hero.webp")).kind === "asset",
    "mexico hero failed",
  );
  assert((await route("/admin")).kind === "page", "admin route failed");
  assert(
    (await route("/admin/login")).kind === "page",
    "admin login route failed",
  );
  assert((await route("/admin.css")).kind === "asset", "admin css failed");
  assert(
    (await route("/admin-dashboard.js")).kind === "asset",
    "admin dashboard script failed",
  );
  assert(
    (await route("/vendor/fonts/fonts.css")).kind === "asset",
    "vendor font css failed",
  );
  assert(
    (await route("/vendor/animejs/anime.min.js")).kind === "asset",
    "vendor script failed",
  );
});

Deno.test("router rejects traversal, ambiguous encodings, dotfiles, and unknown types", async () => {
  const rejected = [
    "/%2e%2e/server/main.ts",
    "/vendor%2ffonts/fonts.css",
    "/vendor%5cfonts/fonts.css",
    "/%00",
    "/.env",
    "/about.html",
    "/mexico.html",
    "/admin.html",
    "/admin-login.html",
    "/unknown.exe",
  ];

  for (const path of rejected) {
    const result = await route(path);
    assert(result.kind === "notFound", `${path} should not resolve`);
  }
});
