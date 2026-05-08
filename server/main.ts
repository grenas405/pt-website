import { config } from "./config.ts";
import { resolve } from "./router.ts";
import { openFile } from "./file.ts";
import { mimeType } from "./mime.ts";
import { buildHeaders, buildJsonHeaders, buildTextHeaders } from "./headers.ts";

const HEALTH_PATH = "/api/health";
const ANSI_ESCAPE = "\x1b";

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

async function serve404(): Promise<Response> {
  const path404 = config.publicDir + "/404.html";
  try {
    const f = await openFile(path404);
    const headers = buildHeaders({
      contentType: "text/html; charset=utf-8",
      size: f.size,
      mtime: f.mtime,
    });
    return new Response(f.stream, { status: 404, headers });
  } catch {
    return new Response("Not Found", { status: 404 });
  }
}

async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);

  if (req.method !== "GET" && req.method !== "HEAD") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: { Allow: "GET, HEAD" },
    });
  }

  if (url.pathname === HEALTH_PATH) {
    return serveHealth(req);
  }

  const filePath = await resolve(url.pathname);
  if (filePath === null) {
    return await serve404();
  }

  let fileResult;
  try {
    fileResult = await openFile(filePath);
  } catch {
    return await serve404();
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

console.log(`Serving on http://${config.host}:${config.port}`);

Deno.serve({ port: config.port, hostname: config.host }, handler);
