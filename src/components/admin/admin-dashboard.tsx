"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BadgeCheck, Check, FileQuestion, Loader2, Save, ShieldCheck, Trash2, Users, Video } from "lucide-react";
import { VideoModeration, type VideoRow } from "@/components/admin/video-moderation";
import type { ProfileStatus } from "@/lib/vocabulary";

type Stats = { publishedProfiles: number; pendingProfiles: number; removedProfiles: number; certificationRate: number; questionCount: number; recruiterContacts: number };
type Profile = { id: string; name: string; title: string; videoUrl: string | null; status: ProfileStatus; createdAt: string };
type Question = { id: string; text: string; weight: number; position: number; options: { id: string; label: string; value: number }[] };
type Settings = { certificationThreshold: number; catalogPageSize: number };

/**
 * Onglets de l'ecran d'administration.
 *
 * La moderation des videos (R.2) est un ecran a part et non une colonne de plus
 * dans la file des profils : elle porte sur un autre objet, se decide sur un
 * autre critere (le contenu du fichier, qu'il faut regarder) et n'a pas le meme
 * effet — refuser une video ne depublie pas le profil.
 */
type Tab = "profils" | "videos" | "questionnaire";

const TABS: { id: Tab; label: string; icon: typeof Users }[] = [
  { id: "profils", label: "Profils", icon: Users },
  { id: "videos", label: "Vidéos", icon: Video },
  { id: "questionnaire", label: "Questionnaire", icon: FileQuestion },
];

export function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [videos, setVideos] = useState<VideoRow[]>([]);
  const [tab, setTab] = useState<Tab>("profils");
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingProfileId, setDeletingProfileId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [s, p, q, config, v] = await Promise.all([fetch("/api/admin/stats"), fetch("/api/admin/profiles"), fetch("/api/admin/questions"), fetch("/api/admin/settings"), fetch("/api/admin/videos")]);
    if (s.ok) setStats(await s.json());
    if (p.ok) setProfiles(((await p.json()) as { items: Profile[] }).items);
    if (q.ok) setQuestions(((await q.json()) as { items: Question[] }).items);
    if (config.ok) setSettings(await config.json());
    if (v.ok) setVideos(((await v.json()) as { items: VideoRow[] }).items);
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function moderate(id: string, status: ProfileStatus) {
    const response = await fetch(`/api/admin/profiles/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    if (response.ok) { setProfiles((rows) => rows.map((row) => row.id === id ? { ...row, status } : row)); setMessage("Statut du profil mis à jour."); void load(); }
  }
  /**
   * Valide ou refuse une video (R.2).
   *
   * `reason` n'est envoye qu'au refus : l'API refuse un motif accroche a une
   * validation, et refuse un refus sans motif.
   */
  async function decideVideo(profileId: string, decision: "approved" | "rejected", reason: string) {
    const response = await fetch(`/api/admin/videos/${profileId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(decision === "rejected" ? { decision, reason } : { decision }),
    });
    const data = await response.json();
    if (response.ok) {
      setVideos((rows) => rows.map((row) => (row.profileId === profileId ? data : row)));
      setMessage(decision === "approved" ? "Vidéo validée : elle est désormais diffusée." : "Vidéo refusée : le motif a été transmis au candidat.");
      void load();
    } else {
      setMessage(data?.error?.message ?? "Impossible d’enregistrer la décision.");
    }
  }

  async function removeProfile(profile: Profile) {
    if (!window.confirm(`Supprimer definitivement le profil de ${profile.name} ? Cette action est irreversible.`)) return;

    setDeletingProfileId(profile.id);
    const response = await fetch(`/api/admin/profiles/${profile.id}`, { method: "DELETE" });
    if (response.ok) {
      setProfiles((rows) => rows.filter((row) => row.id !== profile.id));
      setMessage("Profil supprimé.");
      void load();
    } else {
      setMessage("Impossible de supprimer le profil.");
    }
    setDeletingProfileId(null);
  }
  async function saveSettings() {
    if (!settings) return;
    const response = await fetch("/api/admin/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) });
    setMessage(response.ok ? "Réglages enregistrés." : "Impossible d’enregistrer les réglages.");
    if (response.ok) setSettings(await response.json());
  }
  async function saveQuestion(question: Question) {
    const response = await fetch(`/api/admin/questions/${question.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: question.text, weight: question.weight }) });
    setMessage(response.ok ? "Question enregistrée." : "Impossible d’enregistrer la question.");
  }
  async function removeQuestion(id: string) {
    const response = await fetch(`/api/admin/questions/${id}`, { method: "DELETE" });
    if (response.ok) { setQuestions((rows) => rows.filter((row) => row.id !== id)); setMessage("Question supprimée."); void load(); }
  }

  const cards = [
    { label: "Profils publiés", value: stats?.publishedProfiles ?? 0, icon: Users, tone: "bg-[#D1DEF0] text-[#1B2D3E]" },
    { label: "En attente", value: stats?.pendingProfiles ?? 0, icon: ShieldCheck, tone: "bg-[#fff0d9] text-[#8a5208]" },
    { label: "Certification", value: `${stats?.certificationRate ?? 0}%`, icon: BadgeCheck, tone: "bg-[#dff7e9] text-[#17603a]" },
    { label: "Contacts recruteurs", value: stats?.recruiterContacts ?? 0, icon: Check, tone: "bg-[#eee7ff] text-[#65449b]" },
  ];

  return <main className="mx-auto w-full max-w-[1480px] px-5 pb-24 pt-8 md:px-10 md:pt-12 lg:px-6">
    <header className="border-b border-[#1B3A6B]/15 pb-7"><p className="font-mono text-xs font-semibold uppercase tracking-wider text-[#41556E]">Administration du dispositif</p><h1 className="mt-3 text-4xl font-extrabold uppercase text-[#22334D] md:text-5xl">Pilotez la <span className="text-[#1B3A6B]">plateforme.</span></h1></header>
    {message && <p role="status" className="mt-5 rounded-xl bg-[#D1DEF0] px-4 py-3 text-sm text-[#1B2D3E]">{message}</p>}
    <section className="mt-6 grid grid-cols-2 gap-3 xl:grid-cols-4">{cards.map(({ label, value, icon: Icon, tone }) => <article key={label} className="flex items-center gap-4 rounded-2xl border border-[#1B3A6B]/15 bg-white p-5"><span className={`flex size-10 items-center justify-center rounded-xl ${tone}`}><Icon className="size-5" /></span><div><p className="text-2xl font-extrabold text-[#22334D]">{value}</p><p className="text-xs text-[#41556E]">{label}</p></div></article>)}</section>
    {loading ? <div className="flex justify-center py-24"><Loader2 className="size-7 animate-spin text-[#1B3A6B]" /></div> : <>
      <nav aria-label="Sections de l&apos;administration" className="mt-7 flex flex-wrap gap-2 border-b border-[#1B3A6B]/15 pb-3">
        {TABS.map(({ id, label, icon: Icon }) => {
          const waiting = id === "videos" ? videos.filter((row) => row.videoStatus === "pending").length : 0;
          return <button key={id} type="button" onClick={() => setTab(id)} aria-current={tab === id ? "page" : undefined} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold ${tab === id ? "bg-[#1B3A6B] text-white" : "bg-white text-[#41556E] hover:bg-[#D1DEF0]"}`}>
            <Icon className="size-4" /> {label}
            {waiting > 0 && <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${tab === id ? "bg-white text-[#1B3A6B]" : "bg-[#fff0d9] text-[#8a5208]"}`}>{waiting}</span>}
          </button>;
        })}
      </nav>
      {tab === "profils" && <div className="mt-7 grid items-start gap-7 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)]">
      <section className="rounded-3xl bg-[#ebf0f7] p-6 shadow-[10px_10px_20px_#c5d1e0,-10px_-10px_20px_#ffffff] md:p-8"><h2 className="text-2xl font-bold uppercase text-[#22334D]">Modération des profils</h2><p className="mt-1 text-sm text-[#41556E]">Validez, retirez ou supprimez les profils.</p><div className="mt-6 space-y-3">{profiles.map((profile) => <article key={profile.id} className="grid gap-4 rounded-2xl bg-white p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold text-[#22334D]">{profile.name}</h3><Status status={profile.status} /></div><p className="mt-1 text-sm text-[#41556E]">{profile.title}</p><p className="mt-2 text-xs text-[#41556E]">{profile.videoUrl ? "Vidéo renseignée" : "Aucune vidéo"}</p></div><div className="flex flex-wrap gap-2">{profile.status !== "published" && <button onClick={() => void moderate(profile.id, "published")} className="rounded-xl bg-[#dff7e9] px-3 py-2 text-xs font-semibold text-[#17603a]">Publier</button>}{profile.status !== "pending" && <button onClick={() => void moderate(profile.id, "pending")} className="rounded-xl bg-[#fff0d9] px-3 py-2 text-xs font-semibold text-[#8a5208]">En attente</button>}{profile.status !== "removed" && <button onClick={() => void moderate(profile.id, "removed")} className="rounded-xl bg-[#ffe8ef] px-3 py-2 text-xs font-semibold text-[#8a3f5b]">Retirer</button>}{profile.status === "published" && <Link href={`/profils/${profile.id}`} className="rounded-xl bg-[#E8F0F8] px-3 py-2 text-xs font-semibold text-[#273D4F]">Voir</Link>}<button onClick={() => void removeProfile(profile)} disabled={deletingProfileId === profile.id} aria-label={`Supprimer le profil de ${profile.name}`} className="inline-flex items-center gap-1.5 rounded-xl bg-[#8a3f5b] px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">{deletingProfileId === profile.id ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />} Supprimer</button></div></article>)}</div></section>
      <aside className="space-y-7 xl:sticky xl:top-6"><section className="rounded-3xl border border-[#A8C5E0] bg-[#F5F9FE] p-6"><h2 className="text-xl font-bold uppercase text-[#22334D]">Réglages</h2>{settings && <div className="mt-5 space-y-4"><label className="block text-xs font-semibold uppercase tracking-wider text-[#41556E]">Seuil de certification<input type="number" min="0" max="100" value={settings.certificationThreshold} onChange={(e) => setSettings({ ...settings, certificationThreshold: Number(e.target.value) })} className="mt-2 h-11 w-full rounded-xl border border-[#1B3A6B]/20 bg-white px-4 text-sm" /></label><label className="block text-xs font-semibold uppercase tracking-wider text-[#41556E]">Profils par page<input type="number" min="1" max="20" value={settings.catalogPageSize} onChange={(e) => setSettings({ ...settings, catalogPageSize: Number(e.target.value) })} className="mt-2 h-11 w-full rounded-xl border border-[#1B3A6B]/20 bg-white px-4 text-sm" /></label><button onClick={() => void saveSettings()} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#1B3A6B] px-4 text-sm font-semibold text-white"><Save className="size-4" /> Enregistrer</button></div>}</section></aside>
      </div>}

      {tab === "videos" && <VideoModeration rows={videos} onDecide={decideVideo} />}

      {tab === "questionnaire" &&
      <section className="rounded-3xl border border-[#A8C5E0] bg-[#F5F9FE] p-6 md:p-8"><div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-[#eee7ff] text-[#65449b]"><FileQuestion className="size-5" /></span><div><h2 className="text-2xl font-bold uppercase text-[#22334D]">Questionnaire</h2><p className="text-sm text-[#41556E]">Libellés et pondérations du calcul JEB.</p></div></div><div className="mt-6 grid gap-3 lg:grid-cols-2">{questions.map((question, index) => <article key={question.id} className="rounded-2xl bg-white p-4"><div className="flex gap-3"><span className="font-mono text-xs font-bold text-[#1B3A6B]">{String(index + 1).padStart(2, "0")}</span><textarea value={question.text} onChange={(e) => setQuestions((rows) => rows.map((row) => row.id === question.id ? { ...row, text: e.target.value } : row))} className="min-h-20 flex-1 resize-none rounded-xl border border-[#1B3A6B]/15 p-3 text-sm outline-none focus:border-[#1B3A6B]" /></div><div className="mt-3 flex items-center justify-between gap-3"><label className="text-xs text-[#41556E]">Poids <input type="number" min="1" max="5" value={question.weight} onChange={(e) => setQuestions((rows) => rows.map((row) => row.id === question.id ? { ...row, weight: Number(e.target.value) } : row))} className="ml-2 h-9 w-16 rounded-lg border border-[#1B3A6B]/15 px-2" /></label><div className="flex gap-2"><button onClick={() => void saveQuestion(question)} aria-label="Enregistrer la question" className="flex size-9 items-center justify-center rounded-lg bg-[#D1DEF0] text-[#1B2D3E]"><Save className="size-4" /></button><button onClick={() => void removeQuestion(question.id)} aria-label="Supprimer la question" className="flex size-9 items-center justify-center rounded-lg bg-[#ffe8ef] text-[#8a3f5b]"><Trash2 className="size-4" /></button></div></div></article>)}</div></section>
      }
    </>}
  </main>;
}

function Status({ status }: { status: ProfileStatus }) { const style = status === "published" ? "bg-[#dff7e9] text-[#17603a]" : status === "pending" ? "bg-[#fff0d9] text-[#8a5208]" : "bg-[#ffe8ef] text-[#8a3f5b]"; return <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${style}`}>{status === "published" ? "Publié" : status === "pending" ? "En attente" : "Retiré"}</span>; }
