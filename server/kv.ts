import { config } from "./config.ts";

let kvPromise: Promise<Deno.Kv> | null = null;

async function ensureKvParentDir(path: string): Promise<void> {
  if (
    path === ":memory:" || path.startsWith("http://") ||
    path.startsWith("https://")
  ) {
    return;
  }

  const slashIndex = path.lastIndexOf("/");
  if (slashIndex <= 0) return;

  await Deno.mkdir(path.slice(0, slashIndex), { recursive: true });
}

export async function getKv(): Promise<Deno.Kv> {
  if (kvPromise === null) {
    kvPromise = (async () => {
      await ensureKvParentDir(config.kvPath);
      return await Deno.openKv(config.kvPath);
    })();
  }

  return await kvPromise;
}

export async function closeKvForTesting(): Promise<void> {
  if (kvPromise === null) return;
  const kv = await kvPromise;
  kv.close();
  kvPromise = null;
}
