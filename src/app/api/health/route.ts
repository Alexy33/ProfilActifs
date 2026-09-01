import { sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { named } from "@/server/openapi/schemas";
import { defineRoute } from "@/server/openapi/routes";
import { errorResponse } from "@/server/contracts/common";

// Cible du HEALTHCHECK Docker. Doit etre dynamique : une route mise en cache
// repondrait 200 meme base morte, ce qui rend le healthcheck inutile.
export const dynamic = "force-dynamic";

const HealthSchema = named(
  "Health",
  z.object({
    status: z.literal("ok"),
    db: z.literal("up"),
    ts: z.iso.datetime(),
  }),
);

export const { GET } = defineRoute({
  method: "GET",
  path: "/api/health",
  tags: ["Systeme"],
  summary: "Etat de l'application et de la base",
  description: "Sonde utilisee par le HEALTHCHECK Docker.",
  responses: {
    "200": { description: "Application et base operationnelles.", schema: HealthSchema },
    "503": errorResponse("Base injoignable."),
  },
  handler: () => {
    try {
      // Requete la moins chere qui prouve que le fichier SQLite est bien ouvert.
      db.get(sql`SELECT 1`);
    } catch (error) {
      // 503 et non 500 : la sonde doit dire « indisponible, reessayez », c'est
      // ce que la politique de redemarrage de Docker attend.
      return Response.json(
        {
          error: {
            code: "internal",
            message: `Base injoignable : ${(error as Error).message}`,
          },
        },
        { status: 503 },
      );
    }
    return { status: "ok" as const, db: "up" as const, ts: new Date().toISOString() };
  },
});
