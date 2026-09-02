"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, RotateCcw, Search, SlidersHorizontal } from "lucide-react";

import type { City, Sector, Skill } from "@/lib/vocabulary";

/**
 * Filtres du catalogue.
 *
 * L'etat vit dans l'URL, pas dans le composant : un filtrage est partageable,
 * revient au bouton « precedent » du navigateur et se recharge tel quel. Le
 * serveur relit ces memes parametres pour interroger le catalogue, si bien
 * qu'il n'existe qu'une seule source de verite pour « ce qui est filtre ».
 */
interface CatalogueFiltersProps {
  sectors: readonly Sector[];
  cities: readonly City[];
  skills: readonly Skill[];
}

export function CatalogueFilters({ sectors, cities, skills }: CatalogueFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const activeSector = searchParams.get("sector") ?? "";
  const activeCity = searchParams.get("city") ?? "";
  const certifiedOnly = searchParams.get("certified") === "true";
  const activeSkills = searchParams.getAll("skills");
  const activeQuery = searchParams.get("q") ?? "";

  // Champ de recherche non controle par l'URL : on ne veut pas relancer une
  // requete a chaque frappe. Il se resynchronise quand l'URL change ailleurs
  // (reinitialisation, retour arriere).
  const [query, setQuery] = useState(activeQuery);
  useEffect(() => setQuery(activeQuery), [activeQuery]);

  const hasFilters =
    activeQuery !== "" ||
    activeSector !== "" ||
    activeCity !== "" ||
    certifiedOnly ||
    activeSkills.length > 0;

  /** Applique une mutation des parametres et revient toujours page 1. */
  function apply(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    params.delete("page");
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  function setSingle(key: string, value: string) {
    apply((params) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
  }

  function toggleSkill(skill: Skill) {
    apply((params) => {
      const current = params.getAll("skills");
      params.delete("skills");
      const next = current.includes(skill)
        ? current.filter((item) => item !== skill)
        : [...current, skill];
      for (const item of next) params.append("skills", item);
    });
  }

  const selectClassName =
    "h-12 w-full appearance-none rounded-2xl border border-[#5980a6]/15 bg-white px-4 text-sm font-semibold text-[#2d3748] outline-none transition-colors hover:border-[#5980a6]/35 focus-visible:border-[#5980a6]";

  return (
    <aside className="rounded-3xl border border-[#5980a6]/15 bg-white/55 p-7">
      <div className="flex items-center justify-between gap-4 border-b border-[#2d3748]/10 pb-5">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-[#5980a6]/10 text-[#5980a6]">
            <SlidersHorizontal aria-hidden="true" className="size-5 stroke-[1.7]" />
          </div>
          <h2 className="text-base font-bold uppercase tracking-tight text-[#2d3748]">
            Filtres
          </h2>
        </div>

        {pending ? (
          <Loader2 aria-hidden="true" className="size-4 animate-spin text-[#5980a6]" />
        ) : null}
      </div>

      {/* Recherche libre */}
      <form
        className="mt-6"
        onSubmit={(event) => {
          event.preventDefault();
          setSingle("q", query.trim());
        }}
      >
        <label
          htmlFor="catalogue-search"
          className="font-mono text-xs font-semibold uppercase tracking-wider text-[#718096]"
        >
          Recherche
        </label>
        <div className="relative mt-2">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#718096]"
          />
          <input
            id="catalogue-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nom, métier, compétence"
            className="h-12 w-full rounded-2xl border border-[#5980a6]/15 bg-white pl-11 pr-4 text-sm text-[#2d3748] outline-none transition-colors placeholder:text-[#718096] hover:border-[#5980a6]/35 focus-visible:border-[#5980a6]"
          />
        </div>
      </form>

      {/* Secteur */}
      <div className="mt-6">
        <label
          htmlFor="catalogue-sector"
          className="font-mono text-xs font-semibold uppercase tracking-wider text-[#718096]"
        >
          Secteur
        </label>
        <select
          id="catalogue-sector"
          value={activeSector}
          onChange={(event) => setSingle("sector", event.target.value)}
          className={`mt-2 ${selectClassName}`}
        >
          <option value="">Tous les secteurs</option>
          {sectors.map((sector) => (
            <option key={sector} value={sector}>
              {sector}
            </option>
          ))}
        </select>
      </div>

      {/* Localisation */}
      <div className="mt-6">
        <label
          htmlFor="catalogue-city"
          className="font-mono text-xs font-semibold uppercase tracking-wider text-[#718096]"
        >
          Localisation
        </label>
        <select
          id="catalogue-city"
          value={activeCity}
          onChange={(event) => setSingle("city", event.target.value)}
          className={`mt-2 ${selectClassName}`}
        >
          <option value="">Toute la France</option>
          {cities.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>
      </div>

      {/* Certification */}
      <div className="mt-6">
        <span className="font-mono text-xs font-semibold uppercase tracking-wider text-[#718096]">
          Certification JEB
        </span>
        <div className="mt-2 grid grid-cols-2 gap-2 rounded-2xl bg-[#ebf0f7] p-1.5">
          <button
            type="button"
            aria-pressed={!certifiedOnly}
            onClick={() => setSingle("certified", "")}
            className={`h-10 rounded-xl text-sm font-semibold transition-all ${
              certifiedOnly
                ? "text-[#718096] hover:text-[#416180]"
                : "bg-white text-[#2d3748]"
            }`}
          >
            Tous
          </button>
          <button
            type="button"
            aria-pressed={certifiedOnly}
            onClick={() => setSingle("certified", "true")}
            className={`h-10 rounded-xl text-sm font-semibold transition-all ${
              certifiedOnly
                ? "bg-[#5980a6] text-white"
                : "text-[#718096] hover:text-[#416180]"
            }`}
          >
            Certifiés
          </button>
        </div>
      </div>

      {/* Competences : cumulables, un profil doit toutes les posseder */}
      <div className="mt-6">
        <span className="font-mono text-xs font-semibold uppercase tracking-wider text-[#718096]">
          Compétences
        </span>
        <div className="mt-3 flex flex-wrap gap-2">
          {skills.map((skill) => {
            const active = activeSkills.includes(skill);

            return (
              <button
                key={skill}
                type="button"
                aria-pressed={active}
                onClick={() => toggleSkill(skill)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                  active
                    ? "bg-[#5980a6] text-white"
                    : "bg-[#ebf0f7] text-[#4a5568] hover:bg-[#5980a6]/15"
                }`}
              >
                {skill}
              </button>
            );
          })}
        </div>
      </div>

      {hasFilters ? (
        <button
          type="button"
          onClick={() => startTransition(() => router.push(pathname, { scroll: false }))}
          className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-[#5980a6] transition-colors hover:text-[#416180]"
        >
          <RotateCcw aria-hidden="true" className="size-4" />
          Réinitialiser les filtres
        </button>
      ) : null}
    </aside>
  );
}
