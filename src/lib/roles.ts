import type { UserRole } from "@/lib/vocabulary";

/**
 * Etiquettes et destinations par role.
 *
 * Volontairement separe de `session.ts` : ces constantes sont lues par des
 * composants client, et `session.ts` importe l'instance better-auth — donc
 * better-sqlite3, un binaire natif qui n'a rien a faire dans un bundle
 * navigateur.
 */
export const ROLE_LABELS: Record<UserRole, string> = {
  candidate: "Demandeur",
  recruiter: "Recruteur",
  admin: "Administration",
};

/** Ecran d'accueil de chaque role, apres connexion. */
export const ROLE_HOME: Record<UserRole, string> = {
  candidate: "/mon-espace",
  recruiter: "/mes-candidats",
  admin: "/administration",
};
