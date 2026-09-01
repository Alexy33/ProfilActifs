import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { contact, favorite } from "@/db/schema";
import { defineRoute } from "@/server/openapi/routes";
import { AUTH_RESPONSES } from "@/server/contracts/common";
import { RecruiterStatsSchema } from "@/server/contracts/recruiter";

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
  handler: async ({ session }) => {
    const [contacts] = await db
      .select({
        total: sql<number>`count(*)`,
        interviews: sql<number>`sum(case when ${contact.status} = 'Entretien planifié' then 1 else 0 end)`,
      })
      .from(contact)
      .where(eq(contact.recruiterId, session.user.id));

    const [favorites] = await db
      .select({ total: sql<number>`count(*)` })
      .from(favorite)
      .where(eq(favorite.recruiterId, session.user.id));

    return {
      contacted: contacts?.total ?? 0,
      favorites: favorites?.total ?? 0,
      interviewsPlanned: contacts?.interviews ?? 0,
    };
  },
});
