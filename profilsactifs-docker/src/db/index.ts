import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

// "file:/data/profilsactifs.db" -> "/data/profilsactifs.db"
// better-sqlite3 attend un chemin brut, pas une URL.
const dbPath = (process.env.DATABASE_URL ?? "file:./local.db").replace(/^file:/, "");

const sqlite = new Database(dbPath);

// WAL : lectures concurrentes pendant une ecriture. Sans lui, le feed de
// profils (CDC 3.4) bloque des qu'un candidat sauvegarde son questionnaire.
// Cree deux fichiers voisins (.db-wal, .db-shm) : ils doivent etre sur le
// meme volume que la base, d'ou un repertoire /data dedie et non un fichier
// monte tout seul.
sqlite.pragma("journal_mode = WAL");

// Attente avant erreur "SQLITE_BUSY" si une ecriture est deja en cours.
sqlite.pragma("busy_timeout = 5000");

// SQLite ne verifie PAS les cles etrangeres par defaut. A activer sur chaque
// connexion, sinon la moderation admin peut laisser des profils orphelins.
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });
