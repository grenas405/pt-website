const port = parseInt(Deno.env.get("PORT") ?? "8000", 10);
const publicDir = Deno.env.get("PUBLIC_DIR") ??
  new URL("../public", import.meta.url).pathname;
const host = Deno.env.get("HOST") ?? "0.0.0.0";

export const config = Object.freeze({ port, publicDir, host });
