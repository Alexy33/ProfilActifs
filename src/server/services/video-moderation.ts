import { and, desc, eq, inArray, isNotNull, ne } from "drizzle-orm";
import { db } from "@/db";
import { profile, user } from "@/db/schema";
import type { VideoStatus } from "@/lib/vocabulary";
import { isMinor } from "@/lib/vocabulary";
import { notify } from "./notifications";

/**
 * Moderation A PRIORI des videos (mesure Cabinet du 2026-09-02, point 2).
 *
 * Regle unique, appliquee ici et nulle part ailleurs : une video n'est
 * publique QUE si elle est `approved` ET que son titulaire n'est pas mineur.
 * Toutes les lectures — catalogue, fiche, API, flux de fichier — passent par
 * `isVideoPublic` ou par `publicVideoUrl`, de sorte qu'aucune route ne puisse
 * diverger de la regle par oubli.
 */

/** Le profil porte-t-il une video reellement diffusable ? */
export function isVideoPublic(row: {
  videoUrl: string | null;
  videoStatus: VideoStatus;
}, minor: boolean): boolean {
  if (minor) return false;
  if (row.videoStatus !== "approved") return false;
  return !!row.videoUrl && row.videoUrl.trim() !== "";
}

/**
 * `videoUrl` telle qu'elle doit sortir du serveur pour un lecteur PUBLIC.
 *
 * Renvoie `null` — et non l'URL — des que la video n'est pas diffusable : le
 * Cabinet demande que la mesure porte sur ce que le serveur renvoie, pas
 * seulement sur ce que l'interface affiche.
 */
export function publicVideoUrl(
  row: { videoUrl: string | null; videoStatus: VideoStatus },
  minor: boolean,
): string | null {
  return isVideoPublic(row, minor) ? row.videoUrl : null;
}

export interface VideoReviewRow {
  profileId: string;
  name: string;
  title: string;
  videoUrl: string | null;
  videoStatus: VideoStatus;
  videoReviewReason: string | null;
  reviewedByName: string | null;
  reviewedAt: string | null;
  seenBeforeReview: boolean;
  isMinor: boolean;
}

/**
 * File d'attente de moderation video.
 *
 * Les videos deja consultees avant la mesure remontent en tete : ce sont les
 * cas que le Cabinet demande de traiter en priorite.
 */
export async function videoQueue(status?: VideoStatus): Promise<VideoReviewRow[]> {
  const rows = await db
    .select({ profile, name: user.name })
    .from(profile)
    .innerJoin(user, eq(user.id, profile.userId))
    .where(
      and(
        isNotNull(profile.videoUrl),
        ne(profile.videoUrl, ""),
        status ? eq(profile.videoStatus, status) : undefined,
      ),
    )
    .orderBy(desc(profile.videoSeenBeforeReview), desc(profile.updatedAt));

  // Nom du moderateur : resolu en une requete plutot qu'une jointure sur
  // `user` deja utilisee pour le titulaire (deux alias de la meme table).
  const reviewerIds = [
    ...new Set(rows.map((row) => row.profile.videoReviewedBy).filter((id): id is string => !!id)),
  ];
  const names = new Map<string, string>();
  if (reviewerIds.length > 0) {
    const found = await db
      .select({ id: user.id, name: user.name })
      .from(user)
      .where(inArray(user.id, reviewerIds));
    for (const item of found) names.set(item.id, item.name);
  }

  const ownerIds = [...new Set(rows.map((row) => row.profile.userId))];
  const owners =
    ownerIds.length > 0
      ? await db
          .select({ id: user.id, birthDate: user.birthDate })
          .from(user)
          .where(inArray(user.id, ownerIds))
      : [];
  const birthDates = new Map(owners.map((item) => [item.id, item.birthDate]));

  return rows.map((row) => ({
    profileId: row.profile.id,
    name: row.name,
    title: row.profile.title,
    videoUrl: row.profile.videoUrl,
    videoStatus: row.profile.videoStatus,
    videoReviewReason: row.profile.videoReviewReason,
    reviewedByName: row.profile.videoReviewedBy
      ? (names.get(row.profile.videoReviewedBy) ?? null)
      : null,
    reviewedAt: row.profile.videoReviewedAt?.toISOString() ?? null,
    seenBeforeReview: row.profile.videoSeenBeforeReview,
    isMinor: isMinor(birthDates.get(row.profile.userId) ?? null),
  }));
}

/**
 * Applique une decision de moderation et notifie le candidat.
 *
 * Un refus EXIGE un motif : c'est la contrepartie demandee par le Cabinet a
 * la disparition d'une video de l'espace du candidat.
 */
export async function reviewVideo(options: {
  profileId: string;
  status: Extract<VideoStatus, "approved" | "rejected">;
  reason: string | null;
  adminId: string;
}): Promise<VideoReviewRow | null> {
  const [updated] = await db
    .update(profile)
    .set({
      videoStatus: options.status,
      videoReviewReason: options.status === "rejected" ? options.reason : null,
      videoReviewedBy: options.adminId,
      videoReviewedAt: new Date(),
      // La decision prise, le signalement « vue avant moderation » a joue son
      // role : il ne doit pas faire remonter eternellement la ligne en tete.
      videoSeenBeforeReview: false,
      updatedAt: new Date(),
    })
    .where(eq(profile.id, options.profileId))
    .returning();

  if (!updated) return null;

  await notify(
    updated.userId,
    "moderation",
    options.status === "approved"
      ? "Votre video de presentation a ete validee : elle est desormais visible."
      : `Votre video de presentation a ete refusee. Motif : ${options.reason}`,
  );

  const [owner] = await db
    .select({ name: user.name, birthDate: user.birthDate })
    .from(user)
    .where(eq(user.id, updated.userId))
    .limit(1);

  return {
    profileId: updated.id,
    name: owner?.name ?? "",
    title: updated.title,
    videoUrl: updated.videoUrl,
    videoStatus: updated.videoStatus,
    videoReviewReason: updated.videoReviewReason,
    reviewedByName: null,
    reviewedAt: updated.videoReviewedAt?.toISOString() ?? null,
    seenBeforeReview: updated.videoSeenBeforeReview,
    isMinor: isMinor(owner?.birthDate ?? null),
  };
}

/**
 * Remet une video en attente : tout NOUVEAU depot repart de zero.
 *
 * Appele a chaque televersement ou changement de lien, sans quoi un candidat
 * validerait une video anodine puis la remplacerait par une autre.
 */
export function resetVideoReview() {
  return {
    videoStatus: "pending" as const,
    videoReviewReason: null,
    videoReviewedBy: null,
    videoReviewedAt: null,
    videoSeenBeforeReview: false,
  };
}
