import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { contact, profile, user } from "@/db/schema";
import { defineRoute } from "@/server/openapi/routes";
import { AUTH_RESPONSES } from "@/server/contracts/common";
import { ContactSchema } from "@/server/contracts/recruiter";
import { named } from "@/server/openapi/schemas";
import { skillsByProfile, toCard } from "@/server/services/profiles";

export const dynamic = "force-dynamic";

const ContactListSchema = named("ContactList", z.object({ items: z.array(ContactSchema) }));

export const { GET } = defineRoute({
  method: "GET",
  path: "/api/me/contacts",
  tags: ["Espace recruteur"],
  summary: "Candidats que j'ai contactes",
  description: "Le pipeline de suivi du recruteur, du plus recemment contacte au plus ancien.",
  access: "recruiter",
  responses: {
    "200": { description: "Lignes de suivi.", schema: ContactListSchema },
    ...AUTH_RESPONSES,
  },
  handler: async ({ session }) => {
    const rows = await db
      .select({ contact, profile, name: user.name })
      .from(contact)
      .innerJoin(profile, eq(profile.id, contact.profileId))
      .innerJoin(user, eq(user.id, profile.userId))
      .where(eq(contact.recruiterId, session.user.id))
      .orderBy(desc(contact.createdAt));

    const skills = await skillsByProfile(rows.map((row) => row.profile.id));

    return {
      items: rows.map((row) => ({
        id: row.contact.id,
        profile: toCard(row.profile, row.name, skills.get(row.profile.id) ?? []),
        message: row.contact.message,
        status: row.contact.status,
        createdAt: row.contact.createdAt.toISOString(),
        updatedAt: row.contact.updatedAt.toISOString(),
      })),
    };
  },
});
