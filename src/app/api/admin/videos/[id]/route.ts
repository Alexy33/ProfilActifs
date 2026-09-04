import { eq } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
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
import { DecideVideoBody, VideoModerationRowSchema } from "@/server/contracts/admin";
import { notify } from "@/server/services/notifications";
import { decideVideoModeration } from "@/server/services/video";

export const dynamic = "force-dynamic";

const moderator = alias(user, "moderator");

export const { PATCH } = defineRoute({
  method: "PATCH",
  path: "/api/admin/videos/{id}",
  tags: ["Administration"],
  summary: "Moderer une video",
  description: [
    "Valide ou refuse la video d'un profil (`id` = `profile.id`).",
    "Un refus exige un motif : il est enregistre, notifie au candidat et affiche",
    "sur son espace. La decision conserve son auteur et sa date.",
    "",
    "Tant que la video n'est pas validee, `GET /api/videos/{id}` repond 404 a",
    "toute autre personne que son titulaire et l'administration.",
  ].join("\n"),
  access: "admin",
  params: IdParam,
  body: DecideVideoBody,
  responses: {
    "200": { description: "Decision enregistree.", schema: VideoModerationRowSchema },
    ...VALIDATION_RESPONSE,
    ...AUTH_RESPONSES,
    ...NOT_FOUND_RESPONSE,
  },
  handler: async ({ params, body, session }) => {
    const [target] = await db
      .select({ userId: profile.userId, videoUrl: profile.videoUrl })
      .from(profile)
      .where(eq(profile.id, params.id))
      .limit(1);

    if (!target) throw ApiError.notFound("Ce profil n'existe pas.");
    // Moderer une video absente n'a pas de sens : la decision porterait sur
    // rien et serait heritee par le prochain fichier depose.
    if (!target.videoUrl) throw ApiError.notFound("Ce profil ne porte aucune video.");

    await decideVideoModeration(params.id, body.decision, session.user.id, body.reason ?? null);

    await notify(
      target.userId,
      "moderation",
      body.decision === "approved"
        ? "Votre video de presentation a ete validee : elle est desormais visible."
        : `Votre video de presentation a ete refusee. Motif : ${body.reason}`,
    );

    const [row] = await db
      .select({ profile, name: user.name, moderatorName: moderator.name })
      .from(profile)
      .innerJoin(user, eq(user.id, profile.userId))
      .leftJoin(moderator, eq(moderator.id, profile.videoReviewedBy))
      .where(eq(profile.id, params.id))
      .limit(1);

    if (!row) throw ApiError.notFound("Ce profil n'existe pas.");

    return {
      profileId: row.profile.id,
      name: row.name,
      title: row.profile.title,
      videoUrl: row.profile.videoUrl,
      profileStatus: row.profile.status,
      videoStatus: row.profile.videoStatus,
      reason: row.profile.videoReviewReason,
      decidedBy: row.moderatorName,
      decidedAt: row.profile.videoReviewedAt?.toISOString() ?? null,
      submittedAt: row.profile.updatedAt.toISOString(),
    };
  },
});
