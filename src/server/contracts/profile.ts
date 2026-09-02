import { z } from "zod";
import { named } from "../openapi/schemas";
import {
  CitySchema,
  PaginationQuery,
  ProfileStatusSchema,
  QueryBoolean,
  SectorSchema,
  SkillSchema,
  pageOf,
} from "./common";
import { VideoStatusSchema } from "./admin";

/**
 * Carte de profil telle qu'elle apparait dans le catalogue.
 *
 * Volontairement plus pauvre que `Profile` : la biographie n'a pas sa place
 * dans une liste. `videoUrl` en fait partie en revanche — le catalogue est un
 * fil video (CDC 3.4), une carte doit pouvoir se lire sans ouvrir la fiche —
 * et c'est une URL, pas un fichier : le cout est negligeable.
 *
 * Ne porte AUCUN compteur d'engagement (mesure Cabinet du 2026-09-02,
 * point 3) : ni `views`, ni `contactCount`. Ces donnees restent en base et ne
 * sont servies qu'a leur titulaire, via `MyProfile`.
 */
export const ProfileCardSchema = named(
  "ProfileCard",
  z.object({
    id: z.string(),
    name: z.string().meta({ description: "Nom du titulaire du compte." }),
    initials: z.string().meta({ description: "Initiales pretes a afficher dans une pastille." }),
    title: z.string(),
    sector: SectorSchema,
    city: CitySchema,
    skills: z.array(SkillSchema),
    certified: z.boolean(),
    score: z.number().int().nullable().meta({ description: "Nul tant que la certification n'est pas obtenue." }),
    videoUrl: z
      .string()
      .nullable()
      .meta({
        description:
          "Lien externe ou `/api/videos/{id}` pour un fichier televerse. Nul si aucune video, si la video n'est pas encore validee par la moderation, ou si le titulaire est mineur.",
      }),
  }),
);

/** Profil public complet, tel que servi sur la fiche d'un candidat. */
export const ProfileSchema = named(
  "Profile",
  ProfileCardSchema.extend({
    bio: z.string(),
    status: ProfileStatusSchema,
    certifiedAt: z.iso.datetime().nullable(),
    createdAt: z.iso.datetime(),
  }),
);

/**
 * Profil vu par son proprietaire.
 *
 * SEUL endroit ou reapparaissent les compteurs d'engagement : le Cabinet a
 * demande le retrait de leur affichage PUBLIC, pas de la fonctionnalite. Le
 * candidat garde donc la mesure de son activite dans son espace prive.
 *
 * C'est aussi le seul endroit ou l'etat de moderation de la video et son
 * motif de refus sont exposes : une video qui disparait sans explication est
 * un contentieux qui commence.
 */
export const MyProfileSchema = named(
  "MyProfile",
  ProfileSchema.extend({
    views: z.number().int().meta({ description: "Visible du seul titulaire." }),
    contactCount: z.number().int().meta({ description: "Visible du seul titulaire." }),
    videoStatus: VideoStatusSchema,
    videoReviewReason: z
      .string()
      .nullable()
      .meta({ description: "Motif du refus, le cas echeant." }),
    ownVideoUrl: z.string().nullable().meta({
      description:
        "Video du titulaire, servie meme en attente de validation : il doit pouvoir revoir ce qu'il a depose.",
    }),
    isMinor: z.boolean().meta({
      description:
        "Titulaire mineur : profil hors catalogue public et video non diffusee (parcours 16-18 ans).",
    }),
    birthDateMissing: z.boolean().meta({
      description:
        "Compte anterieur a la verification d'age : date de naissance a declarer pour reparaitre au catalogue.",
    }),
  }),
);

export const ProfilePageSchema = pageOf("ProfilePage", ProfileCardSchema);

/* --- Requetes ------------------------------------------------------------ */

export const CatalogQuery = PaginationQuery.extend({
  q: z
    .string()
    .trim()
    .optional()
    .meta({ description: "Recherche libre sur le nom, l'intitule, le secteur et les competences." }),
  sector: SectorSchema.optional(),
  city: CitySchema.optional(),
  certified: QueryBoolean.optional().meta({
    description: "true : uniquement les profils certifies JEB.",
  }),
  hasVideo: QueryBoolean.optional().meta({
    description:
      "true : uniquement les profils dont la video de presentation est renseignee ET validee par la moderation.",
  }),
  skills: z
    .array(SkillSchema)
    .optional()
    .meta({
      description:
        "Repeter le parametre pour cumuler : un profil doit posseder TOUTES les competences demandees.",
    }),
});

/**
 * Mise a jour du profil par son titulaire.
 *
 * Tous les champs sont optionnels : le front envoie ce que l'utilisateur a
 * modifie, pas le profil entier. Ni `status`, ni `score`, ni les compteurs ne
 * figurent ici — ils ne se modifient pas depuis l'espace candidat.
 */
export const UpdateMyProfileBody = named(
  "UpdateProfileInput",
  z.object({
    name: z.string().trim().min(1).max(120).optional(),
    title: z.string().trim().max(120).optional(),
    sector: SectorSchema.optional(),
    city: CitySchema.optional(),
    bio: z.string().trim().max(2000).optional(),
    videoUrl: z
      .string()
      .trim()
      .max(500)
      .nullable()
      .optional()
      .meta({ description: "URL de la presentation video (YouTube, Vimeo). null pour la retirer." }),
    skills: z.array(SkillSchema).max(8).optional(),

    /**
     * Regularisation d'un compte cree avant la verification d'age (mesure
     * Cabinet du 2026-09-02, point 1).
     *
     * N'est acceptee que si le compte n'a PAS encore de date de naissance :
     * la declaration se fait une fois. Elle ne permet donc pas de contourner
     * le blocage en se vieillissant apres coup, ni de rajeunir un compte.
     */
    birthDate: z.iso
      .date()
      .optional()
      .meta({
        description:
          "Date de naissance (AAAA-MM-JJ), uniquement pour un compte qui n'en porte pas encore. Refusee en dessous de 16 ans.",
      }),
  }),
);
