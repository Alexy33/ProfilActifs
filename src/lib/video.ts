/**
 * Vocabulaire de la video de presentation, partage serveur et client.
 *
 * `profile.videoUrl` porte TOUJOURS une URL, quelle que soit la source
 * (cf. docs/video.md) :
 *
 * - lien externe : l'adresse saisie par le candidat (YouTube, Vimeo) ;
 * - upload direct : `/api/videos/{profileId}?t=<ts>`, servi par notre API.
 *
 * Une seule colonne, deux lectures : c'est ici qu'on decide laquelle.
 */

/** Plafond du CDC §3.2. Le serveur l'applique aussi, en streaming. */
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

/** Formats acceptes a l'upload, et l'extension retenue sur disque. */
export const VIDEO_EXTENSION_BY_MIME: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/ogg": "ogv",
  "video/quicktime": "mov",
};

export const ACCEPTED_VIDEO_MIME = Object.keys(VIDEO_EXTENSION_BY_MIME);

/** Valeur de l'attribut `accept` du selecteur de fichier. */
export const VIDEO_ACCEPT = [...ACCEPTED_VIDEO_MIME, ".mp4", ".webm", ".ogv", ".mov"].join(",");

export type VideoSource =
  /** Aucune video renseignee. */
  | { kind: "none" }
  /** Fichier televerse, servi par `GET /api/videos/{id}` — balise <video>. */
  | { kind: "uploaded"; src: string }
  /** Plateforme reconnue — <iframe> d'integration. */
  | { kind: "embed"; src: string; provider: "YouTube" | "Vimeo"; href: string }
  /** URL non reconnue : on ne devine pas, on renvoie vers la source. */
  | { kind: "link"; href: string };

function youtubeId(url: URL): string | null {
  const host = url.hostname.replace(/^www\./, "");

  if (host === "youtu.be") return url.pathname.slice(1) || null;
  if (host !== "youtube.com" && host !== "m.youtube.com") return null;

  if (url.pathname === "/watch") return url.searchParams.get("v");

  // /embed/<id> et /shorts/<id>
  const match = /^\/(embed|shorts|v)\/([^/]+)/.exec(url.pathname);
  return match ? match[2] : null;
}

function vimeoId(url: URL): string | null {
  const host = url.hostname.replace(/^www\./, "");
  if (host !== "vimeo.com" && host !== "player.vimeo.com") return null;

  // L'integration Vimeo exige un identifiant numerique : un lien vers une page
  // au titre litteral n'est pas integrable, il devient un simple lien.
  const match = /(\d+)(?:$|[/?#])/.exec(url.pathname);
  return match ? match[1] : null;
}

/**
 * Classe une `videoUrl` pour savoir comment l'afficher.
 *
 * Ne devine jamais : une URL non reconnue devient un lien sortant plutot qu'un
 * `<iframe>` qui afficherait « vidéo indisponible ».
 */
export function describeVideo(videoUrl: string | null | undefined): VideoSource {
  const raw = videoUrl?.trim();
  if (!raw) return { kind: "none" };

  // Chemin servi par notre propre API : c'est un fichier televerse.
  if (raw.startsWith("/api/videos/")) return { kind: "uploaded", src: raw };

  let url: URL;
  try {
    // Un candidat tape volontiers « youtube.com/... » sans protocole.
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return { kind: "link", href: raw };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { kind: "link", href: raw };
  }

  const yt = youtubeId(url);
  if (yt) {
    return {
      kind: "embed",
      provider: "YouTube",
      src: `https://www.youtube.com/embed/${encodeURIComponent(yt)}`,
      href: url.toString(),
    };
  }

  const vimeo = vimeoId(url);
  if (vimeo) {
    return {
      kind: "embed",
      provider: "Vimeo",
      src: `https://player.vimeo.com/video/${encodeURIComponent(vimeo)}`,
      href: url.toString(),
    };
  }

  return { kind: "link", href: url.toString() };
}

/** « 12,4 Mo » — pour annoncer un poids de fichier a l'utilisateur. */
export function formatBytes(bytes: number): string {
  const mo = bytes / (1024 * 1024);
  return `${mo.toFixed(mo < 10 ? 1 : 0).replace(".", ",")} Mo`;
}
