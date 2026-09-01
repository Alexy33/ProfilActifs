import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { favorite, profile } from "@/db/schema";
import { ApiError } from "@/server/http";
import { defineRoute } from "@/server/openapi/routes";
import { AUTH_RESPONSES, NOT_FOUND_RESPONSE, OkSchema } from "@/server/contracts/common";

export const dynamic = "force-dynamic";

const ProfileIdParam = z.object({ profileId: z.string().min(1) });

export const { PUT } = defineRoute({
  method: "PUT",
  path: "/api/me/favorites/{profileId}",
  tags: ["Espace recruteur"],
  summary: "Ajouter un profil aux favoris",
  description: "Idempotent : ajouter deux fois le meme profil ne cree pas de doublon.",
  access: "recruiter",
  params: ProfileIdParam,
  responses: {
    "200": { description: "Profil en favoris.", schema: OkSchema },
    ...AUTH_RESPONSES,
    ...NOT_FOUND_RESPONSE,
  },
  handler: async ({ session, params }) => {
    const [target] = await db
      .select({ id: profile.id })
      .from(profile)
      .where(eq(profile.id, params.profileId))
      .limit(1);
    if (!target) throw ApiError.notFound("Ce profil n'existe pas.");

    await db
      .insert(favorite)
      .values({ recruiterId: session.user.id, profileId: params.profileId })
      .onConflictDoNothing();

    return { ok: true as const };
  },
});

export const { DELETE } = defineRoute({
  method: "DELETE",
  path: "/api/me/favorites/{profileId}",
  tags: ["Espace recruteur"],
  summary: "Retirer un profil des favoris",
  description: "Idempotent : retirer un profil absent des favoris repond 200.",
  access: "recruiter",
  params: ProfileIdParam,
  responses: {
    "200": { description: "Profil retire des favoris.", schema: OkSchema },
    ...AUTH_RESPONSES,
  },
  handler: async ({ session, params }) => {
    await db
      .delete(favorite)
      .where(
        and(
          eq(favorite.recruiterId, session.user.id),
          eq(favorite.profileId, params.profileId),
        ),
      );
    return { ok: true as const };
  },
});
