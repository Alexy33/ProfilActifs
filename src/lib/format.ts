/**
 * Formats d'affichage partages.
 *
 * Les dates viennent de l'API en ISO 8601 (UTC) ; elles ne sont mises en forme
 * qu'au rendu, en fr-FR, comme dans la maquette : « 14 mars, 09:32 ».
 */

const DATE_TIME = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : DATE_TIME.format(date);
}

/** « 3 profils », « 1 profil » — l'accord que la maquette fait a la main. */
export function plural(count: number, singular: string, plural?: string): string {
  return `${count} ${count > 1 ? (plural ?? `${singular}s`) : singular}`;
}
