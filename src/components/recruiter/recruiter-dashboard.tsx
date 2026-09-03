"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BriefcaseBusiness, CalendarCheck, Heart, Loader2, Search, Trash2 } from "lucide-react";
import { CONTACT_STATUSES, type ContactStatus } from "@/lib/vocabulary";

type Profile = { id: string; name: string; title: string; city: string; sector: string; score: number | null; certified: boolean };
type Contact = { id: string; profile: Profile; message: string; status: ContactStatus; updatedAt: string };
type Favorite = { profile: Profile; createdAt: string };
type Stats = { contacted: number; favorites: number; interviewsPlanned: number };

export function RecruiterDashboard() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [contactResponse, favoriteResponse, statsResponse] = await Promise.all([
      fetch("/api/me/contacts"), fetch("/api/me/favorites"), fetch("/api/me/stats"),
    ]);
    if (contactResponse.ok) setContacts(((await contactResponse.json()) as { items: Contact[] }).items);
    if (favoriteResponse.ok) setFavorites(((await favoriteResponse.json()) as { items: Favorite[] }).items);
    if (statsResponse.ok) setStats(await statsResponse.json());
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function updateStatus(id: string, status: ContactStatus) {
    const response = await fetch(`/api/me/contacts/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    if (response.ok) { setContacts((items) => items.map((item) => item.id === id ? { ...item, status } : item)); void load(); }
  }

  async function removeFavorite(profileId: string) {
    const response = await fetch(`/api/me/favorites/${profileId}`, { method: "DELETE" });
    if (response.ok) { setFavorites((items) => items.filter((item) => item.profile.id !== profileId)); void load(); }
  }

  const cards = [
    { label: "Candidats contactés", value: stats?.contacted ?? 0, icon: BriefcaseBusiness, tone: "bg-[#D1DEF0] text-[#1B2D3E]" },
    { label: "Favoris", value: stats?.favorites ?? 0, icon: Heart, tone: "bg-[#ffe8ef] text-[#8a3f5b]" },
    { label: "Entretiens planifiés", value: stats?.interviewsPlanned ?? 0, icon: CalendarCheck, tone: "bg-[#dff7e9] text-[#17603a]" },
  ];

  return <main className="mx-auto w-full max-w-[1480px] px-5 pb-24 pt-8 md:px-10 md:pt-12 lg:px-6">
    <header className="flex flex-wrap items-end justify-between gap-5 border-b border-[#1B3A6B]/15 pb-7"><div><p className="font-mono text-xs font-semibold uppercase tracking-wider text-[#566274]">Espace recruteur</p><h1 className="mt-3 text-4xl font-extrabold uppercase text-[#2d3748] md:text-5xl">Suivez vos <span className="text-[#1B3A6B]">candidats.</span></h1></div><Link href="/catalogue" className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#1B3A6B] px-5 text-sm font-semibold text-white hover:bg-[#273D4F]"><Search className="size-4" /> Parcourir le catalogue</Link></header>
    <section className="mt-6 grid gap-3 sm:grid-cols-3">{cards.map(({ label, value, icon: Icon, tone }) => <article key={label} className="flex items-center gap-4 rounded-2xl border border-[#1B3A6B]/15 bg-white p-5"><span className={`flex size-10 items-center justify-center rounded-xl ${tone}`}><Icon className="size-5" /></span><div><p className="text-2xl font-extrabold text-[#2d3748]">{value}</p><p className="text-xs text-[#566274]">{label}</p></div></article>)}</section>
    {loading ? <div className="flex justify-center py-24"><Loader2 className="size-7 animate-spin text-[#1B3A6B]" /></div> : <div className="mt-7 grid items-start gap-7 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)]">
      <section className="rounded-3xl bg-[#ebf0f7] p-6 shadow-[10px_10px_20px_#c5d1e0,-10px_-10px_20px_#ffffff] md:p-8"><h2 className="text-2xl font-bold uppercase text-[#2d3748]">Candidats contactés</h2><p className="mt-1 text-sm text-[#566274]">Faites avancer chaque profil dans votre suivi.</p><div className="mt-6 space-y-3">{contacts.length ? contacts.map((item) => <article key={item.id} className="grid gap-4 rounded-2xl bg-white p-4 md:grid-cols-[minmax(0,1fr)_190px_auto] md:items-center"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold text-[#2d3748]">{item.profile.name}</h3>{item.profile.certified && <span className="rounded-full bg-[#dff7e9] px-2 py-1 text-[10px] font-bold text-[#17603a]">JEB {item.profile.score}</span>}</div><p className="mt-1 text-sm text-[#566274]">{item.profile.title} · {item.profile.city}</p><p className="mt-2 line-clamp-1 text-xs text-[#4a5568]">{item.message}</p></div><select value={item.status} onChange={(event) => void updateStatus(item.id, event.target.value as ContactStatus)} className="h-10 rounded-xl border border-[#1B3A6B]/20 bg-[#F5F9FE] px-3 text-sm outline-none focus:border-[#1B3A6B]">{CONTACT_STATUSES.map((status) => <option key={status}>{status}</option>)}</select><Link href={`/profils/${item.profile.id}`} className="text-sm font-semibold text-[#1B3A6B] hover:text-[#273D4F]">Ouvrir</Link></article>) : <Empty text="Aucun candidat contacté pour le moment." />}</div></section>
      <section className="rounded-3xl border border-[#A8C5E0] bg-[#F5F9FE] p-6"><div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-[#ffe8ef] text-[#8a3f5b]"><Heart className="size-5" /></span><h2 className="text-xl font-bold uppercase text-[#2d3748]">Favoris</h2></div><div className="mt-5 space-y-3">{favorites.length ? favorites.map(({ profile }) => <article key={profile.id} className="flex items-center gap-3 rounded-xl bg-white p-4"><div className="min-w-0 flex-1"><p className="truncate font-bold text-[#2d3748]">{profile.name}</p><p className="truncate text-xs text-[#566274]">{profile.title}</p></div><Link href={`/profils/${profile.id}`} className="text-xs font-semibold text-[#1B3A6B]">Voir</Link><button onClick={() => void removeFavorite(profile.id)} aria-label={`Retirer ${profile.name} des favoris`} className="text-[#8a3f5b]"><Trash2 className="size-4" /></button></article>) : <Empty text="Aucun profil enregistré." />}</div></section>
    </div>}
  </main>;
}

function Empty({ text }: { text: string }) { return <div className="rounded-2xl border border-dashed border-[#1B3A6B]/25 px-5 py-10 text-center text-sm text-[#566274]">{text}</div>; }
