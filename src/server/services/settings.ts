import { eq } from "drizzle-orm";
import { db } from "@/db";
import { setting } from "@/db/schema";
import { DEFAULT_CERTIFICATION_THRESHOLD, DEFAULT_PAGE_SIZE } from "@/lib/vocabulary";

/**
 * Reglages du dispositif, avec repli sur les valeurs par defaut.
 *
 * La table peut etre vide (base fraiche, seed non joue) : l'API doit repondre
 * quand meme. Les defauts vivent dans `vocabulary.ts`, pas ici.
 */

export interface Settings {
  certificationThreshold: number;
  catalogPageSize: number;
}

const DEFAULTS: Settings = {
  certificationThreshold: DEFAULT_CERTIFICATION_THRESHOLD,
  catalogPageSize: DEFAULT_PAGE_SIZE,
};

export async function getSettings(): Promise<Settings> {
  const rows = await db.select().from(setting);
  const stored = new Map(rows.map((row) => [row.key, row.value]));

  const read = (key: keyof Settings): number => {
    const raw = stored.get(key);
    const parsed = raw === undefined ? Number.NaN : Number(raw);
    return Number.isFinite(parsed) ? parsed : DEFAULTS[key];
  };

  return {
    certificationThreshold: read("certificationThreshold"),
    catalogPageSize: read("catalogPageSize"),
  };
}

export async function updateSettings(patch: Partial<Settings>): Promise<Settings> {
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    await db
      .insert(setting)
      .values({ key, value: String(value), updatedAt: new Date() })
      .onConflictDoUpdate({
        target: setting.key,
        set: { value: String(value), updatedAt: new Date() },
      });
  }
  return getSettings();
}
