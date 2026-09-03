import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { MINIMUM_AGE, isAllowedToRegister } from "@/lib/age";

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

      /**
       * Date de naissance declarative (R.1). `input: true` : c'est le seul
       * champ additionnel que le client a le droit de fournir, parce que
       * l'inscription DOIT le demander. Sa validite est verifiee dans le hook
       * `before` ci-dessous — un champ additionnel n'est pas valide par
       * better-auth au-dela de son type.
       */
      birthDate: {
        type: "string",
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

          /**
           * Blocage strict des moins de 16 ans (R.1, courrier Pontaillac).
           *
           * Ici et pas seulement dans le formulaire : le formulaire est du
           * JavaScript que n'importe qui contourne avec un `curl` sur
           * `POST /api/auth/sign-up/email`. Un controle qui ne vit que dans le
           * navigateur n'est pas un controle.
           *
           * Une date absente ou illisible est refusee au meme titre qu'une date
           * trop recente : sans date, l'age n'est pas verifie, et le blocage
           * demande est strict.
           */
          const birthDate = (data as { birthDate?: unknown }).birthDate;
          const declared = typeof birthDate === "string" ? birthDate.trim() : "";

          if (!isAllowedToRegister(declared)) {
            throw new APIError("BAD_REQUEST", {
              message:
                `L'inscription est reservee aux personnes de ${MINIMUM_AGE} ans et plus. ` +
                "Indiquez une date de naissance valide.",
            });
          }

          return { data: { ...data, role, birthDate: declared } };
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
  // Le port n'est pas toujours 3000 : l'artefact de build se lance sur le PORT
  // qu'on lui donne. On declare donc aussi l'origine derivee de PORT, sinon la
  // connexion repond 403 des qu'on sort du port par defaut.
  trustedOrigins: Array.from(
    new Set([
      process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      `http://localhost:${process.env.PORT ?? 3000}`,
      `http://127.0.0.1:${process.env.PORT ?? 3000}`,
    ]),
  ),

  advanced: {
    // Cookie httpOnly + SameSite=Lax par defaut ; Secure des que l'app est
    // servie en HTTPS.
    //
    // On se cale sur le SCHEMA REEL de baseURL, pas sur NODE_ENV : le serveur
    // standalone force NODE_ENV=production, et un cookie « Secure » est
    // silencieusement ignore par le navigateur en http://. L'artefact de build
    // lance en local acceptait donc la connexion (200) sans jamais ouvrir de
    // session. En HTTPS le comportement est inchange.
    // `BETTER_AUTH_SECURE_COOKIES=1` force le comportement si un jour l'app est
    // servie en HTTPS par un proxy alors que BETTER_AUTH_URL reste en http://.
    useSecureCookies:
      process.env.BETTER_AUTH_SECURE_COOKIES === "1" ||
      (process.env.BETTER_AUTH_URL ?? "").startsWith("https://"),
  },

  // Doit rester le DERNIER plugin : il pose les cookies sur la reponse
  // Next.js une fois les autres plugins passes.
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
export type AuthUser = Session["user"];
