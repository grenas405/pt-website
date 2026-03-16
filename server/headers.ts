export interface FileInfo {
  contentType: string;
  size: number;
  mtime: Date | null;
}

const CACHE_DURATION: Record<string, number> = {
  "text/html": 0,
  "text/css": 31536000,
  "text/javascript": 31536000,
  "image/x-icon": 86400,
};

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
    h.set("ETag", `W/"${info.mtime.getTime()}"`);
  }

  h.set("X-Content-Type-Options", "nosniff");
  h.set("X-Frame-Options", "DENY");
  h.set("Referrer-Policy", "strict-origin-when-cross-origin");

  return h;
}
