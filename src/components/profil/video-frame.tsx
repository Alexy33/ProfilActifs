import { Blueprint } from "@/components/ui/blueprint";
import { describeVideo } from "@/lib/video";

/**
 * Emplacement de la video de presentation (CDC §3.2 : previsionnement sans
 * quitter la page).
 *
 * Trois rendus selon la source, decidee par `describeVideo` :
 * un fichier televerse est lu par une balise <video> servie par notre API
 * (qui gere `Range`, donc la timeline est navigable) ; une plateforme reconnue
 * passe par son <iframe> d'integration ; tout le reste reste une planche de la
 * maquette, avec un lien vers la source — mieux qu'un lecteur qui afficherait
 * « vidéo indisponible ».
 */
export function VideoFrame({ videoUrl }: { videoUrl: string | null }) {
  const source = describeVideo(videoUrl);

  if (source.kind === "uploaded") {
    return (
      <Blueprint className="bg-neutral-900">
        <video
          data-testid="video-player"
          src={source.src}
          controls
          preload="metadata"
          playsInline
          className="aspect-video w-full bg-neutral-900"
        >
          Votre navigateur ne sait pas lire cette vidéo.
        </video>
      </Blueprint>
    );
  }

  if (source.kind === "embed") {
    return (
      <Blueprint className="bg-neutral-900">
        <iframe
          data-testid="video-embed"
          src={source.src}
          title={`Vidéo de présentation (${source.provider})`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="aspect-video w-full border-0"
        />
      </Blueprint>
    );
  }

  return (
    <Blueprint className="duotone grid aspect-video place-items-center bg-[repeating-linear-gradient(135deg,var(--color-neutral-200)_0_12px,var(--color-neutral-100)_12px_24px)]">
      <div className="px-6 text-center">
        <div className="mx-auto grid size-16 place-items-center border border-accent-700 text-[22px] text-accent-800">
          ▶
        </div>
        <div className="mt-3.5 font-mono text-[11px] tracking-[0.1em] text-accent-800 uppercase">
          Vidéo de présentation — 60 s
        </div>
        {source.kind === "link" ? (
          <a
            href={source.href}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-1 block font-mono text-[10.5px] break-all text-accent-700 underline underline-offset-2"
          >
            {source.href}
          </a>
        ) : (
          <div className="mt-1 font-mono text-[10.5px] text-text/55">
            aucune vidéo renseignée
          </div>
        )}
      </div>
    </Blueprint>
  );
}
