import { defineRoute } from "@/server/openapi/routes";
import { AUTH_RESPONSES } from "@/server/contracts/common";
import { CertificationStateSchema } from "@/server/contracts/certification";
import { certificationState } from "@/server/services/certification";

export const dynamic = "force-dynamic";

export const { GET } = defineRoute({
  method: "GET",
  path: "/api/me/certification",
  tags: ["Certification"],
  summary: "Etat de ma certification",
  description:
    "Tout ce dont l'ecran a besoin en un appel : avancement, reponses deja enregistrees, seuil et resultat s'il existe.",
  access: "candidate",
  responses: {
    "200": { description: "Etat de la tentative courante.", schema: CertificationStateSchema },
    ...AUTH_RESPONSES,
  },
  handler: ({ session }) => certificationState(session.user.id),
});
