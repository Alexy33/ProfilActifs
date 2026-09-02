import { eq } from "drizzle-orm";
import { db } from "@/db";
import { profile, user } from "@/db/schema";
import { ApiError } from "@/server/http";
import { defineRoute } from "@/server/openapi/routes";
import { AUTH_RESPONSES, errorResponse } from "@/server/contracts/common";
import { MyProfileSchema, UpdateMyProfileBody } from "@/server/contracts/profile";
import { findProfileByUserId, replaceSkills } from "@/server/services/profiles";
import { resetVideoReview } from "@/server/services/video-moderation";
import { MIN_SIGNUP_AGE, ageOn } from "@/lib/vocabulary";

export const dynamic = "force-dynamic";

const PROFILE_NOT_FOUND = {
  "404": errorResponse("Aucun profil rattache a ce compte.", {
    error: { code: "not_found", message: "Aucun profil rattache a ce compte." },
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
    "Mise a jour partielle : n'envoyez que les champs modifies. Le statut de moderation, le score et les compteurs ne sont pas modifiables ici. `birthDate` n'est acceptee que si le compte n'en porte pas encore (regularisation des comptes anterieurs a la verification d'age).",
  access: "candidate",
  body: UpdateMyProfileBody,
  responses: {
    "200": { description: "Profil mis a jour.", schema: MyProfileSchema },
    ...PROFILE_VALIDATION,
    ...AUTH_RESPONSES,
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

    /* Regularisation d'un compte cree avant la verification d'age.
     *
     * Ecrite UNIQUEMENT si la colonne est encore vide : la date de naissance
     * se declare une fois. Sans ce garde-fou, la mesure serait contournable
     * dans les deux sens — se vieillir pour sortir du parcours mineur, ou se
     * rajeunir apres coup. */
    if (body.birthDate !== undefined) {
      const [account] = await db
        .select({ birthDate: user.birthDate })
        .from(user)
        .where(eq(user.id, session.user.id))
        .limit(1);

      if (account?.birthDate) {
        throw ApiError.unprocessable(
          "La date de naissance est déjà enregistrée et ne peut pas être modifiée ici.",
        );
      }

      const declared = new Date(`${body.birthDate}T00:00:00.000Z`);
      if (Number.isNaN(declared.getTime()) || declared.getTime() > Date.now()) {
        throw ApiError.unprocessable("Date de naissance invalide.");
      }
      if (ageOn(declared) < MIN_SIGNUP_AGE) {
        throw ApiError.unprocessable(
          `Le dispositif est réservé aux personnes de ${MIN_SIGNUP_AGE} ans et plus.`,
        );
      }

      await db
        .update(user)
        .set({ birthDate: declared, updatedAt: new Date() })
        .where(eq(user.id, session.user.id));
    }

    const { name: _name, skills, birthDate: _birthDate, ...columns } = body;
    if (Object.keys(columns).length > 0) {
      // Changer le lien video, c'est deposer une nouvelle video : elle
      // repasse en attente de validation (mesure Cabinet, point 2). Le champ
      // n'est reinitialise que s'il est REELLEMENT present dans la requete —
      // une mise a jour de la biographie ne doit pas depublier la video.
      const videoChanged =
        columns.videoUrl !== undefined && columns.videoUrl !== owned.ownVideoUrl;

      await db
        .update(profile)
        .set({
          ...columns,
          ...(videoChanged ? resetVideoReview() : {}),
          updatedAt: new Date(),
        })
        .where(eq(profile.id, owned.id));
    }

    if (skills) await replaceSkills(owned.id, skills);

    const updated = await findProfileByUserId(session.user.id);
    if (!updated) throw ApiError.notFound("Aucun profil rattache a ce compte.");
    return updated;
  },
});
