import { defineRoute } from "@/server/openapi/routes";
import { CatalogQuery, ProfilePageSchema } from "@/server/contracts/profile";
import { VALIDATION_RESPONSE } from "@/server/contracts/common";
import { searchCatalog } from "@/server/services/profiles";

export const dynamic = "force-dynamic";

export const { GET } = defineRoute({
  method: "GET",
  path: "/api/profiles",
  tags: ["Catalogue"],
  summary: "Catalogue des profils publies",
  description:
    "Seuls les profils au statut `published` sont servis. Les certifies remontent en tete. La taille de page est plafonnee a 20 (CDC 3.4).",
  query: CatalogQuery,
  responses: {
    "200": { description: "Page de resultats.", schema: ProfilePageSchema },
    ...VALIDATION_RESPONSE,
  },
  handler: ({ query }) => searchCatalog(query),
});
