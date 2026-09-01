import { eq } from "drizzle-orm";
import { db } from "@/db";
import { question, questionOption } from "@/db/schema";
import { ApiError } from "@/server/http";
import { defineRoute } from "@/server/openapi/routes";
import {
  AUTH_RESPONSES,
  IdParam,
  NOT_FOUND_RESPONSE,
  OkSchema,
  VALIDATION_RESPONSE,
} from "@/server/contracts/common";
import { AdminQuestionSchema } from "@/server/contracts/certification";
import { UpdateQuestionBody } from "@/server/contracts/admin";
import { loadQuestions } from "@/server/services/certification";

export const dynamic = "force-dynamic";

export const { PATCH } = defineRoute({
  method: "PATCH",
  path: "/api/admin/questions/{id}",
  tags: ["Administration"],
  summary: "Modifier une question",
  description:
    "Mise a jour partielle. Fournir `options` remplace TOUTES les reponses de la question : les reponses deja enregistrees par les candidats en cours de tentative peuvent alors ne plus correspondre.",
  access: "admin",
  params: IdParam,
  body: UpdateQuestionBody,
  responses: {
    "200": { description: "Question mise a jour.", schema: AdminQuestionSchema },
    ...VALIDATION_RESPONSE,
    ...AUTH_RESPONSES,
    ...NOT_FOUND_RESPONSE,
  },
  handler: async ({ params, body }) => {
    const { options, ...columns } = body;

    if (Object.keys(columns).length > 0) {
      const [updated] = await db
        .update(question)
        .set(columns)
        .where(eq(question.id, params.id))
        .returning();
      if (!updated) throw ApiError.notFound("Cette question n'existe pas.");
    }

    if (options) {
      await db.delete(questionOption).where(eq(questionOption.questionId, params.id));
      await db.insert(questionOption).values(
        options.map((option, index) => ({
          id: crypto.randomUUID(),
          questionId: params.id,
          label: option.label,
          value: option.value,
          position: index,
        })),
      );
    }

    const found = (await loadQuestions()).find((item) => item.id === params.id);
    if (!found) throw ApiError.notFound("Cette question n'existe pas.");
    return found;
  },
});

export const { DELETE } = defineRoute({
  method: "DELETE",
  path: "/api/admin/questions/{id}",
  tags: ["Administration"],
  summary: "Supprimer une question",
  description:
    "Les reponses deja enregistrees pour cette question sont supprimees avec elle (cascade), ce qui modifie le bareme des tentatives en cours.",
  access: "admin",
  params: IdParam,
  responses: {
    "200": { description: "Question supprimee.", schema: OkSchema },
    ...AUTH_RESPONSES,
    ...NOT_FOUND_RESPONSE,
  },
  handler: async ({ params }) => {
    const deleted = await db
      .delete(question)
      .where(eq(question.id, params.id))
      .returning({ id: question.id });

    if (deleted.length === 0) throw ApiError.notFound("Cette question n'existe pas.");
    return { ok: true as const };
  },
});
