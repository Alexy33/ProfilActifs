"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Bell, CircleCheck, CircleX, Clock, Eye, FileVideo, Loader2, MessageSquare, Save, ShieldCheck, ShieldOff, Upload } from "lucide-react";

import { ProfileVideo } from "@/components/catalogue/profile-video";
import { formatDay, formatTimestamp } from "@/lib/dates";
import type { City, Sector, Skill } from "@/lib/vocabulary";
import type { OwnProfile } from "@/server/services/profiles";

type Certification = { status: "not_started" | "in_progress" | "submitted"; answered: number; questionCount: number; score: number | null; passed: boolean | null };
type Notice = { id: string; text: string; createdAt: string };
type Props = { initialProfile: OwnProfile; sectors: readonly Sector[]; cities: readonly City[]; skills: readonly Skill[] };

const field = "mt-2 h-11 w-full rounded-xl border border-[#1B3A6B]/20 bg-white px-4 text-sm text-[#22334D] outline-none transition-colors focus:border-[#1B3A6B]";

export function CandidateDashboard({ initialProfile, sectors, cities, skills }: Props) {
  const [profile, setProfile] = useState(initialProfile);
  const [form, setForm] = useState({
    name: initialProfile.name, title: initialProfile.title, sector: initialProfile.sector,
    city: initialProfile.city, bio: initialProfile.bio,
    videoUrl: initialProfile.videoUrl?.startsWith("/api/videos/") ? "" : (initialProfile.videoUrl ?? ""),
    skills: initialProfile.skills,
  });
  const [certification, setCertification] = useState<Certification | null>(null);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [busy, setBusy] = useState<"save" | "upload" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/me/certification").then(async (r) => r.ok && setCertification(await r.json()));
    void fetch("/api/me/notifications").then(async (r) => {
      if (r.ok) setNotices(((await r.json()) as { items: Notice[] }).items);
    });
  }, []);

  function toggleSkill(skill: Skill) {
    setForm((current) => ({ ...current, skills: current.skills.includes(skill)
      ? current.skills.filter((item) => item !== skill)
      : current.skills.length < 8 ? [...current.skills, skill] : current.skills }));
  }

  async function save() {
    setBusy("save"); setMessage(null);
    const response = await fetch("/api/me/profile", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, videoUrl: form.videoUrl.trim() || (profile.videoUrl?.startsWith("/api/videos/") ? undefined : null) }),
    });
    const data = await response.json();
    if (response.ok) { setProfile(data); setMessage("Profil enregistré."); }
    else setMessage(data?.error?.message ?? "Impossible d’enregistrer le profil.");
    setBusy(null);
  }

  async function upload(file: File) {
    setBusy("upload"); setMessage(null);
    const response = await fetch("/api/me/profile/video", { method: "PUT", headers: { "Content-Type": file.type }, body: file });
    const data = await response.json();
    if (response.ok) { setProfile(data); setForm((current) => ({ ...current, videoUrl: "" })); setMessage("Vidéo mise en ligne."); }
    else setMessage(data?.error?.message ?? "Impossible d’envoyer la vidéo.");
    setBusy(null);
  }

  const consent = profile.videoConsent;
  const moderation = profile.videoModeration;

  const status = { pending: "En attente", published: "Publié", removed: "Retiré" }[profile.status];
  const stats = [
    { label: "Vues du profil", value: profile.views, icon: Eye, tone: "bg-[#D1DEF0] text-[#1B2D3E]" },
    { label: "Contacts reçus", value: profile.contactCount, icon: MessageSquare, tone: "bg-[#dff7e9] text-[#17603a]" },
    { label: "Statut", value: status, icon: FileVideo, tone: "bg-[#fff0d9] text-[#8a5208]" },
    { label: "Score JEB", value: profile.score ?? "—", icon: BadgeCheck, tone: "bg-[#eee7ff] text-[#65449b]" },
  ];

  return (
    <main className="mx-auto w-full max-w-[1480px] px-5 pb-24 pt-8 md:px-10 md:pt-12 lg:px-6">
      <header className="flex flex-wrap items-end justify-between gap-5 border-b border-[#1B3A6B]/15 pb-7">
        <div><p className="font-mono text-xs font-semibold uppercase tracking-wider text-[#41556E]">Espace demandeur d&apos;emploi</p>
          <h1 className="mt-3 text-4xl font-extrabold uppercase tracking-tight text-[#22334D] md:text-5xl">Bonjour, <span className="text-[#1B3A6B]">{profile.name.split(" ")[0]}.</span></h1></div>
        {profile.status === "published" && <Link href={`/profils/${profile.id}`} className="inline-flex h-11 items-center rounded-xl bg-[#2d3748] px-5 text-sm font-semibold text-white hover:bg-[#1E293B]">Voir mon profil public</Link>}
      </header>

      {message && (
        <p role="status" className="mt-5 rounded-xl border border-[#A8C5E0] bg-[#D1DEF0] px-4 py-3 text-sm text-[#1B2D3E]">
          {message}
        </p>
      )}

      <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, tone }) => <article key={label} className="flex items-center gap-4 rounded-2xl border border-[#1B3A6B]/15 bg-white p-4 sm:p-5">
          <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon className="size-4" /></div>
          <div className="min-w-0"><p className="truncate text-xl font-extrabold text-[#22334D]">{value}</p><p className="mt-0.5 text-xs text-[#41556E]">{label}</p></div>
        </article>)}
      </section>

      <div className="mt-7 grid items-start gap-7 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-7">
        <section className="rounded-3xl bg-[#ebf0f7] p-6 shadow-[10px_10px_20px_#c5d1e0,-10px_-10px_20px_#ffffff] md:p-8">
          <div className="flex items-center justify-between gap-4"><div><h2 className="text-2xl font-bold uppercase text-[#22334D]">Mon profil</h2><p className="mt-1 text-sm text-[#41556E]">Informations visibles dans le catalogue.</p></div>
            <button type="button" onClick={save} disabled={busy !== null} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#2d3748] px-4 text-sm font-semibold text-white hover:bg-[#1E293B] disabled:opacity-60">{busy === "save" ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Enregistrer</button></div>

          <div className="mt-7 grid gap-5 md:grid-cols-2">
            <Field label="Nom affiché"><input className={field} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Intitulé recherché"><input className={field} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
            <Field label="Secteur"><select className={field} value={form.sector} onChange={(e) => setForm({ ...form, sector: e.target.value as Sector })}>{sectors.map((x) => <option key={x}>{x}</option>)}</select></Field>
            <Field label="Localisation"><select className={field} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value as City })}>{cities.map((x) => <option key={x}>{x}</option>)}</select></Field>
          </div>
          <Field label="Présentation" className="mt-5 block"><textarea className={`${field} min-h-32 resize-y py-3`} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} /></Field>

          <div className="mt-5"><p className="text-xs font-semibold uppercase tracking-wider text-[#41556E]">Compétences</p><div className="mt-3 flex flex-wrap gap-2">
            {skills.map((skill) => <button key={skill} type="button" onClick={() => toggleSkill(skill)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${form.skills.includes(skill) ? "bg-[#2d3748] text-white" : "bg-white text-[#41556E] hover:bg-[#D1DEF0]"}`}>{skill}</button>)}
          </div></div>

        </section>

        <section className="rounded-3xl border border-[#A8C5E0] bg-[#F5F9FE] p-6 md:p-8">
          <div><h2 className="text-2xl font-bold uppercase text-[#22334D]">Vidéo de présentation</h2><p className="mt-1 text-sm text-[#41556E]">Ajoutez un lien ou importez directement votre vidéo.</p></div>
          <div className="mt-5 grid items-start gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(260px,0.75fr)]">
            <ProfileVideo videoUrl={profile.videoUrl} name={profile.name} />
            <div><Field label="URL YouTube ou Vimeo"><input className={field} placeholder="https://…" value={form.videoUrl} onChange={(e) => setForm({ ...form, videoUrl: e.target.value })} /></Field><p className="my-3 text-center text-xs text-[#41556E]">ou</p>
              <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-[#1B3A6B]/40 bg-white px-4 text-center text-sm font-semibold text-[#273D4F] hover:bg-[#E8F0F8]">{busy === "upload" ? <Loader2 className="mb-2 size-5 animate-spin" /> : <Upload className="mb-2 size-5" />}Importer une vidéo (100 Mo max.)<input type="file" accept="video/mp4,video/webm,video/ogg,video/quicktime" className="sr-only" disabled={busy !== null} onChange={(e) => { const file = e.target.files?.[0]; if (file) void upload(file); }} /></label>
              {form.videoUrl.trim() ? <button type="button" onClick={save} disabled={busy !== null} className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#2d3748] px-4 text-sm font-semibold text-white hover:bg-[#1E293B] disabled:opacity-60"><Save className="size-4" /> Enregistrer le lien</button> : null}
            </div>
          </div>

          {/* Moderation de la video (R.2) : ou en est la video, et — en cas de
              refus — ce qui est reproche. Le motif est affiche tel qu'il a ete
              saisi par l'administration : c'est ce qui permet de corriger. */}
          {profile.videoUrl ? (
            <div className={`mt-6 rounded-2xl border p-5 ${moderation.status === "approved" ? "border-[#17603a]/25 bg-[#dff7e9]" : moderation.status === "rejected" ? "border-[#8a3f5b]/25 bg-[#ffe8ef]" : "border-[#8a5208]/25 bg-[#fff0d9]"}`}>
              <div className="flex items-center gap-3">
                <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl bg-white ${moderation.status === "approved" ? "text-[#17603a]" : moderation.status === "rejected" ? "text-[#8a3f5b]" : "text-[#8a5208]"}`}>
                  {moderation.status === "approved" ? <CircleCheck className="size-5" /> : moderation.status === "rejected" ? <CircleX className="size-5" /> : <Clock className="size-5" />}
                </span>
                <div>
                  <h3 className="text-lg font-bold uppercase text-[#2d3748]">
                    {moderation.status === "approved" ? "Vidéo validée" : moderation.status === "rejected" ? "Vidéo refusée" : "Vidéo en attente de validation"}
                  </h3>
                  <p className="text-sm text-[#4a5568]">
                    {moderation.status === "approved"
                      ? "Elle est visible des recruteurs sur votre profil public."
                      : moderation.status === "rejected"
                        ? "Elle n’est pas diffusée. Corrigez le point ci-dessous puis envoyez une nouvelle vidéo."
                        : "Elle n’est visible que de vous et de l’administration tant qu’elle n’a pas été examinée."}
                  </p>
                </div>
              </div>

              {moderation.status === "rejected" && moderation.reason ? (
                <p className="mt-4 rounded-xl bg-white p-4 text-sm text-[#2d3748]">
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#566274]">Motif du refus</span>
                  <br />
                  {moderation.reason}
                </p>
              ) : null}

              {moderation.decidedAt ? (
                <p className="mt-3 font-mono text-[11px] uppercase tracking-wider text-[#566274]">
                  Décision du {formatTimestamp(moderation.decidedAt)}
                  {moderation.decidedBy ? ` — ${moderation.decidedBy}` : ""}
                </p>
              ) : null}
            </div>
          ) : null}

          {/* Consentement a la diffusion (R.3) : le tableau de bord n'en montre
              que l'etat. La redaction soumise, sa portee et les actions qui
              engagent vivent sur /candidate/consentement. */}
          <div className="mt-6 rounded-2xl border border-[#A8C5E0] bg-white p-5" id="consentement">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className={`flex size-10 items-center justify-center rounded-xl ${consent.granted ? "bg-[#dff7e9] text-[#17603a]" : "bg-[#ffe8ef] text-[#8a3f5b]"}`}>
                  {consent.granted ? <ShieldCheck className="size-5" /> : <ShieldOff className="size-5" />}
                </span>
                <div>
                  <h3 className="text-lg font-bold uppercase text-[#22334D]">Consentement à la diffusion</h3>
                  <p className="text-sm text-[#41556E]">
                    {consent.granted
                      ? `Accord en cours depuis le ${formatTimestamp(consent.grantedAt)} (version ${consent.version ?? "—"}).`
                      : consent.revokedAt
                        ? `Retiré le ${formatTimestamp(consent.revokedAt)} : aucune vidéo ne peut être hébergée.`
                        : "Jamais donné : aucune vidéo ne peut être hébergée."}
                  </p>
                </div>
              </div>

              <Link href="/candidate/consentement"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#2d3748] px-5 text-sm font-semibold text-white hover:bg-[#1E293B]">
                {consent.granted ? "Gérer mon consentement" : "Donner mon consentement"}
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </section>
        </div>

        <aside className="space-y-6 xl:sticky xl:top-6">
          <Panel title="Certification JEB" icon={<BadgeCheck className="size-5" />}><p className="mt-5 text-4xl font-extrabold text-[#1B3A6B]">{certification?.score ?? profile.score ?? "—"}<span className="text-lg text-[#41556E]"> / 100</span></p><p className="mt-3 text-sm leading-relaxed text-[#41556E]">{certification?.status === "in_progress" ? `Questionnaire en cours : ${certification.answered}/${certification.questionCount} réponses.` : certification?.passed ? "Badge obtenu et visible sur votre profil public." : "Passez le questionnaire pour certifier vos aptitudes professionnelles."}</p><Link href="/candidate/certification" className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#2d3748] px-4 text-sm font-semibold text-white hover:bg-[#1E293B]">{certification?.status === "in_progress" ? "Reprendre le questionnaire" : certification?.status === "submitted" ? "Voir mon résultat" : "Commencer le questionnaire"}</Link></Panel>
          <section className="rounded-3xl border border-[#A8C5E0] bg-[#F5F9FE] p-6"><div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-[#D1DEF0] text-[#1B2D3E]"><Bell className="size-5" /></span><h2 className="text-xl font-bold uppercase text-[#22334D]">Notifications</h2></div><div className="mt-5 space-y-3">{notices.length ? notices.slice(0, 5).map((notice) => <article key={notice.id} className="rounded-xl bg-white p-4"><p className="text-sm text-[#41556E]">{notice.text}</p><time className="mt-2 block font-mono text-[10px] text-[#41556E]">{formatDay(notice.createdAt)}</time></article>) : <p className="text-sm text-[#41556E]">Aucune interaction reçue pour le moment.</p>}</div></section>
        </aside>
      </div>
    </main>
  );
}

function Field({ label, className = "", children }: { label: string; className?: string; children: React.ReactNode }) {
  return <label className={`${className} text-xs font-semibold uppercase tracking-wider text-[#41556E]`}>{label}{children}</label>;
}

function Panel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return <section className="rounded-3xl bg-[#ebf0f7] p-6 shadow-[8px_8px_16px_#c5d1e0,-8px_-8px_16px_#ffffff]"><div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-[#eee7ff] text-[#65449b]">{icon}</span><h2 className="text-xl font-bold uppercase text-[#22334D]">{title}</h2></div>{children}</section>;
}
