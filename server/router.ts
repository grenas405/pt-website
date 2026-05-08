import { config } from "./config.ts";

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

function decodePath(pathname: string): string | null {
  try {
    return decodeURIComponent(pathname);
  } catch {
    return null;
  }
}

function hasStaticAssetExtension(pathname: string): boolean {
  const basename = pathname.slice(pathname.lastIndexOf("/") + 1);
  return basename.includes(".") && !pathname.endsWith("/") &&
    !pathname.toLowerCase().endsWith(".html");
}

export async function resolve(url: URL): Promise<RouteResult> {
  const pathname = decodePath(url.pathname);
  if (pathname === null) {
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

  if (hasStaticAssetExtension(pathname)) {
    const path = await resolvePublicFile(pathname);
    return path === null ? { kind: "notFound" } : { kind: "asset", path };
  }

  return { kind: "notFound" };
}
