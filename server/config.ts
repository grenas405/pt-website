const rawPort = Deno.env.get("PORT") ?? "8000";
const port = Number.parseInt(rawPort, 10);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error(`Invalid PORT: ${rawPort}`);
}

const publicDir = Deno.env.get("PUBLIC_DIR") ??
  new URL("../public", import.meta.url).pathname;
if (publicDir.trim() === "") {
  throw new Error("PUBLIC_DIR cannot be empty");
}

const host = Deno.env.get("HOST") ?? "0.0.0.0";
if (host.trim() === "") {
  throw new Error("HOST cannot be empty");
}

const defaultAllowedHosts = [
  "localhost",
  "127.0.0.1",
  "::1",
  "0.0.0.0",
  "praxedistechnologies.com",
  "www.praxedistechnologies.com",
];
const allowedHosts = (Deno.env.get("ALLOWED_HOSTS") ??
  defaultAllowedHosts.join(","))
  .split(",")
  .map((value) => value.trim().toLowerCase())
  .filter((value) => value.length > 0);

const kvPath = Deno.env.get("KV_PATH") ?? ":memory:";
if (kvPath.trim() === "") {
  throw new Error("KV_PATH cannot be empty");
}

export const config = Object.freeze({
  port,
  publicDir,
  host,
  allowedHosts,
  kvPath,
});
