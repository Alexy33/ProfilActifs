export const dynamic = "force-dynamic";

/**
 * Specification OpenAPI servie a Scalar (CDC 3.1 : "API RESTful documentee").
 * Ecrite a la main pour le socle. Quand les routes du domaine arriveront,
 * elle sera generee depuis les schemas Zod plutot que maintenue en double.
 */
const spec = {
  openapi: "3.1.0",
  info: {
    title: "ProfilsActifs — API",
    version: "0.1.0",
    description:
      "API du demonstrateur ProfilsActifs (Ministere du Job et Bonheur, JEB/DNI/2026-003).",
  },
  servers: [{ url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000" }],
  tags: [
    { name: "Systeme", description: "Sonde de sante et verification du socle." },
    { name: "Authentification", description: "Sessions better-auth (email + mot de passe)." },
  ],
  paths: {
    "/api/health": {
      get: {
        tags: ["Systeme"],
        summary: "Etat de l'application et de la base",
        responses: {
          "200": {
            description: "Application et base operationnelles",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", example: "ok" },
                    db: { type: "string", example: "up" },
                    ts: { type: "string", format: "date-time" },
                  },
                },
              },
            },
          },
          "503": { description: "Base injoignable" },
        },
      },
    },
    "/api/ping": {
      post: {
        tags: ["Systeme"],
        summary: "Ecrit une ligne en base (verification du socle)",
        description: "Route de demonstration : a supprimer avec la table `ping`.",
        responses: {
          "200": {
            description: "Nombre total de pings",
            content: {
              "application/json": {
                schema: { type: "object", properties: { total: { type: "integer" } } },
              },
            },
          },
        },
      },
    },
    "/api/auth/sign-up/email": {
      post: {
        tags: ["Authentification"],
        summary: "Creer un compte",
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
                },
              },
            },
          },
        },
        responses: { "200": { description: "Compte cree, session ouverte (cookie httpOnly)" } },
      },
    },
    "/api/auth/sign-in/email": {
      post: {
        tags: ["Authentification"],
        summary: "Ouvrir une session",
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
        responses: {
          "200": { description: "Session ouverte" },
          "401": { description: "Identifiants invalides" },
        },
      },
    },
    "/api/auth/get-session": {
      get: {
        tags: ["Authentification"],
        summary: "Session courante",
        responses: { "200": { description: "Session, ou null si non connecte" } },
      },
    },
  },
} as const;

export function GET() {
  return Response.json(spec);
}
