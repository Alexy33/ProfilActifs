import { z } from "zod";
import { named } from "../openapi/schemas";
import { MINIMUM_AGE, isAllowedToRegister } from "@/lib/age";
import { isValidSiren, normalizeSiren } from "@/lib/siren";
import { SectorSchema } from "./common";

/* --------------------------------------------------------------------------
 * Inscription (CDC 3.1 : authentification multi-roles)
 *
 * Un compte se cree soit en demandeur d'emploi, soit en recruteur. Le second
 * declare l'entreprise pour laquelle il agit : contacter des candidats au nom
 * d'une personne morale suppose de dire laquelle.
 * ----------------------------------------------------------------------- */

/** Champs communs aux deux roles. */
const identity = {
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().toLowerCase().email().max(255),
  password: z.string().min(8).max(200),
  /**
   * Date civile « AAAA-MM-JJ ». Le controle des 16 ans (R.1) est porte par le
   * contrat ET par le hook better-auth : le premier donne un message utile a
   * l'inscription, le second tient meme si un appelant court-circuite cette
   * route.
   */
  birthDate: z
    .string()
    .trim()
    .refine(isAllowedToRegister, {
      message: `L'inscription est reservee aux personnes de ${MINIMUM_AGE} ans et plus.`,
    })
    .meta({ description: "Date de naissance declarative, « AAAA-MM-JJ »." }),
};

/**
 * Entreprise declaree par un recruteur.
 *
 * Le SIREN est normalise AVANT d'etre valide et stocke : « 552 100 554 » et
 * « 552100554 » designent la meme entreprise, et la contrainte d'unicite en
 * base ne le sait pas. Sans cette normalisation, deux comptes pourraient
 * declarer le meme numero ecrit differemment.
 */
export const CompanyInputSchema = named(
  "CompanyInput",
  z.object({
    name: z
      .string()
      .trim()
      .min(1)
      .max(200)
      .meta({ description: "Raison sociale de l'entreprise." }),
    siren: z
      .string()
      .transform(normalizeSiren)
      .refine(isValidSiren, {
        message: "SIREN invalide : neuf chiffres, cle de Luhn verifiee.",
      })
      .meta({ description: "Neuf chiffres. Les espaces et tirets sont acceptes a la saisie." }),
    position: z
      .string()
      .trim()
      .min(1)
      .max(120)
      .meta({ description: "Poste occupe par la personne AU SEIN de l'entreprise." }),
    address: z.string().trim().min(1).max(200).meta({ description: "Adresse (voie)." }),
    postalCode: z
      .string()
      .trim()
      .regex(/^\d{5}$/, "Code postal invalide : cinq chiffres attendus.")
      .meta({ description: "Code postal a cinq chiffres." }),
    city: z.string().trim().min(1).max(120).meta({ description: "Commune de l'etablissement." }),
    sector: SectorSchema.meta({ description: "Secteur d'activite, meme vocabulaire que les profils." }),
    phone: z
      .string()
      .trim()
      .max(30)
      .optional()
      .meta({ description: "Telephone professionnel. Facultatif." }),
    website: z
      .string()
      .trim()
      .max(200)
      .optional()
      .meta({ description: "Site de l'entreprise. Facultatif." }),
  }),
);

/**
 * Corps d'inscription, discrimine par le role.
 *
 * Une union et non un objet a champs optionnels : c'est ce qui rend impossible
 * une inscription recruteur sans entreprise, ou une inscription candidat qui
 * trainerait un SIREN. Le refus est alors une erreur de validation lisible,
 * pas une ligne incomplete en base.
 */
export const RegisterBody = named(
  "RegisterInput",
  z.discriminatedUnion("role", [
    z.object({ role: z.literal("candidate"), ...identity }),
    z.object({ role: z.literal("recruiter"), ...identity, company: CompanyInputSchema }),
  ]),
);

/** Entreprise telle qu'elle est servie : la forme d'entree, plus les dates. */
export const CompanySchema = named(
  "Company",
  CompanyInputSchema.extend({
    id: z.string(),
    phone: z.string().nullable(),
    website: z.string().nullable(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  }),
);

/** Mise a jour de sa propre entreprise : partielle, comme le profil candidat. */
export const UpdateCompanyBody = named(
  "UpdateCompanyInput",
  CompanyInputSchema.partial().meta({
    description: "N'envoyez que les champs modifies. Le SIREN reste modifiable, mais unique.",
  }),
);

/** Reponse d'inscription : de quoi rediriger, rien de plus. */
export const RegisteredSchema = named(
  "Registered",
  z.object({
    id: z.string(),
    email: z.string(),
    role: z.enum(["candidate", "recruiter"]),
  }),
);
