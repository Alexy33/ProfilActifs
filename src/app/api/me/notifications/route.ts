import { z } from "zod";
import { defineRoute } from "@/server/openapi/routes";
import { AUTH_RESPONSES } from "@/server/contracts/common";
import { NotificationSchema } from "@/server/contracts/recruiter";
import { named } from "@/server/openapi/schemas";
import { listNotifications } from "@/server/services/dashboard";

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
  handler: ({ session }) => listNotifications(session.user.id),
});
