import { desc, eq, isNull, and, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { notification } from "@/db/schema";
import { defineRoute } from "@/server/openapi/routes";
import { AUTH_RESPONSES } from "@/server/contracts/common";
import { NotificationSchema } from "@/server/contracts/recruiter";
import { named } from "@/server/openapi/schemas";

export const dynamic = "force-dynamic";

const NotificationListSchema = named(
  "NotificationList",
  z.object({
    items: z.array(NotificationSchema),
    unread: z.number().int().meta({ description: "Nombre de notifications non lues." }),
  }),
);

export const { GET } = defineRoute({
  method: "GET",
  path: "/api/me/notifications",
  tags: ["Espace demandeur"],
  summary: "Mes notifications",
  description: "Ouverte a tous les roles connectes, meme si seuls les candidats en recoivent aujourd'hui.",
  access: "authenticated",
  responses: {
    "200": { description: "Notifications, les plus recentes en tete.", schema: NotificationListSchema },
    ...AUTH_RESPONSES,
  },
  handler: async ({ session }) => {
    const rows = await db
      .select()
      .from(notification)
      .where(eq(notification.userId, session.user.id))
      .orderBy(desc(notification.createdAt));

    return {
      items: rows.map((row) => ({
        id: row.id,
        type: row.type,
        text: row.text,
        read: row.readAt !== null,
        createdAt: row.createdAt.toISOString(),
      })),
      unread: rows.filter((row) => row.readAt === null).length,
    };
  },
});
