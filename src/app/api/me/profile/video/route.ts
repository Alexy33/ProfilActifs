import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/db";
import { profile } from "@/db/schema";
import { auth } from "@/lib/auth";
import { ApiError } from "@/server/http";
import { findProfileByUserId } from "@/server/services/profiles";
import { resetVideoReview } from "@/server/services/video-moderation";
import {
  deleteProfileVideo,
  extensionForMime,
  saveProfileVideo,
  VideoTooLargeError,
} from "@/server/services/video";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function fail(error: unknown): Response {
  const api = error instanceof ApiError ? error : new ApiError("internal", "Erreur interne.");
  return Response.json(api.toJSON(), { status: api.status });
}

async function candidateContext(): Promise<{ userId: string; profileId: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw ApiError.unauthorized();
  if (session.user.role !== "candidate") {
    throw ApiError.forbidden("Cette ressource est réservée au rôle « candidate ».");
  }
  const owned = await findProfileByUserId(session.user.id);
  if (!owned) throw ApiError.notFound("Aucun profil rattaché à ce compte.");
  return { userId: session.user.id, profileId: owned.id };
}

export async function PUT(request: Request): Promise<Response> {
  let ctx: { userId: string; profileId: string };
  try {
    ctx = await candidateContext();
  } catch (error) {
    return fail(error);
  }

  const extension = extensionForMime(request.headers.get("content-type"));
  if (!extension) {
    return fail(
      ApiError.unprocessable(
        "Type de fichier non pris en charge. Formats acceptés : MP4, WebM, OGG, MOV — via l'en-tête Content-Type.",
      ),
    );
  }
  if (!request.body) {
    return fail(ApiError.badRequest("Corps de requête vide : envoyez le fichier vidéo en corps de requête."));
  }

  try {
    await saveProfileVideo(ctx.profileId, extension, request.body);
  } catch (error) {
    if (error instanceof VideoTooLargeError) return fail(ApiError.unprocessable(error.message));
    return fail(new ApiError("internal", `Enregistrement impossible : ${(error as Error).message}`));
  }

  // Tout nouveau depot repart en attente de validation : sans cela, une video
  // validee pourrait etre remplacee par une autre sans repasser la moderation.
  await db
    .update(profile)
    .set({
      videoUrl: `/api/videos/${ctx.profileId}?t=${Date.now()}`,
      ...resetVideoReview(),
      updatedAt: new Date(),
    })
    .where(eq(profile.id, ctx.profileId));

  return Response.json(await findProfileByUserId(ctx.userId));
}

export async function DELETE(): Promise<Response> {
  let ctx: { userId: string; profileId: string };
  try {
    ctx = await candidateContext();
  } catch (error) {
    return fail(error);
  }

  await deleteProfileVideo(ctx.profileId);
  await db
    .update(profile)
    .set({ videoUrl: null, ...resetVideoReview(), updatedAt: new Date() })
    .where(eq(profile.id, ctx.profileId));

  return Response.json(await findProfileByUserId(ctx.userId));
}
