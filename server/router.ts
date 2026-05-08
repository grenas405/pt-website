import { config } from "./config.ts";

export type RouteResult =
  | { kind: "page"; path: string }
  | { kind: "asset"; path: string }
  | { kind: "redirect"; location: string; status: 308 }
  | { kind: "notFound" };

const REDIRECTS: Record<string, string> = {
  "/about.html": "/about",
  "/about/": "/about",
  "/case-study.html": "/case-study",
  "/case-study/": "/case-study",
  "/heavenly-roofing": "/case-study",
  "/heavenly-roofing.html": "/case-study",
  "/heavenly-roofing/": "/case-study",
};

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

function withSearch(pathname: string, search: string): string {
  return search === "" ? pathname : `${pathname}${search}`;
}

function hasFileExtension(pathname: string): boolean {
  const basename = pathname.slice(pathname.lastIndexOf("/") + 1);
  return basename.includes(".") && !pathname.endsWith("/");
}

export async function resolve(url: URL): Promise<RouteResult> {
  const pathname = decodePath(url.pathname);
  if (pathname === null) {
    return { kind: "notFound" };
  }

  const redirectTarget = REDIRECTS[pathname];
  if (redirectTarget !== undefined) {
    return {
      kind: "redirect",
      location: withSearch(redirectTarget, url.search),
      status: 308,
    };
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

  if (hasFileExtension(pathname)) {
    const path = await resolvePublicFile(pathname);
    return path === null ? { kind: "notFound" } : { kind: "asset", path };
  }

  return { kind: "notFound" };
}
