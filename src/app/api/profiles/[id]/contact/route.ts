import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { contact, profile, user } from "@/db/schema";
import { ApiError } from "@/server/http";
import { defineRoute } from "@/server/openapi/routes";
import {
  AUTH_RESPONSES,
  IdParam,
  NOT_FOUND_RESPONSE,
  VALIDATION_RESPONSE,
} from "@/server/contracts/common";
import { ContactSchema, SendContactBody } from "@/server/contracts/recruiter";
import { skillsByProfile, toCard } from "@/server/services/profiles";
import { notify } from "@/server/services/notifications";

export const dynamic = "force-dynamic";

export const { POST } = defineRoute({
  method: "POST",
  path: "/api/profiles/{id}/contact",
  tags: ["Espace recruteur"],
  summary: "Prendre contact avec un candidat",
  description:
    "Cree la ligne de suivi, incremente le compteur de contacts du profil et notifie le candidat (CDC 2.3). Recontacter le meme candidat met a jour le message existant plutot que d'ouvrir un second suivi.",
  successStatus: 201,
  access: "recruiter",
  params: IdParam,
  body: SendContactBody,
  responses: {
    "201": { description: "Contact enregistre.", schema: ContactSchema },
    ...VALIDATION_RESPONSE,
    ...AUTH_RESPONSES,
    ...NOT_FOUND_RESPONSE,
  },
  handler: async ({ session, params, body }) => {
    const [row] = await db
      .select({ profile, name: user.name })
      .from(profile)
      .innerJoin(user, eq(user.id, profile.userId))
      .where(eq(profile.id, params.id))
      .limit(1);

    if (!row || row.profile.status !== "published") {
      throw ApiError.notFound("Ce profil n'existe pas ou n'est pas publie.");
    }
    const target = row.profile;

    const now = new Date();
    const [saved] = await db
      .insert(contact)
      .values({
        id: crypto.randomUUID(),
        recruiterId: session.user.id,
        profileId: target.id,
        message: body.message,
      })
      .onConflictDoUpdate({
        target: [contact.recruiterId, contact.profileId],
        set: { message: body.message, updatedAt: now },
      })
      .returning();

    await db
      .update(profile)
      .set({ contactCount: sql`${profile.contactCount} + 1` })
      .where(eq(profile.id, target.id));

    await notify(
      target.userId,
      "contact",
      `${session.user.name} a pris contact avec vous.`,
    );

    const skills = await skillsByProfile([target.id]);

    return {
      id: saved.id,
      profile: toCard(target, row.name, skills.get(target.id) ?? []),
      message: saved.message,
      status: saved.status,
      createdAt: saved.createdAt.toISOString(),
      updatedAt: saved.updatedAt.toISOString(),
    };
  },
});
