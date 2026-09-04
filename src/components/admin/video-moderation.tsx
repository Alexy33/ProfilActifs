"use client";

import { useState } from "react";
import { Check, Loader2, ShieldQuestion, X } from "lucide-react";

import { ProfileVideo } from "@/components/catalogue/profile-video";
import type { ProfileStatus, VideoStatus } from "@/lib/vocabulary";

export type VideoRow = {
  profileId: string;
  name: string;
  title: string;
  videoUrl: string | null;
  profileStatus: ProfileStatus;
  videoStatus: VideoStatus;
  reason: string | null;
  decidedBy: string | null;
  decidedAt: string | null;
  submittedAt: string;
};

const LABEL: Record<VideoStatus, string> = {
  pending: "En attente",
  approved: "Validée",
  rejected: "Refusée",
};

const TONE: Record<VideoStatus, string> = {
  pending: "bg-[#fff0d9] text-[#8a5208]",
  approved: "bg-[#dff7e9] text-[#17603a]",
  rejected: "bg-[#ffe8ef] text-[#8a3f5b]",
};

const stamp = (value: string) =>
  new Date(value).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" });

/**
 * File de moderation des videos (R.2).
 *
 * L'administration voit la video AVANT qu'elle soit diffusable : c'est le seul
 * endroit du dispositif ou une video `pending` est servie, et c'est ce qui rend
 * la decision possible. Le motif est saisi dans la ligne meme, parce qu'un
 * refus sans motif est refuse par l'API — autant le rendre evident a l'ecran.
 */
export function VideoModeration({
  rows,
  onDecide,
}: {
  rows: VideoRow[];
  onDecide: (profileId: string, decision: "approved" | "rejected", reason: string) => Promise<void>;
}) {
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(row: VideoRow, decision: "approved" | "rejected") {
    const reason = (reasons[row.profileId] ?? "").trim();
    if (decision === "rejected" && !reason) {
      setError(`Indiquez le motif du refus de la vidéo de ${row.name} : il lui sera communiqué.`);
      return;
    }
    setError(null);
    setBusy(row.profileId);
    await onDecide(row.profileId, decision, reason);
    setReasons((current) => ({ ...current, [row.profileId]: "" }));
    setBusy(null);
  }

  return (
    <section className="mt-7 rounded-3xl bg-[#ebf0f7] p-6 shadow-[10px_10px_20px_#c5d1e0,-10px_-10px_20px_#ffffff] md:p-8">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-[#fff0d9] text-[#8a5208]">
          <ShieldQuestion className="size-5" />
        </span>
        <div>
          <h2 className="text-2xl font-bold uppercase text-[#2d3748]">Modération des vidéos</h2>
          <p className="text-sm text-[#566274]">
            Une vidéo n&apos;est diffusée qu&apos;après validation. Un refus exige un motif, communiqué au candidat.
          </p>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-5 rounded-xl bg-[#ffe8ef] px-4 py-3 text-sm text-[#8a3f5b]">
          {error}
        </p>
      )}

      {rows.length === 0 ? (
        <p className="mt-6 rounded-2xl bg-white p-5 text-sm text-[#566274]">
          Aucune vidéo déposée pour le moment.
        </p>
      ) : (
        <div className="mt-6 space-y-4">
          {rows.map((row) => (
            <article key={row.profileId} className="grid gap-5 rounded-2xl bg-white p-5 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
              <ProfileVideo videoUrl={row.videoUrl} name={row.name} />

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold text-[#2d3748]">{row.name}</h3>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${TONE[row.videoStatus]}`}>
                    {LABEL[row.videoStatus]}
                  </span>
                </div>
                <p className="mt-1 text-sm text-[#566274]">{row.title}</p>
                <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-[#566274]">
                  Déposée le {stamp(row.submittedAt)}
                </p>

                {row.decidedAt && (
                  <div className="mt-3 rounded-xl bg-[#F5F9FE] p-3 text-xs text-[#4a5568]">
                    <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#566274]">
                      Décision — {row.decidedBy ?? "administrateur supprimé"}, le {stamp(row.decidedAt)}
                    </p>
                    {row.reason && <p className="mt-1">Motif : {row.reason}</p>}
                  </div>
                )}

                <label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-[#566274]">
                  Motif du refus
                  <textarea
                    value={reasons[row.profileId] ?? ""}
                    onChange={(e) => setReasons((current) => ({ ...current, [row.profileId]: e.target.value }))}
                    placeholder="Ce que le candidat doit corriger."
                    className="mt-2 min-h-20 w-full resize-y rounded-xl border border-[#1B3A6B]/20 bg-white p-3 text-sm font-normal normal-case tracking-normal text-[#2d3748] outline-none focus:border-[#1B3A6B]"
                  />
                </label>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void decide(row, "approved")}
                    disabled={busy !== null || row.videoStatus === "approved"}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#dff7e9] px-3 py-2 text-xs font-semibold text-[#17603a] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {busy === row.profileId ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                    Valider
                  </button>
                  <button
                    type="button"
                    onClick={() => void decide(row, "rejected")}
                    disabled={busy !== null}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#ffe8ef] px-3 py-2 text-xs font-semibold text-[#8a3f5b] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <X className="size-3.5" /> Refuser
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
