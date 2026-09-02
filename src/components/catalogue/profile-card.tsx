import Link from "next/link";
import { ArrowRight, BadgeCheck, Eye, MapPin } from "lucide-react";

import type { ProfileCard as ProfileCardData } from "@/server/services/profiles";

/**
 * Carte d'un profil dans le catalogue.
 *
 * Reprend le vocabulaire visuel de la page d'accueil : surface blanche posee
 * sur le fond #ebf0f7, coins tres arrondis, ligne d'accent qui se deploie au
 * survol. Le badge de certification est le seul aplat plein de la carte : le
 * cahier des charges (2.3) demande qu'il soit visuellement distinct.
 */
export function ProfileCard({ profile }: { profile: ProfileCardData }) {
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-[#5980a6]/15 bg-white/55 p-7 transition-all duration-500 hover:-translate-y-2 hover:border-[#5980a6]/35 hover:bg-white">
      {/* Ligne d'accent, comme les cartes « 3 etapes » de l'accueil */}
      <div className="absolute left-0 top-0 h-1 w-0 bg-[#5980a6] transition-all duration-500 group-hover:w-full" />

      <div className="flex items-start gap-4">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-[#5980a6]/10 font-mono text-lg font-bold text-[#5980a6] transition-all duration-500 group-hover:bg-[#5980a6] group-hover:text-white">
          {profile.initials}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-bold uppercase leading-tight tracking-tight text-[#2d3748]">
            {profile.name}
          </h3>
          <p className="mt-1 line-clamp-2 text-sm leading-snug text-[#718096]">
            {profile.title}
          </p>
        </div>
      </div>

      {profile.certified ? (
        <div className="mt-5 inline-flex w-fit items-center gap-2 rounded-full bg-[#5980a6] px-3 py-1.5 text-white">
          <BadgeCheck aria-hidden="true" className="size-4 stroke-[2]" />
          <span className="whitespace-nowrap font-mono text-xs font-bold tracking-wider">
            JEB {profile.score}/100
          </span>
        </div>
      ) : (
        <div className="mt-5 inline-flex w-fit items-center gap-2 rounded-full border border-[#5980a6]/20 px-3 py-1.5 text-[#718096]">
          <span className="font-mono text-xs font-semibold tracking-wider">
            NON CERTIFIÉ
          </span>
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-xs font-semibold uppercase tracking-wider text-[#718096]">
        <span className="flex items-center gap-1.5">
          <MapPin aria-hidden="true" className="size-3.5 text-[#5980a6]/60" />
          {profile.city}
        </span>
        <span className="text-[#5980a6]">{profile.sector}</span>
        <span className="flex items-center gap-1.5">
          <Eye aria-hidden="true" className="size-3.5 text-[#5980a6]/60" />
          {profile.views}
        </span>
      </div>

      {profile.skills.length > 0 ? (
        <ul className="mt-5 flex flex-wrap gap-2">
          {profile.skills.map((skill) => (
            <li
              key={skill}
              className="rounded-full bg-[#ebf0f7] px-3 py-1 text-xs font-semibold text-[#4a5568]"
            >
              {skill}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-auto pt-7">
        <Link
          href={`/profils/${profile.id}`}
          className="group/link inline-flex items-center gap-2 text-sm font-semibold text-[#5980a6] transition-colors hover:text-[#416180]"
        >
          Consulter le profil
          <ArrowRight
            aria-hidden="true"
            className="size-4 transition-transform duration-300 group-hover/link:translate-x-1.5"
          />
        </Link>

        <div className="mt-4 h-px overflow-hidden bg-[#5980a6]/15">
          <div className="h-full w-0 bg-[#5980a6] transition-all duration-700 group-hover:w-full" />
        </div>
      </div>
    </article>
  );
}
