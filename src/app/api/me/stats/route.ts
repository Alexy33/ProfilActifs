import { defineRoute } from "@/server/openapi/routes";
import { AUTH_RESPONSES } from "@/server/contracts/common";
import { RecruiterStatsSchema } from "@/server/contracts/recruiter";
import { recruiterStats } from "@/server/services/dashboard";

export const dynamic = "force-dynamic";

export const { GET } = defineRoute({
  method: "GET",
  path: "/api/me/stats",
  tags: ["Espace recruteur"],
  summary: "Compteurs de mon tableau de bord",
  access: "recruiter",
  responses: {
    "200": { description: "Compteurs du recruteur connecte.", schema: RecruiterStatsSchema },
    ...AUTH_RESPONSES,
  },
  handler: ({ session }) => recruiterStats(session.user.id),
});
