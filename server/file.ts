export interface FileResult {
  stream: ReadableStream<Uint8Array>;
  size: number;
  mtime: Date | null;
}

export async function openFile(absolutePath: string): Promise<FileResult> {
  const stat = await Deno.stat(absolutePath);
  const file = await Deno.open(absolutePath, { read: true });

  return {
    stream: file.readable,
    size: stat.size,
    mtime: stat.mtime,
  };
}
