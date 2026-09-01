/**
 * Description des routes better-auth.
 *
 * Elles sont servies par le catch-all `/api/auth/[...all]` et ne passent donc
 * pas par `defineRoute` : c'est le seul endroit du depot ou une portion de
 * specification est ecrite a la main. La contrepartie est qu'elle peut deriver
 * si better-auth change — le test `openapi.test.ts` verifie au moins que les
 * chemins repondent.
 */

const userResponse = {
  description: "Session ouverte. Le cookie httpOnly est pose sur la reponse.",
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: {
          token: { type: "string" },
          user: { $ref: "#/components/schemas/SessionUser" },
        },
      },
    },
  },
};

const authError = {
  description: "Identifiants invalides ou compte inexistant.",
  content: { "application/json": { schema: { type: "object" } } },
};

export const authPaths: Record<string, Record<string, unknown>> = {
  "/api/auth/sign-up/email": {
    post: {
      tags: ["Authentification"],
      summary: "Creer un compte",
      operationId: "authSignUpEmail",
      description:
        "Un compte `candidate` cree aussi un profil vide, en attente de moderation. Un compte `recruiter` n'en cree pas.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["email", "password", "name"],
              properties: {
                email: { type: "string", format: "email" },
                password: { type: "string", minLength: 4 },
                name: { type: "string" },
                role: { $ref: "#/components/schemas/UserRole" },
              },
            },
          },
        },
      },
      responses: { "200": userResponse, "400": authError },
    },
  },

  "/api/auth/sign-in/email": {
    post: {
      tags: ["Authentification"],
      summary: "Ouvrir une session",
      operationId: "authSignInEmail",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["email", "password"],
              properties: {
                email: { type: "string", format: "email" },
                password: { type: "string" },
              },
            },
          },
        },
      },
      responses: { "200": userResponse, "401": authError },
    },
  },

  "/api/auth/sign-out": {
    post: {
      tags: ["Authentification"],
      summary: "Fermer la session",
      operationId: "authSignOut",
      security: [{ sessionCookie: [] }],
      responses: { "200": { description: "Session fermee, cookie efface." } },
    },
  },

  "/api/auth/get-session": {
    get: {
      tags: ["Authentification"],
      summary: "Session courante",
      operationId: "authGetSession",
      description:
        "Renvoie `null` (et non 401) lorsqu'aucune session n'est ouverte : c'est la route que le front interroge au chargement.",
      security: [{ sessionCookie: [] }],
      responses: {
        "200": {
          description: "Session courante, ou null.",
          content: {
            "application/json": {
              schema: {
                type: ["object", "null"],
                properties: {
                  user: { $ref: "#/components/schemas/SessionUser" },
                  session: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      expiresAt: { type: "string", format: "date-time" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};
