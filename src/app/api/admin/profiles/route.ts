import { z } from "zod";
import { defineRoute } from "@/server/openapi/routes";
import { AUTH_RESPONSES, ProfileStatusSchema, VALIDATION_RESPONSE } from "@/server/contracts/common";
import { ModerationRowSchema } from "@/server/contracts/admin";
import { named } from "@/server/openapi/schemas";
import { moderationQueue } from "@/server/services/dashboard";

export const dynamic = "force-dynamic";

const ModerationQueueSchema = named(
  "ModerationQueue",
  z.object({ items: z.array(ModerationRowSchema) }),
);

export const { GET } = defineRoute({
  method: "GET",
  path: "/api/admin/profiles",
  tags: ["Administration"],
  summary: "File de moderation",
  description:
    "Tous les profils, quel que soit leur statut — c'est la seule route qui expose les profils non publies.",
  access: "admin",
  query: z.object({
    status: ProfileStatusSchema.optional().meta({
      description: "Filtre optionnel. Sans lui, tous les profils sont renvoyes.",
    }),
  }),
  responses: {
    "200": { description: "Profils a moderer.", schema: ModerationQueueSchema },
    ...VALIDATION_RESPONSE,
    ...AUTH_RESPONSES,
  },
  handler: async ({ query }) => ({ items: await moderationQueue(query.status) }),
});
