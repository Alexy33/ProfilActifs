import { ApiError } from "@/server/http";
import { defineRoute } from "@/server/openapi/routes";
import {
  AUTH_RESPONSES,
  IdParam,
  NOT_FOUND_RESPONSE,
  VALIDATION_RESPONSE,
} from "@/server/contracts/common";
import { ReviewVideoBody, VideoReviewRowSchema } from "@/server/contracts/admin";
import { reviewVideo } from "@/server/services/video-moderation";

export const dynamic = "force-dynamic";

export const { PATCH } = defineRoute({
  method: "PATCH",
  path: "/api/admin/videos/{id}",
  tags: ["Administration"],
  summary: "Valider ou refuser une video",
  description:
    "Moderation A PRIORI : une video n'est diffusee qu'une fois `approved`. Un refus exige un motif, qui est notifie au candidat dans son espace. La decision est tracee (auteur et horodatage).",
  access: "admin",
  params: IdParam,
  body: ReviewVideoBody,
  responses: {
    "200": { description: "Decision enregistree.", schema: VideoReviewRowSchema },
    ...VALIDATION_RESPONSE,
    ...AUTH_RESPONSES,
    ...NOT_FOUND_RESPONSE,
  },
  handler: async ({ params, body, session }) => {
    const updated = await reviewVideo({
      profileId: params.id,
      status: body.status,
      reason: body.reason ?? null,
      adminId: session.user.id,
    });

    if (!updated) throw ApiError.notFound("Ce profil n'existe pas.");
    return updated;
  },
});
