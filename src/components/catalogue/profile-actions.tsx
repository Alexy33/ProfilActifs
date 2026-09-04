"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, Loader2, MessageSquare, ShieldCheck } from "lucide-react";
import type { UserRole } from "@/lib/vocabulary";

export function ProfileActions({ profileId, role }: { profileId: string; role: UserRole | null }) {
  const [favorite, setFavorite] = useState(false);
  const [message, setMessage] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (role !== "recruiter") return;
    void fetch("/api/me/favorites").then(async (response) => {
      if (!response.ok) return;
      const data = (await response.json()) as { items: { profile: { id: string } }[] };
      setFavorite(data.items.some((item) => item.profile.id === profileId));
    });
  }, [profileId, role]);

  async function toggleFavorite() {
    setBusy(true); setFeedback(null);
    const response = await fetch(`/api/me/favorites/${profileId}`, { method: favorite ? "DELETE" : "PUT" });
    if (response.ok) { setFavorite(!favorite); setFeedback(favorite ? "Profil retiré des favoris." : "Profil ajouté aux favoris."); }
    else setFeedback("Impossible de modifier les favoris.");
    setBusy(false);
  }

  async function contact() {
    if (!message.trim()) return;
    setBusy(true); setFeedback(null);
    const response = await fetch(`/api/profiles/${profileId}/contact`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: message.trim() }),
    });
    if (response.ok) { setMessage(""); setFeedback("Votre message a été envoyé au candidat."); }
    else { const data = await response.json(); setFeedback(data?.error?.message ?? "Impossible d’envoyer le message."); }
    setBusy(false);
  }

  if (role === "recruiter") {
    return <div className="mt-6 border-t border-[#1B3A6B]/15 pt-5">
      <h3 className="text-sm font-bold uppercase text-[#22334D]">Actions recruteur</h3>
      <textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={2000} placeholder="Présentez votre opportunité et proposez un échange…" className="mt-3 min-h-28 w-full resize-y rounded-xl border border-[#1B3A6B]/20 bg-white p-3 text-sm text-[#22334D] outline-none placeholder:text-[#41556E] focus:border-[#1B3A6B]" />
      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
        <button type="button" onClick={() => void contact()} disabled={busy || !message.trim()} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#2d3748] px-4 text-sm font-semibold text-white hover:bg-[#1E293B] disabled:opacity-50">{busy ? <Loader2 className="size-4 animate-spin" /> : <MessageSquare className="size-4" />} Prendre contact</button>
        <button type="button" onClick={() => void toggleFavorite()} disabled={busy} className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold ${favorite ? "bg-[#ffe8ef] text-[#8a3f5b]" : "border border-[#1B3A6B]/25 bg-white text-[#273D4F]"}`}><Heart className={`size-4 ${favorite ? "fill-current" : ""}`} /> {favorite ? "Dans mes favoris" : "Ajouter aux favoris"}</button>
      </div>
      {feedback && <p role="status" className="mt-3 rounded-xl bg-[#D1DEF0] px-3 py-2 text-xs text-[#1B2D3E]">{feedback}</p>}
    </div>;
  }

  if (role === "candidate") {
    return <div className="mt-6 border-t border-[#1B3A6B]/15 pt-5"><p className="text-sm leading-relaxed text-[#41556E]">La prise de contact et les favoris sont réservés aux recruteurs. Depuis votre espace, vous pouvez modifier et suivre votre propre profil.</p><Link href="/candidate" className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#2d3748] px-4 text-sm font-semibold text-white">Mon espace candidat</Link></div>;
  }

  if (role === "admin") {
    return <div className="mt-6 border-t border-[#1B3A6B]/15 pt-5"><Link href="/admin" className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#2d3748] px-4 text-sm font-semibold text-white"><ShieldCheck className="size-4" /> Administrer les profils</Link></div>;
  }

  return <div className="mt-6 border-t border-[#1B3A6B]/15 pt-5"><p className="text-sm leading-relaxed text-[#41556E]">Le catalogue et les profils sont publics. Connectez-vous avec un compte recruteur pour contacter ou enregistrer ce candidat.</p><Link href="/login" className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#2d3748] px-4 text-sm font-semibold text-white">Connexion recruteur</Link></div>;
}
