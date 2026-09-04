import { eq } from "drizzle-orm";
import { db } from "@/db";
import { profile, user } from "@/db/schema";
import { auth } from "@/lib/auth";
import { ApiError } from "@/server/http";
import { defineRoute } from "@/server/openapi/routes";
import { errorResponse, VALIDATION_RESPONSE } from "@/server/contracts/common";
import { RegisterBody, RegisteredSchema } from "@/server/contracts/register";
import { createCompany, isSirenTaken } from "@/server/services/companies";

export const dynamic = "force-dynamic";

/**
 * Inscription, un role a la fois (CDC 3.1).
 *
 * Pourquoi une route maison plutot que `POST /api/auth/sign-up/email` en direct
 * depuis le navigateur : un recruteur ne se resume pas a un compte. Il declare
 * une entreprise, et cette declaration doit etre validee et ecrite dans la
 * MEME requete que la creation du compte. Deux appels successifs depuis le
 * client laisseraient exister un recruteur sans entreprise des que le second
 * echoue — c'est-a-dire quelqu'un qui contacte des candidats sans qu'on sache
 * au nom de qui.
 *
 * La creation du compte elle-meme reste deleguee a better-auth
 * (`auth.api.signUpEmail`) : le hachage du mot de passe, la session et le
 * controle d'age du hook `before` ne sont pas reecrits ici.
 */

const CONFLICT_RESPONSE = {
  "409": errorResponse("Adresse e-mail ou SIREN deja utilise.", {
    error: { code: "conflict", message: "Un compte existe deja avec cette adresse e-mail." },
  }),
} as const;

export const { POST } = defineRoute({
  method: "POST",
  path: "/api/register",
  tags: ["Authentification"],
  summary: "Creer un compte",
  description: [
    "Cree un compte **demandeur d'emploi** ou **recruteur**, et ouvre la session.",
    "",
    "Le corps est discrimine par `role` : un recruteur DOIT declarer son",
    "entreprise (raison sociale, SIREN, adresse, secteur, et le poste qu'il y",
    "occupe), un candidat ne le peut pas. Le SIREN est normalise puis verifie",
    "par sa cle de Luhn, et reste unique dans le dispositif.",
    "",
    "Le role `admin` n'est pas accessible : les comptes d'administration sont",
    "crees en base, jamais par l'API.",
  ].join("\n"),
  body: RegisterBody,
  successStatus: 201,
  responses: {
    "201": { description: "Compte cree, session ouverte.", schema: RegisteredSchema },
    ...VALIDATION_RESPONSE,
    ...CONFLICT_RESPONSE,
  },
  handler: async ({ body, request }) => {
    // Le SIREN est verifie AVANT la creation du compte : sinon la contrainte
    // d'unicite refuserait l'entreprise apres que l'utilisateur existe deja.
    if (body.role === "recruiter" && (await isSirenTaken(body.company.siren))) {
      throw ApiError.conflict(
        "Ce SIREN est deja declare par un autre compte. Rapprochez-vous de la personne qui gere l'espace de votre entreprise.",
      );
    }

    let created: { id: string; email: string };
    try {
      const result = await auth.api.signUpEmail({
        body: {
          name: body.name,
          email: body.email,
          password: body.password,
          birthDate: body.birthDate,
        },
        headers: request.headers,
        // Sans cela, better-auth rend l'utilisateur mais les en-tetes
        // `Set-Cookie` restent dans son contexte : le compte serait cree sans
        // que la session s'ouvre.
        asResponse: false,
      });
      created = { id: result.user.id, email: result.user.email };
    } catch (error) {
      // better-auth leve une APIError pour un e-mail deja pris. On ne recopie
      // pas son message tel quel : il est en anglais et parle de « user ».
      const status = (error as { statusCode?: number }).statusCode;
      if (status === 400 || status === 422) {
        const message = (error as { body?: { message?: string } }).body?.message ?? "";
        if (/exist/i.test(message)) {
          throw ApiError.conflict("Un compte existe deja avec cette adresse e-mail.");
        }
        throw ApiError.badRequest(message || "Inscription refusee.");
      }
      throw error;
    }

    if (body.role === "candidate") {
      return { id: created.id, email: created.email, role: "candidate" as const };
    }

    /**
     * Passage en recruteur, apres coup et non a la creation.
     *
     * `role` est declare `input: false` cote better-auth : aucun appelant ne
     * peut se promouvoir par `POST /api/auth/sign-up/email`. C'est voulu, et
     * cela vaut aussi pour nous — d'ou la mise a jour explicite ici, une fois
     * l'entreprise acceptee. Le hook de creation a fabrique un profil candidat
     * en chemin : il est supprime, un recruteur n'en a pas.
     */
    try {
      await createCompany(created.id, body.company);
    } catch (error) {
      // L'entreprise est la raison d'etre du compte recruteur : si elle n'entre
      // pas, le compte ne doit pas rester. On efface ce qu'on vient de creer
      // plutot que de laisser un recruteur anonyme.
      await db.delete(user).where(eq(user.id, created.id));
      throw error;
    }

    await db.update(user).set({ role: "recruiter", updatedAt: new Date() }).where(eq(user.id, created.id));
    await db.delete(profile).where(eq(profile.userId, created.id));

    return { id: created.id, email: created.email, role: "recruiter" as const };
  },
});
