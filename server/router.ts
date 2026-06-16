import { config } from "./config.ts";
import { hasKnownMimeType } from "./mime.ts";

export type RouteResult =
  | { kind: "page"; path: string }
  | { kind: "asset"; path: string }
  | { kind: "notFound" };

async function resolvePublicFile(filePath: string): Promise<string | null> {
  const candidate = config.publicDir + filePath;

  let realPath: string;
  let realPublic: string;
  try {
    realPath = await Deno.realPath(candidate);
    realPublic = await Deno.realPath(config.publicDir);
  } catch {
    return null;
  }

  if (!realPath.startsWith(realPublic + "/") && realPath !== realPublic) {
    return null;
  }

  return realPath;
}

async function homePage(): Promise<string | null> {
  return await resolvePublicFile("/index.html");
}

async function aboutPage(): Promise<string | null> {
  return await resolvePublicFile("/about.html");
}

async function caseStudyPage(): Promise<string | null> {
  return await resolvePublicFile("/case-study.html");
}

async function missionPage(): Promise<string | null> {
  return await resolvePublicFile("/mission.html");
}

function decodePath(pathname: string): string | null {
  if (/%2f|%5c/i.test(pathname)) {
    return null;
  }

  try {
    return decodeURIComponent(pathname);
  } catch {
    return null;
  }
}

function hasControlCharacter(value: string): boolean {
  for (const char of value) {
    const code = char.charCodeAt(0);
    if (code <= 0x1f || code === 0x7f) return true;
  }

  return false;
}

function isSafePathname(pathname: string): boolean {
  if (!pathname.startsWith("/")) return false;
  if (hasControlCharacter(pathname)) return false;
  if (pathname.includes("\\")) return false;

  const segments = pathname.split("/");
  return segments.every((segment) =>
    segment !== "." && segment !== ".." && !segment.startsWith(".")
  );
}

function hasStaticAssetExtension(pathname: string): boolean {
  const basename = pathname.slice(pathname.lastIndexOf("/") + 1);
  if (
    !basename.includes(".") || pathname.endsWith("/") ||
    pathname.toLowerCase().endsWith(".html")
  ) {
    return false;
  }

  const ext = basename.slice(basename.lastIndexOf("."));
  return hasKnownMimeType(ext);
}

export async function resolve(url: URL): Promise<RouteResult> {
  const pathname = decodePath(url.pathname);
  if (pathname === null || !isSafePathname(pathname)) {
    return { kind: "notFound" };
  }

  if (pathname === "/") {
    const path = await homePage();
    return path === null ? { kind: "notFound" } : { kind: "page", path };
  }

  if (pathname === "/about") {
    const path = await aboutPage();
    return path === null ? { kind: "notFound" } : { kind: "page", path };
  }

  if (pathname === "/case-study") {
    const path = await caseStudyPage();
    return path === null ? { kind: "notFound" } : { kind: "page", path };
  }

  if (pathname === "/mission") {
    const path = await missionPage();
    return path === null ? { kind: "notFound" } : { kind: "page", path };
  }

  if (hasStaticAssetExtension(pathname)) {
    const path = await resolvePublicFile(pathname);
    return path === null ? { kind: "notFound" } : { kind: "asset", path };
  }

  return { kind: "notFound" };
}
