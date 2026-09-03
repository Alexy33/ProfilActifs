"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Eye, Heart, Loader2, MapPin } from "lucide-react";

import type { ProfileCard as ProfileCardData } from "@/server/services/profiles";

/**
 * Carte d'un profil dans le catalogue.
 *
 * Ligne horizontale compacte : identite, informations utiles et action restent
 * lisibles d'un seul regard dans le catalogue.
 */
export function ProfileCard({
  profile,
  canFavorite = false,
  initialFavorite = false,
}: {
  profile: ProfileCardData;
  canFavorite?: boolean;
  initialFavorite?: boolean;
}) {
  const [favorite, setFavorite] = useState(initialFavorite);
  const [updatingFavorite, setUpdatingFavorite] = useState(false);

  async function toggleFavorite() {
    setUpdatingFavorite(true);
    const response = await fetch(`/api/me/favorites/${profile.id}`, {
      method: favorite ? "DELETE" : "PUT",
    });
    if (response.ok) setFavorite((current) => !current);
    setUpdatingFavorite(false);
  }

  return (
    <article className="group flex w-full items-center gap-4 overflow-hidden rounded-xl border border-[#A8C5E0] bg-[#F5F9FE] px-5 py-4 transition-colors hover:border-[#4A6B8A] hover:bg-[#f2f8ff]">
      <div className="flex min-w-0 flex-1 items-start gap-4">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-[#D1DEF0] font-mono text-base font-bold text-[#1B2D3E]">
          {profile.initials}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold uppercase leading-tight tracking-tight text-[#2d3748]">
              {profile.name}
            </h3>
            {profile.certified ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#dff7e9] px-2.5 py-1 font-mono text-[10px] font-bold tracking-wider text-[#17603a]">
                <BadgeCheck aria-hidden="true" className="size-3.5 stroke-[2]" />
                JEB {profile.score}/100
              </span>
            ) : (
              <span className="rounded-full bg-[#fff0d9] px-2.5 py-1 font-mono text-[10px] font-semibold tracking-wider text-[#8a5208]">
                NON CERTIFIÉ
              </span>
            )}
          </div>
          <p className="mt-1 text-sm leading-snug text-[#4a5568]">{profile.title}</p>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-[#718096]">
            <span className="flex items-center gap-1.5">
              <MapPin aria-hidden="true" className="size-3.5 text-[#1B3A6B]" />
              {profile.city}
            </span>
            <span className="rounded-full bg-[#eee7ff] px-2 py-1 text-[#65449b]">
              {profile.sector}
            </span>
            <span className="flex items-center gap-1.5">
              <Eye aria-hidden="true" className="size-3.5 text-[#1B3A6B]" />
              {profile.views}
            </span>
          </div>

          {profile.skills.length > 0 ? (
            <ul className="mt-3 hidden flex-wrap gap-1.5 sm:flex">
              {profile.skills.map((skill, index) => (
                <li
                  key={skill}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    index % 3 === 0
                      ? "bg-[#dff3f5] text-[#25636a]"
                      : index % 3 === 1
                        ? "bg-[#ffe8ef] text-[#8a3f5b]"
                        : "bg-[#fff0d9] text-[#80531a]"
                  }`}
                >
                  {skill}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 flex-col gap-2">
      <Link
        href={`/profils/${profile.id}`}
        aria-label={`Consulter le profil de ${profile.name}`}
        className="group/link inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#1B3A6B] text-white transition-colors hover:bg-[#273D4F] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B3A6B] sm:w-auto sm:gap-2 sm:px-4"
      >
        <span className="hidden text-sm font-semibold sm:inline">Voir le profil</span>
        <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover/link:translate-x-0.5" />
      </Link>
      {canFavorite ? (
        <button
          type="button"
          onClick={() => void toggleFavorite()}
          disabled={updatingFavorite}
          aria-label={favorite ? `Retirer ${profile.name} des favoris` : `Ajouter ${profile.name} aux favoris`}
          aria-pressed={favorite}
          className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg px-3 text-xs font-semibold transition-colors disabled:opacity-60 ${favorite ? "bg-[#ffe8ef] text-[#8a3f5b]" : "border border-[#1B3A6B]/25 bg-white text-[#1B3A6B] hover:bg-[#E8F0F8]"}`}
        >
          {updatingFavorite ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : <Heart aria-hidden="true" className={`size-4 ${favorite ? "fill-current" : ""}`} />}
          <span className="hidden sm:inline">{favorite ? "Favori" : "Ajouter"}</span>
        </button>
      ) : null}
      </div>
    </article>
  );
}
