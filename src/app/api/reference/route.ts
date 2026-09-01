import { defineRoute } from "@/server/openapi/routes";
import { ReferenceSchema } from "@/server/contracts/reference";
import { getSettings } from "@/server/services/settings";
import { CITIES, CONTACT_STATUSES, MAX_PAGE_SIZE, PROFILE_STATUSES, SECTORS, SKILLS } from "@/lib/vocabulary";

export const dynamic = "force-dynamic";

export const { GET } = defineRoute({
  method: "GET",
  path: "/api/reference",
  tags: ["Reference"],
  summary: "Vocabulaires et bornes du dispositif",
  description:
    "A appeler une fois au demarrage du front pour alimenter les listes deroulantes. Evite de recopier secteurs, villes et competences dans le code client.",
  responses: {
    "200": { description: "Vocabulaires fermes et reglages courants.", schema: ReferenceSchema },
  },
  handler: async () => {
    const settings = await getSettings();
    return {
      sectors: [...SECTORS],
      cities: [...CITIES],
      skills: [...SKILLS],
      profileStatuses: [...PROFILE_STATUSES],
      contactStatuses: [...CONTACT_STATUSES],
      certificationThreshold: settings.certificationThreshold,
      catalogPageSize: settings.catalogPageSize,
      maxPageSize: MAX_PAGE_SIZE,
    };
  },
});
