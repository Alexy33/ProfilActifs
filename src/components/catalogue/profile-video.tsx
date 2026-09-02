import { PlayCircle } from "lucide-react";

/**
 * Presentation video d'un profil (CDC 3.2).
 *
 * Le prévisionnement doit se faire « sans quitter la page de profil » : la
 * video est donc jouee en place, jamais derriere un lien sortant. Deux sources
 * possibles pour une seule colonne `videoUrl` (cf. docs/video.md) : un lien
 * YouTube/Vimeo, rendu en iframe, ou un upload servi par `/api/videos/{id}`,
 * rendu par le lecteur natif.
 */

/** Convertit une URL YouTube/Vimeo en URL embarquable ; null si non reconnue. */
export function toEmbedUrl(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw, "https://localhost");
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "");

  if (host === "youtu.be") {
    const id = url.pathname.slice(1);
    return id ? `https://www.youtube.com/embed/${id}` : null;
  }

  if (host === "youtube.com" || host === "m.youtube.com") {
    if (url.pathname === "/watch") {
      const id = url.searchParams.get("v");
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (url.pathname.startsWith("/embed/")) return url.toString();
    return null;
  }

  if (host === "vimeo.com") {
    const id = url.pathname.split("/").filter(Boolean)[0];
    return id ? `https://player.vimeo.com/video/${id}` : null;
  }

  if (host === "player.vimeo.com") return url.toString();

  return null;
}

/** Un upload maison est servi par notre API, pas par un hebergeur tiers. */
function isUploadedVideo(raw: string): boolean {
  return raw.startsWith("/api/videos/");
}

export function ProfileVideo({ videoUrl, name }: { videoUrl: string | null; name: string }) {
  if (!videoUrl) {
    return (
      <div className="flex aspect-video w-full flex-col items-center justify-center rounded-3xl border border-[#5980a6]/15 bg-white/55 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-[#5980a6]/10 text-[#5980a6]">
          <PlayCircle aria-hidden="true" className="size-7 stroke-[1.6]" />
        </div>
        <p className="mt-5 font-mono text-xs font-semibold uppercase tracking-wider text-[#718096]">
          Aucune présentation vidéo
        </p>
      </div>
    );
  }

  if (isUploadedVideo(videoUrl)) {
    return (
      <div className="overflow-hidden rounded-3xl border border-[#5980a6]/15 bg-black">
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video
          src={videoUrl}
          controls
          preload="metadata"
          playsInline
          className="aspect-video w-full"
        />
      </div>
    );
  }

  const embed = toEmbedUrl(videoUrl);

  if (embed) {
    return (
      <div className="overflow-hidden rounded-3xl border border-[#5980a6]/15 bg-black">
        <iframe
          src={embed}
          title={`Présentation vidéo de ${name}`}
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="aspect-video w-full"
        />
      </div>
    );
  }

  // URL renseignee mais d'un hebergeur qu'on ne sait pas embarquer : on
  // l'affiche sans pretendre la lire, plutot que de casser la page.
  return (
    <div className="flex aspect-video w-full flex-col items-center justify-center rounded-3xl border border-[#5980a6]/15 bg-white/55 px-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-[#5980a6]/10 text-[#5980a6]">
        <PlayCircle aria-hidden="true" className="size-7 stroke-[1.6]" />
      </div>
      <p className="mt-5 max-w-md break-all font-mono text-xs text-[#718096]">
        {videoUrl}
      </p>
      <p className="mt-2 font-mono text-xs font-semibold uppercase tracking-wider text-[#718096]">
        Format d&apos;hébergement non pris en charge
      </p>
    </div>
  );
}
