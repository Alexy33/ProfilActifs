import { and, desc, eq, inArray, isNotNull, like, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { profile, profileSkill, user } from "@/db/schema";
import type { City, ProfileStatus, Sector, Skill } from "@/lib/vocabulary";
import { MAJORITY_AGE, isMinor } from "@/lib/age";

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
}

export interface FullProfile extends ProfileCard {
  bio: string;
  videoUrl: string | null;
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
  };
}

/**
 * @param birthDate date de naissance du titulaire, pour le parcours 16-18 ans.
 * @param viewer qui consulte : un mineur ne diffuse pas sa video publiquement.
 */
function toFull(
  row: ProfileRow,
  name: string,
  skills: Skill[],
  birthDate: string | null,
  viewer: ProfileViewer,
): FullProfile {
  // Video d'un mineur : masquee a tout le monde sauf au titulaire et a
  // l'administration (R.1). On retire l'URL du contrat plutot que de compter
  // sur la route /api/videos/{id} pour repondre 404 : la fiche afficherait
  // sinon un lecteur qui ne charge jamais.
  const hideVideo = isMinor(birthDate) && viewer !== "owner" && viewer !== "admin";

  return {
    ...toCard(row, name, skills),
    bio: row.bio,
    videoUrl: hideVideo ? null : row.videoUrl,
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

/**
 * Qui consulte.
 *
 * `"public"` designe une consultation SANS compte recruteur : visiteur non
 * connecte, ou candidat. Les profils de mineurs en sont exclus (R.1) — le
 * courrier vise le catalogue « consultable sans compte recruteur », pas le
 * catalogue en general.
 */
export type CatalogViewer = "public" | "recruiter" | "admin";

/** Qui consulte une fiche. `"owner"` : le titulaire lui-meme. */
export type ProfileViewer = CatalogViewer | "owner";

/**
 * Traduit une session en niveau de consultation.
 *
 * Un seul endroit ou cette correspondance est ecrite : le catalogue, la fiche
 * publique et l'API doivent appliquer la meme regle, sinon la restriction des
 * profils de mineurs tiendrait a un endroit et pas a l'autre.
 *
 * `ownerId` : identifiant du titulaire du profil consulte, quand on regarde une
 * fiche precise. Absent pour le catalogue.
 */
/**
 * Forme minimale d'une session, pour ne pas dependre du type complet de
 * better-auth. `role` est optionnel parce qu'il l'est cote better-auth : un
 * role absent est traite comme le niveau le moins privilegie.
 */
export type SessionLike = { user: { id: string; role?: string | null } };

/**
 * Session synthetique designant le titulaire.
 *
 * `findProfileByUserId` est toujours appele pour le compte connecte lui-meme :
 * plutot que d'imposer a chaque route de repasser sa session, on reconstitue le
 * titulaire a partir de l'identifiant demande.
 */
const OWNER_OF = (userId: string): SessionLike => ({ user: { id: userId, role: "candidate" } });

export function viewerOf(
  session: SessionLike | null | undefined,
  ownerId?: string,
): ProfileViewer {
  if (!session) return "public";
  if (session.user.role === "admin") return "admin";
  if (ownerId && session.user.id === ownerId) return "owner";
  if (session.user.role === "recruiter") return "recruiter";
  return "public";
}

/**
 * Niveau de consultation du CATALOGUE.
 *
 * Distinct de `viewerOf` parce qu'un catalogue n'a pas de titulaire : la
 * notion de « owner » n'y a pas de sens, et le type l'interdit plutot que de
 * laisser un appelant la passer par megarde.
 */
export function catalogViewerOf(session: SessionLike | null | undefined): CatalogViewer {
  const viewer = viewerOf(session);
  return viewer === "owner" ? "public" : viewer;
}

export interface CatalogFilters {
  q?: string;
  sector?: Sector;
  city?: City;
  certified?: boolean;
  skills?: Skill[];
  page: number;
  pageSize: number;
  /** Absent = consultation publique. Le defaut est donc le plus restrictif. */
  viewer?: CatalogViewer;
}

export interface CatalogResult {
  items: ProfileCard[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

export async function searchCatalog(filters: CatalogFilters): Promise<CatalogResult> {
  const conditions = [eq(profile.status, "published")];

  /**
   * Exclusion des profils de mineurs du catalogue consultable sans compte
   * recruteur (R.1).
   *
   * Filtre en SQL et non apres coup : ecarter les lignes en JavaScript apres
   * la requete fausserait `total` et le nombre de pages, et laisserait des
   * pages a moitie vides. Le calcul d'age se fait donc ici en SQL, sur la date
   * civile stockee en texte — `date('now')` et la comparaison lexicographique
   * de deux « AAAA-MM-JJ » donnent le meme resultat que `ageOn`.
   *
   * Une date ABSENTE ne fait pas exclure : ce sont les comptes anterieurs a
   * l'exigence (cf. docs/verification-age.md, decision assumee).
   */
  if ((filters.viewer ?? "public") === "public") {
    conditions.push(
      sql`(${user.birthDate} IS NULL OR ${user.birthDate} <= date('now', '-${sql.raw(String(MAJORITY_AGE))} years'))`,
    );
  }

  if (filters.sector) conditions.push(eq(profile.sector, filters.sector));
  if (filters.city) conditions.push(eq(profile.city, filters.city));
  if (filters.certified) conditions.push(isNotNull(profile.certifiedAt));

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

/**
 * @param session session de l'appelant, pour resoudre le niveau de
 *   consultation. `undefined` vaut consultation publique : un appelant qui
 *   oublie l'argument n'expose rien de plus que le public.
 */
async function findOne(
  where: ReturnType<typeof eq>,
  session?: SessionLike,
): Promise<FullProfile | null> {
  const [row] = await db
    .select({ profile, name: user.name, birthDate: user.birthDate })
    .from(profile)
    .innerJoin(user, eq(user.id, profile.userId))
    .where(where)
    .limit(1);

  if (!row) return null;

  // `viewerOf` recoit le titulaire du profil trouve : c'est ce qui distingue
  // « le candidat regarde sa propre fiche » de « un tiers la regarde ».
  const viewer = viewerOf(session, row.profile.userId);
  const skills = await skillsByProfile([row.profile.id]);
  return toFull(row.profile, row.name, skills.get(row.profile.id) ?? [], row.birthDate, viewer);
}

/** Fiche d'un profil par son identifiant. */
export function findProfileById(id: string, session?: SessionLike) {
  return findOne(eq(profile.id, id), session);
}

/**
 * Profil d'un utilisateur.
 *
 * Appele depuis l'espace candidat et les routes `/api/me/*`, toujours pour le
 * titulaire connecte : il voit sa propre video, mineur ou non.
 */
export function findProfileByUserId(userId: string, session?: SessionLike) {
  return findOne(eq(profile.userId, userId), session ?? OWNER_OF(userId));
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
