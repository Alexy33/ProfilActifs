import { Suspense } from "react";
import type { Metadata } from "next";
import { SearchX } from "lucide-react";

import { CatalogueFilters } from "@/components/catalogue/catalogue-filters";
import { CataloguePagination } from "@/components/catalogue/catalogue-pagination";
import { ProfileCard } from "@/components/catalogue/profile-card";
import { SiteShell } from "@/components/layout/site-shell";
import { CITIES, SECTORS, SKILLS } from "@/lib/vocabulary";
import { CatalogQuery } from "@/server/contracts/profile";
import { getSettings } from "@/server/services/settings";
import { searchCatalog } from "@/server/services/profiles";
import { getCurrentSession } from "@/lib/auth-session";
import { db } from "@/db";
import { favorite } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Catalogue des profils — ProfilsActifs",
  description:
    "Consultez les profils des demandeurs d'emploi : compétences, secteur, localisation et certification JEB. Accessible sans compte recruteur.",
};

type SearchParams = Record<string, string | string[] | undefined>;

/**
 * Catalogue public des profils (CDC 2.1 « Espace recruteur », 2.3, 3.4).
 *
 * Consultable sans session : le cahier des charges impose que les profils
 * soient visibles sans compte recruteur, pour maximiser la visibilite des
 * candidats. Les filtres et la page vivent dans l'URL et sont valides par le
 * meme contrat Zod que la route `/api/profiles`, de sorte qu'une URL bricolee a
 * la main ne peut pas depasser le plafond reglementaire de 20 profils par page.
 */
export default async function CataloguePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const raw = await searchParams;
  const settings = await getSettings();

  // `skills` est repetable (?skills=A&skills=B) : on normalise en tableau avant
  // de valider. Le reste des parametres est scalaire.
  const skillsParam = raw.skills;
  const candidate = {
    ...raw,
    skills: skillsParam === undefined ? undefined : [skillsParam].flat(),
    pageSize: raw.pageSize ?? settings.catalogPageSize,
  };

  // Filtres invalides (secteur inexistant, page negative, pageSize hors
  // plafond) : on retombe sur un catalogue par defaut plutot que d'afficher une
  // erreur — une URL malformee reste une visite a servir.
  const parsed = CatalogQuery.safeParse(candidate);
  const filters = parsed.success
    ? parsed.data
    : CatalogQuery.parse({ pageSize: settings.catalogPageSize });

  const [{ items, meta }, session] = await Promise.all([
    searchCatalog(filters),
    getCurrentSession(),
  ]);
  const isRecruiter = session?.user.role === "recruiter";
  const favoriteIds = isRecruiter
    ? new Set(
        (
          await db
            .select({ profileId: favorite.profileId })
            .from(favorite)
            .where(eq(favorite.recruiterId, session.user.id))
        ).map((row) => row.profileId),
      )
    : new Set<string>();

  // Parametres reconduits par la pagination, sans `page`.
  const carried = new URLSearchParams();
  if (filters.q) carried.set("q", filters.q);
  if (filters.sector) carried.set("sector", filters.sector);
  if (filters.city) carried.set("city", filters.city);
  if (filters.certified) carried.set("certified", "true");
  for (const skill of filters.skills ?? []) carried.append("skills", skill);

  return (
    <SiteShell>
      <main className="lg:h-screen lg:overflow-y-hidden">
        <div className="w-full px-5 pb-24 pt-10 md:px-10 md:pt-14 lg:flex lg:h-full lg:flex-col lg:pb-8 lg:pl-4">
          {/* En-tete */}
          <div className="flex flex-wrap items-end justify-between gap-6 border-b border-[#5980a6]/15 pb-8">
            <div>
              <h1 className="text-4xl font-extrabold uppercase leading-tight tracking-tight text-[#2d3748] md:text-6xl">
                Découvrez les
                <span className="text-[#5980a6]"> talents.</span>
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#718096]">
                Parcourez les compétences des demandeurs d&apos;emploi et repérez
                les profils dont les aptitudes ont été certifiées par le
                dispositif JEB.
              </p>
            </div>

            <p className="font-mono text-sm font-semibold uppercase tracking-wider text-[#5980a6]">
              {meta.total} profil{meta.total > 1 ? "s" : ""}
            </p>
          </div>

          <div className="mt-10 grid gap-8 lg:min-h-0 lg:flex-1 lg:grid-cols-[320px_1fr] lg:gap-12">
            <div className="lg:sticky lg:top-28 lg:self-start">
              {/* useSearchParams impose une frontiere de suspense au prerendu. */}
              <Suspense fallback={<div className="h-[520px] border border-[#5980a6]/20 bg-white" />}>
                <CatalogueFilters sectors={SECTORS} cities={CITIES} skills={SKILLS} />
              </Suspense>
            </div>

            <div className="lg:overflow-y-auto lg:pr-3">
              {items.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {items.map((profile) => (
                    <ProfileCard
                      key={profile.id}
                      profile={profile}
                      canFavorite={isRecruiter}
                      initialFavorite={favoriteIds.has(profile.id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center border border-[#5980a6]/20 bg-white px-8 py-24 text-center">
                  <div className="flex size-16 items-center justify-center border border-[#5980a6]/25 bg-[#eef6ff] text-[#5980a6]">
                    <SearchX aria-hidden="true" className="size-7 stroke-[1.6]" />
                  </div>
                  <h2 className="mt-8 text-xl font-bold uppercase tracking-tight text-[#2d3748]">
                    Aucun profil ne correspond
                  </h2>
                  <p className="mt-3 max-w-md text-sm leading-relaxed text-[#718096]">
                    Élargissez la recherche en retirant une compétence, un secteur
                    ou le filtre de certification.
                  </p>
                </div>
              )}

              <CataloguePagination
                page={meta.page}
                totalPages={meta.totalPages}
                params={carried}
              />
            </div>
          </div>
        </div>
      </main>
    </SiteShell>
  );
}
