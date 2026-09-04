import Link from "next/link";

/**
 * Bloc-marque de l'Etat (charte graphique ministerielle, R.10).
 *
 * La charte impose trois choses que ce composant tient ensemble :
 *
 *  1. « Bloc-marque en haut a gauche » — il est place en tete de la barre
 *     laterale et en tete des pages qui n'en ont pas, toujours au premier
 *     element du flux.
 *  2. « Zone de protection respectee » — la charte de l'Etat exige autour du
 *     bloc un espace libre d'au moins la moitie de la hauteur du bloc RF.
 *     Le `padding` porte cette reserve dans le composant lui-meme plutot que
 *     de la confier a chaque page : une marge oubliee cote appelant ne peut
 *     donc pas la supprimer.
 *  3. « Jamais sur une photo » — le fond est opaque et fixe. Le composant ne
 *     prend pas de prop de transparence : il n'y a pas de variante posable sur
 *     une image, ce qui rend la faute impossible plutot que deconseillee.
 *
 * Un seul composant reutilise partout : la marque ne peut pas deriver d'un
 * ecran a l'autre, ce qui est precisement ce que la charte cherche a garantir.
 */
export function BlocMarque({ asLink = true }: { asLink?: boolean }) {
  const contenu = (
    <>
      {/* Bloc « Republique Francaise ». La devise est en Marianne, en
          capitales, comme le prevoit le bloc-marque officiel. */}
      <span className="flex flex-col leading-[1.15]">
        <span
          className="font-heading text-[11px] font-bold uppercase tracking-[0.08em] text-[#1B3A6B]"
          style={{ fontFamily: "Marianne, system-ui, sans-serif" }}
        >
          République
        </span>
        <span
          className="font-heading text-[11px] font-bold uppercase tracking-[0.08em] text-[#1B3A6B]"
          style={{ fontFamily: "Marianne, system-ui, sans-serif" }}
        >
          Française
        </span>
        <span
          aria-hidden="true"
          className="mt-1 font-heading text-[8px] font-medium italic tracking-tight text-[#41556E]"
          style={{ fontFamily: "Marianne, system-ui, sans-serif" }}
        >
          Liberté · Égalité · Fraternité
        </span>
      </span>

      {/* Filet de separation entre le bloc RF et la marque du service. */}
      <span aria-hidden="true" className="h-10 w-px shrink-0 bg-[#1B3A6B]/25" />

      <span className="flex flex-col leading-tight">
        <span
          className="text-[15px] font-bold tracking-tight text-[#1B3A6B]"
          style={{ fontFamily: "Marianne, system-ui, sans-serif" }}
        >
          ProfilsActifs
        </span>
        <span className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.06em] text-[#41556E]">
          Ministère du Job et Bonheur
        </span>
      </span>
    </>
  );

  // `p-4` = zone de protection ; `bg-white` = fond opaque impose.
  const classes =
    "flex items-center gap-3 rounded-2xl bg-white p-4 no-underline";

  if (!asLink) {
    return <div className={classes}>{contenu}</div>;
  }

  return (
    <Link href="/" className={classes} aria-label="ProfilsActifs — Ministère du Job et Bonheur, accueil">
      {contenu}
    </Link>
  );
}
