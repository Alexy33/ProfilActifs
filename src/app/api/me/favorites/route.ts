import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { favorite, profile, user } from "@/db/schema";
import { defineRoute } from "@/server/openapi/routes";
import { AUTH_RESPONSES } from "@/server/contracts/common";
import { FavoriteSchema } from "@/server/contracts/recruiter";
import { named } from "@/server/openapi/schemas";
import { skillsByProfile, toCard } from "@/server/services/profiles";

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
  handler: async ({ session }) => {
    const rows = await db
      .select({ favorite, profile, name: user.name })
      .from(favorite)
      .innerJoin(profile, eq(profile.id, favorite.profileId))
      .innerJoin(user, eq(user.id, profile.userId))
      .where(eq(favorite.recruiterId, session.user.id))
      .orderBy(desc(favorite.createdAt));

    const skills = await skillsByProfile(rows.map((row) => row.profile.id));

    return {
      items: rows.map((row) => ({
        profile: toCard(row.profile, row.name, skills.get(row.profile.id) ?? []),
        createdAt: row.favorite.createdAt.toISOString(),
      })),
    };
  },
});
