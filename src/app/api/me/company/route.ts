import { ApiError } from "@/server/http";
import { defineRoute } from "@/server/openapi/routes";
import { AUTH_RESPONSES, NOT_FOUND_RESPONSE, VALIDATION_RESPONSE } from "@/server/contracts/common";
import { CompanySchema, UpdateCompanyBody } from "@/server/contracts/register";
import { findCompanyByUserId, isSirenTaken, updateCompany } from "@/server/services/companies";

export const dynamic = "force-dynamic";

/**
 * L'entreprise du recruteur connecte.
 *
 * Reservee au role `recruiter` : c'est une donnee de son espace, pas une fiche
 * publique. Un candidat n'a pas a lire le SIREN ni l'adresse d'une entreprise
 * par cette route ; ce qu'il voit d'un recruteur passe par la prise de contact.
 */

const COMPANY_NOT_FOUND = {
  "404": {
    ...NOT_FOUND_RESPONSE["404"],
    description: "Aucune entreprise rattachee a ce compte.",
  },
} as const;

export const { GET } = defineRoute({
  method: "GET",
  path: "/api/me/company",
  tags: ["Espace recruteur"],
  summary: "Mon entreprise",
  description: "Les informations declarees a l'inscription du compte recruteur.",
  access: "recruiter",
  responses: {
    "200": { description: "Entreprise du recruteur connecte.", schema: CompanySchema },
    ...AUTH_RESPONSES,
    ...COMPANY_NOT_FOUND,
  },
  handler: async ({ session }) => {
    const found = await findCompanyByUserId(session.user.id);
    if (!found) throw ApiError.notFound("Aucune entreprise rattachee a ce compte.");
    return found;
  },
});

export const { PATCH } = defineRoute({
  method: "PATCH",
  path: "/api/me/company",
  tags: ["Espace recruteur"],
  summary: "Mettre a jour mon entreprise",
  description:
    "Mise a jour partielle : n'envoyez que les champs modifies. Le SIREN reste unique dans le dispositif.",
  access: "recruiter",
  body: UpdateCompanyBody,
  responses: {
    "200": { description: "Entreprise mise a jour.", schema: CompanySchema },
    ...VALIDATION_RESPONSE,
    ...AUTH_RESPONSES,
    ...COMPANY_NOT_FOUND,
  },
  handler: async ({ session, body }) => {
    if (body.siren && (await isSirenTaken(body.siren, session.user.id))) {
      throw ApiError.conflict("Ce SIREN est deja declare par un autre compte.");
    }

    const updated = await updateCompany(session.user.id, body);
    if (!updated) throw ApiError.notFound("Aucune entreprise rattachee a ce compte.");
    return updated;
  },
});
