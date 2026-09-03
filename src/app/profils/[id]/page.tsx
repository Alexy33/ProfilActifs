import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BadgeCheck } from "lucide-react";

import { ProfileVideo } from "@/components/catalogue/profile-video";
import { ProfileActions } from "@/components/catalogue/profile-actions";
import { SiteShell } from "@/components/layout/site-shell";
import { getCurrentSession } from "@/lib/auth-session";
import type { UserRole } from "@/lib/vocabulary";
import {
  findProfileById,
  recordProfileView,
  type SessionLike,
} from "@/server/services/profiles";
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

/**
 * @param session session de l'appelant. Elle ne conditionne pas l'acces a la
 *   fiche — publique par construction — mais la diffusion de la video d'un
 *   profil de mineur, reservee au titulaire et a l'administration (R.1).
 */
async function loadPublishedProfile(id: string, session?: SessionLike) {
  const found = await findProfileById(id, session);
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

  // Session lue en premier : elle determine si la video d'un profil de mineur
  // est diffusee (R.1), donc le contenu meme de la fiche chargee ensuite.
  const session = await getCurrentSession();
  const profile = await loadPublishedProfile(id, session ?? undefined);

  if (!profile) notFound();

  // La consultation compte comme une vue : c'est le compteur d'interactions que
  // le candidat suit depuis son espace (CDC 2.1).
  await recordProfileView(profile.id);
  const views = profile.views + 1;

  const settings = await getSettings();

  return (
    <SiteShell>
      <main>
        <div className="w-full px-5 pb-24 pt-10 md:px-10 md:pt-14 lg:pl-4">
          <Link
            href="/catalogue"
            className="group inline-flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider text-[#1B3A6B] transition-colors hover:text-[#273D4F] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1B3A6B]"
          >
            <ArrowLeft
              aria-hidden="true"
              className="size-4 transition-transform duration-300 group-hover:-translate-x-1"
            />
            Retour au catalogue
          </Link>

          <div className="mt-7 border-b border-[#1B3A6B]/15 pb-7">
            <p className="font-mono text-xs font-semibold uppercase tracking-wider text-[#718096]">
              Profil public · présentation vidéo
            </p>
            <h1 className="mt-3 text-4xl font-extrabold uppercase leading-tight tracking-tight text-[#2d3748] md:text-5xl">
              {profile.name}
            </h1>
            <p className="mt-2 text-lg text-[#4a5568]">{profile.title}</p>
          </div>

          <div className="mt-8 grid items-start gap-8 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.75fr)] xl:gap-10">
            {/* Colonne principale : video, identite, presentation */}
            <div>
              <ProfileVideo videoUrl={profile.videoUrl} name={profile.name} />

              <div className="mt-5 flex flex-wrap items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-wider">
                <span className="rounded-full bg-[#D1DEF0] px-3 py-1.5 text-[#1B2D3E]">{profile.city}</span>
                <span className="rounded-full bg-[#eee7ff] px-3 py-1.5 text-[#65449b]">{profile.sector}</span>
              </div>

              {profile.bio ? (
                <div className="mt-6 rounded-3xl border border-[#A8C5E0] bg-[#F5F9FE] p-6">
                  <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-[#718096]">Présentation</h2>
                  <p className="mt-3 max-w-[70ch] text-[15.5px] leading-[1.65] text-[#4a5568]">
                    {profile.bio}
                  </p>
                </div>
              ) : null}

              {profile.skills.length > 0 ? (
                <div className="mt-6 rounded-3xl border border-[#A8C5E0] bg-[#F5F9FE] p-6">
                  <h2 className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#1d1f20]/55">
                    Compétences déclarées
                  </h2>
                  <ul className="mt-3 flex flex-wrap gap-1.5">
                    {profile.skills.map((skill) => (
                      <li
                        key={skill}
                        className="rounded-full bg-[#dff3f5] px-3 py-1.5 text-xs font-semibold text-[#25636a]"
                      >
                        {skill}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>

            {/* Colonne laterale : certification et compteurs */}
            <aside className="space-y-5 xl:sticky xl:top-8 xl:self-start">
              {profile.certified ? (
                // Le badge est le seul aplat plein de la page : le CDC (2.3)
                // demande qu'il soit visuellement distinct et mis en avant.
                <div className="rounded-3xl bg-[#1B3A6B] p-7 text-white">
                  <div className="flex items-center gap-2">
                    <BadgeCheck aria-hidden="true" className="size-5 stroke-[2]" />
                    <span className="font-mono text-[10.5px] font-bold uppercase tracking-[0.16em] text-white/80">
                      Certification officielle
                    </span>
                  </div>
                  <p className="mt-4 text-6xl font-bold leading-none tracking-tight">
                    {profile.score}
                    <span className="text-2xl font-bold text-white/70"> / 100</span>
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-white/80">
                    Badge Aptitudes professionnelles JEB — délivré par la Direction
                    Numérique et Innovation. Seuil : {settings.certificationThreshold}/100.
                  </p>
                </div>
              ) : (
                <div className="rounded-3xl bg-[#ebf0f7] p-7 shadow-[8px_8px_16px_#c5d1e0,-8px_-8px_16px_#ffffff]">
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

              <div className="rounded-3xl bg-[#ebf0f7] p-7 shadow-[8px_8px_16px_#c5d1e0,-8px_-8px_16px_#ffffff]">
                <div className="grid grid-cols-2 gap-5">
                <div>
                  <p className="text-3xl font-bold leading-none text-[#2d3748]">
                    {views}
                  </p>
                  <p className="mt-1 text-xs text-[#718096]">
                    vues du profil
                  </p>
                </div>
                <div>
                  <p className="text-3xl font-bold leading-none text-[#2d3748]">
                    {profile.contactCount}
                  </p>
                  <p className="mt-1 text-xs text-[#718096]">
                    contacts reçus
                  </p>
                </div>
                </div>
                <ProfileActions
                  profileId={profile.id}
                  role={(session?.user.role as UserRole | undefined) ?? null}
                />
              </div>
            </aside>
          </div>
        </div>
      </main>
    </SiteShell>
  );
}
