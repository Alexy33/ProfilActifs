import { z } from "zod";
import { defineRoute } from "@/server/openapi/routes";
import { AUTH_RESPONSES } from "@/server/contracts/common";
import { FavoriteSchema } from "@/server/contracts/recruiter";
import { named } from "@/server/openapi/schemas";
import { listFavorites } from "@/server/services/dashboard";

export const dynamic = "force-dynamic";

const FavoriteListSchema = named("FavoriteList", z.object({ items: z.array(FavoriteSchema) }));

export const { GET } = defineRoute({
  method: "GET",
  path: "/api/me/favorites",
  tags: ["Espace recruteur"],
  summary: "Mes profils en favoris",
  access: "recruiter",
  responses: {
    "200": { description: "Favoris du recruteur, les plus recents en tete.", schema: FavoriteListSchema },
    ...AUTH_RESPONSES,
  },
  handler: async ({ session }) => ({ items: await listFavorites(session.user.id) }),
});
