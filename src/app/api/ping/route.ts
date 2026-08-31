import { sql } from "drizzle-orm";
import { db } from "@/db";
import { ping } from "@/db/schema";

export const dynamic = "force-dynamic";

/** POST /api/ping — ecrit une ligne, prouve que la base est accessible en ecriture. */
export async function POST() {
  await db.insert(ping).values({});
  const [{ total }] = await db.select({ total: sql<number>`count(*)` }).from(ping);
  return Response.json({ total });
}
