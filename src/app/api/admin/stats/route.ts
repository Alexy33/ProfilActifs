import { sql } from "drizzle-orm";
import { db } from "@/db";
import { profile, question } from "@/db/schema";
import { defineRoute } from "@/server/openapi/routes";
import { AUTH_RESPONSES } from "@/server/contracts/common";
import { AdminStatsSchema } from "@/server/contracts/admin";

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
  handler: async () => {
    const [counts] = await db
      .select({
        published: sql<number>`sum(case when ${profile.status} = 'published' then 1 else 0 end)`,
        pending: sql<number>`sum(case when ${profile.status} = 'pending' then 1 else 0 end)`,
        removed: sql<number>`sum(case when ${profile.status} = 'removed' then 1 else 0 end)`,
        certifiedPublished: sql<number>`sum(case when ${profile.status} = 'published' and ${profile.certifiedAt} is not null then 1 else 0 end)`,
        contacts: sql<number>`coalesce(sum(${profile.contactCount}), 0)`,
      })
      .from(profile);

    const [{ questions }] = await db.select({ questions: sql<number>`count(*)` }).from(question);

    const published = counts?.published ?? 0;

    return {
      publishedProfiles: published,
      pendingProfiles: counts?.pending ?? 0,
      removedProfiles: counts?.removed ?? 0,
      certificationRate: published
        ? Math.round(((counts?.certifiedPublished ?? 0) / published) * 100)
        : 0,
      questionCount: questions,
      recruiterContacts: counts?.contacts ?? 0,
    };
  },
});
