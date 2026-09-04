import { z } from "zod";
import {
  CITIES,
  CONTACT_STATUSES,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  PROFILE_STATUSES,
  SECTORS,
  SKILLS,
  USER_ROLES,
  VIDEO_STATUSES,
  mutable,
} from "@/lib/vocabulary";
import { named } from "../openapi/schemas";

/* --------------------------------------------------------------------------
 * Vocabulaires
 *
 * Nommes pour apparaitre une seule fois dans `components.schemas` : le front
 * peut generer un type `Sector` plutot que recopier sept chaines.
 * ----------------------------------------------------------------------- */

export const SectorSchema = named("Sector", z.enum(mutable(SECTORS)));
export const CitySchema = named("City", z.enum(mutable(CITIES)));
export const SkillSchema = named("Skill", z.enum(mutable(SKILLS)));
export const ProfileStatusSchema = named(
  "ProfileStatus",
  z.enum(mutable(PROFILE_STATUSES)).meta({
    description:
      "pending : cree, en attente de moderation. published : visible au catalogue. removed : retire par l'administration.",
  }),
);
export const VideoStatusSchema = named(
  "VideoStatus",
  z.enum(mutable(VIDEO_STATUSES)).meta({
    description:
      "pending : deposee, en attente de moderation — servie au seul titulaire et a l'administration. approved : diffusable. rejected : refusee, motif communique au candidat.",
  }),
);
export const ContactStatusSchema = named("ContactStatus", z.enum(mutable(CONTACT_STATUSES)));
export const UserRoleSchema = named("UserRole", z.enum(mutable(USER_ROLES)));

/* --------------------------------------------------------------------------
 * Erreurs
 * ----------------------------------------------------------------------- */

export const ApiErrorSchema = named(
  "ApiError",
  z
    .object({
      error: z.object({
        code: z.enum([
          "bad_request",
          "unauthorized",
          "forbidden",
          "not_found",
          "conflict",
          "unprocessable",
          "internal",
        ]),
        message: z.string(),
        details: z
          .array(z.object({ path: z.string(), message: z.string() }))
          .optional()
          .meta({ description: "Present uniquement sur les erreurs de validation." }),
      }),
    })
    .meta({ description: "Forme unique de toutes les reponses d'erreur de l'API." }),
);

/** Reponses d'erreur reutilisables dans les definitions de route. */
export const errorResponse = (description: string, example?: unknown) => ({
  description,
  schema: ApiErrorSchema,
  ...(example !== undefined ? { example } : {}),
});

export const ERROR_BODY = {
  unauthorized: {
    error: { code: "unauthorized", message: "Authentification requise." },
  },
  forbidden: {
    error: {
      code: "forbidden",
      message: "Cette ressource est reservee au role « candidate ».",
    },
  },
  notFound: {
    error: { code: "not_found", message: "Ressource introuvable." },
  },
} as const;

export const AUTH_RESPONSES = {
  "401": errorResponse("Aucune session valide.", ERROR_BODY.unauthorized),
  "403": errorResponse("Session valide, mais role insuffisant.", ERROR_BODY.forbidden),
} as const;

export const VALIDATION_RESPONSE = {
  "400": errorResponse("Parametres ou corps de requete invalides."),
} as const;

export const NOT_FOUND_RESPONSE = {
  "404": errorResponse("Ressource introuvable.", ERROR_BODY.notFound),
} as const;

/* --------------------------------------------------------------------------
 * Pagination
 * ----------------------------------------------------------------------- */

/**
 * `pageSize` est plafonne a 20 : le cahier des charges (3.4) interdit au
 * catalogue de servir davantage de profils d'un coup. La borne est ici, dans le
 * contrat, pour qu'elle apparaisse dans la documentation et soit refusee a
 * l'entree plutot que corrigee en silence.
 */
export const PaginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1).meta({ description: "Numero de page, a partir de 1." }),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_PAGE_SIZE)
    .default(DEFAULT_PAGE_SIZE)
    .meta({ description: `Nombre d'elements par page (plafond reglementaire : ${MAX_PAGE_SIZE}).` }),
});

export const PageMetaSchema = named(
  "PageMeta",
  z.object({
    page: z.number().int(),
    pageSize: z.number().int(),
    total: z.number().int().meta({ description: "Nombre total d'elements correspondant au filtre." }),
    totalPages: z.number().int(),
  }),
);

/** Construit le schema d'une page de resultats pour un type d'element donne. */
export function pageOf<T extends z.ZodType>(id: string, item: T) {
  return named(
    id,
    z.object({
      items: z.array(item),
      meta: PageMetaSchema,
    }),
  );
}

/** Booleen de query string : `?certified=true`. */
export const QueryBoolean = z
  .enum(["true", "false"])
  .transform((value) => value === "true");

/* --------------------------------------------------------------------------
 * Divers
 * ----------------------------------------------------------------------- */

export const OkSchema = named(
  "Ok",
  z.object({ ok: z.literal(true) }).meta({ description: "Accuse de reception sans contenu utile." }),
);

export const IdParam = z.object({
  id: z.string().min(1).meta({ description: "Identifiant de la ressource." }),
});

/**
 * Utilisateur porte par la session better-auth.
 *
 * Decrit ici pour que `/api/auth/*` puisse y faire reference : c'est la charge
 * utile que le front recoit a la connexion et sur `get-session`.
 */
export const SessionUserSchema = named(
  "SessionUser",
  z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    emailVerified: z.boolean(),
    image: z.string().nullable().optional(),
    role: UserRoleSchema,
  }),
);
