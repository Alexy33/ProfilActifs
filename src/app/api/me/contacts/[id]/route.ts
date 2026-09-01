import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { contact } from "@/db/schema";
import { ApiError } from "@/server/http";
import { defineRoute } from "@/server/openapi/routes";
import {
  AUTH_RESPONSES,
  IdParam,
  NOT_FOUND_RESPONSE,
  VALIDATION_RESPONSE,
} from "@/server/contracts/common";
import { UpdateContactBody } from "@/server/contracts/recruiter";
import { named } from "@/server/openapi/schemas";
import { z } from "zod";
import { ContactStatusSchema } from "@/server/contracts/common";

export const dynamic = "force-dynamic";

const ContactStatusUpdatedSchema = named(
  "ContactStatusUpdated",
  z.object({ id: z.string(), status: ContactStatusSchema, updatedAt: z.iso.datetime() }),
);

export const { PATCH } = defineRoute({
  method: "PATCH",
  path: "/api/me/contacts/{id}",
  tags: ["Espace recruteur"],
  summary: "Faire avancer un candidat dans le suivi",
  description: "Seul le recruteur a l'origine du contact peut en changer le statut.",
  access: "recruiter",
  params: IdParam,
  body: UpdateContactBody,
  responses: {
    "200": { description: "Statut mis a jour.", schema: ContactStatusUpdatedSchema },
    ...VALIDATION_RESPONSE,
    ...AUTH_RESPONSES,
    ...NOT_FOUND_RESPONSE,
  },
  handler: async ({ session, params, body }) => {
    const now = new Date();
    const [updated] = await db
      .update(contact)
      .set({ status: body.status, updatedAt: now })
      // Le filtre sur `recruiterId` fait aussi office de controle d'acces :
      // le suivi d'un autre recruteur est introuvable, pas « interdit ».
      .where(and(eq(contact.id, params.id), eq(contact.recruiterId, session.user.id)))
      .returning();

    if (!updated) throw ApiError.notFound("Aucun suivi ne correspond a cet identifiant.");

    return {
      id: updated.id,
      status: updated.status,
      updatedAt: updated.updatedAt.toISOString(),
    };
  },
});
