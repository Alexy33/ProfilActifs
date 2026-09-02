"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { api, errorMessage } from "@/lib/api-client";
import { Blueprint } from "@/components/ui/blueprint";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { TagToggle } from "@/components/ui/tag";
import { CITIES, SECTORS, SKILLS, type City, type Sector, type Skill } from "@/lib/vocabulary";
import type { FullProfile } from "@/server/services/profiles";
import { VideoField } from "./video-field";

type Draft = {
  name: string;
  title: string;
  sector: Sector;
  city: City;
  bio: string;
  skills: Skill[];
};

/**
 * Edition du profil par son titulaire.
 *
 * Enregistrement automatique, comme dans la maquette : chaque modification est
 * envoyee en `PATCH` partiel apres une pause de frappe. Le formulaire n'a donc
 * pas de bouton « Enregistrer » — mais il affiche toujours ou en est la
 * sauvegarde, faute de quoi l'utilisateur ne saurait pas si son texte est parti.
 */
export function ProfileForm({ profile }: { profile: FullProfile }) {
  const router = useRouter();

  const initial = React.useMemo<Draft>(
    () => ({
      name: profile.name,
      title: profile.title,
      sector: profile.sector,
      city: profile.city,
      bio: profile.bio,
      skills: profile.skills,
    }),
    [profile],
  );

  const [draft, setDraft] = React.useState<Draft>(initial);
  const [state, setState] = React.useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = React.useState("");

  // Ce qui est deja en base, pour n'envoyer que les champs reellement changes.
  const saved = React.useRef<Draft>(initial);

  React.useEffect(() => {
    saved.current = initial;
    setDraft(initial);
  }, [initial]);

  React.useEffect(() => {
    const patch: Record<string, unknown> = {};
    for (const key of Object.keys(draft) as (keyof Draft)[]) {
      const next = draft[key];
      const previous = saved.current[key];
      const changed =
        key === "skills"
          ? JSON.stringify(next) !== JSON.stringify(previous)
          : next !== previous;

      if (!changed) continue;
      patch[key] = next;
    }

    if (Object.keys(patch).length === 0) return;

    const timer = setTimeout(async () => {
      setState("saving");
      try {
        await api("/api/me/profile", { method: "PATCH", body: patch });
        saved.current = draft;
        setState("saved");
        setError("");
        // Le bandeau d'etat et le profil public relisent les donnees fraiches.
        router.refresh();
      } catch (caught) {
        setState("error");
        setError(errorMessage(caught));
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [draft, router]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const toggleSkill = (skill: Skill) =>
    set(
      "skills",
      draft.skills.includes(skill)
        ? draft.skills.filter((s) => s !== skill)
        : [...draft.skills, skill],
    );

  const status = {
    idle: "Enregistrement automatique — PATCH /api/me/profile",
    saving: "Enregistrement…",
    saved: "Modifications enregistrées",
    error: error,
  }[state];

  return (
    <Blueprint className="p-[26px]">
      <div className="font-heading text-2xl uppercase">Mon profil</div>

      <div className="mt-5 grid gap-3.5 sm:grid-cols-2">
        <Field label="Nom affiché" htmlFor="p-name">
          <Input
            id="p-name"
            value={draft.name}
            onChange={(event) => set("name", event.target.value)}
          />
        </Field>
        <Field label="Intitulé recherché" htmlFor="p-title">
          <Input
            id="p-title"
            value={draft.title}
            onChange={(event) => set("title", event.target.value)}
          />
        </Field>
        <Field label="Secteur" htmlFor="p-sector">
          <Select
            id="p-sector"
            value={draft.sector}
            onChange={(event) => set("sector", event.target.value as Sector)}
          >
            {SECTORS.map((sector) => (
              <option key={sector} value={sector}>
                {sector}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Localisation" htmlFor="p-city">
          <Select
            id="p-city"
            value={draft.city}
            onChange={(event) => set("city", event.target.value as City)}
          >
            {CITIES.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="Présentation" htmlFor="p-bio" className="mt-3.5">
        <Textarea
          id="p-bio"
          value={draft.bio}
          onChange={(event) => set("bio", event.target.value)}
        />
      </Field>

      {/* La video a ses propres routes (lien externe vs fichier televerse) :
          elle ne peut pas partager l'enregistrement automatique ci-dessus. */}
      <VideoField videoUrl={profile.videoUrl} />

      <Field label="Compétences transversales" className="mt-4">
        <div className="flex flex-wrap gap-1.5">
          {SKILLS.map((skill) => (
            <TagToggle
              key={skill}
              active={draft.skills.includes(skill)}
              onClick={() => toggleSkill(skill)}
            >
              {skill}
            </TagToggle>
          ))}
        </div>
      </Field>

      <div
        data-testid="autosave-status"
        role="status"
        aria-live="polite"
        className={`mt-5 font-mono text-[11px] ${state === "error" ? "text-accent-800" : "text-text/50"}`}
      >
        {status}
      </div>
    </Blueprint>
  );
}
