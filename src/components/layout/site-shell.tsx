import { getCurrentSession } from "@/lib/auth-session";
import type { UserRole } from "@/lib/vocabulary";
import { SiteSidebar } from "./site-sidebar";

/**
 * Chassis des pages portant la navigation laterale.
 *
 * Composant serveur : la session est lue ici et passee a la barre, qui n'a donc
 * pas a la recharger cote client ni a afficher un etat transitoire. La gouttiere
 * de gauche n'existe qu'a partir de `lg`, ou la barre est fixe.
 */
export async function SiteShell({ children }: { children: React.ReactNode }) {
  const session = await getCurrentSession();
  const user = session?.user;

  return (
    <div className="min-h-screen bg-[#ebf0f7] text-[#22334D] selection:bg-[#1B3A6B] selection:text-white antialiased">
      {/* Lien d'evitement (RGAA 12.7) : premier arret de la tabulation, il saute
          la navigation laterale que chaque page repete a l'identique. */}
      <a href="#contenu" className="lien-evitement">
        Aller au contenu principal
      </a>
      <SiteSidebar
        session={
          user
            ? { name: user.name, role: (user.role ?? "candidate") as UserRole }
            : null
        }
      />
      <div id="contenu" tabIndex={-1} className="lg:pl-64">
        {children}
      </div>
    </div>
  );
}
