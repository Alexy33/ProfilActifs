import { CatalogQuery } from "@/server/contracts/profile";
import type { CatalogFilters } from "@/server/services/profiles";

/**
 * Traduction entre l'URL du catalogue et les filtres du service.
 *
 * Les filtres vivent dans la query string, pas dans un etat React : une
 * recherche est alors partageable, le bouton « precedent » du navigateur
 * fonctionne, et la page peut etre rendue cote serveur.
 *
 * La lecture rejoue `CatalogQuery` — le contrat de `GET /api/profiles` — pour
 * que la page et l'API acceptent exactement les memes entrees, plafond
 * reglementaire de 20 profils par page compris (CDC 3.4).
 */

export type RawSearchParams = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[value.length - 1] : value;

const all = (value: string | string[] | undefined): string[] | undefined => {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value : [value];
};

export function parseCatalogParams(
  params: RawSearchParams,
  defaultPageSize: number,
): CatalogFilters {
  const raw = {
    q: first(params.q),
    sector: first(params.sector),
    city: first(params.city),
    certified: first(params.certified),
    hasVideo: first(params.hasVideo),
    skills: all(params.skills),
    page: first(params.page),
    pageSize: first(params.pageSize) ?? String(defaultPageSize),
  };

  // Une URL bricolee a la main (secteur inconnu, page negative) ne doit pas
  // faire tomber l'ecran : on retombe sur le catalogue non filtre.
  const parsed = CatalogQuery.safeParse(raw);
  if (!parsed.success) {
    return { page: 1, pageSize: defaultPageSize };
  }

  const { q, ...rest } = parsed.data;
  return { ...rest, q: q?.trim() ? q.trim() : undefined };
}

/** Serialise des filtres vers une query string, en omettant les valeurs vides. */
export function catalogSearchParams(filters: Partial<CatalogFilters>): string {
  const search = new URLSearchParams();

  if (filters.q) search.set("q", filters.q);
  if (filters.sector) search.set("sector", filters.sector);
  if (filters.city) search.set("city", filters.city);
  if (filters.certified) search.set("certified", "true");
  if (filters.hasVideo) search.set("hasVideo", "true");
  for (const skill of filters.skills ?? []) search.append("skills", skill);
  // La page 1 est l'etat par defaut : l'ecrire alourdirait l'URL pour rien.
  if (filters.page && filters.page > 1) search.set("page", String(filters.page));

  return search.toString();
}

export function catalogHref(filters: Partial<CatalogFilters>): string {
  const query = catalogSearchParams(filters);
  return query ? `/catalogue?${query}` : "/catalogue";
}
