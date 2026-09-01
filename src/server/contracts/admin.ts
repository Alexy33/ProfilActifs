import { z } from "zod";
import { named } from "../openapi/schemas";
import { MAX_PAGE_SIZE } from "@/lib/vocabulary";
import { ProfileStatusSchema } from "./common";

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
