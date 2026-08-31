import { headers } from "next/headers";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { ping, user } from "@/db/schema";
import { auth } from "@/lib/auth";
import { StackPanel } from "@/components/stack-panel";

// Session et compteurs sont lus a chaque requete : pas de cache statique.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  // Composant serveur : la session est lue cote serveur, sans aller-retour
  // reseau depuis le navigateur.
  const session = await auth.api.getSession({ headers: await headers() });

  const [{ pings }] = await db.select({ pings: sql<number>`count(*)` }).from(ping);
  const [{ users }] = await db.select({ users: sql<number>`count(*)` }).from(user);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col px-7">
      <header className="flex items-baseline gap-3 border-b border-divider py-5">
        <span className="font-heading text-[21px] tracking-wide uppercase">ProfilsActifs</span>
        <span className="font-mono text-[10px] tracking-[0.14em] text-accent-700 uppercase">
          JEB / DNI · socle technique
        </span>
      </header>

      <div className="flex-1 py-10">
        <h1 className="text-4xl leading-tight uppercase">Verification de la stack</h1>
        <p className="mt-4 max-w-[56ch] text-[15px] leading-relaxed text-text/78">
          Cette page est rendue par un composant serveur Next.js qui lit SQLite via Drizzle et
          la session better-auth cote serveur. Elle ne sert qu&apos;a prouver que les briques
          tiennent ensemble — le vrai produit se construit par-dessus.
        </p>

        <StackPanel
          pings={pings}
          users={users}
          sessionEmail={session?.user.email ?? null}
          sessionName={session?.user.name ?? null}
        />
      </div>

      <footer className="border-t border-divider py-5 font-mono text-[10.5px] tracking-wider text-text/50 uppercase">
        Ministere du Job et Bonheur — Direction Numerique et Innovation
      </footer>
    </main>
  );
}
