import { and, desc, eq, isNotNull, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { contact, favorite, notification, profile, question, user } from "@/db/schema";
import type { ContactStatus, ProfileStatus } from "@/lib/vocabulary";
import { isMinor } from "@/lib/vocabulary";
import { latestAdultBirthDate } from "./profiles";
import { skillsByProfile, toCard, type ProfileCard } from "./profiles";

/**
 * Lectures des tableaux de bord.
 *
 * Elles servent DEUX appelants : les routes `/api/*` et les composants serveur
 * qui rendent les memes ecrans. Les ecrire ici plutot que dans le handler evite
 * que la page et l'API divergent — le catalogue avait deja ce probleme avant
 * que `searchCatalog` ne soit extrait.
 */

/* --- Compteurs ----------------------------------------------------------- */

export interface PublicStats {
  publishedProfiles: number;
  certificationRate: number;
  questionCount: number;
  recruiterContacts: number;
}

export async function publicStats(): Promise<PublicStats> {
  /* Les compteurs publics annoncent la taille du dispositif. Ils portent donc
   * sur ce qui est REELLEMENT consultable : les profils de mineurs, exclus du
   * catalogue, sont exclus du compte, sinon la page d'accueil annoncerait plus
   * de profils que le catalogue n'en sert.
   *
   * Ce sont des agregats du dispositif entier — jamais un compteur rattache a
   * une personne — donc etrangers au retrait demande au point 3. */
  const [published] = await db
    .select({
      total: sql<number>`count(*)`,
      certified: sql<number>`sum(case when ${profile.certifiedAt} is not null then 1 else 0 end)`,
      contacts: sql<number>`coalesce(sum(${profile.contactCount}), 0)`,
    })
    .from(profile)
    .innerJoin(user, eq(user.id, profile.userId))
    .where(
      and(
        eq(profile.status, "published"),
        isNotNull(user.birthDate),
        lte(user.birthDate, latestAdultBirthDate()),
      ),
    );

  const [{ questions }] = await db.select({ questions: sql<number>`count(*)` }).from(question);

  const total = published?.total ?? 0;
  const certified = published?.certified ?? 0;

  return {
    publishedProfiles: total,
    certificationRate: total ? Math.round((certified / total) * 100) : 0,
    questionCount: questions,
    recruiterContacts: published?.contacts ?? 0,
  };
}

export interface AdminStats extends PublicStats {
  pendingProfiles: number;
  removedProfiles: number;
}

export async function adminStats(): Promise<AdminStats> {
  const [counts] = await db
    .select({
      published: sql<number>`sum(case when ${profile.status} = 'published' then 1 else 0 end)`,
      pending: sql<number>`sum(case when ${profile.status} = 'pending' then 1 else 0 end)`,
      removed: sql<number>`sum(case when ${profile.status} = 'removed' then 1 else 0 end)`,
      certifiedPublished: sql<number>`sum(case when ${profile.status} = 'published' and ${profile.certifiedAt} is not null then 1 else 0 end)`,
      contacts: sql<number>`coalesce(sum(${profile.contactCount}), 0)`,
    })
    .from(profile);

  const [{ questions }] = await db.select({ questions: sql<number>`count(*)` }).from(question);

  const published = counts?.published ?? 0;

  return {
    publishedProfiles: published,
    pendingProfiles: counts?.pending ?? 0,
    removedProfiles: counts?.removed ?? 0,
    certificationRate: published
      ? Math.round(((counts?.certifiedPublished ?? 0) / published) * 100)
      : 0,
    questionCount: questions,
    recruiterContacts: counts?.contacts ?? 0,
  };
}

export interface RecruiterStats {
  contacted: number;
  favorites: number;
  interviewsPlanned: number;
}

export async function recruiterStats(recruiterId: string): Promise<RecruiterStats> {
  const [contacts] = await db
    .select({
      total: sql<number>`count(*)`,
      interviews: sql<number>`sum(case when ${contact.status} = 'Entretien planifié' then 1 else 0 end)`,
    })
    .from(contact)
    .where(eq(contact.recruiterId, recruiterId));

  const [favorites] = await db
    .select({ total: sql<number>`count(*)` })
    .from(favorite)
    .where(eq(favorite.recruiterId, recruiterId));

  return {
    contacted: contacts?.total ?? 0,
    favorites: favorites?.total ?? 0,
    interviewsPlanned: contacts?.interviews ?? 0,
  };
}

/* --- Suivi recruteur ----------------------------------------------------- */

export interface ContactRow {
  id: string;
  profile: ProfileCard;
  message: string;
  status: ContactStatus;
  createdAt: string;
  updatedAt: string;
}

export async function listContacts(recruiterId: string): Promise<ContactRow[]> {
  const rows = await db
    .select({ contact, profile, name: user.name, birthDate: user.birthDate })
    .from(contact)
    .innerJoin(profile, eq(profile.id, contact.profileId))
    .innerJoin(user, eq(user.id, profile.userId))
    .where(eq(contact.recruiterId, recruiterId))
    .orderBy(desc(contact.createdAt));

  const skills = await skillsByProfile(rows.map((row) => row.profile.id));

  // La vue recruteur applique les memes regles que le catalogue : la mesure
  // porte sur ce que le serveur renvoie, pas seulement sur la page publique.
  return rows.map((row) => ({
    id: row.contact.id,
    profile: toCard(row.profile, row.name, skills.get(row.profile.id) ?? [], isMinor(row.birthDate)),
    message: row.contact.message,
    status: row.contact.status,
    createdAt: row.contact.createdAt.toISOString(),
    updatedAt: row.contact.updatedAt.toISOString(),
  }));
}

export interface FavoriteRow {
  profile: ProfileCard;
  createdAt: string;
}

export async function listFavorites(recruiterId: string): Promise<FavoriteRow[]> {
  const rows = await db
    .select({ favorite, profile, name: user.name, birthDate: user.birthDate })
    .from(favorite)
    .innerJoin(profile, eq(profile.id, favorite.profileId))
    .innerJoin(user, eq(user.id, profile.userId))
    .where(eq(favorite.recruiterId, recruiterId))
    .orderBy(desc(favorite.createdAt));

  const skills = await skillsByProfile(rows.map((row) => row.profile.id));

  return rows.map((row) => ({
    profile: toCard(row.profile, row.name, skills.get(row.profile.id) ?? [], isMinor(row.birthDate)),
    createdAt: row.favorite.createdAt.toISOString(),
  }));
}

/* --- Notifications ------------------------------------------------------- */

export interface NotificationRow {
  id: string;
  type: "contact" | "moderation" | "certification";
  text: string;
  read: boolean;
  createdAt: string;
}

export async function listNotifications(
  userId: string,
): Promise<{ items: NotificationRow[]; unread: number }> {
  const rows = await db
    .select()
    .from(notification)
    .where(eq(notification.userId, userId))
    .orderBy(desc(notification.createdAt));

  return {
    items: rows.map((row) => ({
      id: row.id,
      type: row.type,
      text: row.text,
      read: row.readAt !== null,
      createdAt: row.createdAt.toISOString(),
    })),
    unread: rows.filter((row) => row.readAt === null).length,
  };
}

/* --- Moderation ---------------------------------------------------------- */

export interface ModerationRow {
  id: string;
  name: string;
  title: string;
  videoUrl: string | null;
  status: ProfileStatus;
  createdAt: string;
  /** Profil de mineur : jamais publie au catalogue, quel que soit son statut. */
  isMinor: boolean;
  /** Date de naissance absente : compte anterieur a la mesure, a regulariser. */
  birthDateMissing: boolean;
}

export async function moderationQueue(status?: ProfileStatus): Promise<ModerationRow[]> {
  const rows = await db
    .select({ profile, name: user.name, birthDate: user.birthDate })
    .from(profile)
    .innerJoin(user, eq(user.id, profile.userId))
    .where(status ? eq(profile.status, status) : undefined)
    // Les profils en attente d'abord : c'est ce que l'ecran doit traiter.
    .orderBy(desc(profile.status), desc(profile.createdAt));

  return rows.map((row) => ({
    id: row.profile.id,
    name: row.name,
    title: row.profile.title,
    // L'administration voit l'URL reelle : c'est elle qui doit la moderer.
    videoUrl: row.profile.videoUrl,
    status: row.profile.status,
    createdAt: row.profile.createdAt.toISOString(),
    isMinor: isMinor(row.birthDate),
    birthDateMissing: row.birthDate === null,
  }));
}
