import { ApiError } from "@/server/http";
import { defineRoute } from "@/server/openapi/routes";
import { AUTH_RESPONSES, errorResponse } from "@/server/contracts/common";
import { VideoConsentNoticeSchema, VideoConsentSchema } from "@/server/contracts/profile";
import { findProfileByUserId } from "@/server/services/profiles";
import { grantVideoConsent, revokeVideoConsent } from "@/server/services/video";
import { VIDEO_CONSENT_TEXT, VIDEO_CONSENT_VERSION } from "@/lib/vocabulary";

export const dynamic = "force-dynamic";

const PROFILE_NOT_FOUND = {
  "404": errorResponse("Aucun profil rattache a ce compte.", {
    error: { code: "not_found", message: "Aucun profil rattache a ce compte." },
  }),
} as const;

/** Le titulaire, ou 404 : le consentement ne se lit et ne s'ecrit que sur son propre profil. */
async function ownProfileId(userId: string): Promise<string> {
  const owned = await findProfileByUserId(userId);
  if (!owned) throw ApiError.notFound("Aucun profil rattache a ce compte.");
  return owned.id;
}

function toJson(consent: {
  granted: boolean;
  grantedAt: Date | null;
  version: string | null;
  revokedAt: Date | null;
}) {
  return {
    granted: consent.granted,
    grantedAt: consent.grantedAt?.toISOString() ?? null,
    version: consent.version,
    revokedAt: consent.revokedAt?.toISOString() ?? null,
  };
}

export const { GET } = defineRoute({
  method: "GET",
  path: "/api/me/profile/video/consent",
  tags: ["Espace demandeur"],
  summary: "Texte de consentement en vigueur et etat de mon accord",
  description:
    "Renvoie la redaction actuellement soumise, sa version, et ou en est le consentement du candidat connecte.",
  access: "candidate",
  responses: {
    "200": { description: "Texte en vigueur et etat de l'accord.", schema: VideoConsentNoticeSchema },
    ...AUTH_RESPONSES,
    ...PROFILE_NOT_FOUND,
  },
  handler: async ({ session }) => {
    const owned = await findProfileByUserId(session.user.id);
    if (!owned) throw ApiError.notFound("Aucun profil rattache a ce compte.");
    return {
      version: VIDEO_CONSENT_VERSION,
      text: VIDEO_CONSENT_TEXT,
      consent: owned.videoConsent,
    };
  },
});

export const { POST } = defineRoute({
  method: "POST",
  path: "/api/me/profile/video/consent",
  tags: ["Espace demandeur"],
  summary: "Donner mon consentement a la diffusion video",
  description:
    "Enregistre l'accord avec son horodatage et la version du texte en vigueur. La version n'est pas fournie par le client : le serveur enregistre celle qu'il a effectivement affichee.",
  access: "candidate",
  responses: {
    "200": { description: "Consentement enregistre.", schema: VideoConsentSchema },
    ...AUTH_RESPONSES,
    ...PROFILE_NOT_FOUND,
  },
  handler: async ({ session }) => toJson(await grantVideoConsent(await ownProfileId(session.user.id))),
});

export const { DELETE } = defineRoute({
  method: "DELETE",
  path: "/api/me/profile/video/consent",
  tags: ["Espace demandeur"],
  summary: "Retirer mon consentement a la diffusion video",
  description:
    "Retire l'accord ET supprime physiquement le fichier video du stockage, par le meme service que la suppression d'un profil. Le profil n'est pas masque : il subsiste sans video. La date de l'accord et la version acceptee restent enregistrees, comme trace de ce qui avait ete consenti.",
  access: "candidate",
  responses: {
    "200": { description: "Consentement retire, video supprimee du stockage.", schema: VideoConsentSchema },
    ...AUTH_RESPONSES,
    ...PROFILE_NOT_FOUND,
  },
  handler: async ({ session }) => toJson(await revokeVideoConsent(await ownProfileId(session.user.id))),
});
