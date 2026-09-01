import { sql } from "drizzle-orm";
import { integer, primaryKey, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";
import {
  CITIES,
  CONTACT_STATUSES,
  PROFILE_STATUSES,
  SECTORS,
  SKILLS,
  USER_ROLES,
  mutable,
} from "@/lib/vocabulary";

/* ---------------------------------------------------------------------------
 * Tables better-auth
 *
 * Noms et colonnes IMPOSES par l'adaptateur Drizzle de better-auth : il les
 * resout par convention, donc ne rien renommer. Le champ `role` de `user`
 * est un ajout, declare cote better-auth dans src/lib/auth.ts.
 *
 * C'est ici que viendront s'ajouter les tables du domaine (profil,
 * questionnaire, favoris...) au fur et a mesure.
 * ------------------------------------------------------------------------ */

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
  image: text("image"),

  // Authentification multi-roles exigee par le CDC 3.1.
  role: text("role", { enum: mutable(USER_ROLES) })
    .notNull()
    .default("candidate"),

  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  token: text("token").notNull().unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  // better-auth >= 1.7 : l'identite d'un compte est scopee par emetteur.
  // Colonne requise par l'adaptateur, meme pour le provider "credential".
  issuer: text("issuer").notNull().default(""),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp" }),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp" }),
  scope: text("scope"),
  // Hash du mot de passe pour le provider "credential" (email + mot de passe).
  password: text("password"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

/* ---------------------------------------------------------------------------
 * Table de demonstration
 *
 * Sert uniquement a prouver que l'ecriture en base fonctionne depuis l'app.
 * A SUPPRIMER des que le vrai domaine sera en place.
 * ------------------------------------------------------------------------ */

export const ping = sqliteTable("ping", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

/* ---------------------------------------------------------------------------
 * Domaine metier
 *
 * Les vocabulaires fermes (secteurs, villes, competences, statuts) viennent de
 * `src/lib/vocabulary.ts` : les enums ci-dessous ne les recopient pas, ils les
 * referencent. Une valeur ajoutee la-bas contraint automatiquement la base, les
 * contrats Zod et la documentation.
 * ------------------------------------------------------------------------ */

/**
 * Profil de demandeur d'emploi (CDC 2.1).
 *
 * Relation 1-1 avec `user` : un compte candidat possede exactement un profil,
 * cree a l'inscription et soumis a moderation avant publication.
 */
export const profile = sqliteTable("profile", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),

  title: text("title").notNull().default(""),
  sector: text("sector", { enum: mutable(SECTORS) }).notNull(),
  city: text("city", { enum: mutable(CITIES) }).notNull(),
  bio: text("bio").notNull().default(""),

  // Presentation video : le dispositif reference une URL (YouTube, Vimeo), il
  // n'heberge pas les fichiers.
  videoUrl: text("video_url"),

  status: text("status", { enum: mutable(PROFILE_STATUSES) })
    .notNull()
    .default("pending"),

  // Resultat de certification. `score` reste nul tant que le questionnaire n'a
  // pas ete valide au-dessus du seuil : c'est `certifiedAt` qui fait foi.
  score: integer("score"),
  certifiedAt: integer("certified_at", { mode: "timestamp" }),

  // Compteurs denormalises : lus a chaque affichage du catalogue, jamais
  // recalcules. Les recompter par COUNT(*) a chaque carte serait absurde.
  views: integer("views").notNull().default(0),
  contactCount: integer("contact_count").notNull().default(0),

  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

/**
 * Competences d'un profil.
 *
 * Table de jointure plutot qu'une colonne JSON : le catalogue doit filtrer sur
 * « possede TOUTES ces competences », ce qui se fait en SQL avec un GROUP BY /
 * HAVING COUNT et pas en scannant des chaines.
 */
export const profileSkill = sqliteTable(
  "profile_skill",
  {
    profileId: text("profile_id")
      .notNull()
      .references(() => profile.id, { onDelete: "cascade" }),
    skill: text("skill", { enum: mutable(SKILLS) }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.profileId, table.skill] })],
);

/* --- Certification (CDC 2.2) --------------------------------------------- */

export const question = sqliteTable("question", {
  id: text("id").primaryKey(),
  text: text("text").notNull(),
  // Ponderation 1-5 fixee par l'administration : une question structurante
  // pese plus lourd dans le score final.
  weight: integer("weight").notNull().default(2),
  position: integer("position").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const questionOption = sqliteTable("question_option", {
  id: text("id").primaryKey(),
  questionId: text("question_id")
    .notNull()
    .references(() => question.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  // Points rapportes par cette reponse. Le score maximum d'une question est
  // `weight * max(value)`, ce qui evite d'imposer un bareme uniforme.
  value: integer("value").notNull(),
  position: integer("position").notNull().default(0),
});

/**
 * Tentative de certification.
 *
 * Conservee apres soumission : l'historique permet a l'administration de suivre
 * le dispositif, et un candidat peut repasser le questionnaire sans delai.
 * Au plus une tentative `in_progress` par utilisateur.
 */
export const certificationAttempt = sqliteTable("certification_attempt", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  status: text("status", { enum: ["in_progress", "submitted"] })
    .notNull()
    .default("in_progress"),
  score: integer("score"),
  passed: integer("passed", { mode: "boolean" }),
  submittedAt: integer("submitted_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const certificationAnswer = sqliteTable(
  "certification_answer",
  {
    attemptId: text("attempt_id")
      .notNull()
      .references(() => certificationAttempt.id, { onDelete: "cascade" }),
    questionId: text("question_id")
      .notNull()
      .references(() => question.id, { onDelete: "cascade" }),
    value: integer("value").notNull(),
  },
  (table) => [primaryKey({ columns: [table.attemptId, table.questionId] })],
);

/* --- Espace recruteur (CDC 2.1) ------------------------------------------ */

export const favorite = sqliteTable(
  "favorite",
  {
    recruiterId: text("recruiter_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    profileId: text("profile_id")
      .notNull()
      .references(() => profile.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [primaryKey({ columns: [table.recruiterId, table.profileId] })],
);

/**
 * Prise de contact d'un recruteur vers un candidat, et son suivi.
 *
 * Unique par couple (recruteur, profil) : recontacter quelqu'un ne cree pas une
 * seconde ligne de suivi, cela met a jour celle qui existe.
 */
export const contact = sqliteTable(
  "contact",
  {
    id: text("id").primaryKey(),
    recruiterId: text("recruiter_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    profileId: text("profile_id")
      .notNull()
      .references(() => profile.id, { onDelete: "cascade" }),
    message: text("message").notNull(),
    status: text("status", { enum: mutable(CONTACT_STATUSES) })
      .notNull()
      .default("À qualifier"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [unique("contact_recruiter_profile").on(table.recruiterId, table.profileId)],
);

/* --- Notifications candidat (CDC 2.3) ------------------------------------ */

export const notification = sqliteTable("notification", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  type: text("type", { enum: ["contact", "moderation", "certification"] }).notNull(),
  text: text("text").notNull(),
  readAt: integer("read_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

/* --- Reglages du dispositif ---------------------------------------------- */

/**
 * Reglages modifiables par l'administration (seuil de certification, taille de
 * page). Table cle/valeur plutot que colonnes typees : ces reglages sont peu
 * nombreux, lus ensemble, et la liste evoluera avec le produit.
 */
export const setting = sqliteTable("setting", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});
