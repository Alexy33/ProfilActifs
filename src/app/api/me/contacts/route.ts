import { z } from "zod";
import { defineRoute } from "@/server/openapi/routes";
import { AUTH_RESPONSES } from "@/server/contracts/common";
import { ContactSchema } from "@/server/contracts/recruiter";
import { named } from "@/server/openapi/schemas";
import { listContacts } from "@/server/services/dashboard";

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
  handler: async ({ session }) => ({ items: await listContacts(session.user.id) }),
});
