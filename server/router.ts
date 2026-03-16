import { config } from "./config.ts";

export async function resolve(urlPath: string): Promise<string | null> {
  const cleanPath = decodeURIComponent(urlPath.split("?")[0]);
  const filePath = cleanPath === "/" ? "/index.html" : cleanPath;

  const candidate = config.publicDir + filePath;

  let realPath: string;
  try {
    realPath = await Deno.realPath(candidate);
  } catch {
    return null;
  }

  const realPublic = await Deno.realPath(config.publicDir);
  if (!realPath.startsWith(realPublic + "/") && realPath !== realPublic) {
    return null;
  }

  return realPath;
}
