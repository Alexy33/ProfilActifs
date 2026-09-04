import { eq } from "drizzle-orm";
import { db } from "@/db";
import { profile, user } from "@/db/schema";
import { ApiError } from "@/server/http";
import { defineRoute } from "@/server/openapi/routes";
import { AUTH_RESPONSES, errorResponse } from "@/server/contracts/common";
import { MyProfileSchema, UpdateMyProfileBody } from "@/server/contracts/profile";
import { findProfileByUserId, replaceSkills } from "@/server/services/profiles";
import {
  assertVideoConsent,
  MissingVideoConsentError,
  resetVideoModeration,
} from "@/server/services/video";

export const dynamic = "force-dynamic";

const PROFILE_NOT_FOUND = {
  "404": errorResponse("Aucun profil rattache a ce compte.", {
    error: { code: "not_found", message: "Aucun profil rattache a ce compte." },
  }),
} as const;

/**
 * Ce 403 remplace celui d'`AUTH_RESPONSES` sur cette route, et doit donc en
 * couvrir les deux causes : il se spread APRES lui. Documenter le seul cas du
 * role laisserait la specification muette sur le refus le plus probable ici.
 */
const CONSENT_REQUIRED = {
  "403": errorResponse("Role insuffisant, ou diffusion video sans consentement en cours.", {
    error: {
      code: "forbidden",
      message:
        "Aucun consentement en cours pour la diffusion de la video. " +
        "Acceptez le texte en vigueur avant de mettre une video en ligne ou d'en publier le lien.",
    },
  }),
} as const;

const PROFILE_VALIDATION = {
  "400": errorResponse("Corps de requete invalide.", {
    error: {
      code: "bad_request",
      message: "Parametres invalides (body).",
      details: [{ path: "body.title", message: "Too big: expected string to have <=120 characters" }],
    },
  }),
} as const;

export const { GET } = defineRoute({
  method: "GET",
  path: "/api/me/profile",
  tags: ["Espace demandeur"],
  summary: "Mon profil",
  description:
    "Le candidat voit exactement ce que voient les recruteurs, statut de moderation compris.",
  access: "candidate",
  responses: {
    "200": { description: "Profil du candidat connecte.", schema: MyProfileSchema },
    ...AUTH_RESPONSES,
    ...PROFILE_NOT_FOUND,
  },
  handler: async ({ session }) => {
    const owned = await findProfileByUserId(session.user.id);
    if (!owned) throw ApiError.notFound("Aucun profil rattache a ce compte.");
    return owned;
  },
});

export const { PATCH } = defineRoute({
  method: "PATCH",
  path: "/api/me/profile",
  tags: ["Espace demandeur"],
  summary: "Mettre a jour mon profil",
  description:
    "Mise a jour partielle : n'envoyez que les champs modifies. Le statut de moderation, le score et les compteurs ne sont pas modifiables ici.",
  access: "candidate",
  body: UpdateMyProfileBody,
  responses: {
    "200": { description: "Profil mis a jour.", schema: MyProfileSchema },
    ...PROFILE_VALIDATION,
    ...AUTH_RESPONSES,
    ...CONSENT_REQUIRED,
    ...PROFILE_NOT_FOUND,
  },
  handler: async ({ session, body }) => {
    const owned = await findProfileByUserId(session.user.id);
    if (!owned) throw ApiError.notFound("Aucun profil rattache a ce compte.");

    // Le nom appartient au compte, pas au profil : il vit dans la table `user`.
    if (body.name !== undefined) {
      await db
        .update(user)
        .set({ name: body.name, updatedAt: new Date() })
        .where(eq(user.id, session.user.id));
    }

    // Poser un lien video, c'est mettre en diffusion : meme garde que l'envoi
    // d'un fichier (R.3). Sans cette verification, un lien YouTube contournait
    // le consentement — l'octet vit ailleurs, mais l'image et la voix diffusees
    // sont les memes. Retirer le lien (`null`) reste toujours permis : on ne
    // demande pas d'accord pour cesser de diffuser.
    if (typeof body.videoUrl === "string" && body.videoUrl.trim() !== "") {
      try {
        await assertVideoConsent(owned.id);
      } catch (error) {
        if (error instanceof MissingVideoConsentError) throw ApiError.forbidden(error.message);
        throw error;
      }
    }

    const { name: _name, skills, ...columns } = body;
    if (Object.keys(columns).length > 0) {
      await db
        .update(profile)
        .set({ ...columns, updatedAt: new Date() })
        .where(eq(profile.id, owned.id));
    }

    if (skills) await replaceSkills(owned.id, skills);

    // Changer le lien de la video, c'est changer la video : la nouvelle repasse
    // en attente de moderation (R.2). Compare a la valeur courante pour qu'un
    // enregistrement du profil qui renvoie le meme lien n'annule pas une
    // validation deja obtenue.
    if (body.videoUrl !== undefined && body.videoUrl !== owned.videoUrl) {
      await resetVideoModeration(owned.id);
    }

    const updated = await findProfileByUserId(session.user.id);
    if (!updated) throw ApiError.notFound("Aucun profil rattache a ce compte.");
    return updated;
  },
});
