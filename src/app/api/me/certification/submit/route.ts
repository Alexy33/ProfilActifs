import { defineRoute } from "@/server/openapi/routes";
import { AUTH_RESPONSES } from "@/server/contracts/common";
import { CertificationResultSchema } from "@/server/contracts/certification";
import { submitAttempt } from "@/server/services/certification";
import { notify } from "@/server/services/notifications";

export const dynamic = "force-dynamic";

export const { POST } = defineRoute({
  method: "POST",
  path: "/api/me/certification/submit",
  tags: ["Certification"],
  summary: "Valider le questionnaire et calculer le score",
  description:
    "Cloture la tentative. Au-dessus du seuil, le badge JEB apparait sur le profil public. En dessous, une certification deja acquise n'est pas retiree.",
  access: "candidate",
  responses: {
    "200": { description: "Score calcule.", schema: CertificationResultSchema },
    ...AUTH_RESPONSES,
  },
  handler: async ({ session }) => {
    const result = await submitAttempt(session.user.id);
    await notify(
      session.user.id,
      "certification",
      result.passed
        ? `Certification obtenue avec un score de ${result.score}/100. Le badge JEB est affiche sur votre profil.`
        : `Score de ${result.score}/100, en dessous du seuil de ${result.threshold}. Vous pouvez repasser le questionnaire sans delai.`,
    );
    return result;
  },
});
