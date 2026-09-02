import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { MIN_SIGNUP_AGE, ageOn } from "@/lib/vocabulary";

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
    minPasswordLength: 4,
  },

  user: {
    additionalFields: {
      // Expose `role` sur la session pour que les gardes de routes n'aient
      // pas a refaire une requete en base a chaque rendu.
      role: {
        type: "string",
        required: false,
        defaultValue: "candidate",
        input: true,
      },

      /**
       * Date de naissance declarative (mesure Cabinet du 2026-09-02, point 1).
       *
       * Declaree en champ d'inscription pour que better-auth la persiste
       * lui-meme ; la verification d'age, elle, est faite dans le hook
       * `before` ci-dessous — un champ additionnel ne sait pas refuser.
       */
      birthDate: {
        type: "date",
        required: false,
        input: true,
      },
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 jours
    updateAge: 60 * 60 * 24, // prolonge la session au plus une fois par jour
  },

  databaseHooks: {
    user: {
      create: {
        /**
         * Le role est un champ d'inscription : il est donc choisi par le
         * CLIENT. Sans ce garde-fou, `POST /api/auth/sign-up/email` avec
         * `{"role":"admin"}` cree un administrateur — n'importe qui obtiendrait
         * la moderation et la gestion du bareme.
         *
         * L'inscription publique ne peut produire qu'un demandeur d'emploi ou
         * un recruteur ; les comptes d'administration sont crees en base
         * (cf. `src/db/seed.ts`), jamais par l'API.
         */
        before: async (data) => {
          const asked = (data as { role?: string }).role;
          const role = asked === "recruiter" ? "recruiter" : "candidate";

          /* Verification de l'age a l'inscription (mesure Cabinet du
           * 2026-09-02, point 1).
           *
           * Le blocage est pose ICI et non dans le formulaire : le client
           * peut etre contourne, `POST /api/auth/sign-up/email` est une route
           * publique. C'est le seul chemin de creation de compte, donc le
           * seul endroit ou la regle tient vraiment.
           *
           * En dessous de 16 ans, l'inscription est refusee et AUCUNE donnee
           * n'est ecrite : le compte n'est jamais cree. */
          const raw = (data as { birthDate?: unknown }).birthDate;
          const birthDate =
            raw instanceof Date ? raw : typeof raw === "string" ? new Date(raw) : null;

          if (!birthDate || Number.isNaN(birthDate.getTime())) {
            throw new APIError("BAD_REQUEST", {
              message: "La date de naissance est obligatoire pour créer un compte.",
            });
          }

          if (birthDate.getTime() > Date.now()) {
            throw new APIError("BAD_REQUEST", {
              message: "La date de naissance ne peut pas être dans le futur.",
            });
          }

          if (ageOn(birthDate) < MIN_SIGNUP_AGE) {
            throw new APIError("BAD_REQUEST", {
              message: `L'inscription est réservée aux personnes de ${MIN_SIGNUP_AGE} ans et plus.`,
            });
          }

          return { data: { ...data, role, birthDate } };
        },
        /**
         * Un compte candidat possede toujours un profil.
         *
         * Le creer ici plutot que dans une route d'inscription maison evite
         * qu'un compte puisse exister sans profil : l'espace demandeur n'a
         * alors aucun cas « profil manquant » a gerer. Il naît en `pending`,
         * donc invisible au catalogue tant que l'administration ne l'a pas
         * valide (CDC 2.1).
         */
        after: async (created) => {
          if ((created as { role?: string }).role !== "candidate") return;

          const { db } = await import("@/db");
          const { profile } = await import("@/db/schema");

          await db
            .insert(profile)
            .values({
              id: crypto.randomUUID(),
              userId: created.id,
              // Valeurs a completer par le candidat : le schema exige un
              // secteur et une ville, l'inscription ne les demande pas.
              title: "Intitulé à compléter",
              sector: "Numérique",
              city: "Paris",
            })
            .onConflictDoNothing();
        },
      },
    },
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
