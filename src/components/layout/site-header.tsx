import Link from "next/link";
import { getSession, roleOf } from "@/lib/session";
import { ROLE_LABELS } from "@/lib/roles";
import { listNotifications } from "@/server/services/dashboard";
import { NavLinks, type NavItem } from "./nav-links";
import { SessionMenu } from "./session-menu";

/**
 * En-tete de l'application.
 *
 * Composant serveur : la session est lue ici, une fois, et la navigation en
 * decoule. Aucun ecran n'a donc besoin de deviner le role pour savoir quels
 * liens afficher, et rien de sensible ne transite par le client.
 */
export async function SiteHeader() {
  const session = await getSession();
  const role = roleOf(session);

  const items: NavItem[] = [
    { label: "Accueil", href: "/" },
    { label: "Catalogue", href: "/catalogue" },
  ];

  if (role === "candidate") items.push({ label: "Mon espace", href: "/mon-espace" });
  if (role === "recruiter") items.push({ label: "Mes candidats", href: "/mes-candidats" });
  if (role === "admin") items.push({ label: "Administration", href: "/administration" });

  // Le badge n'a de sens que pour le demandeur : lui seul recoit aujourd'hui
  // des notifications, et la requete est evitee pour les autres roles.
  const unread =
    role === "candidate" ? (await listNotifications(session!.user.id)).unread : 0;

  return (
    <header className="sticky top-0 z-20 border-b border-divider bg-bg">
      <div className="mx-auto flex max-w-[1280px] items-center gap-6 px-7 py-3.5">
        <Link href="/" className="mr-auto flex items-baseline gap-2.5 font-heading">
          <span className="text-[21px] tracking-[0.02em]">PROFILSACTIFS</span>
          <span className="font-mono text-[10px] tracking-[0.14em] text-accent-700 uppercase">
            JEB / DNI
          </span>
        </Link>

        <NavLinks items={items} />

        <SessionMenu
          name={session?.user.name ?? null}
          roleLabel={role ? ROLE_LABELS[role] : null}
          isCandidate={role === "candidate"}
          unread={unread}
        />
      </div>
    </header>
  );
}
