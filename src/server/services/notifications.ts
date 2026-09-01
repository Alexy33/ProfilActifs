import { db } from "@/db";
import { notification } from "@/db/schema";

/**
 * Notifications candidat (CDC 2.3).
 *
 * Ecriture en base uniquement : le demonstrateur n'envoie pas d'e-mail. Le
 * front les releve sur `/api/me/notifications`.
 */
export async function notify(
  userId: string,
  type: "contact" | "moderation" | "certification",
  text: string,
): Promise<void> {
  await db.insert(notification).values({
    id: crypto.randomUUID(),
    userId,
    type,
    text,
  });
}
