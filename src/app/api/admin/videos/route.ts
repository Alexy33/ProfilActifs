import { and, desc, eq, isNotNull, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { z } from "zod";
import { db } from "@/db";
import { profile, user } from "@/db/schema";
import { defineRoute } from "@/server/openapi/routes";
import { AUTH_RESPONSES, VideoStatusSchema, VALIDATION_RESPONSE } from "@/server/contracts/common";
import { VideoModerationRowSchema } from "@/server/contracts/admin";
import { named } from "@/server/openapi/schemas";

export const dynamic = "force-dynamic";

const VideoModerationQueueSchema = named(
  "VideoModerationQueue",
  z.object({ items: z.array(VideoModerationRowSchema) }),
);

// Le decideur est le meme table `user` que le titulaire : sans alias, la
// jointure se refermerait sur elle-meme et rendrait le nom du candidat.
const moderator = alias(user, "moderator");

export const { GET } = defineRoute({
  method: "GET",
  path: "/api/admin/videos",
  tags: ["Administration"],
  summary: "File de moderation des videos",
  description:
    "Les profils qui portent une video, avec son statut de moderation et la decision deja prise. Seule route qui expose l'URL d'une video non validee.",
  access: "admin",
  query: z.object({
    status: VideoStatusSchema.optional().meta({
      description: "Filtre optionnel. Sans lui, toutes les videos sont renvoyees.",
    }),
  }),
  responses: {
    "200": { description: "Videos a moderer.", schema: VideoModerationQueueSchema },
    ...VALIDATION_RESPONSE,
    ...AUTH_RESPONSES,
  },
  handler: async ({ query }) => {
    const rows = await db
      .select({ profile, name: user.name, moderatorName: moderator.name })
      .from(profile)
      .innerJoin(user, eq(user.id, profile.userId))
      .leftJoin(moderator, eq(moderator.id, profile.videoReviewedBy))
      // Un profil sans video n'a rien a moderer : il encombrerait la file sans
      // qu'aucune decision ne soit possible.
      .where(
        and(
          isNotNull(profile.videoUrl),
          query.status ? eq(profile.videoStatus, query.status) : undefined,
        ),
      )
      // Les videos en attente d'abord : c'est ce que l'ecran doit traiter.
      // L'ordre est explicite et non alphabetique — « pending » ne se trouve ni
      // en tete ni en queue d'un tri sur la chaine.
      .orderBy(
        sql`case ${profile.videoStatus} when 'pending' then 0 when 'rejected' then 1 else 2 end`,
        desc(profile.updatedAt),
      );

    return {
      items: rows.map((row) => ({
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
      })),
    };
  },
});
