import { z } from "zod";
import { named } from "../openapi/schemas";
import {
  CitySchema,
  ContactStatusSchema,
  ProfileStatusSchema,
  SectorSchema,
  SkillSchema,
} from "./common";

/**
 * Vocabulaires et bornes du dispositif, en une seule requete.
 *
 * Le front remplit ses listes deroulantes depuis ici plutot que de recopier les
 * valeurs : ajouter un secteur cote serveur le fait apparaitre dans l'interface
 * sans toucher au code front.
 */
export const ReferenceSchema = named(
  "Reference",
  z.object({
    sectors: z.array(SectorSchema),
    cities: z.array(CitySchema),
    skills: z.array(SkillSchema),
    profileStatuses: z.array(ProfileStatusSchema),
    contactStatuses: z.array(ContactStatusSchema),
    certificationThreshold: z.number().int(),
    catalogPageSize: z.number().int(),
    maxPageSize: z.number().int(),
  }),
);

/** Compteurs publics affiches sur la page d'accueil. */
export const PublicStatsSchema = named(
  "PublicStats",
  z.object({
    publishedProfiles: z.number().int(),
    certificationRate: z.number().int(),
    questionCount: z.number().int(),
    recruiterContacts: z.number().int(),
  }),
);
