"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BadgeCheck,
  ArrowLeft,
  Home,
  LayoutGrid,
  LogOut,
  Menu,
  Shield,
  UserRound,
  Users,
  X,
} from "lucide-react";

import { authClient } from "@/lib/auth-client";
import type { UserRole } from "@/lib/vocabulary";
import { BlocMarque } from "./bloc-marque";

/**
 * Navigation laterale du site.
 *
 * Chassis commun aux pages publiques et aux espaces : elle porte la navigation
 * globale et l'etat de session, tandis que le contenu garde ses propres outils
 * (le catalogue conserve donc sa colonne de filtres). Sous `lg` elle se replie
 * derriere un bouton et s'ouvre en tiroir, pour que le mobile ne perde pas de
 * largeur utile.
 *
 * La session est resolue par le serveur et passee en props : la barre ne
 * clignote pas entre « deconnecte » et « connecte » au premier rendu.
 */
export interface SidebarSession {
  name: string;
  role: UserRole;
}

interface SiteSidebarProps {
  session: SidebarSession | null;
}

const ROLE_LABELS: Record<UserRole, string> = {
  candidate: "Demandeur d'emploi",
  recruiter: "Recruteur",
  admin: "Administration",
};

/** Espace personnel correspondant au role porte par la session. */
const ROLE_HOME: Record<UserRole, { href: string; label: string; icon: typeof Home }> = {
  candidate: { href: "/candidate", label: "Mon espace", icon: UserRound },
  recruiter: { href: "/recruiter", label: "Mes candidats", icon: Users },
  admin: { href: "/admin", label: "Administration", icon: Shield },
};

export function SiteSidebar({ session }: SiteSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // Naviguer referme le tiroir : sans cela il resterait ouvert par-dessus la
  // page qui vient de s'afficher.
  useEffect(() => setOpen(false), [pathname]);

  // Le tiroir est modal sur mobile : on rend le fond non defilable tant qu'il
  // est ouvert, et Echap le referme.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  const links = [
    { href: "/", label: "Accueil", icon: ArrowLeft },
    { href: "/catalogue", label: "Catalogue", icon: LayoutGrid },
    ...(session ? [ROLE_HOME[session.role]] : []),
  ];

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  async function handleSignOut() {
    setSigningOut(true);
    await authClient.signOut();
    router.push("/");
    router.refresh();
  }

  const panel = (variant: "fixe" | "tiroir") => (
    <div className="flex h-full flex-col bg-[#ebf0f7] px-5 py-7">
      {/* Bloc-marque : premier element, en haut a gauche (charte R.10). */}
      <div className="flex items-start justify-between gap-2">
        <BlocMarque />
        {variant === "tiroir" ? (
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Fermer le menu"
            className="rounded-xl p-2 text-[#41556E] transition-colors hover:text-[#273D4F]"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        ) : null}
      </div>

      <nav
        aria-label={
          variant === "fixe" ? "Navigation principale" : "Navigation principale (menu mobile)"
        }
        className="mt-8 flex flex-col gap-2"
      >
        {links.map((link) => {
          const Icon = link.icon;
          const active = isActive(link.href);

          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all ${
                active
                  ? "bg-[#1B3A6B] text-white"
                  : "text-[#41556E] hover:bg-white/70 hover:text-[#273D4F]"
              }`}
            >
              <Icon aria-hidden="true" className="size-5 stroke-[1.7]" />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-8">
        {session ? (
          <div className="rounded-2xl bg-white/70 p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#1B3A6B] text-white">
                <BadgeCheck aria-hidden="true" className="size-5 stroke-[1.7]" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-[#22334D]">{session.name}</p>
                <p className="truncate font-mono text-[10px] font-semibold uppercase tracking-wider text-[#41556E]">
                  {ROLE_LABELS[session.role]}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#ebf0f7] px-4 py-2.5 text-xs font-semibold text-[#22334D] transition-colors hover:text-[#273D4F] disabled:opacity-60"
            >
              <LogOut aria-hidden="true" className="size-4" />
              {signingOut ? "Déconnexion…" : "Déconnexion"}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <Link
              href="/login"
              className="rounded-2xl bg-[#ebf0f7] px-4 py-3 text-center text-sm font-semibold text-[#22334D] shadow-[5px_5px_10px_#c5d1e0,-5px_-5px_10px_#ffffff] transition-all hover:shadow-[inset_3px_3px_6px_#c5d1e0,inset_-3px_-3px_6px_#ffffff] active:scale-[0.97]"
            >
              Connexion
            </Link>
            <Link
              href="/register"
              className="rounded-2xl bg-[#2d3748] px-4 py-3 text-center text-sm font-semibold text-white shadow-[6px_6px_12px_#c5d1e0,-6px_-6px_12px_#ffffff] transition-all hover:bg-[#1E293B] active:scale-[0.97]"
            >
              Créer un profil
            </Link>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Barre fixe a partir de lg */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 lg:block">
        {panel("fixe")}
      </aside>

      {/* En-tete compacte sous lg : seul point d'entree du tiroir */}
      <div className="sticky top-0 z-30 flex h-16 items-center gap-3 bg-[#ebf0f7]/90 px-5 backdrop-blur-md lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Ouvrir le menu"
          aria-expanded={open}
          className="rounded-xl p-2 text-[#22334D] transition-colors hover:text-[#273D4F]"
        >
          <Menu aria-hidden="true" className="size-6" />
        </button>
        <Link href="/" className="text-lg font-extrabold tracking-tight text-[#22334D]">
          Profils<span className="text-[#1B3A6B]">Actifs.</span>
        </Link>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Fermer le menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-[#2d3748]/40 backdrop-blur-sm"
          />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] shadow-2xl">{panel("tiroir")}</div>
        </div>
      ) : null}
    </>
  );
}
