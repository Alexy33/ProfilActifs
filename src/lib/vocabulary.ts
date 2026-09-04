/**
 * Vocabulaires fermes du dispositif.
 *
 * Source de verite UNIQUE : le schema Drizzle contraint ses colonnes avec ces
 * listes, les contrats Zod les rejouent en enum, et /api/reference les sert au
 * front. Ajouter un secteur ici suffit a le propager partout — il ne doit
 * exister aucune autre copie de ces listes dans le depot.
 */

export const SECTORS = [
  "Numérique",
  "Santé",
  "Logistique",
  "Éducation",
  "Bâtiment",
  "Commerce",
  "Industrie",
] as const;

export const CITIES = [
  "Paris",
  "Lyon",
  "Marseille",
  "Lille",
  "Nantes",
  "Bordeaux",
  "Strasbourg",
  "Toulouse",
] as const;

export const SKILLS = [
  "Communication",
  "Organisation",
  "Adaptabilité",
  "Travail en équipe",
  "Autonomie",
  "Rigueur",
  "Relation client",
  "Gestion de projet",
] as const;

/** Cycle de vie d'un profil, pilote par la moderation (CDC 2.1). */
export const PROFILE_STATUSES = ["pending", "published", "removed"] as const;

/**
 * Cycle de vie d'une video de presentation, distinct de celui du profil (R.2).
 *
 * Une video se modere pour elle-meme : un profil deja publie qui remplace sa
 * video repasse la nouvelle en `pending` sans que la fiche disparaisse du
 * catalogue. Confondre les deux statuts obligerait a depublier le profil entier
 * pour re-examiner un seul fichier.
 */
export const VIDEO_STATUSES = ["pending", "approved", "rejected"] as const;

/** Suivi d'un candidat dans le pipeline d'un recruteur. */
export const CONTACT_STATUSES = [
  "À qualifier",
  "Entretien planifié",
  "Retenu",
  "Écarté",
] as const;

export const USER_ROLES = ["candidate", "recruiter", "admin"] as const;

export type Sector = (typeof SECTORS)[number];
export type City = (typeof CITIES)[number];
export type Skill = (typeof SKILLS)[number];
export type ProfileStatus = (typeof PROFILE_STATUSES)[number];
export type VideoStatus = (typeof VIDEO_STATUSES)[number];
export type ContactStatus = (typeof CONTACT_STATUSES)[number];
export type UserRole = (typeof USER_ROLES)[number];

/**
 * Drizzle et Zod attendent un tuple mutable `[string, ...string[]]`, alors que
 * `as const` produit un tuple en lecture seule. Ce passe-plat evite de dupliquer
 * chaque liste sous deux formes.
 */
export function mutable<T extends readonly [string, ...string[]]>(list: T): [...T] {
  return [...list];
}

/* --- Bornes reglementaires (CDC 3.4) ------------------------------------- */

/** Plafond impose : le catalogue ne sert jamais plus de 20 profils par page. */
export const MAX_PAGE_SIZE = 20;
export const DEFAULT_PAGE_SIZE = 12;

/** Valeurs par defaut des reglages modifiables par l'administration. */
export const DEFAULT_CERTIFICATION_THRESHOLD = 70;

/* --- Consentement a la diffusion video (R.3) ------------------------------ */

/**
 * Version du texte de consentement en vigueur.
 *
 * Elle est enregistree avec chaque accord donne. Toute reecriture du texte
 * impose d'incrementer cette valeur : un consentement recueilli sur l'ancienne
 * redaction ne vaut pas accord sur la nouvelle, et il faut pouvoir le prouver
 * profil par profil des lors qu'on est interroge sur la portee de l'accord.
 */
export const VIDEO_CONSENT_VERSION = "2026-01-v1";

/** Texte soumis au candidat pour cette version. Archive avec le code. */
export const VIDEO_CONSENT_TEXT =
  "J'autorise le dispositif ProfilsActifs a heberger et diffuser ma video de " +
  "presentation, image et voix comprises, aupres des recruteurs inscrits. " +
  "Je peux retirer cet accord a tout moment : le retrait entraine la " +
  "suppression definitive du fichier video.";
