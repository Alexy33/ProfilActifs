import { defineRoute } from "@/server/openapi/routes";
import { PublicStatsSchema } from "@/server/contracts/reference";
import { publicStats } from "@/server/services/dashboard";

export const dynamic = "force-dynamic";

export const { GET } = defineRoute({
  method: "GET",
  path: "/api/stats",
  tags: ["Reference"],
  summary: "Compteurs publics du dispositif",
  description: "Chiffres affiches sur la page d'accueil. Accessible sans session.",
  responses: {
    "200": { description: "Compteurs a jour.", schema: PublicStatsSchema },
  },
  handler: () => publicStats(),
});
