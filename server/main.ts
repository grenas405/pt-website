import { config } from "./config.ts";
import { resolve } from "./router.ts";
import { openFile } from "./file.ts";
import { mimeType } from "./mime.ts";
import {
  buildCsvHeaders,
  buildHeaders,
  buildJsonHeaders,
  buildTextHeaders,
} from "./headers.ts";
import {
  createAdminSessionToken,
  isAdminSessionConfigured,
  verifyAdminSessionToken,
} from "./admin_auth.ts";
import { getKv } from "./kv.ts";
import {
  ADMIN_PASSWORD_KEY,
  AdminPasswordRecord,
  verifyPassword,
} from "./password.ts";
import {
  createWaitlistEntry,
  listWaitlistEntries,
  waitlistEntriesToCsv,
} from "./waitlist.ts";

const HEALTH_PATH = "/api/health";
const WAITLIST_PATH = "/api/waitlist";
const ADMIN_LOGIN_PATH = "/api/admin/login";
const ADMIN_WAITLIST_PATH = "/api/admin/waitlist";
const ADMIN_WAITLIST_CSV_PATH = "/api/admin/waitlist.csv";
const ANSI_ESCAPE = "\x1b";
const MAX_URL_LENGTH = 2048;
const MAX_JSON_BODY_BYTES = 8192;
const METHOD_NOT_ALLOWED = "Method Not Allowed";
const BAD_REQUEST = "Bad Request";

interface HealthPayload {
  status: "ok";
  service: string;
  timestamp: string;
  uptimeSeconds: number;
}

const ANSI = {
  reset: `${ANSI_ESCAPE}[0m`,
  bold: `${ANSI_ESCAPE}[1m`,
  dim: `${ANSI_ESCAPE}[2m`,
  green: `${ANSI_ESCAPE}[38;2;0;104;71m`,
  brightGreen: `${ANSI_ESCAPE}[38;2;0;255;136m`,
  white: `${ANSI_ESCAPE}[38;2;255;255;255m`,
  red: `${ANSI_ESCAPE}[38;2;206;17;38m`,
  gold: `${ANSI_ESCAPE}[38;2;255;214;10m`,
  steel: `${ANSI_ESCAPE}[38;2;138;160;175m`,
  bgGreen: `${ANSI_ESCAPE}[48;2;0;104;71m`,
  bgWhite: `${ANSI_ESCAPE}[48;2;255;255;255m`,
  bgRed: `${ANSI_ESCAPE}[48;2;206;17;38m`,
};

function encodeSize(body: string): number {
  return new TextEncoder().encode(body).byteLength;
}

function createHealthPayload(): HealthPayload {
  return {
    status: "ok",
    service: "praxedis-technologies-website",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(performance.now() / 1000),
  };
}

function isBrowserUserAgent(userAgent: string | null): boolean {
  if (userAgent === null) return false;

  const ua = userAgent.toLowerCase();
  const cliMarkers = [
    "curl/",
    "wget/",
    "httpie/",
    "python-requests",
    "go-http-client",
    "node-fetch",
    "undici",
    "axios/",
    "postmanruntime/",
    "insomnia/",
  ];

  if (cliMarkers.some((marker) => ua.includes(marker))) {
    return false;
  }

  return ua.includes("mozilla/") &&
    (
      ua.includes("chrome/") ||
      ua.includes("crios/") ||
      ua.includes("firefox/") ||
      ua.includes("fxios/") ||
      ua.includes("safari/") ||
      ua.includes("edg/") ||
      ua.includes("opr/") ||
      ua.includes("opera/") ||
      ua.includes("trident/") ||
      ua.includes("msie ")
    );
}

function formatUptime(totalSeconds: number): string {
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0 || parts.length > 0) parts.push(`${hours}h`);
  if (minutes > 0 || parts.length > 0) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);

  return parts.join(" ");
}

function stripAnsi(value: string): string {
  const pattern = new RegExp(`${ANSI_ESCAPE}\\[[0-9;]*m`, "g");
  return value.replace(pattern, "");
}

function padAnsi(value: string, width: number): string {
  const visibleLength = stripAnsi(value).length;
  return value + " ".repeat(Math.max(width - visibleLength, 0));
}

function row(label: string, value: string, width = 74): string {
  const left = `${ANSI.steel}${label.padEnd(14)}${ANSI.reset}`;
  const content = `${left}${value}`;
  return `| ${padAnsi(content, width)} |`;
}

function formatAnsiHealth(payload: HealthPayload): string {
  const width = 78;
  const border =
    "+------------------------------------------------------------------------------+";
  const flag = `${ANSI.bgGreen}${" ".repeat(26)}${ANSI.bgWhite}${
    " ".repeat(26)
  }${ANSI.bgRed}${" ".repeat(26)}${ANSI.reset}`;
  const uptime = formatUptime(payload.uptimeSeconds);

  const lines = [
    "",
    flag,
    border,
    `| ${
      padAnsi(
        `${ANSI.bold}${ANSI.white}PRAXEDIS TECHNOLOGIES${ANSI.reset} ${ANSI.steel}//${ANSI.reset} ${ANSI.green}LIVE SYSTEM PULSE${ANSI.reset}`,
        width - 4,
      )
    } |`,
    `| ${
      padAnsi(
        `${ANSI.brightGreen}${ANSI.bold}ONLINE${ANSI.reset} ${ANSI.dim}// edge health confirmed${ANSI.reset}`,
        width - 4,
      )
    } |`,
    border,
    row("service", `${ANSI.white}${payload.service}${ANSI.reset}`),
    row(
      "status",
      `${ANSI.brightGreen}${payload.status.toUpperCase()}${ANSI.reset}`,
    ),
    row("timestamp", `${ANSI.white}${payload.timestamp}${ANSI.reset}`),
    row(
      "uptime",
      `${ANSI.gold}${uptime}${ANSI.reset} ${ANSI.dim}(${payload.uptimeSeconds}s)${ANSI.reset}`,
    ),
    border,
    `| ${
      padAnsi(
        `${ANSI.green}Velocity:${ANSI.reset} operational  ${ANSI.white}Signal:${ANSI.reset} clean  ${ANSI.red}Execution:${ANSI.reset} live`,
        width - 4,
      )
    } |`,
    `| ${
      padAnsi(
        `${ANSI.dim}Named in tribute to${ANSI.reset} ${ANSI.bold}Praxedis G. Guerrero${ANSI.reset}${ANSI.dim}, Mexican revolutionary journalist${ANSI.reset}`,
        width - 4,
      )
    } |`,
    `| ${
      padAnsi(
        `${ANSI.dim}and fearless voice of progress.${ANSI.reset}`,
        width - 4,
      )
    } |`,
    border,
    `${ANSI.green}praxedis@edge${ANSI.reset}:${ANSI.white}~${ANSI.reset}$ ${ANSI.brightGreen}system integrity confirmed${ANSI.reset}`,
    "",
  ];

  return lines.join("\n");
}

function serveHealth(req: Request): Response {
  const payload = createHealthPayload();
  const browserRequest = isBrowserUserAgent(req.headers.get("user-agent"));
  const body = browserRequest
    ? JSON.stringify(payload)
    : formatAnsiHealth(payload);
  const size = encodeSize(body);
  const headers = browserRequest
    ? buildJsonHeaders(size)
    : buildTextHeaders(size);

  if (req.method === "HEAD") {
    return new Response(null, { status: 200, headers });
  }

  return new Response(body, { status: 200, headers });
}

function textResponse(
  req: Request,
  body: string,
  status: number,
  extraHeaders?: Record<string, string>,
): Response {
  const headers = buildTextHeaders(encodeSize(body));
  for (const [name, value] of Object.entries(extraHeaders ?? {})) {
    headers.set(name, value);
  }

  if (req.method === "HEAD") {
    return new Response(null, { status, headers });
  }

  return new Response(body, { status, headers });
}

function jsonResponse(body: unknown, status = 200): Response {
  const json = JSON.stringify(body);
  return new Response(json, {
    status,
    headers: buildJsonHeaders(encodeSize(json)),
  });
}

function csvResponse(body: string, filename: string): Response {
  return new Response(body, {
    status: 200,
    headers: buildCsvHeaders(encodeSize(body), filename),
  });
}

function apiError(status: number, code: string, message: string): Response {
  return jsonResponse({ ok: false, error: { code, message } }, status);
}

function methodNotAllowed(allowedMethods: string): Response {
  const response = apiError(405, "method_not_allowed", METHOD_NOT_ALLOWED);
  response.headers.set("Allow", allowedMethods);
  return response;
}

async function readJsonBody(req: Request): Promise<
  | { ok: true; value: unknown }
  | { ok: false; response: Response }
> {
  const contentType = req.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("application/json")) {
    return {
      ok: false,
      response: apiError(
        415,
        "unsupported_media_type",
        "Expected application/json.",
      ),
    };
  }

  const contentLength = req.headers.get("content-length");
  if (contentLength !== null) {
    const normalized = contentLength.trim();
    if (!/^(0|[1-9][0-9]*)$/.test(normalized)) {
      return { ok: false, response: apiError(400, "bad_request", BAD_REQUEST) };
    }
    if (Number(normalized) > MAX_JSON_BODY_BYTES) {
      return {
        ok: false,
        response: apiError(
          413,
          "payload_too_large",
          "Request body is too large.",
        ),
      };
    }
  }

  if (req.body === null) {
    return {
      ok: false,
      response: apiError(400, "empty_body", "Request body is required."),
    };
  }

  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;

    if (total > MAX_JSON_BODY_BYTES) {
      await reader.cancel();
      return {
        ok: false,
        response: apiError(
          413,
          "payload_too_large",
          "Request body is too large.",
        ),
      };
    }

    chunks.push(value);
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return { ok: true, value: JSON.parse(new TextDecoder().decode(bytes)) };
  } catch {
    return {
      ok: false,
      response: apiError(400, "invalid_json", "Submit valid JSON."),
    };
  }
}

async function serveWaitlist(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return methodNotAllowed("POST");
  }

  const body = await readJsonBody(req);
  if (!body.ok) return body.response;

  const result = await createWaitlistEntry(body.value);
  if (!result.ok) {
    const { status, code, message } = result.error;
    return apiError(status, code, message);
  }

  return jsonResponse({ ok: true, id: result.entry.id });
}

async function serveAdminLogin(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return methodNotAllowed("POST");
  }

  if (!isAdminSessionConfigured()) {
    return apiError(
      503,
      "admin_not_configured",
      "Admin sessions are not configured.",
    );
  }

  const body = await readJsonBody(req);
  if (!body.ok) return body.response;

  const password = typeof body.value === "object" && body.value !== null &&
      !Array.isArray(body.value)
    ? String((body.value as Record<string, unknown>).password ?? "")
    : "";
  if (password === "") {
    return apiError(400, "missing_password", "Password is required.");
  }

  const kv = await getKv();
  const passwordRecord = await kv.get<AdminPasswordRecord>(ADMIN_PASSWORD_KEY);
  if (passwordRecord.value === null) {
    return apiError(
      503,
      "admin_not_configured",
      "Admin password has not been created.",
    );
  }

  if (!(await verifyPassword(password, passwordRecord.value))) {
    return apiError(401, "invalid_credentials", "Invalid credentials.");
  }

  const token = await createAdminSessionToken();
  if (token === null) {
    return apiError(
      503,
      "admin_not_configured",
      "Admin sessions are not configured.",
    );
  }

  return jsonResponse({ ok: true, token });
}

async function requireAdmin(req: Request): Promise<Response | null> {
  const auth = req.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(auth);
  if (match === null || !(await verifyAdminSessionToken(match[1]))) {
    return apiError(401, "unauthorized", "Admin authorization is required.");
  }

  return null;
}

async function serveAdminWaitlist(req: Request, url: URL): Promise<Response> {
  if (req.method !== "GET") {
    return methodNotAllowed("GET");
  }

  const authError = await requireAdmin(req);
  if (authError !== null) return authError;

  const rawLimit = url.searchParams.get("limit");
  const limit = rawLimit === null ? 100 : Number.parseInt(rawLimit, 10);
  const entries = await listWaitlistEntries(
    Number.isInteger(limit) ? limit : 100,
  );

  return jsonResponse({ ok: true, entries });
}

async function serveAdminWaitlistCsv(req: Request): Promise<Response> {
  if (req.method !== "GET") {
    return methodNotAllowed("GET");
  }

  const authError = await requireAdmin(req);
  if (authError !== null) return authError;

  const entries = await listWaitlistEntries(500);
  return csvResponse(waitlistEntriesToCsv(entries), "praxedis-waitlist.csv");
}

async function serve404(req: Request): Promise<Response> {
  const path404 = config.publicDir + "/404.html";
  try {
    const f = await openFile(path404);
    const headers = buildHeaders({
      contentType: "text/html; charset=utf-8",
      size: f.size,
      mtime: f.mtime,
    });

    if (req.method === "HEAD") {
      f.stream.cancel();
      return new Response(null, { status: 404, headers });
    }

    return new Response(f.stream, { status: 404, headers });
  } catch {
    return textResponse(req, "Not Found", 404);
  }
}

function normalizeHostname(hostname: string): string {
  return hostname.toLowerCase().replace(/^\[(.*)\]$/, "$1");
}

function isAllowedHost(url: URL): boolean {
  return config.allowedHosts.includes(normalizeHostname(url.hostname));
}

function hasDisallowedRequestBody(req: Request): boolean {
  const contentLength = req.headers.get("content-length");
  if (contentLength !== null) {
    const normalized = contentLength.trim();
    if (!/^(0|[1-9][0-9]*)$/.test(normalized)) return true;
    return Number(normalized) > 0;
  }

  return req.headers.has("transfer-encoding");
}

export async function handler(req: Request): Promise<Response> {
  let url: URL;
  try {
    url = new URL(req.url);
  } catch {
    return textResponse(req, BAD_REQUEST, 400);
  }

  if (req.url.length > MAX_URL_LENGTH || !isAllowedHost(url)) {
    return textResponse(req, BAD_REQUEST, 400);
  }

  if (url.pathname === WAITLIST_PATH) {
    return await serveWaitlist(req);
  }

  if (url.pathname === ADMIN_LOGIN_PATH) {
    return await serveAdminLogin(req);
  }

  if (url.pathname === ADMIN_WAITLIST_PATH) {
    return await serveAdminWaitlist(req, url);
  }

  if (url.pathname === ADMIN_WAITLIST_CSV_PATH) {
    return await serveAdminWaitlistCsv(req);
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    return textResponse(req, METHOD_NOT_ALLOWED, 405, {
      Allow: "GET, HEAD",
    });
  }

  if (hasDisallowedRequestBody(req)) {
    return textResponse(req, BAD_REQUEST, 400);
  }

  if (url.pathname === HEALTH_PATH) {
    return serveHealth(req);
  }

  const route = await resolve(url);
  if (route.kind === "notFound") {
    return await serve404(req);
  }

  const filePath = route.path;
  let fileResult;
  try {
    fileResult = await openFile(filePath);
  } catch {
    return await serve404(req);
  }

  const ext = filePath.slice(filePath.lastIndexOf("."));
  const contentType = mimeType(ext);

  const headers = buildHeaders({
    contentType,
    size: fileResult.size,
    mtime: fileResult.mtime,
  });

  if (req.method === "HEAD") {
    fileResult.stream.cancel();
    return new Response(null, { status: 200, headers });
  }

  return new Response(fileResult.stream, { status: 200, headers });
}

if (import.meta.main) {
  console.log(`Serving on http://${config.host}:${config.port}`);
  Deno.serve({ port: config.port, hostname: config.host }, handler);
}
