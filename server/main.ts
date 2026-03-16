import { config } from "./config.ts";
import { resolve } from "./router.ts";
import { openFile } from "./file.ts";
import { mimeType } from "./mime.ts";
import { buildHeaders } from "./headers.ts";

async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);

  if (req.method !== "GET" && req.method !== "HEAD") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const filePath = await resolve(url.pathname);
  if (filePath === null) {
    return new Response("Not Found", { status: 404 });
  }

  let fileResult;
  try {
    fileResult = await openFile(filePath);
  } catch {
    return new Response("Not Found", { status: 404 });
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
