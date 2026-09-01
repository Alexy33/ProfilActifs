import { eq } from "drizzle-orm";
import { db } from "@/db";
import { profile, user } from "@/db/schema";
import { ApiError } from "@/server/http";
import { defineRoute } from "@/server/openapi/routes";
import {
  AUTH_RESPONSES,
  IdParam,
  NOT_FOUND_RESPONSE,
  VALIDATION_RESPONSE,
} from "@/server/contracts/common";
import { ModerateProfileBody, ModerationRowSchema } from "@/server/contracts/admin";
import { notify } from "@/server/services/notifications";

export const dynamic = "force-dynamic";

const MESSAGES = {
  published: "Votre profil a ete valide : il est desormais visible au catalogue.",
  removed: "Votre profil a ete retire du catalogue par l'administration.",
  pending: "Votre profil est repasse en attente de moderation.",
} as const;

export const { PATCH } = defineRoute({
  method: "PATCH",
  path: "/api/admin/profiles/{id}",
  tags: ["Administration"],
  summary: "Moderer un profil",
  description: "Publie, retire ou remet en attente un profil, et notifie son titulaire.",
  access: "admin",
  params: IdParam,
  body: ModerateProfileBody,
  responses: {
    "200": { description: "Statut applique.", schema: ModerationRowSchema },
    ...VALIDATION_RESPONSE,
    ...AUTH_RESPONSES,
    ...NOT_FOUND_RESPONSE,
  },
  handler: async ({ params, body }) => {
    const [updated] = await db
      .update(profile)
      .set({ status: body.status, updatedAt: new Date() })
      .where(eq(profile.id, params.id))
      .returning();

    if (!updated) throw ApiError.notFound("Ce profil n'existe pas.");

    await notify(updated.userId, "moderation", MESSAGES[body.status]);

    const [owner] = await db
      .select({ name: user.name })
      .from(user)
      .where(eq(user.id, updated.userId))
      .limit(1);

    return {
      id: updated.id,
      name: owner?.name ?? "",
      title: updated.title,
      videoUrl: updated.videoUrl,
      status: updated.status,
      createdAt: updated.createdAt.toISOString(),
    };
  },
});
