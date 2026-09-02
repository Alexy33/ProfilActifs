import { z } from "zod";
import { defineRoute } from "@/server/openapi/routes";
import { AUTH_RESPONSES, VALIDATION_RESPONSE } from "@/server/contracts/common";
import { VideoReviewRowSchema, VideoStatusSchema } from "@/server/contracts/admin";
import { named } from "@/server/openapi/schemas";
import { videoQueue } from "@/server/services/video-moderation";

export const dynamic = "force-dynamic";

const VideoQueueSchema = named(
  "VideoQueue",
  z.object({ items: z.array(VideoReviewRowSchema) }),
);

export const { GET } = defineRoute({
  method: "GET",
  path: "/api/admin/videos",
  tags: ["Administration"],
  summary: "File de moderation des videos",
  description:
    "Videos deposees et leur etat de validation. Les videos deja consultees avant la mise en place de la moderation a priori remontent en tete : ce sont les cas a traiter en priorite.",
  access: "admin",
  query: z.object({
    status: VideoStatusSchema.optional().meta({
      description: "Filtre optionnel. Sans lui, toutes les videos sont renvoyees.",
    }),
  }),
  responses: {
    "200": { description: "Videos a moderer.", schema: VideoQueueSchema },
    ...VALIDATION_RESPONSE,
    ...AUTH_RESPONSES,
  },
  handler: async ({ query }) => ({ items: await videoQueue(query.status) }),
});
