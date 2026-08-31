/**
 * Next.js execute ce fichier UNE fois au demarrage du serveur, avant la
 * premiere requete. C'est le bon endroit pour jouer les migrations dans un
 * conteneur : le code fait partie du bundle trace, donc il survit au build
 * standalone (contrairement a drizzle-kit, qui est une devDependency absente
 * de l'image finale).
 */
export async function register() {
  // Ne s'execute que sur le runtime Node (pas Edge, pas navigateur).
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { migrate } = await import("drizzle-orm/better-sqlite3/migrator");
  const { db } = await import("./db");

  try {
    migrate(db, { migrationsFolder: "./drizzle" });
    console.log("[instrumentation] migrations Drizzle appliquees");
  } catch (error) {
    console.error("[instrumentation] echec des migrations :", error);
    // On laisse tomber le conteneur : Docker le redemarre (restart policy)
    // plutot que de servir une app branchee sur un schema incoherent.
    throw error;
  }
}
