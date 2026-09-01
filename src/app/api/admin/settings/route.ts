import { defineRoute } from "@/server/openapi/routes";
import { AUTH_RESPONSES, VALIDATION_RESPONSE } from "@/server/contracts/common";
import { SettingsSchema, UpdateSettingsBody } from "@/server/contracts/admin";
import { getSettings, updateSettings } from "@/server/services/settings";

export const dynamic = "force-dynamic";

export const { GET } = defineRoute({
  method: "GET",
  path: "/api/admin/settings",
  tags: ["Administration"],
  summary: "Reglages du dispositif",
  access: "admin",
  responses: {
    "200": { description: "Reglages courants.", schema: SettingsSchema },
    ...AUTH_RESPONSES,
  },
  handler: () => getSettings(),
});

export const { PATCH } = defineRoute({
  method: "PATCH",
  path: "/api/admin/settings",
  tags: ["Administration"],
  summary: "Modifier les reglages",
  description:
    "Le nouveau seuil s'applique aux tentatives validees APRES la modification : les certifications deja delivrees ne sont pas recalculees.",
  access: "admin",
  body: UpdateSettingsBody,
  responses: {
    "200": { description: "Reglages mis a jour.", schema: SettingsSchema },
    ...VALIDATION_RESPONSE,
    ...AUTH_RESPONSES,
  },
  handler: ({ body }) => updateSettings(body),
});
