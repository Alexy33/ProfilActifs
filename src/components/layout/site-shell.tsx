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
    <div className="min-h-screen bg-[#ebf0f7] text-[#2d3748] selection:bg-[#1B3A6B] selection:text-white antialiased">
      <SiteSidebar
        session={
          user
            ? { name: user.name, role: (user.role ?? "candidate") as UserRole }
            : null
        }
      />
      <div className="lg:pl-64">{children}</div>
    </div>
  );
}
