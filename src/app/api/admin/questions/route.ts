import { sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { question, questionOption } from "@/db/schema";
import { defineRoute } from "@/server/openapi/routes";
import { AUTH_RESPONSES, VALIDATION_RESPONSE } from "@/server/contracts/common";
import { AdminQuestionSchema } from "@/server/contracts/certification";
import { CreateQuestionBody } from "@/server/contracts/admin";
import { named } from "@/server/openapi/schemas";
import { loadQuestions } from "@/server/services/certification";

export const dynamic = "force-dynamic";

const AdminQuestionListSchema = named(
  "AdminQuestionList",
  z.object({ items: z.array(AdminQuestionSchema) }),
);

export const { GET } = defineRoute({
  method: "GET",
  path: "/api/admin/questions",
  tags: ["Administration"],
  summary: "Questions et ponderations",
  description: "Vue complete du bareme, ponderations et points par reponse compris.",
  access: "admin",
  responses: {
    "200": { description: "Questions dans l'ordre d'affichage.", schema: AdminQuestionListSchema },
    ...AUTH_RESPONSES,
  },
  handler: async () => ({ items: await loadQuestions() }),
});

export const { POST } = defineRoute({
  method: "POST",
  path: "/api/admin/questions",
  tags: ["Administration"],
  summary: "Ajouter une question",
  description: "La question est ajoutee en fin de questionnaire et compte des la tentative suivante.",
  successStatus: 201,
  access: "admin",
  body: CreateQuestionBody,
  responses: {
    "201": { description: "Question creee.", schema: AdminQuestionSchema },
    ...VALIDATION_RESPONSE,
    ...AUTH_RESPONSES,
  },
  handler: async ({ body }) => {
    const [{ last }] = await db
      .select({ last: sql<number>`coalesce(max(${question.position}), -1)` })
      .from(question);

    const id = crypto.randomUUID();
    await db.insert(question).values({
      id,
      text: body.text,
      weight: body.weight,
      position: last + 1,
    });

    await db.insert(questionOption).values(
      body.options.map((option, index) => ({
        id: crypto.randomUUID(),
        questionId: id,
        label: option.label,
        value: option.value,
        position: index,
      })),
    );

    const created = (await loadQuestions()).find((item) => item.id === id)!;
    return created;
  },
});
