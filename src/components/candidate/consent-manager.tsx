"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, FileVideo, Loader2, ShieldCheck, ShieldOff, Trash2 } from "lucide-react";

import { formatTimestamp } from "@/lib/dates";
import type { VideoConsentView } from "@/server/services/profiles";

type ConsentNotice = { version: string; text: string };
type Props = { initialConsent: VideoConsentView; hasVideo: boolean };

/**
 * Page dediee au consentement a la diffusion video (R.3).
 *
 * Le tableau de bord n'en garde qu'un resume : tout ce qui engage le candidat —
 * la redaction integrale soumise, sa version, l'horodatage, et la portee exacte
 * du retrait — vit ici, sur un ecran ou rien d'autre ne dispute l'attention.
 */
export function ConsentManager({ initialConsent, hasVideo }: Props) {
  const [consent, setConsent] = useState(initialConsent);
  const [videoPresent, setVideoPresent] = useState(hasVideo);
  const [notice, setNotice] = useState<ConsentNotice | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // La redaction en vigueur vient du serveur : c'est la version qu'il
  // enregistrera, jamais une copie figee dans le bundle client.
  useEffect(() => {
    void fetch("/api/me/profile/video/consent").then(async (r) => r.ok && setNotice(await r.json()));
  }, []);

  async function submit(granted: boolean) {
    if (!granted && !window.confirm(
      "Retirer votre consentement supprime définitivement votre vidéo du stockage. Continuer ?",
    )) return;

    setBusy(true); setMessage(null);
    const response = await fetch("/api/me/profile/video/consent", { method: granted ? "POST" : "DELETE" });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data?.error?.message ?? "Impossible de modifier le consentement.");
      setBusy(false);
      return;
    }
    setConsent(data as VideoConsentView);
    // Le retrait efface le fichier : la page doit cesser de promettre une video.
    if (!granted) setVideoPresent(false);
    setMessage(granted
      ? "Consentement enregistré."
      : "Consentement retiré : la vidéo a été supprimée du stockage.");
    setBusy(false);
  }

  return (
    <main className="min-h-screen bg-[#ebf0f7] px-6 py-10 text-[#2d3748] md:px-10">
      <div className="mx-auto max-w-3xl">
        <Link href="/candidate" className="inline-flex items-center gap-2 text-sm font-semibold text-[#41556E] hover:text-[#1B3A6B]">
          <ArrowLeft className="size-4" />
          Retour à mon espace
        </Link>

        <header className="mt-6 flex items-center gap-4">
          <span className={`flex size-14 items-center justify-center rounded-2xl ${consent.granted ? "bg-[#dff7e9] text-[#17603a]" : "bg-[#ffe8ef] text-[#8a3f5b]"}`}>
            {consent.granted ? <ShieldCheck className="size-7" /> : <ShieldOff className="size-7" />}
          </span>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[#1B3A6B]">Consentement à la diffusion</h1>
            <p className="mt-1 text-sm text-[#41556E]">
              {consent.granted
                ? "Votre accord est en cours : votre vidéo peut être diffusée auprès des recruteurs inscrits."
                : "Aucun accord en cours : aucune vidéo ne peut être hébergée ni diffusée."}
            </p>
          </div>
        </header>

        {/* Ce qui a ete accepte, quand, sur quelle redaction. */}
        <section className="mt-8 rounded-3xl border border-[#A8C5E0] bg-white p-6">
          <h2 className="text-lg font-bold uppercase text-[#22334D]">État de votre accord</h2>
          <dl className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-[#F5F9FE] p-4">
              <dt className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#41556E]">État</dt>
              <dd className="mt-1 text-sm font-semibold text-[#22334D]">
                {consent.granted ? "Accordé" : consent.revokedAt ? "Retiré" : "Jamais donné"}
              </dd>
            </div>
            <div className="rounded-xl bg-[#F5F9FE] p-4">
              <dt className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#41556E]">Accordé le</dt>
              <dd className="mt-1 text-sm font-semibold text-[#22334D]">{formatTimestamp(consent.grantedAt)}</dd>
            </div>
            <div className="rounded-xl bg-[#F5F9FE] p-4">
              <dt className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#41556E]">Version acceptée</dt>
              <dd className="mt-1 text-sm font-semibold text-[#22334D]">{consent.version ?? "—"}</dd>
            </div>
          </dl>

          {consent.revokedAt ? (
            <p className="mt-4 rounded-xl bg-[#ffe8ef] p-3 font-mono text-[11px] uppercase tracking-wider text-[#8a3f5b]">
              Retiré le {formatTimestamp(consent.revokedAt)} — vidéo supprimée du stockage
            </p>
          ) : null}

          <p className="mt-4 inline-flex items-center gap-2 text-sm text-[#41556E]">
            <FileVideo className="size-4" />
            {videoPresent ? "Une vidéo est actuellement hébergée sur votre profil." : "Aucune vidéo n’est hébergée sur votre profil."}
          </p>
        </section>

        {/* La redaction integrale : c'est elle qui engage, elle est donc lue en entier. */}
        <section className="mt-6 rounded-3xl border border-[#A8C5E0] bg-white p-6">
          <h2 className="text-lg font-bold uppercase text-[#22334D]">Texte soumis à votre accord</h2>
          {notice ? (
            <>
              <p className="mt-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-[#41556E]">
                Version en vigueur : {notice.version}
              </p>
              <blockquote className="mt-4 rounded-2xl border-l-4 border-[#1B3A6B] bg-[#F5F9FE] p-5 text-sm leading-relaxed text-[#22334D]">
                {notice.text}
              </blockquote>
            </>
          ) : (
            <p className="mt-4 inline-flex items-center gap-2 text-sm text-[#41556E]">
              <Loader2 className="size-4 animate-spin" />
              Chargement du texte en vigueur…
            </p>
          )}

          {consent.version && notice && consent.version !== notice.version ? (
            <p className="mt-4 rounded-xl bg-[#FFF6E5] p-3 text-xs leading-relaxed text-[#7a5b1b]">
              Vous avez accepté la version {consent.version}, antérieure au texte ci-dessus.
              Redonner votre consentement enregistrera la version {notice.version}.
            </p>
          ) : null}
        </section>

        {/* Portee du retrait, dite avant le bouton qui l'execute. */}
        <section className="mt-6 rounded-3xl border border-[#A8C5E0] bg-white p-6">
          <h2 className="text-lg font-bold uppercase text-[#22334D]">Ce que change votre décision</h2>
          <ul className="mt-4 space-y-3 text-sm leading-relaxed text-[#41556E]">
            <li className="flex gap-3">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#17603a]" />
              <span>
                <strong className="text-[#22334D]">Donner votre consentement</strong> autorise l’hébergement et la
                diffusion de votre vidéo de présentation, image et voix comprises, auprès des recruteurs inscrits.
                La date et la version acceptée sont enregistrées.
              </span>
            </li>
            <li className="flex gap-3">
              <Trash2 className="mt-0.5 size-4 shrink-0 text-[#8a3f5b]" />
              <span>
                <strong className="text-[#22334D]">Retirer votre consentement</strong> supprime définitivement le
                fichier vidéo du stockage. Votre profil reste en ligne, sans vidéo. La date de l’accord et la version
                acceptée sont conservées comme trace de ce qui avait été consenti.
              </span>
            </li>
          </ul>

          {message ? (
            <p className="mt-5 rounded-xl bg-[#F5F9FE] p-3 text-sm text-[#22334D]">{message}</p>
          ) : null}

          {consent.granted ? (
            <button type="button" onClick={() => void submit(false)} disabled={busy}
              className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#8a3f5b] px-6 text-sm font-semibold text-white hover:bg-[#6f314a] disabled:opacity-60">
              {busy ? <Loader2 className="size-4 animate-spin" /> : <ShieldOff className="size-4" />}
              Retirer mon consentement et supprimer ma vidéo
            </button>
          ) : (
            <button type="button" onClick={() => void submit(true)} disabled={busy || !notice}
              className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#2d3748] px-6 text-sm font-semibold text-white hover:bg-[#1E293B] disabled:opacity-60">
              {busy ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
              {consent.revokedAt ? "Redonner mon consentement" : "Donner mon consentement"}
            </button>
          )}
        </section>
      </div>
    </main>
  );
}
