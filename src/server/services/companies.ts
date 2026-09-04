import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { company } from "@/db/schema";
import type { Sector } from "@/lib/vocabulary";

/**
 * Entreprise d'un compte recruteur (CDC 3.1).
 *
 * Tout ce qui sort d'ici est deja au format servi par l'API (dates en ISO,
 * champs facultatifs a `null` et non `undefined`) : deux routes qui exposent
 * une entreprise ne peuvent pas diverger.
 */

export interface CompanyView {
  id: string;
  name: string;
  siren: string;
  position: string;
  address: string;
  postalCode: string;
  city: string;
  sector: Sector;
  phone: string | null;
  website: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyInput {
  name: string;
  siren: string;
  position: string;
  address: string;
  postalCode: string;
  city: string;
  sector: Sector;
  phone?: string;
  website?: string;
}

type CompanyRow = typeof company.$inferSelect;

function toView(row: CompanyRow): CompanyView {
  return {
    id: row.id,
    name: row.name,
    siren: row.siren,
    position: row.position,
    address: row.address,
    postalCode: row.postalCode,
    city: row.city,
    sector: row.sector,
    phone: row.phone,
    website: row.website,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function findCompanyByUserId(userId: string): Promise<CompanyView | null> {
  const [row] = await db.select().from(company).where(eq(company.userId, userId)).limit(1);
  return row ? toView(row) : null;
}

/**
 * Le SIREN est-il deja declare par un AUTRE compte ?
 *
 * Verifie avant la creation du compte : la contrainte d'unicite de la base
 * suffirait a refuser l'ecriture, mais elle interviendrait apres la creation de
 * l'utilisateur — on aurait alors un compte a supprimer pour rattraper une
 * erreur previsible.
 */
export async function isSirenTaken(siren: string, exceptUserId?: string): Promise<boolean> {
  const rows = await db
    .select({ id: company.id })
    .from(company)
    .where(
      exceptUserId
        ? and(eq(company.siren, siren), ne(company.userId, exceptUserId))
        : eq(company.siren, siren),
    )
    .limit(1);

  return rows.length > 0;
}

export async function createCompany(userId: string, input: CompanyInput): Promise<CompanyView> {
  const [row] = await db
    .insert(company)
    .values({
      id: crypto.randomUUID(),
      userId,
      ...input,
      phone: input.phone ?? null,
      website: input.website ?? null,
    })
    .returning();

  return toView(row);
}

export async function updateCompany(
  userId: string,
  input: Partial<CompanyInput>,
): Promise<CompanyView | null> {
  const [row] = await db
    .update(company)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(company.userId, userId))
    .returning();

  return row ? toView(row) : null;
}
