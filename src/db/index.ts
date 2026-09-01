import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

// "file:/data/profilsactifs.db" -> "/data/profilsactifs.db"
// better-sqlite3 attend un chemin brut, pas une URL.
const dbPath = (process.env.DATABASE_URL ?? "file:./local.db").replace(/^file:/, "");

function connect() {
  const sqlite = new Database(dbPath);

  // Installer l'attente AVANT toute pragma susceptible de prendre un verrou.
  // `next build` charge plusieurs routes dans des workers paralleles : sans
  // cela, deux connexions qui initialisent WAL en meme temps echouent aussitot.
  sqlite.pragma("busy_timeout = 5000");

  // WAL : lectures concurrentes pendant une ecriture. Cree deux fichiers
  // voisins (.db-wal, .db-shm) : ils doivent etre sur le meme volume que la
  // base, d'ou un repertoire /data dedie et non un fichier monte tout seul.
  sqlite.pragma("journal_mode = WAL");

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
 */
export const db = new Proxy({} as ReturnType<typeof connect>, {
  get(_target, prop, receiver) {
    instance ??= connect();
    return Reflect.get(instance, prop, receiver);
  },
});
