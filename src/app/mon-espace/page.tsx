import Link from "next/link";
import { Blueprint } from "@/components/ui/blueprint";
import { Button } from "@/components/ui/button";
import { StatGrid } from "@/components/ui/stat-grid";
import { requireRole } from "@/lib/session";
import { findProfileByUserId } from "@/server/services/profiles";
import { certificationState } from "@/server/services/certification";
import { listNotifications } from "@/server/services/dashboard";
import { ProfileForm } from "@/components/espace/profile-form";
import { NotificationsCard } from "@/components/espace/notifications-card";

export const dynamic = "force-dynamic";

const STATUS_LABELS = {
  published: "En ligne",
  pending: "Modération",
  removed: "Retiré",
} as const;

/**
 * Espace du demandeur d'emploi.
 *
 * Un compte candidat possede toujours un profil (cree par le hook
 * `databaseHooks.user.create.after` de src/lib/auth.ts), mais on ne le suppose
 * pas : un compte promu a la main en base pourrait ne pas en avoir.
 */
export default async function MonEspacePage() {
  const session = await requireRole("candidate");

  const [profile, certification, notifications] = await Promise.all([
    findProfileByUserId(session.user.id),
    certificationState(session.user.id),
    listNotifications(session.user.id),
  ]);

  if (!profile) {
    return (
      <Blueprint className="p-6">
        <div className="font-heading text-2xl uppercase">Profil introuvable</div>
        <p className="mt-3 text-sm text-text/70">
          Aucun profil n&apos;est rattaché à ce compte. Contactez l&apos;administration du
          dispositif.
        </p>
      </Blueprint>
    );
  }

  const resumable = certification.status === "in_progress" && certification.answered > 0;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-divider pb-5">
        <div>
          <div className="font-mono text-[11px] tracking-[0.16em] text-accent-700 uppercase">
            Espace demandeur d&apos;emploi
          </div>
          <h1 className="mt-2.5 text-[42px] leading-none uppercase">{profile.name}</h1>
        </div>
        {profile.status === "published" ? (
          <Button asChild variant="secondary" className="h-9">
            <Link href={`/profils/${profile.id}`}>Voir mon profil public →</Link>
          </Button>
        ) : (
          <div className="font-mono text-[11px] text-text/55">
            Profil non publié — pas encore visible au catalogue
          </div>
        )}
      </div>

      {resumable ? (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-5 border border-accent bg-accent-100 px-5 py-4">
          <div className="text-[14.5px] text-accent-800">
            Questionnaire de certification interrompu — {certification.answered} réponse(s) sur{" "}
            {certification.questionCount} enregistrée(s).
          </div>
          <Button asChild variant="primary" className="h-[34px]">
            <Link href="/certification">Reprendre</Link>
          </Button>
        </div>
      ) : null}

      <StatGrid
        className="mt-7"
        stats={[
          { value: profile.views, label: "vues du profil" },
          { value: profile.contactCount, label: "contacts recruteurs" },
          { value: profile.certified ? profile.score! : "—", label: "score de certification" },
          { value: STATUS_LABELS[profile.status], label: "état du profil" },
        ]}
      />

      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[1.25fr_1fr]">
        <ProfileForm profile={profile} />

        <div className="flex flex-col gap-6">
          <Blueprint className="p-6">
            <div className="font-heading text-2xl uppercase">Certification JEB</div>

            {profile.certified ? (
              <div className="mt-4">
                <div className="flex items-baseline gap-2.5">
                  <div className="font-heading text-5xl leading-none text-accent-700">
                    {profile.score}
                  </div>
                  <div className="text-[15px] opacity-60">/ 100</div>
                </div>
                <div className="mt-2.5 text-sm leading-[1.55]">
                  Badge obtenu et affiché sur votre profil public.
                </div>
                <Button asChild variant="secondary" className="mt-3.5 h-[34px]">
                  <Link href="/certification">Repasser le questionnaire</Link>
                </Button>
              </div>
            ) : (
              <div className="mt-3.5">
                <div className="text-[14.5px] leading-[1.55]">
                  {certification.answered > 0
                    ? "Questionnaire commencé mais non validé. Vos réponses sont conservées."
                    : "Passez le questionnaire pour obtenir le badge officiel JEB et le faire apparaître sur votre profil public."}
                </div>
                <Button asChild variant="primary" className="mt-4 h-10 w-full">
                  <Link href="/certification">
                    {certification.answered > 0
                      ? "Reprendre le questionnaire"
                      : "Passer le questionnaire"}
                  </Link>
                </Button>
              </div>
            )}
          </Blueprint>

          <NotificationsCard items={notifications.items} unread={notifications.unread} />
        </div>
      </div>
    </div>
  );
}
