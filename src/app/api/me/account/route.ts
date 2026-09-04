import { eq } from "drizzle-orm";
import { db } from "@/db";
import { profile, user } from "@/db/schema";
import { ApiError } from "@/server/http";
import { defineRoute } from "@/server/openapi/routes";
import { AUTH_RESPONSES, OkSchema } from "@/server/contracts/common";
import { deleteProfileVideo } from "@/server/services/video";

export const dynamic = "force-dynamic";

/**
 * Effacement du compte par son titulaire (R.5).
 *
 * Cette route existe parce que les CGU l'annoncent. Un droit d'effacement qui
 * suppose d'ecrire a une adresse et d'attendre qu'un administrateur agisse
 * n'est pas le meme droit : on le documente ici pour qu'il soit exerçable
 * depuis l'espace personnel, sans intermediaire.
 *
 * La suppression est definitive et immediate. Les cles etrangeres sont en
 * `ON DELETE CASCADE` : la ligne `user` emporte profil, competences,
 * entreprise, sessions (donc le journal de connexion du compte), comptes
 * d'authentification, notifications, tentatives de certification, favoris et
 * prises de contact. Le FICHIER video est efface d'abord, parce qu'il vit sur
 * le disque et qu'aucune cascade ne l'atteint.
 */
export const { DELETE } = defineRoute({
  method: "DELETE",
  path: "/api/me/account",
  tags: ["Authentification"],
  summary: "Supprimer mon compte",
  description:
    "Efface definitivement le compte et tout ce qui en depend : profil, video, entreprise, sessions, notifications, tentatives de certification, favoris et prises de contact. Sans effet retardateur et sans confirmation par courriel : la requete suffit.",
  access: "authenticated",
  responses: {
    "200": { description: "Compte supprime.", schema: OkSchema },
    ...AUTH_RESPONSES,
  },
  handler: async ({ session }) => {
    const [owned] = await db
      .select({ id: profile.id })
      .from(profile)
      .where(eq(profile.userId, session.user.id))
      .limit(1);

    // Le fichier avant la base : dans l'ordre inverse, une erreur laisserait un
    // fichier orphelin qu'aucune ligne ne rattache plus a personne.
    if (owned) await deleteProfileVideo(owned.id);

    const deleted = await db
      .delete(user)
      .where(eq(user.id, session.user.id))
      .returning({ id: user.id });

    if (deleted.length === 0) throw ApiError.notFound("Ce compte n'existe plus.");

    return { ok: true as const };
  },
});
