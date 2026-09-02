import Link from "next/link";
import { notFound } from "next/navigation";
import { Blueprint } from "@/components/ui/blueprint";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/tag";
import { getSession, roleOf } from "@/lib/session";
import { findProfileById, recordProfileView } from "@/server/services/profiles";
import { listFavorites } from "@/server/services/dashboard";
import { VideoFrame } from "@/components/profil/video-frame";
import { ContactDialog } from "@/components/profil/contact-dialog";
import { FavoriteButton } from "@/components/catalogue/favorite-button";

export const dynamic = "force-dynamic";

/**
 * Fiche publique d'un candidat.
 *
 * Meme regle que `GET /api/profiles/{id}` : un profil non publie est
 * introuvable, y compris pour un recruteur. Le titulaire, lui, voit le sien
 * depuis « Mon espace », ou l'etat de moderation est affiche.
 */
export default async function ProfilPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await findProfileById(id);

  if (!profile || profile.status !== "published") notFound();

  // La consultation compte, comme dans l'API — mais le compteur n'est plus
  // affiche publiquement (mesure Cabinet du 2026-09-02, point 3).
  await recordProfileView(profile.id);

  const session = await getSession();
  const isRecruiter = roleOf(session) === "recruiter";
  const favorited = isRecruiter
    ? (await listFavorites(session!.user.id)).some((row) => row.profile.id === profile.id)
    : false;

  return (
    <div>
      <Button asChild variant="ghost" className="mb-[18px]">
        <Link href="/catalogue">← Retour au catalogue</Link>
      </Button>

      <div className="grid items-start gap-10 lg:grid-cols-[1.35fr_1fr]">
        <div>
          <VideoFrame videoUrl={profile.videoUrl} />

          <h1 className="mt-[26px] text-[clamp(34px,6vw,48px)] leading-none uppercase">
            {profile.name}
          </h1>
          <div className="mt-2 text-[17px] text-text/78">{profile.title}</div>
          <div className="mt-2 font-mono text-xs text-text/55">
            {profile.sector} · {profile.city}
          </div>
          <p className="mt-[22px] max-w-[62ch] text-[15.5px] leading-[1.65] text-pretty">
            {profile.bio || "Aucune présentation renseignée pour le moment."}
          </p>

          <div className="mt-[26px]">
            <div className="font-mono text-[10.5px] tracking-[0.14em] text-text/55 uppercase">
              Compétences déclarées
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {profile.skills.length > 0 ? (
                profile.skills.map((skill) => (
                  <Tag key={skill} className="px-3 py-[5px] text-xs">
                    {skill}
                  </Tag>
                ))
              ) : (
                <span className="text-sm text-text/55">Aucune compétence déclarée.</span>
              )}
            </div>
          </div>
        </div>

        <aside className="flex flex-col gap-[22px] lg:sticky lg:top-[92px]">
          {profile.certified ? (
            <div className="bg-accent-900 p-6 text-bg">
              <div className="font-mono text-[10.5px] tracking-[0.16em] uppercase opacity-72">
                Certification officielle
              </div>
              <div className="mt-3.5 flex items-baseline gap-3">
                <div data-testid="profile-score" className="font-heading text-[56px] leading-none">
                  {profile.score}
                </div>
                <div className="font-heading text-xl opacity-80">/ 100</div>
              </div>
              <div className="mt-2.5 text-sm leading-[1.5] opacity-85">
                Badge Aptitudes professionnelles JEB — délivré par la Direction Numérique et
                Innovation.
              </div>
            </div>
          ) : (
            <Blueprint className="p-[22px]">
              <div className="font-mono text-[10.5px] tracking-[0.16em] text-text/55 uppercase">
                Certification
              </div>
              <div className="mt-2.5 text-[14.5px] leading-[1.55]">
                Ce profil n&apos;a pas encore passé le questionnaire de certification JEB.
              </div>
            </Blueprint>
          )}

          <Blueprint className="flex flex-col gap-3.5 p-[22px]">
            {/* Les compteurs d'engagement (vues, contacts recus) ne figurent
                plus sur la fiche publique : ils restent visibles du seul
                titulaire, dans « Mon espace ». */}
            {isRecruiter ? (
              <div data-testid="profile-actions" className="flex flex-col gap-2">
                <ContactDialog profileId={profile.id} name={profile.name} />
                <FavoriteButton profileId={profile.id} favorited={favorited} variant="block" />
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="text-[13px] leading-[1.5] text-text/62">
                  Le profil est public ; la prise de contact requiert un compte recruteur.
                </div>
                <Button asChild variant="secondary" className="h-9 w-full">
                  <Link href="/connexion">Connexion recruteur</Link>
                </Button>
              </div>
            )}
          </Blueprint>
        </aside>
      </div>
    </div>
  );
}
