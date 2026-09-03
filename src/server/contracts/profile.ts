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
 * Etat du consentement a la diffusion video (R.3).
 *
 * Rattache au seul `MyProfile` : c'est une donnee personnelle du titulaire, pas
 * un attribut public de la fiche. Un recruteur n'a pas a savoir a quelle date
 * quelqu'un a accepte quoi.
 */
export const VideoConsentSchema = named(
  "VideoConsent",
  z.object({
    granted: z.boolean().meta({ description: "Accord en cours. false apres un retrait." }),
    grantedAt: z.iso
      .datetime()
      .nullable()
      .meta({ description: "Horodatage de l'accord ; conserve apres un retrait, comme trace." }),
    version: z
      .string()
      .nullable()
      .meta({ description: "Version du texte de consentement effectivement acceptee." }),
    revokedAt: z.iso.datetime().nullable().meta({ description: "Horodatage du retrait." }),
  }),
);

/** Texte en vigueur et sa version, pour que le client affiche ce qu'il fait accepter. */
export const VideoConsentNoticeSchema = named(
  "VideoConsentNotice",
  z.object({
    version: z.string(),
    text: z.string(),
    consent: VideoConsentSchema,
  }),
);

/**
 * Carte de profil telle qu'elle apparait dans le catalogue.
 *
 * Volontairement plus pauvre que `Profile` : la liste n'a besoin ni de la
 * biographie ni de la video, et les servir a chaque page couterait de la bande
 * passante pour rien.
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
  }),
);

/** Profil public complet, tel que servi sur la fiche d'un candidat. */
export const ProfileSchema = named(
  "Profile",
  ProfileCardSchema.extend({
    bio: z.string(),
    videoUrl: z.string().nullable(),
    status: ProfileStatusSchema,
    contactCount: z.number().int(),
    certifiedAt: z.iso.datetime().nullable(),
    createdAt: z.iso.datetime(),
  }),
);

/**
 * Profil vu par son proprietaire.
 *
 * Le profil public plus le compteur de vues : le candidat suit son audience,
 * mais ce compteur ne quitte pas son espace. Il n'apparait ni dans `Profile`,
 * ni dans `ProfileCard`, ni dans un export, ni dans une vue recruteur — on ne
 * publie pas un classement de personnes par audience.
 */
export const MyProfileSchema = named(
  "MyProfile",
  ProfileSchema.extend({
    views: z.number().int().meta({
      description: "Nombre de consultations. Visible du seul titulaire du profil.",
    }),
    videoConsent: VideoConsentSchema,
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
