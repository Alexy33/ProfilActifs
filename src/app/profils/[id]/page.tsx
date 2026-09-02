import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BadgeCheck, Eye, MapPin, Users } from "lucide-react";

import { ProfileVideo } from "@/components/catalogue/profile-video";
import { SiteShell } from "@/components/layout/site-shell";
import { findProfileById, recordProfileView } from "@/server/services/profiles";
import { getSettings } from "@/server/services/settings";

export const dynamic = "force-dynamic";

/**
 * Fiche publique d'un profil (CDC 2.3).
 *
 * « Le profil doit etre consultable publiquement sans compte recruteur » : la
 * page ne lit aucune session. Seuls les profils `published` sont servis — un
 * profil en moderation ou retire repond 404, y compris a un recruteur connecte,
 * exactement comme la route `/api/profiles/{id}`.
 */

async function loadPublishedProfile(id: string) {
  const found = await findProfileById(id);
  if (!found || found.status !== "published") return null;
  return found;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const profile = await loadPublishedProfile(id);

  if (!profile) return { title: "Profil introuvable — ProfilsActifs" };

  return {
    title: `${profile.name} — ${profile.title} | ProfilsActifs`,
    description: profile.bio.slice(0, 160),
  };
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await loadPublishedProfile(id);

  if (!profile) notFound();

  // La consultation compte comme une vue : c'est le compteur d'interactions que
  // le candidat suit depuis son espace (CDC 2.1).
  await recordProfileView(profile.id);
  const views = profile.views + 1;

  const settings = await getSettings();

  return (
    <SiteShell>
      <main>
        <div className="mx-auto max-w-7xl px-5 pb-24 pt-8 md:px-10">
          <Link
            href="/catalogue"
            className="group inline-flex items-center gap-2 text-sm font-semibold text-[#5980a6] transition-colors hover:text-[#416180]"
          >
            <ArrowLeft
              aria-hidden="true"
              className="size-4 transition-transform duration-300 group-hover:-translate-x-1"
            />
            Retour au catalogue
          </Link>

          <div className="mt-8 grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:gap-14">
            {/* Colonne principale : video, identite, presentation */}
            <div>
              <ProfileVideo videoUrl={profile.videoUrl} name={profile.name} />

              <div className="mt-10 flex flex-wrap items-center gap-5">
                <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-[#5980a6] font-mono text-xl font-bold text-white">
                  {profile.initials}
                </div>
                <div className="min-w-0">
                  <h1 className="text-3xl font-extrabold uppercase leading-tight tracking-tight text-[#2d3748] md:text-5xl">
                    {profile.name}
                  </h1>
                  <p className="mt-3 text-lg text-[#4a5568]">{profile.title}</p>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-xs font-semibold uppercase tracking-wider text-[#718096]">
                <span className="flex items-center gap-1.5">
                  <MapPin aria-hidden="true" className="size-3.5 text-[#5980a6]/60" />
                  {profile.city}
                </span>
                <span className="text-[#5980a6]">{profile.sector}</span>
              </div>

              {profile.bio ? (
                <div className="mt-10">
                  <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-[#718096]">
                    Présentation
                  </h2>
                  <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#4a5568]">
                    {profile.bio}
                  </p>
                </div>
              ) : null}

              {profile.skills.length > 0 ? (
                <div className="mt-10">
                  <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-[#718096]">
                    Compétences déclarées
                  </h2>
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {profile.skills.map((skill) => (
                      <li
                        key={skill}
                        className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#4a5568]"
                      >
                        {skill}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>

            {/* Colonne laterale : certification et compteurs */}
            <aside className="lg:sticky lg:top-28 lg:self-start">
              {profile.certified ? (
                // Le badge est le seul aplat plein de la page : le CDC (2.3)
                // demande qu'il soit visuellement distinct et mis en avant.
                <div className="rounded-3xl bg-[#5980a6] p-8 text-white">
                  <div className="flex items-center gap-2">
                    <BadgeCheck aria-hidden="true" className="size-5 stroke-[2]" />
                    <span className="font-mono text-xs font-bold uppercase tracking-wider">
                      Certification JEB
                    </span>
                  </div>
                  <p className="mt-6 text-5xl font-extrabold tracking-tight">
                    {profile.score}
                    <span className="text-2xl font-bold text-white/70"> / 100</span>
                  </p>
                  <p className="mt-4 text-sm leading-relaxed text-white/80">
                    Aptitudes professionnelles certifiées par le Ministère du Job
                    et Bonheur. Seuil d&apos;obtention :{" "}
                    {settings.certificationThreshold}/100.
                  </p>
                </div>
              ) : (
                <div className="rounded-3xl border border-[#5980a6]/15 bg-white/55 p-8">
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#718096]">
                    Certification JEB
                  </span>
                  <p className="mt-5 text-lg font-bold uppercase tracking-tight text-[#2d3748]">
                    Non certifié
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-[#718096]">
                    Ce candidat n&apos;a pas encore validé le questionnaire de
                    certification des aptitudes professionnelles.
                  </p>
                </div>
              )}

              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="rounded-3xl border border-[#5980a6]/15 bg-white/55 p-6">
                  <Eye aria-hidden="true" className="size-5 text-[#5980a6]" />
                  <p className="mt-4 text-2xl font-extrabold tracking-tight text-[#2d3748]">
                    {views}
                  </p>
                  <p className="mt-1 font-mono text-xs font-semibold uppercase tracking-wider text-[#718096]">
                    Vues
                  </p>
                </div>
                <div className="rounded-3xl border border-[#5980a6]/15 bg-white/55 p-6">
                  <Users aria-hidden="true" className="size-5 text-[#5980a6]" />
                  <p className="mt-4 text-2xl font-extrabold tracking-tight text-[#2d3748]">
                    {profile.contactCount}
                  </p>
                  <p className="mt-1 font-mono text-xs font-semibold uppercase tracking-wider text-[#718096]">
                    Contacts
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-3xl border border-[#5980a6]/15 bg-white/55 p-8">
                <p className="text-sm leading-relaxed text-[#718096]">
                  La prise de contact et la mise en favori sont réservées aux
                  comptes recruteurs.
                </p>
                <Link
                  href="/login"
                  className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-2xl bg-[#5980a6] px-6 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#416180]"
                >
                  Connexion recruteur
                </Link>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </SiteShell>
  );
}
