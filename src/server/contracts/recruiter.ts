import { z } from "zod";
import { named } from "../openapi/schemas";
import { ContactStatusSchema } from "./common";
import { ProfileCardSchema } from "./profile";

/** Ligne de suivi d'un candidat contacte, cote recruteur. */
export const ContactSchema = named(
  "Contact",
  z.object({
    id: z.string(),
    profile: ProfileCardSchema,
    message: z.string(),
    status: ContactStatusSchema,
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  }),
);

export const FavoriteSchema = named(
  "Favorite",
  z.object({
    profile: ProfileCardSchema,
    createdAt: z.iso.datetime(),
  }),
);

export const SendContactBody = named(
  "SendContactInput",
  z.object({
    message: z.string().trim().min(1).max(2000),
  }),
);

export const UpdateContactBody = named(
  "UpdateContactInput",
  z.object({
    status: ContactStatusSchema,
  }),
);

/** Compteurs du tableau de bord recruteur. */
export const RecruiterStatsSchema = named(
  "RecruiterStats",
  z.object({
    contacted: z.number().int(),
    favorites: z.number().int(),
    interviewsPlanned: z.number().int(),
  }),
);

/* --- Notifications ------------------------------------------------------- */

export const NotificationSchema = named(
  "Notification",
  z.object({
    id: z.string(),
    type: z.enum(["contact", "moderation", "certification"]),
    text: z.string(),
    read: z.boolean(),
    createdAt: z.iso.datetime(),
  }),
);
