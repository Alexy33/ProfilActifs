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

/** Suivi d'un candidat dans le pipeline d'un recruteur. */
export const CONTACT_STATUSES = [
  "À qualifier",
  "Entretien planifié",
  "Retenu",
  "Écarté",
] as const;

export const USER_ROLES = ["candidate", "recruiter", "admin"] as const;

/**
 * Etat de moderation d'une video (mesure Cabinet du 2026-09-02, point 2).
 *
 * Moderation A PRIORI : une video deposee naît `pending` et n'est servie a
 * personne d'autre que son titulaire et l'administration tant qu'elle n'est
 * pas `approved`. `rejected` porte un motif, communique au candidat.
 */
export const VIDEO_STATUSES = ["pending", "approved", "rejected"] as const;

export type Sector = (typeof SECTORS)[number];
export type City = (typeof CITIES)[number];
export type Skill = (typeof SKILLS)[number];
export type ProfileStatus = (typeof PROFILE_STATUSES)[number];
export type ContactStatus = (typeof CONTACT_STATUSES)[number];
export type UserRole = (typeof USER_ROLES)[number];
export type VideoStatus = (typeof VIDEO_STATUSES)[number];

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

/* --- Age (mesure Cabinet du 2026-09-02, point 1) -------------------------- */

/**
 * Age minimal absolu pour ouvrir un compte. En dessous, l'inscription est
 * refusee : le dispositif ne collecte alors aucune donnee.
 */
export const MIN_SIGNUP_AGE = 16;

/**
 * En dessous de cet age, le compte suit un parcours distinct : mention
 * d'information adaptee, et surtout aucune publication de video par defaut.
 */
export const MINOR_AGE = 18;

/**
 * Age revolu a une date donnee, en annees.
 *
 * Calcule sur les composantes de date (et non par division de millisecondes) :
 * annees bissextiles et changements d'heure fausseraient un age proche du
 * seuil, c'est-a-dire exactement les cas qui decident d'un blocage.
 */
export function ageOn(birthDate: Date, now: Date = new Date()): number {
  let age = now.getUTCFullYear() - birthDate.getUTCFullYear();
  const monthDelta = now.getUTCMonth() - birthDate.getUTCMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getUTCDate() < birthDate.getUTCDate())) {
    age -= 1;
  }
  return age;
}

/** Un profil de mineur ne parait jamais au catalogue public. */
export function isMinor(birthDate: Date | null, now: Date = new Date()): boolean {
  // Date de naissance inconnue (compte anterieur a la mesure) : traite comme
  // mineur. Le doute ne peut pas profiter a la publication.
  if (!birthDate) return true;
  return ageOn(birthDate, now) < MINOR_AGE;
}
