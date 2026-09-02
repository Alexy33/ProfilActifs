import { defineRoute } from "@/server/openapi/routes";
import { AUTH_RESPONSES } from "@/server/contracts/common";
import { AdminStatsSchema } from "@/server/contracts/admin";
import { adminStats } from "@/server/services/dashboard";

export const dynamic = "force-dynamic";

export const { GET } = defineRoute({
  method: "GET",
  path: "/api/admin/stats",
  tags: ["Administration"],
  summary: "Tableau de bord du dispositif",
  access: "admin",
  responses: {
    "200": { description: "Compteurs globaux.", schema: AdminStatsSchema },
    ...AUTH_RESPONSES,
  },
  handler: () => adminStats(),
});
