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

/**
 * Carte de profil telle qu'elle apparait dans le catalogue.
 *
 * Volontairement plus pauvre que `Profile` : la biographie n'a pas sa place
 * dans une liste. `videoUrl` en fait partie en revanche — le catalogue est un
 * fil video (CDC 3.4), une carte doit pouvoir se lire sans ouvrir la fiche —
 * et c'est une URL, pas un fichier : le cout est negligeable.
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
    views: z.number().int(),
    videoUrl: z
      .string()
      .nullable()
      .meta({ description: "Lien externe ou `/api/videos/{id}` pour un fichier televerse. Nul si aucune video." }),
  }),
);

/** Profil public complet, tel que servi sur la fiche d'un candidat. */
export const ProfileSchema = named(
  "Profile",
  ProfileCardSchema.extend({
    bio: z.string(),
    status: ProfileStatusSchema,
    contactCount: z.number().int(),
    certifiedAt: z.iso.datetime().nullable(),
    createdAt: z.iso.datetime(),
  }),
);

/**
 * Profil vu par son proprietaire.
 *
 * Identique au profil public : le candidat voit exactement ce que les
 * recruteurs voient, y compris son statut de moderation.
 */
export const MyProfileSchema = named("MyProfile", ProfileSchema.extend({}));

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
    description: "true : uniquement les profils dont la video de presentation est renseignee.",
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
  }),
);
