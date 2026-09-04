import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import * as schema from "@/db/schema";
import {
  certificationAttempt,
  contact,
  favorite,
  notification,
  profile,
  session,
  user,
} from "@/db/schema";
import { RETENTION, cutoffs, monthsBefore, runRetention } from "../retention";

/**
 * Durees de conservation (R.5).
 *
 * Ces tests tournent sur une VRAIE base — SQLite en memoire, migrations du
 * depot rejouees. Une purge se juge sur ce qu'elle efface et surtout sur ce
 * qu'elle laisse : un test qui simule la base ne dirait rien des cascades, qui
 * sont precisement ce sur quoi repose la suppression d'un compte.
 *
 * Ils verifient un COMPORTEMENT (« au-dela du delai, la ligne part ; en deca,
 * elle reste ») et jamais les chiffres eux-memes : changer un delai est une
 * decision, elle ne doit pas faire echouer la suite.
 */

const NOW = new Date("2026-09-04T12:00:00Z");

/** Une date suffisamment au-dela de la borne pour ne pas dependre du jour. */
function wellPast(cutoff: Date): Date {
  return new Date(cutoff.getTime() - 30 * 24 * 60 * 60 * 1000);
}

/** Une date juste en deca de la borne : la ligne doit survivre. */
function justInside(cutoff: Date): Date {
  return new Date(cutoff.getTime() + 60 * 1000);
}

type Db = ReturnType<typeof drizzle<typeof schema>>;

let db: Db;
let deleted: string[];

function makeUser(id: string, over: Partial<typeof user.$inferInsert> = {}) {
  return db.insert(user).values({
    id,
    name: id,
    email: `${id}@exemple.fr`,
    role: "candidate",
    lastSeenAt: NOW,
    createdAt: NOW,
    updatedAt: NOW,
    ...over,
  });
}

function makeProfile(id: string, userId: string, over: Partial<typeof profile.$inferInsert> = {}) {
  return db.insert(profile).values({
    id,
    userId,
    title: id,
    sector: "Numérique",
    city: "Paris",
    createdAt: NOW,
    updatedAt: NOW,
    ...over,
  });
}

beforeEach(async () => {
  const sqlite = new Database(":memory:");
  sqlite.pragma("foreign_keys = ON");
  db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: "./drizzle" });
  deleted = [];
});

const run = () =>
  runRetention({
    db,
    now: NOW,
    deleteVideo: async (profileId) => {
      deleted.push(profileId);
    },
  });

describe("bornes", () => {
  it("borne au dernier jour du mois plutot que de deborder", () => {
    // `setMonth` seul rendrait le 3 mars : trois jours de moins que le delai
    // annonce, donc une suppression anticipee.
    const borne = monthsBefore(new Date("2026-03-31T12:00:00"), 1);
    expect(borne.getMonth()).toBe(1);
    expect(borne.getDate()).toBe(28);
  });

  it("place la conservation du journal de connexion en deca de celle du compte", () => {
    // Le journal de connexion doit partir AVANT le compte, sinon la purge du
    // compte serait deja arrivee et le journal n'aurait jamais sa propre duree.
    const limit = cutoffs(NOW);
    expect(limit.session.getTime()).toBeGreaterThan(limit.account.getTime());
    expect(RETENTION.sessionLogMonths).toBeLessThan(RETENTION.accountInactivityMonths);
  });
});

describe("compte inactif", () => {
  it("supprime le compte, son profil et le fichier video", async () => {
    const cutoff = cutoffs(NOW).account;
    await makeUser("dormant", { lastSeenAt: wellPast(cutoff) });
    await makeProfile("p-dormant", "dormant", { videoUrl: "/api/videos/p-dormant" });

    const report = await run();

    expect(report.deleted.accounts).toBe(1);
    expect(await db.select().from(user)).toEqual([]);
    // La cascade emporte le profil...
    expect(await db.select().from(profile)).toEqual([]);
    // ...mais le fichier, lui, ne connait pas la base : il faut l'effacer.
    expect(deleted).toEqual(["p-dormant"]);
  });

  it("laisse un compte encore actif", async () => {
    const cutoff = cutoffs(NOW).account;
    await makeUser("actif", { lastSeenAt: justInside(cutoff) });

    const report = await run();

    expect(report.deleted.accounts).toBe(0);
    expect(await db.select().from(user)).toHaveLength(1);
  });

  it("retombe sur la date de creation quand le compte n'a jamais ete date", async () => {
    // Comptes anterieurs a `last_seen_at` : sans ce repli, ils seraient
    // conserves indefiniment.
    const cutoff = cutoffs(NOW).account;
    await makeUser("ancien", { lastSeenAt: null, createdAt: wellPast(cutoff) });
    await makeUser("recent", { lastSeenAt: null, createdAt: justInside(cutoff) });

    await run();

    const restants = await db.select({ id: user.id }).from(user);
    expect(restants.map((row) => row.id)).toEqual(["recent"]);
  });

  it("epargne un compte d'administration inactif", async () => {
    // Supprimer le dernier admin retirerait la moderation au dispositif.
    const cutoff = cutoffs(NOW).account;
    await makeUser("admin", { role: "admin", lastSeenAt: wellPast(cutoff) });

    const report = await run();

    expect(report.deleted.accounts).toBe(0);
    expect(await db.select().from(user)).toHaveLength(1);
  });
});

describe("journal de connexion", () => {
  it("efface les lignes de session au-dela du delai et garde les autres", async () => {
    const cutoff = cutoffs(NOW).session;
    await makeUser("u");
    await db.insert(session).values([
      {
        id: "vieille",
        token: "t1",
        userId: "u",
        expiresAt: NOW,
        ipAddress: "192.0.2.1",
        userAgent: "curl",
        createdAt: wellPast(cutoff),
        updatedAt: wellPast(cutoff),
      },
      {
        id: "recente",
        token: "t2",
        userId: "u",
        expiresAt: NOW,
        ipAddress: "192.0.2.2",
        userAgent: "curl",
        createdAt: justInside(cutoff),
        updatedAt: justInside(cutoff),
      },
    ]);

    const report = await run();

    expect(report.deleted.sessions).toBe(1);
    const restantes = await db.select({ id: session.id }).from(session);
    expect(restantes.map((row) => row.id)).toEqual(["recente"]);
  });
});

describe("contacts, favoris et notifications", () => {
  it("efface au-dela du delai, sur la date qui fait foi pour chacun", async () => {
    await makeUser("recruteur", { role: "recruiter" });
    await makeUser("candidat");
    await makeProfile("p", "candidat");

    const limit = cutoffs(NOW);
    await db.insert(contact).values({
      id: "c",
      recruiterId: "recruteur",
      profileId: "p",
      message: "Bonjour",
      createdAt: wellPast(limit.contact),
      // C'est `updatedAt` qui fait foi : un echange suivi reste vivant.
      updatedAt: wellPast(limit.contact),
    });
    await db.insert(favorite).values({
      recruiterId: "recruteur",
      profileId: "p",
      createdAt: wellPast(limit.favorite),
    });
    await db.insert(notification).values({
      id: "n",
      userId: "candidat",
      type: "contact",
      text: "Un recruteur vous a contacte",
      createdAt: wellPast(limit.notification),
    });

    const report = await run();

    expect(report.deleted).toMatchObject({ contacts: 1, favorites: 1, notifications: 1 });
    expect(await db.select().from(contact)).toEqual([]);
    expect(await db.select().from(favorite)).toEqual([]);
    expect(await db.select().from(notification)).toEqual([]);
  });

  it("garde une prise de contact reprise recemment, meme ancienne", async () => {
    await makeUser("recruteur", { role: "recruiter" });
    await makeUser("candidat");
    await makeProfile("p", "candidat");

    const limit = cutoffs(NOW);
    await db.insert(contact).values({
      id: "c",
      recruiterId: "recruteur",
      profileId: "p",
      message: "Bonjour",
      createdAt: wellPast(limit.contact),
      updatedAt: NOW,
    });

    const report = await run();

    expect(report.deleted.contacts).toBe(0);
  });
});

describe("certification", () => {
  it("distingue la tentative abandonnee de la tentative soumise", async () => {
    const limit = cutoffs(NOW);
    await makeUser("u");
    await db.insert(certificationAttempt).values([
      // Abandonnee il y a plus de trente jours : jamais de resultat, rien a garder.
      {
        id: "abandonnee",
        userId: "u",
        status: "in_progress",
        createdAt: wellPast(limit.abandonedAttempt),
      },
      // Ouverte hier : encore en cours.
      { id: "en-cours", userId: "u", status: "in_progress", createdAt: NOW },
      // Soumise il y a deux ans passes : le badge ne se justifie plus par elle.
      {
        id: "ancienne",
        userId: "u",
        status: "submitted",
        score: 80,
        submittedAt: wellPast(limit.submittedAttempt),
        createdAt: wellPast(limit.submittedAttempt),
      },
      // Soumise il y a un an : conservee.
      {
        id: "valide",
        userId: "u",
        status: "submitted",
        score: 90,
        submittedAt: justInside(limit.submittedAttempt),
        createdAt: justInside(limit.submittedAttempt),
      },
    ]);

    const report = await run();

    expect(report.deleted.attempts).toBe(2);
    const restantes = await db.select({ id: certificationAttempt.id }).from(certificationAttempt);
    expect(restantes.map((row) => row.id).sort()).toEqual(["en-cours", "valide"]);
  });
});

describe("video refusee", () => {
  it("efface le fichier passe le delai mais conserve la decision", async () => {
    const cutoff = cutoffs(NOW).rejectedVideo;
    await makeUser("u");
    await makeProfile("p", "u", {
      videoUrl: "/api/videos/p",
      videoStatus: "rejected",
      videoReviewReason: "Visage d'un tiers non flouté",
      videoReviewedAt: wellPast(cutoff),
    });

    const report = await run();

    expect(report.deleted.videos).toBe(1);
    expect(deleted).toEqual(["p"]);

    const [row] = await db.select().from(profile).where(eq(profile.id, "p"));
    expect(row.videoUrl).toBeNull();
    // Le motif survit au fichier : il dit pourquoi il n'y a plus rien a voir.
    expect(row.videoStatus).toBe("rejected");
    expect(row.videoReviewReason).toBe("Visage d'un tiers non flouté");
  });

  it("ne touche pas a une video validee", async () => {
    await makeUser("u");
    await makeProfile("p", "u", {
      videoUrl: "/api/videos/p",
      videoStatus: "approved",
      videoReviewedAt: new Date("2020-01-01T00:00:00Z"),
    });

    const report = await run();

    expect(report.deleted.videos).toBe(0);
    expect(deleted).toEqual([]);
  });
});

describe("trace de consentement retire", () => {
  it("efface la preuve une fois le retrait ancien, et la garde avant", async () => {
    const cutoff = cutoffs(NOW).revokedConsent;
    await makeUser("vieux");
    await makeUser("recent");
    await makeProfile("p-vieux", "vieux", {
      videoConsentGranted: false,
      videoConsentAt: wellPast(cutoff),
      videoConsentVersion: "2026-01",
      videoConsentRevokedAt: wellPast(cutoff),
    });
    await makeProfile("p-recent", "recent", {
      videoConsentGranted: false,
      videoConsentAt: NOW,
      videoConsentVersion: "2026-01",
      videoConsentRevokedAt: justInside(cutoff),
    });

    const report = await run();

    expect(report.deleted.consentTraces).toBe(1);

    const [vieux] = await db.select().from(profile).where(eq(profile.id, "p-vieux"));
    expect(vieux.videoConsentAt).toBeNull();
    expect(vieux.videoConsentVersion).toBeNull();

    const [recent] = await db.select().from(profile).where(eq(profile.id, "p-recent"));
    expect(recent.videoConsentVersion).toBe("2026-01");
  });

  it("ne touche pas a un consentement en cours", async () => {
    await makeUser("u");
    await makeProfile("p", "u", {
      videoConsentGranted: true,
      videoConsentAt: new Date("2020-01-01T00:00:00Z"),
      videoConsentVersion: "2026-01",
    });

    const report = await run();

    expect(report.deleted.consentTraces).toBe(0);
  });
});

describe("idempotence", () => {
  it("ne supprime plus rien au second passage", async () => {
    const cutoff = cutoffs(NOW).account;
    await makeUser("dormant", { lastSeenAt: wellPast(cutoff) });
    await makeProfile("p", "dormant");

    await run();
    const second = await run();

    expect(Object.values(second.deleted).every((count) => count === 0)).toBe(true);
  });
});
