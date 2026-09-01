import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { notification } from "@/db/schema";
import { defineRoute } from "@/server/openapi/routes";
import { AUTH_RESPONSES } from "@/server/contracts/common";
import { named } from "@/server/openapi/schemas";

export const dynamic = "force-dynamic";

const MarkedReadSchema = named(
  "MarkedRead",
  z.object({ marked: z.number().int().meta({ description: "Nombre de notifications passees a lues." }) }),
);

export const { POST } = defineRoute({
  method: "POST",
  path: "/api/me/notifications/read",
  tags: ["Espace demandeur"],
  summary: "Marquer toutes mes notifications comme lues",
  access: "authenticated",
  responses: {
    "200": { description: "Notifications marquees.", schema: MarkedReadSchema },
    ...AUTH_RESPONSES,
  },
  handler: async ({ session }) => {
    const updated = await db
      .update(notification)
      .set({ readAt: new Date() })
      .where(and(eq(notification.userId, session.user.id), isNull(notification.readAt)))
      .returning({ id: notification.id });

    return { marked: updated.length };
  },
});
