import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth, type Session } from "@/lib/auth";
import { USER_ROLES, type UserRole } from "@/lib/vocabulary";

export { ROLE_HOME, ROLE_LABELS } from "@/lib/roles";

/**
 * Gardes de session cote rendu.
 *
 * Le pendant de `requireAccess` (src/server/openapi/routes.ts) pour les pages :
 * l'API et l'interface appliquent la meme regle, pour qu'un ecran ne s'affiche
 * jamais alors que les routes qu'il appelle repondront 403.
 */

/**
 * Role de la session, restreint au vocabulaire.
 *
 * better-auth type `role` en `string` (c'est un champ additionnel declare a la
 * volee) : ce passe-plat rend la valeur utilisable comme cle d'index et ferme
 * la porte a un role inconnu arrive en base.
 */
export function roleOf(session: Session | null): UserRole | null {
  const role = session?.user.role;
  return USER_ROLES.includes(role as UserRole) ? (role as UserRole) : null;
}

export async function getSession(): Promise<Session | null> {
  return (await auth.api.getSession({ headers: await headers() })) as Session | null;
}

/** Session obligatoire, quel que soit le role. */
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/connexion");
  return session;
}

/**
 * Session ET role obligatoires.
 *
 * Un utilisateur connecte mais du mauvais role est renvoye a l'accueil, pas au
 * formulaire de connexion : il n'a rien a y refaire, il est deja identifie.
 */
export async function requireRole(role: UserRole): Promise<Session> {
  const session = await requireSession();
  if (session.user.role !== role) redirect("/");
  return session;
}
