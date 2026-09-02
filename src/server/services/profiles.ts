import { and, desc, eq, inArray, isNotNull, like, ne, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { profile, profileSkill, user } from "@/db/schema";
import type { City, ProfileStatus, Sector, Skill } from "@/lib/vocabulary";

/**
 * Lecture des profils : catalogue, fiche publique, profil du titulaire.
 *
 * Tout ce qui sort de ce module est deja au format servi par l'API (dates en
 * ISO, competences resolues) : les handlers de route n'ont plus qu'a le
 * renvoyer, et deux routes qui exposent un profil ne peuvent pas diverger.
 */

type ProfileRow = typeof profile.$inferSelect;

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
  views: number;
  videoUrl: string | null;
}

export interface FullProfile extends ProfileCard {
  bio: string;
  status: ProfileStatus;
  contactCount: number;
  certifiedAt: string | null;
  createdAt: string;
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
 * Construit une carte de profil.
 *
 * Exportee parce que les favoris et le suivi recruteur embarquent la meme carte
 * que le catalogue : trois routes, une seule forme, une seule definition.
 */
export function toCard(row: ProfileRow, name: string, skills: Skill[]): ProfileCard {
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
    views: row.views,
    videoUrl: row.videoUrl,
  };
}

function toFull(row: ProfileRow, name: string, skills: Skill[]): FullProfile {
  return {
    ...toCard(row, name, skills),
    bio: row.bio,
    status: row.status,
    contactCount: row.contactCount,
    certifiedAt: row.certifiedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
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

  if (filters.sector) conditions.push(eq(profile.sector, filters.sector));
  if (filters.city) conditions.push(eq(profile.city, filters.city));
  if (filters.certified) conditions.push(isNotNull(profile.certifiedAt));
  // Une colonne renseignee puis videe reste une chaine vide : `is not null` ne
  // suffit pas a distinguer « a une video » de « en avait une ».
  if (filters.hasVideo) {
    conditions.push(and(isNotNull(profile.videoUrl), ne(profile.videoUrl, ""))!);
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
    // que le dispositif certifie, ce qui est tout son objet.
    .orderBy(desc(profile.certifiedAt), desc(profile.score), desc(profile.views))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const skills = await skillsByProfile(rows.map((row) => row.profile.id));

  return {
    items: rows.map((row) => toCard(row.profile, row.name, skills.get(row.profile.id) ?? [])),
    meta: { page, pageSize, total, totalPages },
  };
}

/* --------------------------------------------------------------------------
 * Fiches
 * ----------------------------------------------------------------------- */

async function findOne(where: ReturnType<typeof eq>): Promise<FullProfile | null> {
  const [row] = await db
    .select({ profile, name: user.name })
    .from(profile)
    .innerJoin(user, eq(user.id, profile.userId))
    .where(where)
    .limit(1);

  if (!row) return null;
  const skills = await skillsByProfile([row.profile.id]);
  return toFull(row.profile, row.name, skills.get(row.profile.id) ?? []);
}

export function findProfileById(id: string) {
  return findOne(eq(profile.id, id));
}

export function findProfileByUserId(userId: string) {
  return findOne(eq(profile.userId, userId));
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
