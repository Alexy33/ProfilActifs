import { defineRoute } from "@/server/openapi/routes";
import { AUTH_RESPONSES } from "@/server/contracts/common";
import { RetentionPolicySchema, RetentionReportSchema } from "@/server/contracts/admin";
import { RETENTION, runRetention } from "@/server/services/retention";

export const dynamic = "force-dynamic";

/**
 * Durees de conservation (R.5).
 *
 * Deux routes plutot qu'une : lire la politique ne doit pas supprimer quoi que
 * ce soit, et la purge s'execute deja seule (`src/instrumentation.ts`). Le
 * `POST` sert a la prouver — le rapport dit ce qui a ete efface, ligne par
 * ligne — et a la rejouer apres un changement de delai sans attendre le
 * lendemain.
 */
export const { GET } = defineRoute({
  method: "GET",
  path: "/api/admin/retention",
  tags: ["Administration"],
  summary: "Durees de conservation appliquees",
  description:
    "Les delais reellement appliques par la purge. C'est la meme source que le registre des traitements (docs/registre-traitements.md) et que les CGU : si les trois divergent, l'un des trois est faux.",
  access: "admin",
  responses: {
    "200": { description: "Politique de conservation.", schema: RetentionPolicySchema },
    ...AUTH_RESPONSES,
  },
  handler: () => RETENTION,
});

export const { POST } = defineRoute({
  method: "POST",
  path: "/api/admin/retention",
  tags: ["Administration"],
  summary: "Executer la purge maintenant",
  description:
    "Applique les durees de conservation immediatement. Idempotente : sur une base deja purgee, tous les compteurs sont a zero. La purge tourne de toute facon au demarrage puis toutes les 24 heures.",
  access: "admin",
  responses: {
    "200": { description: "Lignes supprimees.", schema: RetentionReportSchema },
    ...AUTH_RESPONSES,
  },
  handler: async () => {
    const report = await runRetention();
    return { ranAt: report.ranAt.toISOString(), deleted: report.deleted };
  },
});
