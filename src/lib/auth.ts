import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import * as schema from "@/db/schema";

/**
 * Instance better-auth cote serveur. Seule source de verite pour les
 * sessions : ne jamais lire le cookie a la main ailleurs dans l'app.
 */
export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema,
  }),

  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",

  emailAndPassword: {
    enabled: true,
    // Pas d'envoi de mail dans le demonstrateur : un compte est utilisable
    // des sa creation (CDC : aucune exigence de verification par e-mail).
    requireEmailVerification: false,
    minPasswordLength: 8,
  },

  user: {
    additionalFields: {
      // Expose `role` sur la session pour que les gardes de routes n'aient
      // pas a refaire une requete en base a chaque rendu.
      role: {
        type: "string",
        required: false,
        defaultValue: "candidate",
        input: false,
      },
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 jours
    updateAge: 60 * 60 * 24, // prolonge la session au plus une fois par jour
  },

  // better-auth >= 1.7 refuse toute requete dont l'en-tete Origin ne
  // correspond pas a baseURL (protection CSRF). localhost et 127.0.0.1 sont
  // deux origines distinctes : il faut declarer celles qui sont legitimes,
  // sinon les tests e2e et les appels depuis le conteneur repondent 403.
  trustedOrigins: [
    process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ],

  advanced: {
    // Cookie httpOnly + SameSite=Lax par defaut ; Secure des que l'app est
    // servie en HTTPS.
    useSecureCookies: process.env.NODE_ENV === "production",
  },

  // Doit rester le DERNIER plugin : il pose les cookies sur la reponse
  // Next.js une fois les autres plugins passes.
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
export type AuthUser = Session["user"];
