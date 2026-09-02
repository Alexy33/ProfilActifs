import { Blueprint } from "@/components/ui/blueprint";

/**
 * Emplacement de la video de presentation.
 *
 * Le demonstrateur ne diffuse pas les videos : le jeu d'essai ne contient que
 * des URL fictives, et un lecteur affichant « video indisponible » sur chaque
 * profil dirait moins bien la chose que la planche de la maquette. Le cadre
 * annonce le format attendu (60 s) et rappelle l'adresse enregistree.
 */
export function VideoFrame({ videoUrl }: { videoUrl: string | null }) {
  return (
    <Blueprint className="duotone grid aspect-video place-items-center bg-[repeating-linear-gradient(135deg,var(--color-neutral-200)_0_12px,var(--color-neutral-100)_12px_24px)]">
      <div className="text-center">
        <div className="mx-auto grid size-16 place-items-center border border-accent-700 text-[22px] text-accent-800">
          ▶
        </div>
        <div className="mt-3.5 font-mono text-[11px] tracking-[0.1em] text-accent-800 uppercase">
          Vidéo de présentation — 60 s
        </div>
        <div className="mt-1 font-mono text-[10.5px] break-all text-text/55">
          {videoUrl || "aucune vidéo renseignée"}
        </div>
      </div>
    </Blueprint>
  );
}
