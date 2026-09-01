import { db } from "@/db";
import { certificationAnswer } from "@/db/schema";
import { ApiError } from "@/server/http";
import { defineRoute } from "@/server/openapi/routes";
import { AUTH_RESPONSES, VALIDATION_RESPONSE } from "@/server/contracts/common";
import { CertificationStateSchema, SaveAnswersBody } from "@/server/contracts/certification";
import { certificationState, loadQuestions, openAttempt } from "@/server/services/certification";

export const dynamic = "force-dynamic";

export const { PUT } = defineRoute({
  method: "PUT",
  path: "/api/me/certification/answers",
  tags: ["Certification"],
  summary: "Enregistrer des reponses",
  description:
    "Appelable a chaque question : la progression est conservee si le candidat quitte le questionnaire. Les reponses envoyees sont fusionnees avec les precedentes, jamais substituees en bloc.",
  access: "candidate",
  body: SaveAnswersBody,
  responses: {
    "200": { description: "Reponses enregistrees, etat mis a jour.", schema: CertificationStateSchema },
    ...VALIDATION_RESPONSE,
    ...AUTH_RESPONSES,
  },
  handler: async ({ session, body }) => {
    const attempt = await openAttempt(session.user.id);
    if (attempt.status === "submitted") {
      throw ApiError.conflict(
        "Cette tentative est deja validee. Relancez le questionnaire pour repondre a nouveau.",
      );
    }

    const questions = await loadQuestions();
    const allowed = new Map(questions.map((item) => [item.id, item]));

    for (const [questionId, value] of Object.entries(body.answers)) {
      const item = allowed.get(questionId);
      if (!item) throw ApiError.unprocessable(`Question inconnue : ${questionId}.`);
      if (!item.options.some((option) => option.value === value)) {
        throw ApiError.unprocessable(
          `La valeur ${value} ne correspond a aucune reponse de la question ${questionId}.`,
        );
      }

      await db
        .insert(certificationAnswer)
        .values({ attemptId: attempt.id, questionId, value })
        .onConflictDoUpdate({
          target: [certificationAnswer.attemptId, certificationAnswer.questionId],
          set: { value },
        });
    }

    return certificationState(session.user.id);
  },
});
