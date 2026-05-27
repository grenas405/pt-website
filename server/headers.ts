export interface FileInfo {
  contentType: string;
  size: number;
  mtime: Date | null;
}

export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "connect-src 'self'",
  "font-src 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "img-src 'self' data:",
  "object-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
].join("; ");

const CACHE_DURATION: Record<string, number> = {
  "text/html": 0,
  "text/css": 31536000,
  "text/javascript": 31536000,
  "font/woff": 31536000,
  "font/woff2": 31536000,
  "font/ttf": 31536000,
  "image/x-icon": 86400,
};

function applySecurityHeaders(h: Headers): void {
  h.set("Content-Security-Policy", CONTENT_SECURITY_POLICY);
  h.set("Cross-Origin-Opener-Policy", "same-origin");
  h.set("Cross-Origin-Resource-Policy", "same-origin");
  h.set("Origin-Agent-Cluster", "?1");
  h.set(
    "Permissions-Policy",
    "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()",
  );
  h.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  h.set("X-Content-Type-Options", "nosniff");
  h.set("X-Frame-Options", "DENY");
  h.set("X-Permitted-Cross-Domain-Policies", "none");
  h.set("X-XSS-Protection", "0");
  h.set("Referrer-Policy", "strict-origin-when-cross-origin");
}

export function buildHeaders(info: FileInfo): Headers {
  const h = new Headers();

  h.set("Content-Type", info.contentType);
  h.set("Content-Length", String(info.size));

  const ct = info.contentType.split(";")[0].trim();
  const maxAge = CACHE_DURATION[ct] ?? 3600;
  if (maxAge === 0) {
    h.set("Cache-Control", "no-cache, must-revalidate");
  } else {
    h.set("Cache-Control", `public, max-age=${maxAge}, immutable`);
  }

  if (info.mtime) {
    h.set("Last-Modified", info.mtime.toUTCString());
    h.set("ETag", `W/"${info.mtime.getTime()}-${info.size}"`);
  }

  applySecurityHeaders(h);

  return h;
}

export function buildJsonHeaders(size: number): Headers {
  const h = new Headers();

  h.set("Content-Type", "application/json; charset=utf-8");
  h.set("Content-Length", String(size));
  h.set("Cache-Control", "no-store");
  applySecurityHeaders(h);

  return h;
}

export function buildTextHeaders(size: number): Headers {
  const h = new Headers();

  h.set("Content-Type", "text/plain; charset=utf-8");
  h.set("Content-Length", String(size));
  h.set("Cache-Control", "no-store");
  applySecurityHeaders(h);

  return h;
}
