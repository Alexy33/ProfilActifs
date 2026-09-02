import { and, desc, eq, inArray, isNotNull, isNull, like, lte, ne, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { profile, profileSkill, user } from "@/db/schema";
import type { City, ProfileStatus, Sector, Skill, VideoStatus } from "@/lib/vocabulary";
import { MINOR_AGE, isMinor } from "@/lib/vocabulary";
import { publicVideoUrl } from "./video-moderation";

/**
 * Lecture des profils : catalogue, fiche publique, profil du titulaire.
 *
 * Tout ce qui sort de ce module est deja au format servi par l'API (dates en
 * ISO, competences resolues) : les handlers de route n'ont plus qu'a le
 * renvoyer, et deux routes qui exposent un profil ne peuvent pas diverger.
 */

type ProfileRow = typeof profile.$inferSelect;

/**
 * Date de naissance la plus RECENTE qui corresponde encore a un majeur.
 *
 * Sert a filtrer les mineurs en SQL plutot qu'en memoire : un filtre applique
 * apres pagination retirerait des lignes d'une page deja comptee, et le
 * catalogue afficherait « 12 resultats » en en montrant 9.
 */
export function latestAdultBirthDate(now: Date = new Date()): Date {
  const limit = new Date(now);
  limit.setUTCFullYear(limit.getUTCFullYear() - MINOR_AGE);
  return limit;
}

/**
 * Carte de profil telle qu'elle sort du serveur pour un lecteur public.
 *
 * `views` et `contactCount` n'y figurent PAS (mesure Cabinet du 2026-09-02,
 * point 3) : un compteur d'engagement public revient a classer des personnes
 * par popularite sur un service de l'emploi. Les compteurs restent en base et
 * sont servis a leur titulaire par `OwnProfile`, ainsi qu'a l'administration.
 * Les retirer ICI, dans la seule fabrique de cartes, garantit qu'aucune
 * reponse d'API, vue recruteur ou export ne puisse les reintroduire.
 */
export interface ProfileCard {
  id: string;
  name: string;
  initials: string;
  title: string;
  sector: Sector;
  city: City;
  skills: Skill[];
  certified: boolean;
  score: number | null;
  videoUrl: string | null;
}

export interface FullProfile extends ProfileCard {
  bio: string;
  status: ProfileStatus;
  certifiedAt: string | null;
  createdAt: string;
}

/**
 * Profil vu par SON TITULAIRE (ou par l'administration).
 *
 * C'est le seul endroit ou reapparaissent les compteurs d'engagement, et le
 * seul ou l'etat de moderation de la video et son motif de refus sont
 * exposes : le candidat doit savoir pourquoi sa video n'est pas visible.
 */
export interface OwnProfile extends FullProfile {
  views: number;
  contactCount: number;
  videoStatus: VideoStatus;
  videoReviewReason: string | null;
  /** URL reelle, servie au titulaire meme si la video n'est pas encore validee. */
  ownVideoUrl: string | null;
  isMinor: boolean;
  /**
   * Compte cree avant la verification d'age : sa date de naissance est
   * inconnue, il est donc traite comme mineur (hors catalogue) tant qu'il ne
   * l'a pas declaree. L'espace demandeur l'invite a le faire.
   */
  birthDateMissing: boolean;
}

/** « Sonia Delaunay-Frey » -> « SD ». Calcule ici pour que le front n'ait rien a deviner. */
export function initialsOf(name: string): string {
  return name
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

/**
 * Construit une carte de profil PUBLIQUE.
 *
 * Exportee parce que les favoris et le suivi recruteur embarquent la meme carte
 * que le catalogue : trois routes, une seule forme, une seule definition —
 * donc une seule application des regles de diffusion.
 *
 * `minor` conditionne la video : un profil de mineur n'expose jamais la
 * sienne, meme validee (mesure Cabinet du 2026-09-02, point 1).
 */
export function toCard(
  row: ProfileRow,
  name: string,
  skills: Skill[],
  minor: boolean,
): ProfileCard {
  return {
    id: row.id,
    name,
    initials: initialsOf(name),
    title: row.title,
    sector: row.sector,
    city: row.city,
    skills,
    certified: row.certifiedAt !== null,
    score: row.score,
    // Jamais `row.videoUrl` directement : la regle de diffusion est unique et
    // vit dans `video-moderation.ts`.
    videoUrl: publicVideoUrl(row, minor),
  };
}

function toFull(
  row: ProfileRow,
  name: string,
  skills: Skill[],
  minor: boolean,
): FullProfile {
  return {
    ...toCard(row, name, skills, minor),
    bio: row.bio,
    status: row.status,
    certifiedAt: row.certifiedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Profil complet pour son titulaire : compteurs et etat de la video compris. */
function toOwn(
  row: ProfileRow,
  name: string,
  skills: Skill[],
  birthDate: Date | null,
): OwnProfile {
  const minor = isMinor(birthDate);
  return {
    ...toFull(row, name, skills, minor),
    views: row.views,
    contactCount: row.contactCount,
    videoStatus: row.videoStatus,
    videoReviewReason: row.videoReviewReason,
    ownVideoUrl: row.videoUrl,
    isMinor: minor,
    birthDateMissing: birthDate === null,
  };
}

/** Competences de plusieurs profils en une requete, pour eviter le N+1. */
export async function skillsByProfile(ids: string[]): Promise<Map<string, Skill[]>> {
  const out = new Map<string, Skill[]>();
  if (ids.length === 0) return out;

  const rows = await db
    .select()
    .from(profileSkill)
    .where(inArray(profileSkill.profileId, ids));

  for (const row of rows) {
    const list = out.get(row.profileId) ?? [];
    list.push(row.skill);
    out.set(row.profileId, list);
  }
  for (const list of out.values()) list.sort((a, b) => a.localeCompare(b, "fr"));
  return out;
}

/* --------------------------------------------------------------------------
 * Catalogue
 * ----------------------------------------------------------------------- */

export interface CatalogFilters {
  q?: string;
  sector?: Sector;
  city?: City;
  certified?: boolean;
  hasVideo?: boolean;
  skills?: Skill[];
  page: number;
  pageSize: number;
}

export interface CatalogResult {
  items: ProfileCard[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

export async function searchCatalog(filters: CatalogFilters): Promise<CatalogResult> {
  const conditions = [eq(profile.status, "published")];

  /* Exclusion des profils de mineurs du catalogue consultable (mesure Cabinet
   * du 2026-09-02, point 1).
   *
   * Le filtre est applique en SQL, AVANT le comptage et la pagination : filtrer
   * apres coup donnerait un total qui ne correspond pas aux lignes servies.
   *
   * Une date de naissance ABSENTE exclut aussi : ce sont les comptes crees
   * avant la mesure, dont l'age est inconnu. Le doute ne profite pas a la
   * publication — c'est ce que demandait la conseillere en signalant qu'un
   * blocage laissant passer les profils deja en base ne protege personne. */
  conditions.push(
    and(isNotNull(user.birthDate), lte(user.birthDate, latestAdultBirthDate()))!,
  );

  if (filters.sector) conditions.push(eq(profile.sector, filters.sector));
  if (filters.city) conditions.push(eq(profile.city, filters.city));
  if (filters.certified) conditions.push(isNotNull(profile.certifiedAt));
  // « Avec video » doit signifier « avec une video REELLEMENT visible » : une
  // video en attente ou refusee n'est servie a personne, la proposer au filtre
  // rendrait des cartes sans lecteur. Une colonne renseignee puis videe reste
  // une chaine vide : `is not null` ne suffit pas.
  if (filters.hasVideo) {
    conditions.push(
      and(
        isNotNull(profile.videoUrl),
        ne(profile.videoUrl, ""),
        eq(profile.videoStatus, "approved"),
      )!,
    );
  }

  if (filters.q) {
    const needle = `%${filters.q.toLowerCase()}%`;
    // La recherche libre couvre aussi les competences, d'ou le EXISTS : elles
    // vivent dans une table separee et ne peuvent pas etre filtrees par LIKE.
    const matchesSkill = sql`EXISTS (
      SELECT 1 FROM ${profileSkill}
      WHERE ${profileSkill.profileId} = ${profile.id}
        AND lower(${profileSkill.skill}) LIKE ${needle}
    )`;
    conditions.push(
      or(
        like(sql`lower(${user.name})`, needle),
        like(sql`lower(${profile.title})`, needle),
        like(sql`lower(${profile.sector})`, needle),
        like(sql`lower(${profile.city})`, needle),
        matchesSkill,
      )!,
    );
  }

  if (filters.skills?.length) {
    // « possede TOUTES les competences demandees » : on compte les competences
    // distinctes trouvees et on exige qu'elles soient aussi nombreuses que
    // celles demandees. Un IN simple donnerait « au moins une ».
    const wanted = filters.skills;
    const owning = db
      .select({ id: profileSkill.profileId })
      .from(profileSkill)
      .where(inArray(profileSkill.skill, wanted))
      .groupBy(profileSkill.profileId)
      .having(sql`count(distinct ${profileSkill.skill}) = ${wanted.length}`);
    conditions.push(inArray(profile.id, owning));
  }

  const where = and(...conditions);

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)` })
    .from(profile)
    .innerJoin(user, eq(user.id, profile.userId))
    .where(where);

  const pageSize = filters.pageSize;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(filters.page, totalPages);

  const rows = await db
    .select({ profile, name: user.name })
    .from(profile)
    .innerJoin(user, eq(user.id, profile.userId))
    .where(where)
    // Certifies d'abord, puis les mieux notes : le catalogue met en avant ce
    // que le dispositif certifie, ce qui est tout son objet. Le nombre de vues
    // reste un critere de tri INTERNE — il ne sort plus du serveur (point 3),
    // mais departager deux profils a score egal n'est pas les classer par
    // popularite devant le public.
    .orderBy(desc(profile.certifiedAt), desc(profile.score), desc(profile.views))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const skills = await skillsByProfile(rows.map((row) => row.profile.id));

  return {
    // Le filtre SQL a deja ecarte les mineurs : les lignes restantes sont
    // toutes majeures, d'ou `false`.
    items: rows.map((row) => toCard(row.profile, row.name, skills.get(row.profile.id) ?? [], false)),
    meta: { page, pageSize, total, totalPages },
  };
}

/* --------------------------------------------------------------------------
 * Fiches
 * ----------------------------------------------------------------------- */

async function findRow(where: ReturnType<typeof eq>) {
  const [row] = await db
    .select({ profile, name: user.name, birthDate: user.birthDate })
    .from(profile)
    .innerJoin(user, eq(user.id, profile.userId))
    .where(where)
    .limit(1);
  return row ?? null;
}

/**
 * Fiche PUBLIQUE d'un profil.
 *
 * Un profil de mineur reste introuvable au public : la fonction renvoie `null`
 * plutot qu'une fiche amputee, comme pour un profil non publie.
 */
export async function findProfileById(id: string): Promise<FullProfile | null> {
  const row = await findRow(eq(profile.id, id));
  if (!row) return null;
  if (isMinor(row.birthDate)) return null;

  const skills = await skillsByProfile([row.profile.id]);
  return toFull(row.profile, row.name, skills.get(row.profile.id) ?? [], false);
}

/** Profil du titulaire : compteurs et etat de moderation de la video compris. */
export async function findProfileByUserId(userId: string): Promise<OwnProfile | null> {
  const row = await findRow(eq(profile.userId, userId));
  if (!row) return null;

  const skills = await skillsByProfile([row.profile.id]);
  return toOwn(row.profile, row.name, skills.get(row.profile.id) ?? [], row.birthDate);
}

/**
 * Profil brut, sans regle de diffusion : reserve a l'administration et aux
 * gardes internes (proprietaire d'une video, par exemple).
 */
export async function findProfileRowById(id: string) {
  return findRow(eq(profile.id, id));
}

/** Incremente le compteur de vues. Volontairement sans await bloquant l'appelant. */
export async function recordProfileView(id: string): Promise<void> {
  await db
    .update(profile)
    .set({ views: sql`${profile.views} + 1` })
    .where(eq(profile.id, id));
}

/** Remplace l'integralite des competences d'un profil. */
export async function replaceSkills(profileId: string, skills: Skill[]): Promise<void> {
  await db.delete(profileSkill).where(eq(profileSkill.profileId, profileId));
  if (skills.length === 0) return;
  await db
    .insert(profileSkill)
    .values([...new Set(skills)].map((skill) => ({ profileId, skill })));
}
