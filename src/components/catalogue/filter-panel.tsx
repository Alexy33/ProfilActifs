"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { TagToggle } from "@/components/ui/tag";
import { catalogHref } from "@/lib/catalog-params";
import { CITIES, SECTORS, SKILLS, type City, type Sector, type Skill } from "@/lib/vocabulary";
import type { CatalogFilters } from "@/server/services/profiles";

/**
 * Rail de filtres du catalogue.
 *
 * Chaque changement reecrit l'URL ; c'est le rendu serveur de la page qui
 * produit les resultats. Le composant ne detient donc aucune liste de profils,
 * seulement le texte en cours de frappe.
 */
export function FilterPanel({ filters }: { filters: CatalogFilters }) {
  const router = useRouter();
  const [query, setQuery] = React.useState(filters.q ?? "");

  // La query string fait foi : un retour arriere du navigateur doit remettre
  // le champ de recherche dans l'etat de la page affichee.
  React.useEffect(() => setQuery(filters.q ?? ""), [filters.q]);

  const apply = React.useCallback(
    (patch: Partial<CatalogFilters>) => {
      // Tout changement de filtre ramene en page 1 : rester en page 4 d'un
      // resultat qui n'en compte plus que 2 afficherait une page vide.
      router.push(catalogHref({ ...filters, ...patch, page: 1 }));
    },
    [filters, router],
  );

  // La frappe n'est repercutee qu'apres une pause : sans cela chaque lettre
  // declencherait un rendu serveur complet.
  React.useEffect(() => {
    const current = filters.q ?? "";
    if (query === current) return;

    const timer = setTimeout(() => apply({ q: query || undefined }), 300);
    return () => clearTimeout(timer);
  }, [query, filters.q, apply]);

  const toggleSkill = (skill: Skill) => {
    const skills = filters.skills ?? [];
    apply({
      skills: skills.includes(skill) ? skills.filter((s) => s !== skill) : [...skills, skill],
    });
  };

  return (
    <aside className="flex flex-col gap-[22px] lg:sticky lg:top-[92px]">
      <Field label="Recherche" htmlFor="q">
        <Input
          id="q"
          type="search"
          placeholder="Nom, métier, mot-clé"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </Field>

      <Field label="Secteur" htmlFor="sector">
        <Select
          id="sector"
          value={filters.sector ?? ""}
          onChange={(event) => apply({ sector: (event.target.value || undefined) as Sector })}
        >
          <option value="">Tous les secteurs</option>
          {SECTORS.map((sector) => (
            <option key={sector} value={sector}>
              {sector}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Localisation" htmlFor="city">
        <Select
          id="city"
          value={filters.city ?? ""}
          onChange={(event) => apply({ city: (event.target.value || undefined) as City })}
        >
          <option value="">Toute la France</option>
          {CITIES.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Certification JEB">
        <Segmented
          name="cert"
          className="w-full"
          value={filters.certified ? "only" : "all"}
          onChange={(value) => apply({ certified: value === "only" ? true : undefined })}
          options={[
            { value: "all", label: "Tous" },
            { value: "only", label: "Certifiés" },
          ]}
        />
      </Field>

      <Field label="Vidéo de présentation">
        <Segmented
          name="video"
          className="w-full"
          value={filters.hasVideo ? "only" : "all"}
          onChange={(value) => apply({ hasVideo: value === "only" ? true : undefined })}
          options={[
            { value: "all", label: "Tous" },
            { value: "only", label: "Avec vidéo" },
          ]}
        />
      </Field>

      <Field label="Compétences">
        <div className="flex flex-wrap gap-1.5">
          {SKILLS.map((skill) => (
            <TagToggle
              key={skill}
              active={(filters.skills ?? []).includes(skill)}
              onClick={() => toggleSkill(skill)}
            >
              {skill}
            </TagToggle>
          ))}
        </div>
      </Field>

      <Button
        variant="ghost"
        className="self-start"
        onClick={() => router.push("/catalogue")}
      >
        Réinitialiser les filtres
      </Button>
    </aside>
  );
}
