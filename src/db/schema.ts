import { sql } from "drizzle-orm";
import { integer, primaryKey, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";
import {
  CITIES,
  CONTACT_STATUSES,
  PROFILE_STATUSES,
  SECTORS,
  SKILLS,
  USER_ROLES,
  VIDEO_STATUSES,
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

  // Date de naissance declarative, exigee a l'inscription (courrier Pontaillac,
  // R.1). Stockee en texte « AAAA-MM-JJ » et non en timestamp : c'est une date
  // civile, sans heure ni fuseau. Un timestamp la decalerait d'un jour selon le
  // fuseau du serveur, ce qui change l'age a la veille d'un anniversaire.
  //
  // Nullable a dessein : les comptes crees avant cette exigence n'en ont pas.
  // Toute inscription NOUVELLE la renseigne obligatoirement (cf. src/lib/auth.ts).
  birthDate: text("birth_date"),

  // Derniere ouverture de session (R.5). Ecrite par le hook
  // `databaseHooks.session.create.after` de src/lib/auth.ts, jamais par le
  // client.
  //
  // Sans cette colonne, aucune duree de conservation du compte n'est
  // mesurable : `updatedAt` bouge des qu'on touche au profil, et les lignes
  // `session` sont elles-memes purgees a six mois. Il faut donc un point fixe
  // qui dise « ce compte sert encore » et qui survive a la purge du journal de
  // connexion.
  //
  // Nullable : les comptes anterieurs a la colonne n'en portent pas. La purge
  // retombe alors sur `createdAt` (cf. `src/server/services/retention.ts`), ce
  // qui ne supprime jamais un compte plus tot que la regle annoncee.
  lastSeenAt: integer("last_seen_at", { mode: "timestamp" }),

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

  // Consentement a la diffusion de la video (R.3).
  //
  // Trois colonnes et non un booleen : la video porte l'image et la voix d'une
  // personne identifiable, et il faut pouvoir etablir non pas « il a accepte »
  // mais « il a accepte CECI, a CETTE date ». Sans l'horodatage ni la version
  // du texte, l'accord n'est pas opposable et un changement de redaction
  // effacerait silencieusement la portee de ce qui avait ete accepte.
  //
  // `videoConsentAt` fait foi pour la date, `videoConsentVersion` pour la
  // redaction acceptee, et `videoConsentGranted` porte l'etat courant : il
  // repasse a false au retrait sans effacer les deux autres, qui restent la
  // trace de ce qui avait ete consenti. `videoConsentRevokedAt` date le
  // retrait, qui doit se prouver autant que l'accord.
  videoConsentGranted: integer("video_consent_granted", { mode: "boolean" })
    .notNull()
    .default(false),
  videoConsentAt: integer("video_consent_at", { mode: "timestamp" }),
  videoConsentVersion: text("video_consent_version"),
  videoConsentRevokedAt: integer("video_consent_revoked_at", { mode: "timestamp" }),

  // Moderation de la video avant publication (R.2).
  //
  // Statut propre a la video, separe de `status` : une video nouvellement
  // deposee est `pending` et n'est servie a personne d'autre que son titulaire
  // et l'administration, meme si le profil est deja publie.
  //
  // Le motif, le decideur et la date de decision sont conserves ensemble : une
  // moderation qui ne dit ni qui ni quand ni pourquoi n'est pas opposable, et
  // c'est le motif qui est montre au candidat sur son espace.
  videoStatus: text("video_status", { enum: mutable(VIDEO_STATUSES) })
    .notNull()
    .default("pending"),
  videoReviewReason: text("video_review_reason"),
  // `set null` et non `cascade` : la suppression d'un compte d'administration
  // ne doit pas effacer les decisions prises, seulement leur auteur.
  videoReviewedBy: text("video_reviewed_by").references(() => user.id, { onDelete: "set null" }),
  videoReviewedAt: integer("video_reviewed_at", { mode: "timestamp" }),

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

/**
 * Entreprise rattachee a un compte recruteur.
 *
 * Table separee et non des colonnes sur `user` : ces informations decrivent une
 * PERSONNE MORALE, pas le compte. Les melanger a l'identite du titulaire
 * obligerait a laisser une dizaine de colonnes nulles sur chaque candidat, et
 * rendrait impossible de dire ce qu'on sait de l'entreprise sans lire le
 * compte.
 *
 * Relation 1-1 avec `user` (`unique`) : l'inscription recruteur cree le compte
 * et l'entreprise dans la meme requete. Un recruteur sans entreprise ne doit
 * pas exister — c'est ce qui identifie la personne qui contacte des candidats.
 */
export const company = sqliteTable("company", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),

  /** Raison sociale, telle qu'elle figure a l'annuaire des entreprises. */
  name: text("name").notNull(),

  /**
   * SIREN : neuf chiffres, forme normalisee (sans espaces).
   *
   * `unique` : deux comptes ne declarent pas la meme entreprise. Cette
   * contrainte est ce qui empeche un compte de se faire passer pour une
   * entreprise deja inscrite.
   *
   * Valide par `isValidSiren` (cle de Luhn) a l'entree, pas ici : SQLite ne
   * porte pas cette regle, et la faire vivre dans le contrat la rend visible
   * dans la documentation.
   */
  siren: text("siren").notNull().unique(),

  /** Poste occupe par le titulaire du compte DANS l'entreprise. */
  position: text("position").notNull(),

  address: text("address").notNull(),
  postalCode: text("postal_code").notNull(),
  city: text("city").notNull(),

  sector: text("sector", { enum: mutable(SECTORS) }).notNull(),

  // Facultatifs : utiles pour joindre l'entreprise, jamais exiges a
  // l'inscription — un formulaire qui reclame tout fait fuir plus qu'il ne
  // renseigne.
  phone: text("phone"),
  website: text("website"),

  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

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
