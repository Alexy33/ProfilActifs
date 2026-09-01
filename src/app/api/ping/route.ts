import { sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { ping } from "@/db/schema";
import { defineRoute } from "@/server/openapi/routes";
import { named } from "@/server/openapi/schemas";

export const dynamic = "force-dynamic";

const PingSchema = named("Ping", z.object({ total: z.number().int() }));

export const { POST } = defineRoute({
  method: "POST",
  path: "/api/ping",
  tags: ["Systeme"],
  summary: "Ecrit une ligne en base (verification du socle)",
  description: "Route de demonstration : a supprimer avec la table `ping`.",
  responses: {
    "200": { description: "Nombre total de pings.", schema: PingSchema },
  },
  handler: async () => {
    await db.insert(ping).values({});
    const [{ total }] = await db.select({ total: sql<number>`count(*)` }).from(ping);
    return { total };
  },
});
