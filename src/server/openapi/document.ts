import { buildComponentSchemas } from "./schemas";
import { operationOf, registeredRoutes } from "./routes";
import { authPaths } from "./auth-paths";
import "./manifest";

/**
 * Assemble la specification OpenAPI 3.1 servie a Scalar.
 *
 * Rien n'est ecrit a la main ici : les chemins viennent des routes reellement
 * enregistrees (via l'import de `manifest`), les schemas du registre Zod. La
 * seule exception est `auth-paths`, qui documente les routes de better-auth —
 * elles sont produites par une bibliotheque et ne passent pas par `defineRoute`.
 */

const TAGS = [
  { name: "Systeme", description: "Sonde de sante et verification du socle." },
  { name: "Reference", description: "Vocabulaires fermes et compteurs publics." },
  {
    name: "Authentification",
    description:
      "Sessions better-auth (e-mail + mot de passe). Le cookie de session est httpOnly : le navigateur le pose et le renvoie seul, aucun jeton n'est a stocker cote front.",
  },
  { name: "Catalogue", description: "Consultation publique des profils publies (CDC 2.1, 3.4)." },
  {
    name: "Espace demandeur",
    description: "Gestion de son propre profil et de ses notifications (CDC 2.1, 2.3).",
  },
  { name: "Certification", description: "Questionnaire et badge JEB (CDC 2.2)." },
  {
    name: "Espace recruteur",
    description: "Favoris, prise de contact et suivi des candidats (CDC 2.1).",
  },
  {
    name: "Administration",
    description: "Moderation, gestion des questions et pilotage du dispositif (CDC 2.1).",
  },
];

export function buildOpenApiDocument() {
  const paths: Record<string, Record<string, unknown>> = {};

  for (const route of registeredRoutes()) {
    const entry = (paths[route.path] ??= {});
    entry[route.method.toLowerCase()] = operationOf(route);
  }

  // Les routes better-auth sont servies par un catch-all : on les decrit a la
  // main pour que le front voie l'ensemble de la surface au meme endroit.
  for (const [path, operations] of Object.entries(authPaths)) {
    paths[path] = { ...(paths[path] ?? {}), ...operations };
  }

  const sorted = Object.keys(paths)
    .sort()
    .reduce<Record<string, unknown>>((acc, key) => {
      acc[key] = paths[key];
      return acc;
    }, {});

  return {
    openapi: "3.1.0",
    info: {
      title: "ProfilsActifs — API",
      version: "0.2.0",
      description: [
        "API du demonstrateur ProfilsActifs (Ministere du Job et Bonheur, JEB/DNI/2026-003).",
        "",
        "**Authentification.** Les routes marquees d'un cadenas exigent une session.",
        "Ouvrez-en une via `POST /api/auth/sign-in/email` : le cookie httpOnly est pose",
        "automatiquement et accompagne les requetes suivantes. Depuis un front sur une",
        "autre origine, pensez a `credentials: \"include\"`.",
        "",
        "**Roles.** `candidate` (demandeur d'emploi), `recruiter`, `admin`. Une session",
        "valide mais d'un role insuffisant recoit 403, jamais 401.",
        "",
        "**Erreurs.** Toutes les reponses non-2xx suivent le schema `ApiError`.",
      ].join("\n"),
    },
    servers: [
      {
        url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
        description: "Environnement de developpement",
      },
    ],
    tags: TAGS,
    paths: sorted,
    components: {
      schemas: buildComponentSchemas(),
      securitySchemes: {
        sessionCookie: {
          type: "apiKey",
          in: "cookie",
          name: "better-auth.session_token",
          description:
            "Cookie de session pose par better-auth. En production (HTTPS) il est prefixe `__Secure-`.",
        },
      },
    },
  };
}
