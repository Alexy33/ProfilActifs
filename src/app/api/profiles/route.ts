import { auth } from "@/lib/auth";
import { defineRoute } from "@/server/openapi/routes";
import { CatalogQuery, ProfilePageSchema } from "@/server/contracts/profile";
import { errorResponse } from "@/server/contracts/common";
import { catalogViewerOf, searchCatalog } from "@/server/services/profiles";

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
    "400": errorResponse(
      "Parametre de requete invalide : hors vocabulaire, ou `pageSize` au-dela du plafond reglementaire de 20 (CDC 3.4).",
      {
        error: {
          code: "bad_request",
          message: "Parametres invalides (query).",
          details: [{ path: "query.pageSize", message: "Too big: expected number to be <=20" }],
        },
      },
    ),
  },
  // Le catalogue reste consultable sans compte (CDC 2.1), mais les profils de
  // mineurs n'y figurent que pour un recruteur connecte ou l'administration
  // (R.1) : d'ou la lecture de session sur une route pourtant publique.
  handler: async ({ query, request }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    return searchCatalog({ ...query, viewer: catalogViewerOf(session) });
  },
});
