import { createReadStream } from "node:fs";
import { mkdir, rm, stat, readdir, rename } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { Readable } from "node:stream";
import { MAX_VIDEO_BYTES, VIDEO_EXTENSION_BY_MIME } from "@/lib/video";

// Plafond et formats acceptes vivent dans `src/lib/video.ts` : l'interface doit
// pouvoir les lire pour refuser un fichier avant de l'envoyer, et elle ne peut
// pas importer ce module-ci (node:fs). Une seule definition, deux lecteurs.
export { MAX_VIDEO_BYTES };

const EXTENSION_BY_MIME = VIDEO_EXTENSION_BY_MIME;

const MIME_BY_EXTENSION: Record<string, string> = {
  mp4: "video/mp4",
  webm: "video/webm",
  ogv: "video/ogg",
  ogg: "video/ogg",
  mov: "video/quicktime",
  m4v: "video/mp4",
};

export function extensionForMime(mime: string | null | undefined): string | null {
  if (!mime) return null;
  return EXTENSION_BY_MIME[mime.split(";")[0].trim().toLowerCase()] ?? null;
}

function storageDir(): string {
  const dbPath = (process.env.DATABASE_URL ?? "file:./local.db").replace(/^file:/, "");
  const custom = process.env.VIDEO_UPLOAD_DIR?.trim();
  return custom ? resolve(custom) : resolve(dirname(dbPath), "uploads");
}

async function ensureDir(): Promise<string> {
  const dir = storageDir();
  await mkdir(dir, { recursive: true });
  return dir;
}

export class VideoTooLargeError extends Error {
  constructor() {
    super("Fichier trop volumineux : 100 Mo maximum (CDC §3.2).");
    this.name = "VideoTooLargeError";
  }
}

export interface StoredVideo {
  path: string;
  bytes: number;
  extension: string;
}

export async function saveProfileVideo(
  profileId: string,
  extension: string,
  body: ReadableStream<Uint8Array>,
): Promise<StoredVideo> {
  const dir = await ensureDir();

  await deleteProfileVideo(profileId);

  // `turbopackIgnore` : le dossier de stockage est resolu a l'execution
  // (DATABASE_URL ou VIDEO_UPLOAD_DIR), donc Turbopack ne peut pas le borner
  // statiquement et trace TOUT le projet dans la sortie standalone — sources et
  // local.db compris. Le chemin reste confine a `storageDir()`.
  const finalPath = join(dir, `${profileId}.${extension}`);
  const partPath = `${finalPath}.part`;

  const { createWriteStream } = await import("node:fs");
  const out = createWriteStream(partPath);

  let bytes = 0;
  try {
    const reader = body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_VIDEO_BYTES) {
        out.destroy();
        await rm(partPath, { force: true });
        throw new VideoTooLargeError();
      }
      if (!out.write(value)) {
        await new Promise<void>((ok) => out.once("drain", ok));
      }
    }
    await new Promise<void>((ok, ko) => out.end((err?: Error | null) => (err ? ko(err) : ok())));
  } catch (error) {
    out.destroy();
    await rm(partPath, { force: true });
    throw error;
  }

  if (bytes === 0) {
    await rm(partPath, { force: true });
    throw new Error("Corps de requête vide.");
  }

  await rename(partPath, finalPath);
  return { path: finalPath, bytes, extension };
}

export async function findProfileVideo(
  profileId: string,
): Promise<{ path: string; size: number; mime: string } | null> {
  try {
    const dir = storageDir();
    const entries = await readdir(dir);
    const match = entries.find(
      (name) => name.startsWith(`${profileId}.`) && !name.endsWith(".part"),
    );
    if (!match) return null;
    const path = join(dir, match);
    const info = await stat(path);
    const ext = match.split(".").pop()?.toLowerCase() ?? "";
    return { path, size: info.size, mime: MIME_BY_EXTENSION[ext] ?? "application/octet-stream" };
  } catch {
    return null;
  }
}

export async function deleteProfileVideo(profileId: string): Promise<void> {
  try {
    const dir = storageDir();
    const entries = await readdir(dir).catch(() => [] as string[]);
    await Promise.all(
      entries
        .filter((name) => name.startsWith(`${profileId}.`))
        .map((name) => rm(join(dir, name), { force: true })),
    );
  } catch {
    /* dossier absent */
  }
}

export function openVideoStream(
  path: string,
  size: number,
  rangeHeader: string | null,
): {
  status: 200 | 206;
  headers: Record<string, string>;
  stream: ReadableStream<Uint8Array>;
} {
  const parsed = parseRange(rangeHeader, size);

  if (!parsed) {
    return {
      status: 200,
      headers: { "Content-Length": String(size), "Accept-Ranges": "bytes" },
      stream: Readable.toWeb(createReadStream(path)) as ReadableStream<Uint8Array>,
    };
  }

  const { start, end } = parsed;
  return {
    status: 206,
    headers: {
      "Content-Length": String(end - start + 1),
      "Content-Range": `bytes ${start}-${end}/${size}`,
      "Accept-Ranges": "bytes",
    },
    stream: Readable.toWeb(createReadStream(path, { start, end })) as ReadableStream<Uint8Array>,
  };
}

function parseRange(header: string | null, size: number): { start: number; end: number } | null {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) return null;

  const [, rawStart, rawEnd] = match;
  let start = rawStart ? Number(rawStart) : 0;
  let end = rawEnd ? Number(rawEnd) : size - 1;

  if (rawStart === "" && rawEnd !== "") {
    start = Math.max(0, size - Number(rawEnd));
    end = size - 1;
  }

  if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= size) return null;
  return { start, end: Math.min(end, size - 1) };
}
