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

  /**
   * Durees de conservation (R.5).
   *
   * Une duree qui n'est appliquee par personne n'est pas une duree. La purge
   * tourne donc au demarrage, puis toutes les vingt-quatre heures, sans
   * dependre d'un cron pose a l'exterieur de l'image : le conteneur de
   * production est en lecture seule et n'embarque pas de planificateur.
   *
   * Son echec ne fait PAS tomber le serveur, contrairement aux migrations :
   * une purge ratee laisse des donnees trop longtemps, ce qui se rattrape au
   * passage suivant ; refuser de servir l'application n'y changerait rien.
   */
  const { runRetention } = await import("./server/services/retention");

  const purge = async () => {
    try {
      const report = await runRetention();
      console.log("[retention] purge appliquee", report.deleted);
    } catch (error) {
      console.error("[retention] purge en echec :", error);
    }
  };

  await purge();

  // `unref` : ce minuteur ne doit pas maintenir le processus en vie a lui seul.
  setInterval(purge, 24 * 60 * 60 * 1000).unref();
}

