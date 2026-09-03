import { PlayCircle } from "lucide-react";

function VideoFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-[#A8C5E0] bg-[#F5F9FE]">
      {children}
    </div>
  );
}

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
      <VideoFrame>
        <div className="flex aspect-video w-full flex-col items-center justify-center bg-[#E8F0F8] text-center">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-[#D1DEF0] text-[#1B2D3E]">
          <PlayCircle aria-hidden="true" className="size-7 stroke-[1.6]" />
        </div>
        <p className="mt-4 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[#1B2D3E]">
          Aucune présentation vidéo
        </p>
        </div>
      </VideoFrame>
    );
  }

  if (isUploadedVideo(videoUrl)) {
    return (
      <VideoFrame>
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video
          src={videoUrl}
          controls
          preload="metadata"
          playsInline
          className="aspect-video w-full"
        />
      </VideoFrame>
    );
  }

  const embed = toEmbedUrl(videoUrl);

  if (embed) {
    return (
      <VideoFrame>
        <iframe
          src={embed}
          title={`Présentation vidéo de ${name}`}
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="aspect-video w-full"
        />
      </VideoFrame>
    );
  }

  // URL renseignee mais d'un hebergeur qu'on ne sait pas embarquer : on
  // l'affiche sans pretendre la lire, plutot que de casser la page.
  return (
    <VideoFrame>
    <div className="flex aspect-video w-full flex-col items-center justify-center bg-[#E8F0F8] px-6 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-[#D1DEF0] text-[#1B2D3E]">
        <PlayCircle aria-hidden="true" className="size-7 stroke-[1.6]" />
      </div>
      <p className="mt-5 max-w-md break-all font-mono text-xs text-[#566274]">
        {videoUrl}
      </p>
      <p className="mt-2 font-mono text-xs font-semibold uppercase tracking-wider text-[#566274]">
        Format d&apos;hébergement non pris en charge
      </p>
    </div>
    </VideoFrame>
  );
}
