import { z } from "zod";
import { named } from "../openapi/schemas";
import { MAX_PAGE_SIZE } from "@/lib/vocabulary";
import { ProfileStatusSchema, VideoStatusSchema } from "./common";

/** Tableau de bord global du dispositif (CDC 2.1). */
export const AdminStatsSchema = named(
  "AdminStats",
  z.object({
    publishedProfiles: z.number().int(),
    pendingProfiles: z.number().int(),
    removedProfiles: z.number().int(),
    certificationRate: z
      .number()
      .int()
      .meta({ description: "Part des profils publies qui sont certifies, en pourcentage." }),
    questionCount: z.number().int(),
    recruiterContacts: z.number().int(),
  }),
);

/** Ligne de la file de moderation. */
export const ModerationRowSchema = named(
  "ModerationRow",
  z.object({
    id: z.string(),
    name: z.string(),
    title: z.string(),
    videoUrl: z.string().nullable(),
    status: ProfileStatusSchema,
    createdAt: z.iso.datetime(),
  }),
);

export const ModerateProfileBody = named(
  "ModerateProfileInput",
  z.object({
    status: ProfileStatusSchema,
  }),
);

/* --- Moderation des videos (R.2) ----------------------------------------- */

/**
 * Ligne de la file de moderation des videos.
 *
 * Porte l'URL de la video : c'est la seule route qui la sert avant validation,
 * puisque c'est precisement celle qui sert a decider.
 */
export const VideoModerationRowSchema = named(
  "VideoModerationRow",
  z.object({
    profileId: z.string(),
    name: z.string().meta({ description: "Titulaire de la video." }),
    title: z.string(),
    videoUrl: z.string().nullable(),
    profileStatus: ProfileStatusSchema,
    videoStatus: VideoStatusSchema,
    reason: z.string().nullable(),
    decidedBy: z.string().nullable().meta({ description: "Nom de l'administrateur decideur." }),
    decidedAt: z.iso.datetime().nullable(),
    submittedAt: z.iso.datetime().meta({ description: "Derniere modification du profil." }),
  }),
);

/**
 * Decision de moderation.
 *
 * `reason` obligatoire au refus et refuse a la validation : un refus sans motif
 * ne serait pas communicable au candidat, et un motif accroche a une validation
 * laisserait croire a une reserve la ou il n'y en a pas. La regle est portee
 * par le contrat, donc appliquee a l'entree et visible dans la documentation.
 */
export const DecideVideoBody = named(
  "DecideVideoInput",
  z
    .object({
      decision: z.enum(["approved", "rejected"]),
      reason: z.string().trim().min(1).max(500).optional(),
    })
    .refine((body) => body.decision !== "rejected" || !!body.reason, {
      path: ["reason"],
      message: "Motif obligatoire pour un refus : il est communique au candidat.",
    })
    .refine((body) => body.decision !== "approved" || !body.reason, {
      path: ["reason"],
      message: "Une validation ne porte pas de motif.",
    }),
);

/* --- Gestion des questions ----------------------------------------------- */

const OptionInput = z.object({
  label: z.string().trim().min(1).max(300),
  value: z.number().int().min(0).meta({ description: "Points rapportes par cette reponse." }),
});

export const CreateQuestionBody = named(
  "CreateQuestionInput",
  z.object({
    text: z.string().trim().min(1).max(500),
    weight: z.number().int().min(1).max(5).default(2),
    options: z
      .array(OptionInput)
      .min(2)
      .max(6)
      .meta({ description: "Au moins deux reponses possibles." }),
  }),
);

export const UpdateQuestionBody = named(
  "UpdateQuestionInput",
  z.object({
    text: z.string().trim().min(1).max(500).optional(),
    weight: z.number().int().min(1).max(5).optional(),
    options: z.array(OptionInput).min(2).max(6).optional().meta({
      description: "Remplace l'integralite des reponses de la question.",
    }),
  }),
);

/* --- Reglages ------------------------------------------------------------ */

export const SettingsSchema = named(
  "Settings",
  z.object({
    certificationThreshold: z
      .number()
      .int()
      .meta({ description: "Score minimal, sur 100, pour delivrer le badge JEB." }),
    catalogPageSize: z
      .number()
      .int()
      .meta({ description: "Taille de page par defaut du catalogue." }),
  }),
);

export const UpdateSettingsBody = named(
  "UpdateSettingsInput",
  z.object({
    certificationThreshold: z.number().int().min(0).max(100).optional(),
    catalogPageSize: z.number().int().min(1).max(MAX_PAGE_SIZE).optional(),
  }),
);

/* --- Conservation des donnees (R.5) -------------------------------------- */

export const RetentionPolicySchema = named(
  "RetentionPolicy",
  z.object({
    accountInactivityMonths: z.number().int().meta({
      description:
        "Mois d'inactivite au terme desquels un compte non administrateur est supprime, avec profil, entreprise, favoris et contacts.",
    }),
    sessionLogMonths: z.number().int().meta({
      description: "Mois de conservation du journal de connexion (table session : IP, user agent).",
    }),
    verificationGraceDays: z
      .number()
      .int()
      .meta({ description: "Jours de conservation d'un jeton apres son expiration." }),
    contactMonths: z.number().int().meta({
      description: "Mois de conservation d'une prise de contact, depuis son dernier changement.",
    }),
    favoriteMonths: z.number().int().meta({ description: "Mois de conservation d'un favori." }),
    notificationMonths: z
      .number()
      .int()
      .meta({ description: "Mois de conservation d'une notification, lue ou non." }),
    submittedAttemptMonths: z
      .number()
      .int()
      .meta({ description: "Mois de conservation d'une tentative de certification soumise." }),
    abandonedAttemptDays: z
      .number()
      .int()
      .meta({ description: "Jours au bout desquels une tentative jamais soumise est effacee." }),
    rejectedVideoDays: z.number().int().meta({
      description: "Jours de conservation du fichier d'une video refusee, apres la decision.",
    }),
    revokedConsentMonths: z
      .number()
      .int()
      .meta({ description: "Mois de conservation de la trace d'un consentement retire." }),
    pingDays: z.number().int().meta({ description: "Jours de conservation de la table ping." }),
  }),
);

export const RetentionReportSchema = named(
  "RetentionReport",
  z.object({
    ranAt: z.string().meta({ description: "Horodatage ISO 8601 de l'execution." }),
    deleted: z
      .object({
        accounts: z.number().int(),
        sessions: z.number().int(),
        verifications: z.number().int(),
        contacts: z.number().int(),
        favorites: z.number().int(),
        notifications: z.number().int(),
        attempts: z.number().int(),
        videos: z.number().int(),
        consentTraces: z.number().int(),
        pings: z.number().int(),
      })
      .meta({ description: "Lignes reellement supprimees, par traitement du registre." }),
  }),
);
