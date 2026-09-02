import { Blueprint } from "@/components/ui/blueprint";
import { StatGrid } from "@/components/ui/stat-grid";
import { requireRole } from "@/lib/session";
import { adminStats, moderationQueue } from "@/server/services/dashboard";
import { loadQuestions } from "@/server/services/certification";
import { getSettings } from "@/server/services/settings";
import { ModerationTable } from "@/components/admin/moderation-table";
import { QuestionsEditor } from "@/components/admin/questions-editor";
import { VideoModerationTable } from "@/components/admin/video-moderation-table";
import { videoQueue } from "@/server/services/video-moderation";

export const dynamic = "force-dynamic";

/** Tableau de bord de l'administration : moderation et bareme. */
export default async function AdministrationPage() {
  await requireRole("admin");

  const [stats, rows, videos, questions, settings] = await Promise.all([
    adminStats(),
    moderationQueue(),
    videoQueue(),
    loadQuestions(),
    getSettings(),
  ]);

  const pendingVideos = videos.filter((row) => row.videoStatus === "pending").length;

  return (
    <div>
      <div className="border-b border-divider pb-5">
        <div className="font-mono text-[11px] tracking-[0.16em] text-accent-700 uppercase">
          Espace administration
        </div>
        <h1 className="mt-2.5 text-[42px] leading-none uppercase">Tableau de bord global</h1>
      </div>

      <StatGrid
        className="mt-7"
        stats={[
          { value: stats.publishedProfiles, label: "profils actifs" },
          { value: `${stats.certificationRate}%`, label: "taux de certification" },
          { value: stats.pendingProfiles, label: "en attente de modération" },
          { value: pendingVideos, label: "vidéos à valider" },
        ]}
      />

      {/* Moderation A PRIORI des videos : une video deposee n'est visible de
          personne tant qu'elle n'a pas ete validee ici. */}
      <Blueprint className="mt-8 p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div className="font-heading text-2xl uppercase">Modération des vidéos</div>
          <div className="font-mono text-[11px] text-text/55">
            validation préalable — une vidéo en attente n&apos;est diffusée à personne
          </div>
        </div>
        <VideoModerationTable rows={videos} />
      </Blueprint>

      <div className="mt-8 grid items-start gap-8 lg:grid-cols-2">
        <Blueprint className="p-6">
          <div className="font-heading text-2xl uppercase">Modération des profils</div>
          <ModerationTable rows={rows} />
        </Blueprint>

        <Blueprint className="p-6">
          <div className="font-heading text-2xl uppercase">Questionnaire de certification</div>
          <QuestionsEditor
            questions={questions}
            threshold={settings.certificationThreshold}
          />
        </Blueprint>
      </div>
    </div>
  );
}
