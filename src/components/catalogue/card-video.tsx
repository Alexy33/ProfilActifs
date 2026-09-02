"use client";

import * as React from "react";
import { describeVideo } from "@/lib/video";

/**
 * Vignette video d'une carte du catalogue.
 *
 * Le catalogue est un fil : une vingtaine de cartes cohabitent a l'ecran, et
 * chacune peut porter une video. Rien n'est donc charge d'office —
 *
 * - fichier televerse : `<video preload="metadata">` ne tire que l'en-tete du
 *   fichier, de quoi afficher la premiere image et une timeline navigable
 *   (notre route `/api/videos/{id}` gere `Range`) ;
 * - plateforme externe : l'`<iframe>` n'est monte qu'au clic. Vingt iframes
 *   YouTube montes d'emblee, ce sont vingt documents et leurs scripts tiers.
 *
 * Une URL non integrable ne devient jamais un lecteur : `describeVideo` la
 * classe en lien, et on renvoie vers la source.
 */
export function CardVideo({ videoUrl, name }: { videoUrl: string | null; name: string }) {
  const source = describeVideo(videoUrl);
  const [playing, setPlaying] = React.useState(false);

  if (source.kind === "none") return null;

  if (source.kind === "uploaded") {
    return (
      <Frame>
        <video
          data-testid="card-video"
          src={source.src}
          controls
          preload="metadata"
          playsInline
          className="aspect-video w-full bg-neutral-900"
        >
          Votre navigateur ne sait pas lire cette vidéo.
        </video>
      </Frame>
    );
  }

  if (source.kind === "embed") {
    if (playing) {
      return (
        <Frame>
          <iframe
            data-testid="card-video-embed"
            src={`${source.src}?autoplay=1`}
            title={`Vidéo de présentation de ${name} (${source.provider})`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="aspect-video w-full border-0"
          />
        </Frame>
      );
    }

    return (
      <button
        type="button"
        data-testid="card-video-poster"
        onClick={() => setPlaying(true)}
        aria-label={`Lire la vidéo de présentation de ${name}`}
        className="group relative block w-full cursor-pointer border border-divider"
      >
        <Plate label={source.provider} />
      </button>
    );
  }

  return (
    <a
      href={source.href}
      target="_blank"
      rel="noreferrer noopener"
      aria-label={`Voir la vidéo de présentation de ${name} sur le site d'origine`}
      className="group relative block w-full border border-divider"
    >
      <Plate label="Lien externe" />
    </a>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return <div className="border border-divider bg-neutral-900">{children}</div>;
}

/** Planche hachuree de la maquette, en format vignette. */
function Plate({ label }: { label: string }) {
  return (
    <div className="duotone grid aspect-video w-full place-items-center bg-[repeating-linear-gradient(135deg,var(--color-neutral-200)_0_12px,var(--color-neutral-100)_12px_24px)]">
      <div className="text-center">
        <div className="mx-auto grid size-11 place-items-center border border-accent-700 text-[16px] text-accent-800 transition-colors group-hover:bg-accent-700 group-hover:text-white">
          ▶
        </div>
        <div className="mt-2 font-mono text-[10px] tracking-[0.1em] text-accent-800 uppercase">
          {label}
        </div>
      </div>
    </div>
  );
}
