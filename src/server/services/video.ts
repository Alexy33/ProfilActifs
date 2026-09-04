import { createReadStream } from "node:fs";
import { mkdir, rm, stat, readdir, rename } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { Readable } from "node:stream";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { profile } from "@/db/schema";
import { VIDEO_CONSENT_VERSION, type VideoStatus } from "@/lib/vocabulary";

export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

const EXTENSION_BY_MIME: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/ogg": "ogv",
  "video/quicktime": "mov",
};

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

export class MissingVideoConsentError extends Error {
  constructor() {
    super(
      "Aucun consentement en cours pour la diffusion de la video. " +
        "Acceptez le texte en vigueur avant d'envoyer un fichier.",
    );
    this.name = "MissingVideoConsentError";
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
  // Rien n'entre en stockage sans accord en cours : un fichier depose avant le
  // consentement serait deja un hebergement non couvert, meme bref.
  const consent = await readVideoConsent(profileId);
  if (!consent?.granted) throw new MissingVideoConsentError();

  const dir = await ensureDir();

  await deleteProfileVideo(profileId);

  const finalPath = join(/*turbopackIgnore: true*/ dir, `${profileId}.${extension}`);
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

  // Un fichier neuf n'herite jamais de la decision prise sur celui qu'il
  // remplace : il repart en attente de moderation (R.2).
  await resetVideoModeration(profileId);

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
    const path = join(/*turbopackIgnore: true*/ dir, match);
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
        .map((name) => rm(join(/*turbopackIgnore: true*/ dir, name), { force: true })),
    );
  } catch {
    /* dossier absent */
  }
}

/* --------------------------------------------------------------------------
 * Consentement a la diffusion (R.3)
 *
 * Le consentement vit ici et non dans un service separe : il porte sur le
 * fichier, et son retrait doit supprimer ce fichier. Les tenir a distance l'un
 * de l'autre laisserait exister le cas ou l'accord est retire en base pendant
 * que la video reste sur le disque, qui est precisement ce qu'il faut rendre
 * impossible.
 * ----------------------------------------------------------------------- */

export interface VideoConsent {
  granted: boolean;
  /** Date de l'accord en cours, ou du dernier accord donne s'il a ete retire. */
  grantedAt: Date | null;
  /** Version du texte effectivement acceptee, telle qu'enregistree. */
  version: string | null;
  revokedAt: Date | null;
}

export async function readVideoConsent(profileId: string): Promise<VideoConsent | null> {
  const [row] = await db
    .select({
      granted: profile.videoConsentGranted,
      grantedAt: profile.videoConsentAt,
      version: profile.videoConsentVersion,
      revokedAt: profile.videoConsentRevokedAt,
    })
    .from(profile)
    .where(eq(profile.id, profileId))
    .limit(1);

  return row ?? null;
}

/**
 * Enregistre un accord sur le texte en vigueur.
 *
 * La version est prise de `VIDEO_CONSENT_VERSION` et non fournie par
 * l'appelant : c'est le serveur qui sait quel texte il a affiche, et un client
 * ne doit pas pouvoir declarer un accord sur une redaction qui n'est plus la
 * sienne. `revokedAt` est remis a null : un nouvel accord ouvre une periode
 * nouvelle, l'ancien retrait n'a plus a la borner.
 */
export async function grantVideoConsent(profileId: string): Promise<VideoConsent> {
  const now = new Date();
  await db
    .update(profile)
    .set({
      videoConsentGranted: true,
      videoConsentAt: now,
      videoConsentVersion: VIDEO_CONSENT_VERSION,
      videoConsentRevokedAt: null,
      updatedAt: now,
    })
    .where(eq(profile.id, profileId));

  // Relu depuis la base et non renvoye de memoire : SQLite stocke des secondes
  // entieres, et un appelant qui comparerait la valeur rendue a celle relue plus
  // tard trouverait deux horodatages differents pour le meme accord.
  const stored = await readVideoConsent(profileId);
  return stored ?? { granted: true, grantedAt: now, version: VIDEO_CONSENT_VERSION, revokedAt: null };
}

/**
 * Retire le consentement et supprime physiquement la video.
 *
 * La suppression passe par `deleteProfileVideo`, le service deja utilise a la
 * suppression d'un profil par l'administration : un seul chemin d'effacement,
 * donc un seul endroit ou se tromper. Le retrait n'est pas un masquage — le
 * profil reste, seul le fichier disparait, avec l'URL qui y menait.
 *
 * L'ordre compte : le fichier part d'abord. Si l'ecriture en base echouait
 * apres coup, on aurait un consentement encore marque valide pour une video qui
 * n'existe plus, ce qui se corrige ; l'inverse laisserait le fichier sur le
 * disque sans accord pour le couvrir, ce qui est la faute a eviter.
 *
 * `videoConsentAt` et `videoConsentVersion` sont conserves : ils disent ce qui
 * avait ete accepte et quand, et c'est ce qui rend le registre auditable.
 */
export async function revokeVideoConsent(profileId: string): Promise<VideoConsent> {
  await deleteProfileVideo(profileId);

  const now = new Date();
  await db
    .update(profile)
    .set({
      videoConsentGranted: false,
      videoConsentRevokedAt: now,
      videoUrl: null,
      // Le fichier vient d'etre efface : la decision de moderation n'a plus
      // d'objet, la conserver ferait etat d'une video validee qui n'existe pas.
      videoStatus: "pending",
      videoReviewReason: null,
      videoReviewedBy: null,
      videoReviewedAt: null,
      updatedAt: now,
    })
    .where(eq(profile.id, profileId));

  const after = await readVideoConsent(profileId);
  return after ?? { granted: false, grantedAt: null, version: null, revokedAt: now };
}

/* --------------------------------------------------------------------------
 * Moderation de la video avant publication (R.2)
 *
 * Meme raison qu'au-dessus pour loger cela ici : la moderation porte sur le
 * fichier. Un depot repasse la video en `pending` dans la MEME operation que
 * l'ecriture disque, sinon il existerait un instant ou un fichier neuf porte
 * encore la validation de celui qu'il remplace.
 * ----------------------------------------------------------------------- */

export interface VideoModeration {
  status: VideoStatus;
  /** Motif de la decision. Montre au candidat en cas de refus. */
  reason: string | null;
  /** Identifiant de l'administrateur qui a decide. */
  decidedBy: string | null;
  decidedAt: Date | null;
}

export async function readVideoModeration(profileId: string): Promise<VideoModeration | null> {
  const [row] = await db
    .select({
      status: profile.videoStatus,
      reason: profile.videoReviewReason,
      decidedBy: profile.videoReviewedBy,
      decidedAt: profile.videoReviewedAt,
    })
    .from(profile)
    .where(eq(profile.id, profileId))
    .limit(1);

  return row ?? null;
}

/**
 * Remet la video en attente de moderation.
 *
 * Appele a chaque fois que le contenu change : upload, suppression, ou
 * remplacement du lien externe. La decision precedente est EFFACEE et non
 * conservee — elle portait sur un autre fichier, la garder afficherait au
 * candidat le motif d'un refus qui ne concerne plus rien.
 */
export async function resetVideoModeration(profileId: string): Promise<void> {
  await db
    .update(profile)
    .set({
      videoStatus: "pending",
      videoReviewReason: null,
      videoReviewedBy: null,
      videoReviewedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(profile.id, profileId));
}

/**
 * Enregistre une decision de moderation.
 *
 * Les quatre colonnes sont ecrites ensemble : statut, motif, auteur et date.
 * Un refus sans motif n'est pas acceptable — le candidat doit pouvoir savoir ce
 * qu'on lui reproche — et c'est le contrat de route qui l'impose a l'entree.
 */
export async function decideVideoModeration(
  profileId: string,
  decision: Exclude<VideoStatus, "pending">,
  moderatorId: string,
  reason: string | null,
): Promise<VideoModeration | null> {
  await db
    .update(profile)
    .set({
      videoStatus: decision,
      videoReviewReason: reason,
      videoReviewedBy: moderatorId,
      videoReviewedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(profile.id, profileId));

  return readVideoModeration(profileId);
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
