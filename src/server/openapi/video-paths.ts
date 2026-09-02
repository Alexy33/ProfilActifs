const myProfile = {
  description: "Profil du candidat, `videoUrl` mis à jour.",
  content: { "application/json": { schema: { $ref: "#/components/schemas/MyProfile" } } },
};

const apiError = (description: string) => ({
  description,
  content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } },
});

export const videoPaths: Record<string, Record<string, unknown>> = {
  "/api/me/profile/video": {
    put: {
      tags: ["Espace demandeur"],
      summary: "Téléverser ma vidéo de présentation",
      operationId: "putMeProfileVideo",
      description: [
        "Upload direct (CDC §3.2). Le corps de la requête est le fichier lui-même ;",
        "`Content-Type` porte son type. Plafond : **100 Mo**, appliqué en streaming",
        "(la requête n'est jamais bufferisée entièrement).",
        "",
        "Après succès, `videoUrl` pointe vers `GET /api/videos/{profileId}`.",
        "",
        "**Modération a priori** : tout dépôt place la vidéo en `pending`. Elle",
        "n'est servie ni au public ni aux recruteurs tant qu'un administrateur",
        "ne l'a pas validée (`PATCH /api/admin/videos/{id}`). Remplacer une",
        "vidéo déjà validée la replace en attente.",
      ].join("\n"),
      security: [{ sessionCookie: [] }],
      requestBody: {
        required: true,
        content: {
          "video/mp4": { schema: { type: "string", format: "binary" } },
          "video/webm": { schema: { type: "string", format: "binary" } },
          "video/ogg": { schema: { type: "string", format: "binary" } },
          "video/quicktime": { schema: { type: "string", format: "binary" } },
        },
      },
      responses: {
        "200": myProfile,
        "400": apiError("Corps de requête vide."),
        "401": apiError("Aucune session."),
        "403": apiError("Session valide mais rôle ≠ candidate."),
        "404": apiError("Aucun profil rattaché au compte."),
        "422": apiError("Fichier > 100 Mo, ou type non pris en charge (Content-Type)."),
      },
    },
    delete: {
      tags: ["Espace demandeur"],
      summary: "Retirer ma vidéo de présentation",
      operationId: "deleteMeProfileVideo",
      description:
        "Supprime le fichier, remet `videoUrl` à `null` et réinitialise l'état de modération. Idempotent.",
      security: [{ sessionCookie: [] }],
      responses: {
        "200": myProfile,
        "401": apiError("Aucune session."),
        "403": apiError("Session valide mais rôle ≠ candidate."),
        "404": apiError("Aucun profil rattaché au compte."),
      },
    },
  },

  "/api/videos/{id}": {
    get: {
      tags: ["Catalogue"],
      summary: "Lire la vidéo d'un profil",
      operationId: "getVideosById",
      description: [
        "Sert le fichier téléversé. Gère l'en-tête `Range` : réponse **206 Partial",
        "Content** avec `Content-Range` quand le lecteur cherche dans la timeline",
        "(CDC §3.2, prévisionnement sans quitter la page).",
        "",
        "**Accès restreint.** Le fichier n'est servi publiquement que si les trois",
        "conditions sont réunies : profil `published`, vidéo `approved`, et",
        "titulaire majeur. Sinon, seuls le titulaire et un administrateur y",
        "accèdent ; tout autre appelant reçoit **404**, y compris en connaissant",
        "l'adresse directe.",
      ].join("\n"),
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          description: "Identifiant du profil (`profile.id`).",
          schema: { type: "string" },
        },
        {
          name: "Range",
          in: "header",
          required: false,
          description: "Ex. `bytes=0-1048575`. Déclenche une réponse 206.",
          schema: { type: "string" },
        },
      ],
      responses: {
        "200": {
          description: "Fichier complet.",
          headers: {
            "Accept-Ranges": { schema: { type: "string" }, description: "`bytes`" },
            "Content-Length": { schema: { type: "integer" } },
          },
          content: {
            "video/mp4": { schema: { type: "string", format: "binary" } },
            "video/webm": { schema: { type: "string", format: "binary" } },
            "video/ogg": { schema: { type: "string", format: "binary" } },
            "video/quicktime": { schema: { type: "string", format: "binary" } },
          },
        },
        "206": {
          description: "Fragment demandé via `Range`.",
          headers: {
            "Content-Range": { schema: { type: "string" }, description: "Ex. `bytes 0-1048575/5242880`" },
            "Accept-Ranges": { schema: { type: "string" } },
            "Content-Length": { schema: { type: "integer" } },
          },
          content: { "video/mp4": { schema: { type: "string", format: "binary" } } },
        },
        "404": apiError(
          "Profil inconnu, vidéo absente, vidéo non validée, profil non publié, ou titulaire mineur.",
        ),
      },
    },
  },
};
