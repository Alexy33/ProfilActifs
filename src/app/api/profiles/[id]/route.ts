import { ApiError } from "@/server/http";
import { defineRoute } from "@/server/openapi/routes";
import { IdParam, NOT_FOUND_RESPONSE } from "@/server/contracts/common";
import { ProfileSchema } from "@/server/contracts/profile";
import { findProfileById, recordProfileView } from "@/server/services/profiles";

export const dynamic = "force-dynamic";

export const { GET } = defineRoute({
  method: "GET",
  path: "/api/profiles/{id}",
  tags: ["Catalogue"],
  summary: "Fiche publique d'un profil",
  description:
    "Chaque appel incremente le compteur de vues affiche au candidat dans son espace ; ce compteur n'est pas renvoye ici. Un profil non publie repond 404, y compris a un recruteur. Un profil de mineur repond 404 en toutes circonstances.",
  params: IdParam,
  responses: {
    "200": { description: "Profil trouve.", schema: ProfileSchema },
    ...NOT_FOUND_RESPONSE,
  },
  handler: async ({ params }) => {
    const found = await findProfileById(params.id);
    if (!found || found.status !== "published") {
      throw ApiError.notFound("Ce profil n'existe pas ou n'est pas publie.");
    }

    // La consultation est toujours comptee — le compteur existe et sert au
    // candidat dans son espace — mais il ne sort plus dans la reponse
    // publique (mesure Cabinet du 2026-09-02, point 3).
    await recordProfileView(found.id);
    return found;
  },
});
