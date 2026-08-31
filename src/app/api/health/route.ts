import { sql } from "drizzle-orm";
import { db } from "@/db";

// Cible du HEALTHCHECK Docker. Doit etre dynamique : une route mise en cache
// repondrait 200 meme base morte, ce qui rend le healthcheck inutile.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Requete la moins chere qui prouve que le fichier SQLite est bien
    // ouvert en lecture depuis le volume.
    db.get(sql`SELECT 1`);
    return Response.json({ status: "ok", db: "up", ts: new Date().toISOString() });
  } catch (error) {
    return Response.json(
      { status: "error", db: "down", message: (error as Error).message },
      { status: 503 },
    );
  }
}
