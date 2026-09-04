import { and, eq, inArray, isNotNull, lt, ne, or, sql } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { db as appDb } from "@/db";
import * as schema from "@/db/schema";
import {
  certificationAttempt,
  contact,
  favorite,
  notification,
  ping,
  profile,
  session,
  user,
  verification,
} from "@/db/schema";
import { deleteProfileVideo } from "./video";

/* --------------------------------------------------------------------------
 * Durees de conservation (R.5)
 *
 * Ce fichier est la MISE EN OEUVRE de la colonne « duree de conservation » du
 * registre des traitements (`docs/registre-traitements.md`) et des delais
 * annonces aux personnes dans les CGU (`docs/cgu.md`). Les trois documents
 * disent la meme chose ou l'un des trois est faux : une duree ecrite nulle
 * part dans le code n'est pas une duree, c'est une intention.
 *
 * Toutes les valeurs sont donc ici, en un seul endroit, nommees comme dans le
 * registre. Modifier un delai se fait ici, puis dans les deux documents — le
 * test `__tests__/retention.test.ts` verifie le comportement, pas les chiffres,
 * pour qu'une decision assumee ne casse pas la suite.
 * ----------------------------------------------------------------------- */

export const RETENTION = {
  /** Compte et tout ce qui en depend, a compter de la derniere connexion. */
  accountInactivityMonths: 24,
  /** Journal de connexion (`session` : IP + agent utilisateur). */
  sessionLogMonths: 6,
  /** Jetons a usage unique, apres expiration. */
  verificationGraceDays: 30,
  /** Prise de contact recruteur, a compter du dernier changement de statut. */
  contactMonths: 24,
  /** Mise en favori. */
  favoriteMonths: 24,
  /** Notification, lue ou non. */
  notificationMonths: 12,
  /** Tentative de certification soumise, a compter de la soumission. */
  submittedAttemptMonths: 24,
  /** Tentative ouverte puis abandonnee. */
  abandonedAttemptDays: 30,
  /** Fichier video refuse par la moderation, apres la decision. */
  rejectedVideoDays: 30,
  /** Trace du consentement video, apres son retrait. */
  revokedConsentMonths: 36,
  /** Table de demonstration. */
  pingDays: 7,
} as const;

type Db = BetterSQLite3Database<typeof schema>;

export interface RetentionReport {
  ranAt: Date;
  /** Nombre de lignes reellement supprimees, par traitement du registre. */
  deleted: {
    accounts: number;
    sessions: number;
    verifications: number;
    contacts: number;
    favorites: number;
    notifications: number;
    attempts: number;
    videos: number;
    consentTraces: number;
    pings: number;
  };
}

export interface RetentionOptions {
  /** Injectable pour les tests : une base en memoire plutot que le fichier. */
  db?: Db;
  /** Effacement du fichier video. Injectable pour la meme raison. */
  deleteVideo?: (profileId: string) => Promise<void>;
  /** Date de reference. Injectable pour eprouver les bornes sans attendre. */
  now?: Date;
}

/* --- Bornes -------------------------------------------------------------- */

/**
 * Recule de `months` mois civils, en bornant au dernier jour du mois vise.
 *
 * `setMonth` seul deborde : le 31 mars moins un mois donne le 3 mars, soit
 * trois jours de moins que le delai annonce. Une purge qui efface trois jours
 * trop tot ne dit plus la meme chose que le registre.
 */
export function monthsBefore(now: Date, months: number): Date {
  const date = new Date(now.getTime());
  const day = date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() - months);

  // Dernier jour du mois d'arrivee : `new Date(annee, mois + 1, 0)`.
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  date.setDate(Math.min(day, lastDay));
  return date;
}

export function daysBefore(now: Date, days: number): Date {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

/**
 * Bornes calculees une fois pour toutes : une ligne dont la date de reference
 * est ANTERIEURE a la borne est effacee.
 */
export function cutoffs(now: Date) {
  return {
    account: monthsBefore(now, RETENTION.accountInactivityMonths),
    session: monthsBefore(now, RETENTION.sessionLogMonths),
    verification: daysBefore(now, RETENTION.verificationGraceDays),
    contact: monthsBefore(now, RETENTION.contactMonths),
    favorite: monthsBefore(now, RETENTION.favoriteMonths),
    notification: monthsBefore(now, RETENTION.notificationMonths),
    submittedAttempt: monthsBefore(now, RETENTION.submittedAttemptMonths),
    abandonedAttempt: daysBefore(now, RETENTION.abandonedAttemptDays),
    rejectedVideo: daysBefore(now, RETENTION.rejectedVideoDays),
    revokedConsent: monthsBefore(now, RETENTION.revokedConsentMonths),
    ping: daysBefore(now, RETENTION.pingDays),
  };
}

/**
 * better-sqlite3 rend `{ changes }`. On ne compte pas les lignes avant de les
 * supprimer : le nombre reellement efface est le seul chiffre honnete a
 * reporter.
 */
async function countChanges(query: unknown): Promise<number> {
  const result = (await query) as { changes?: number } | undefined;
  return result?.changes ?? 0;
}

/* --- Purge --------------------------------------------------------------- */

/**
 * Comptes inactifs : supprimes, avec tout ce qui en depend.
 *
 * Les cles etrangeres sont en `ON DELETE CASCADE` : effacer la ligne `user`
 * emporte profil, competences, entreprise, sessions, comptes d'auth,
 * notifications, tentatives, favoris et contacts. Le FICHIER video, lui, ne
 * connait pas la base — il est supprime explicitement AVANT, sinon il resterait
 * seul sur le disque, sans plus aucune ligne pour dire a qui il appartient.
 *
 * Les comptes `admin` sont exclus : ils sont crees en base et non par
 * l'inscription, et leur suppression automatique retirerait la moderation au
 * dispositif. Leur cycle de vie est une decision d'exploitation, pas une
 * duree de conservation.
 */
async function purgeInactiveAccounts(
  db: Db,
  cutoff: Date,
  deleteVideo: (profileId: string) => Promise<void>,
): Promise<number> {
  // `lastSeenAt` est nullable (comptes anterieurs a la colonne) : on retombe
  // alors sur la date de creation, jamais sur « rien », sinon ces comptes
  // seraient conserves indefiniment.
  const stale = await db
    .select({ userId: user.id, profileId: profile.id })
    .from(user)
    .leftJoin(profile, eq(profile.userId, user.id))
    .where(
      and(
        ne(user.role, "admin"),
        or(
          and(isNotNull(user.lastSeenAt), lt(user.lastSeenAt, cutoff)),
          and(sql`${user.lastSeenAt} is null`, lt(user.createdAt, cutoff)),
        ),
      ),
    );

  if (stale.length === 0) return 0;

  for (const row of stale) {
    if (row.profileId) await deleteVideo(row.profileId);
  }

  return countChanges(
    db.delete(user).where(
      inArray(
        user.id,
        stale.map((row) => row.userId),
      ),
    ),
  );
}

/**
 * Videos refusees par la moderation : le fichier part, la decision reste.
 *
 * Garder trente jours laisse au candidat le temps de lire le motif et de
 * deposer autre chose ; passe ce delai, conserver l'image et la voix d'une
 * personne pour une video qui ne sera jamais diffusee n'a plus de finalite.
 * `video_status` et le motif survivent : ils disent pourquoi il n'y a plus de
 * fichier.
 */
async function purgeRejectedVideos(
  db: Db,
  cutoff: Date,
  deleteVideo: (profileId: string) => Promise<void>,
): Promise<number> {
  const rejected = await db
    .select({ id: profile.id })
    .from(profile)
    .where(
      and(
        eq(profile.videoStatus, "rejected"),
        isNotNull(profile.videoUrl),
        isNotNull(profile.videoReviewedAt),
        lt(profile.videoReviewedAt, cutoff),
      ),
    );

  if (rejected.length === 0) return 0;

  for (const row of rejected) await deleteVideo(row.id);

  await db
    .update(profile)
    .set({ videoUrl: null, updatedAt: new Date() })
    .where(
      inArray(
        profile.id,
        rejected.map((row) => row.id),
      ),
    );

  return rejected.length;
}

/**
 * Traces de consentement dont le retrait est ancien.
 *
 * La date, la version acceptee et la date de retrait sont conservees APRES un
 * retrait (R.3) : c'est ce qui prouve ce qui avait ete accepte. Une preuve n'a
 * pourtant pas vocation a etre eternelle — trois ans passe le retrait, plus
 * aucune diffusion n'est defendable ni contestable, et la trace redevient une
 * donnee conservee sans raison.
 */
async function purgeRevokedConsentTraces(db: Db, cutoff: Date): Promise<number> {
  return countChanges(
    db
      .update(profile)
      .set({
        videoConsentAt: null,
        videoConsentVersion: null,
        videoConsentRevokedAt: null,
      })
      .where(
        and(
          eq(profile.videoConsentGranted, false),
          isNotNull(profile.videoConsentRevokedAt),
          lt(profile.videoConsentRevokedAt, cutoff),
        ),
      ),
  );
}

/**
 * Applique toutes les durees de conservation du registre.
 *
 * Idempotente : rejouee sur une base deja purgee, elle ne supprime rien. C'est
 * ce qui permet de la lancer au demarrage puis toutes les vingt-quatre heures
 * sans se demander si la precedente a eu lieu.
 */
export async function runRetention(options: RetentionOptions = {}): Promise<RetentionReport> {
  const db = options.db ?? (appDb as unknown as Db);
  const deleteVideo = options.deleteVideo ?? deleteProfileVideo;
  const now = options.now ?? new Date();
  const limit = cutoffs(now);

  // Les comptes d'abord : la cascade emporte une partie des lignes que les
  // etapes suivantes auraient eu a examiner.
  const accounts = await purgeInactiveAccounts(db, limit.account, deleteVideo);
  const videos = await purgeRejectedVideos(db, limit.rejectedVideo, deleteVideo);
  const consentTraces = await purgeRevokedConsentTraces(db, limit.revokedConsent);

  const sessions = await countChanges(
    db.delete(session).where(lt(session.createdAt, limit.session)),
  );
  const verifications = await countChanges(
    db.delete(verification).where(lt(verification.expiresAt, limit.verification)),
  );
  const contacts = await countChanges(
    db.delete(contact).where(lt(contact.updatedAt, limit.contact)),
  );
  const favorites = await countChanges(
    db.delete(favorite).where(lt(favorite.createdAt, limit.favorite)),
  );
  const notifications = await countChanges(
    db.delete(notification).where(lt(notification.createdAt, limit.notification)),
  );

  // Une tentative abandonnee (`in_progress`) et une tentative soumise ne
  // repondent pas au meme delai : la premiere n'a jamais produit de resultat,
  // la seconde justifie un badge et doit pouvoir etre reexaminee.
  const attempts = await countChanges(
    db
      .delete(certificationAttempt)
      .where(
        or(
          and(
            eq(certificationAttempt.status, "in_progress"),
            lt(certificationAttempt.createdAt, limit.abandonedAttempt),
          ),
          and(
            eq(certificationAttempt.status, "submitted"),
            isNotNull(certificationAttempt.submittedAt),
            lt(certificationAttempt.submittedAt, limit.submittedAttempt),
          ),
        ),
      ),
  );

  const pings = await countChanges(db.delete(ping).where(lt(ping.createdAt, limit.ping)));

  return {
    ranAt: now,
    deleted: {
      accounts,
      sessions,
      verifications,
      contacts,
      favorites,
      notifications,
      attempts,
      videos,
      consentTraces,
      pings,
    },
  };
}
