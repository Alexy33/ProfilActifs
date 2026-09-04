/**
 * Affichage des horodatages.
 *
 * Source de verite UNIQUE du format : le tableau de bord candidat, la page de
 * consentement et la moderation admin importent d'ici.
 *
 * Le fuseau est FIXE a Europe/Paris, pas laisse a la machine. Sans cela, le
 * serveur rend l'heure UTC et le navigateur l'heure locale : React voit deux
 * textes differents pour le meme instant et l'hydratation echoue. Le dispositif
 * s'adresse a un public en France, donc le fuseau attendu est aussi le bon.
 */

/** Format commun : « 4 septembre 2026 à 10:58 ». */
const TIMESTAMP = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "Europe/Paris",
});

/** Jour seul : « 04/09/2026 ». */
const DAY = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris" });

/** Horodatage lisible, ou tiret : ces champs sont souvent vides. */
export function formatTimestamp(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : TIMESTAMP.format(date);
}

/** Jour lisible, ou tiret. */
export function formatDay(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : DAY.format(date);
}
