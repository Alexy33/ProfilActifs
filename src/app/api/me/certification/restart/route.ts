import { eq } from "drizzle-orm";
import { db } from "@/db";
import { certificationAnswer, certificationAttempt } from "@/db/schema";
import { defineRoute } from "@/server/openapi/routes";
import { AUTH_RESPONSES } from "@/server/contracts/common";
import { CertificationStateSchema } from "@/server/contracts/certification";
import { certificationState, currentAttempt } from "@/server/services/certification";

export const dynamic = "force-dynamic";

export const { POST } = defineRoute({
  method: "POST",
  path: "/api/me/certification/restart",
  tags: ["Certification"],
  summary: "Repasser le questionnaire",
  description:
    "Ouvre une tentative vierge. Les tentatives precedentes sont conservees pour le suivi du dispositif ; aucun delai de carence n'est applique.",
  access: "candidate",
  responses: {
    "200": { description: "Nouvelle tentative ouverte.", schema: CertificationStateSchema },
    ...AUTH_RESPONSES,
  },
  handler: async ({ session }) => {
    const existing = await currentAttempt(session.user.id);

    if (existing && existing.status === "in_progress") {
      // Tentative deja ouverte : on la vide plutot que d'en creer une seconde,
      // sans quoi `currentAttempt` aurait deux candidates a departager.
      await db
        .delete(certificationAnswer)
        .where(eq(certificationAnswer.attemptId, existing.id));
    } else {
      await db
        .insert(certificationAttempt)
        .values({ id: crypto.randomUUID(), userId: session.user.id, status: "in_progress" });
    }

    return certificationState(session.user.id);
  },
});
