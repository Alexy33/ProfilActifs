import { Blueprint } from "@/components/ui/blueprint";
import { parseCatalogParams, type RawSearchParams } from "@/lib/catalog-params";
import { plural } from "@/lib/format";
import { getSession, roleOf } from "@/lib/session";
import { searchCatalog } from "@/server/services/profiles";
import { getSettings } from "@/server/services/settings";
import { listFavorites } from "@/server/services/dashboard";
import { MAX_PAGE_SIZE } from "@/lib/vocabulary";
import { FilterPanel } from "@/components/catalogue/filter-panel";
import { ProfileCard } from "@/components/catalogue/profile-card";
import { Pagination } from "@/components/catalogue/pagination";

export const dynamic = "force-dynamic";

/**
 * Catalogue public.
 *
 * Les filtres vivent dans la query string : la page est rendue cote serveur a
 * partir de l'URL, une recherche se partage par copier-coller, et le bouton
 * « precedent » du navigateur remonte le fil des filtres.
 */
export default async function CataloguePage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const [params, settings, session] = await Promise.all([
    searchParams,
    getSettings(),
    getSession(),
  ]);

  const filters = parseCatalogParams(params, settings.catalogPageSize);
  const results = await searchCatalog(filters);

  const isRecruiter = roleOf(session) === "recruiter";
  // Les favoris ne sont charges que pour un recruteur : c'est le seul role a
  // qui l'etoile est proposee.
  const favorites = isRecruiter
    ? new Set((await listFavorites(session!.user.id)).map((row) => row.profile.id))
    : new Set<string>();

  const { meta } = results;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-6 border-b border-divider pb-5">
        <div>
          <div className="font-mono text-[11px] tracking-[0.16em] text-accent-700 uppercase">
            Catalogue public
          </div>
          <h1 className="mt-2.5 text-[42px] leading-none uppercase">Profils actifs</h1>
        </div>
        <div data-testid="result-count" className="font-mono text-xs text-text/60">
          {plural(meta.total, "profil")} — page {meta.page}/{meta.totalPages}
        </div>
      </div>

      <div className="mt-7 grid items-start gap-8 lg:grid-cols-[260px_1fr]">
        <FilterPanel filters={filters} />

        <div>
          {results.items.length > 0 ? (
            <div className="grid gap-[22px] sm:grid-cols-2">
              {results.items.map((profile) => (
                <ProfileCard
                  key={profile.id}
                  profile={profile}
                  canFavorite={isRecruiter}
                  favorited={favorites.has(profile.id)}
                />
              ))}
            </div>
          ) : (
            <Blueprint className="px-5 py-15 text-center text-[15px] text-text/55">
              Aucun profil ne correspond à ces critères.
            </Blueprint>
          )}

          <div className="mt-7 flex flex-wrap items-center justify-between gap-4 border-t border-divider pt-[18px]">
            <div className="font-mono text-[11.5px] text-text/55">
              Pagination — {meta.pageSize} profils par page (plafond réglementaire : {MAX_PAGE_SIZE}
              )
            </div>
            <Pagination filters={filters} meta={meta} />
          </div>
        </div>
      </div>
    </div>
  );
}
