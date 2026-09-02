import { redirect } from "next/navigation";
import { Blueprint } from "@/components/ui/blueprint";
import { getSession, roleOf, ROLE_HOME } from "@/lib/session";
import { AuthForm } from "@/components/auth/auth-form";

export const dynamic = "force-dynamic";

/**
 * Porte d'entree unique des trois espaces.
 *
 * Le mode (connexion / inscription) est porte par l'URL plutot que par un etat
 * React : le bouton « Créer un profil » de l'en-tete peut alors pointer
 * directement sur le formulaire d'inscription.
 */
export default async function ConnexionPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const session = await getSession();
  const role = roleOf(session);

  // Deja connecte : cet ecran n'a rien a offrir de plus que son espace.
  if (role) redirect(ROLE_HOME[role]);

  const { mode } = await searchParams;
  const signup = mode === "inscription";

  return (
    <div className="mx-auto my-5 grid max-w-[940px] items-start gap-11 lg:grid-cols-2">
      <div>
        <div className="font-mono text-[11px] tracking-[0.16em] text-accent-700 uppercase">
          Authentification
        </div>
        <h1 className="mt-3.5 text-[46px] leading-none uppercase">
          {signup ? "Créer un compte" : "Connexion"}
        </h1>
        <p className="mt-4 text-[15px] leading-[1.6] text-text/72">
          {signup
            ? "Le compte demandeur crée automatiquement un profil, soumis à modération avant publication au catalogue."
            : "Une seule porte d'entrée pour les trois espaces : le rôle porté par la session détermine ce que vous voyez."}
        </p>
        <Blueprint className="mt-7 px-[18px] py-4">
          <div className="space-y-0.5 font-mono text-[11px] leading-[1.7] text-text/65">
            <div>auth: better-auth (email + mot de passe)</div>
            <div>session: cookie httpOnly, 7 jours</div>
            <div>rôles: demandeur | recruteur | admin</div>
            <div>store: SQLite — table user, session, account</div>
          </div>
        </Blueprint>
      </div>

      <AuthForm signup={signup} />
    </div>
  );
}
