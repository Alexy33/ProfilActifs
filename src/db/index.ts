import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

// "file:/data/profilsactifs.db" -> "/data/profilsactifs.db"
// better-sqlite3 attend un chemin brut, pas une URL.
const dbPath = (process.env.DATABASE_URL ?? "file:./local.db").replace(/^file:/, "");

function connect() {
  const sqlite = new Database(dbPath);

  // WAL : lectures concurrentes pendant une ecriture. Cree deux fichiers
  // voisins (.db-wal, .db-shm) : ils doivent etre sur le meme volume que la
  // base, d'ou un repertoire /data dedie et non un fichier monte tout seul.
  sqlite.pragma("journal_mode = WAL");

  // Attente avant erreur "SQLITE_BUSY" si une ecriture est deja en cours.
  sqlite.pragma("busy_timeout = 5000");

  // SQLite ne verifie PAS les cles etrangeres par defaut : a activer sur
  // chaque connexion.
  sqlite.pragma("foreign_keys = ON");

  return drizzle(sqlite, { schema });
}

let instance: ReturnType<typeof connect> | null = null;

/**
 * Connexion paresseuse, exposee derriere un Proxy.
 *
 * Ouvrir la base a l'import casserait `next build` : plusieurs workers de
 * compilation chargent les routes en parallele et se disputent le meme
 * fichier SQLite (SQLITE_BUSY). Ici, rien n'est ouvert tant qu'une requete
 * n'a pas reellement lieu. L'usage reste identique : `db.select()...`.
 *
 * `drizzleAdapter` (better-auth) lit `db._?.schema` AU MOMENT DE L'APPEL,
 * pour indexer les relations Drizzle. Cette seule lecture suffisait a ouvrir
 * la base des qu'un module important `@/lib/auth` etait charge — donc pendant
 * la collecte des pages du build, en parallele, d'ou le SQLITE_BUSY.
 *
 * `_` est donc servi sans connexion. Renvoyer `undefined` est exact et non un
 * contournement : le schema (src/db/schema.ts) ne declare aucune relation
 * Drizzle, et l'adaptateur traite ce cas (`relationRegistry ?? {}`). Le
 * schema, lui, est passe explicitement a `drizzleAdapter` dans src/lib/auth.ts,
 * donc `db._.fullSchema` n'est jamais consulte. Toute autre propriete, et
 * toute lecture de `_` apres connexion, passe par la vraie instance.
 */
export const db = new Proxy({} as ReturnType<typeof connect>, {
  get(_target, prop, receiver) {
    // Sonde de better-auth : repondre sans ouvrir la base.
    if (prop === "_" && instance === null) return undefined;
    instance ??= connect();
    return Reflect.get(instance, prop, receiver);
  },
});
