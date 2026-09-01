import { z } from "zod";
import { named } from "../openapi/schemas";

/**
 * Question telle qu'elle est servie au candidat.
 *
 * La ponderation n'y figure PAS : connaitre le poids d'une question aiderait a
 * optimiser ses reponses. Elle n'apparait que dans la vue administration.
 */
export const QuestionSchema = named(
  "Question",
  z.object({
    id: z.string(),
    text: z.string(),
    position: z.number().int(),
    options: z.array(
      z.object({
        id: z.string(),
        label: z.string(),
      }),
    ),
  }),
);

/** Meme question, vue administration : ponderation et bareme visibles. */
export const AdminQuestionSchema = named(
  "AdminQuestion",
  QuestionSchema.extend({
    weight: z.number().int().min(1).max(5),
    options: z.array(
      z.object({
        id: z.string(),
        label: z.string(),
        value: z.number().int().meta({ description: "Points rapportes par cette reponse." }),
      }),
    ),
  }),
);

export const QuestionnaireSchema = named(
  "Questionnaire",
  z.object({
    questions: z.array(QuestionSchema),
    threshold: z
      .number()
      .int()
      .meta({ description: "Score minimal, sur 100, pour obtenir le badge JEB." }),
  }),
);

/**
 * Etat de la certification du candidat connecte.
 *
 * Une seule route donne tout ce dont l'ecran a besoin : ou en est la tentative,
 * quelles reponses sont deja enregistrees, et le resultat s'il existe.
 */
export const CertificationStateSchema = named(
  "CertificationState",
  z.object({
    status: z
      .enum(["not_started", "in_progress", "submitted"])
      .meta({ description: "Etat de la tentative courante." }),
    answers: z
      .record(z.string(), z.number().int())
      .meta({ description: "Reponses enregistrees, indexees par identifiant de question." }),
    answered: z.number().int(),
    questionCount: z.number().int(),
    threshold: z.number().int(),
    score: z.number().int().nullable(),
    passed: z.boolean().nullable(),
    submittedAt: z.iso.datetime().nullable(),
  }),
);

/**
 * Enregistrement des reponses.
 *
 * Envoye a chaque question plutot qu'a la fin : la maquette conserve la
 * progression si le candidat quitte le questionnaire en cours de route.
 */
export const SaveAnswersBody = named(
  "SaveAnswersInput",
  z.object({
    answers: z
      .record(z.string(), z.number().int().min(0))
      .meta({ description: "Reponses a fusionner avec celles deja enregistrees." }),
  }),
);

export const CertificationResultSchema = named(
  "CertificationResult",
  z.object({
    score: z.number().int().meta({ description: "Score obtenu, sur 100." }),
    threshold: z.number().int(),
    passed: z.boolean(),
    certified: z.boolean().meta({ description: "Etat de certification du profil apres calcul." }),
  }),
);
