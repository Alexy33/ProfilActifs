import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/db";
import { profile, user } from "@/db/schema";
import { auth } from "@/lib/auth";
import { isMinor } from "@/lib/vocabulary";
import { findProfileVideo, openVideoStream } from "@/server/services/video";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function notFound(): Response {
  return Response.json(
    { error: { code: "not_found", message: "Vidéo introuvable." } },
    { status: 404 },
  );
}

/**
 * Flux de la video de presentation.
 *
 * C'est le point sur lequel le Cabinet a demande a etre le plus attentif : une
 * video en attente ne doit etre accessible PAR AUCUN MOYEN, pas seulement
 * invisible dans l'interface. Ouvrir cette adresse directement, en navigation
 * privee, doit donc repondre 404 tant que la video n'est pas validee.
 *
 * La garde ne peut pas se contenter du statut du PROFIL : un profil publie
 * dont la video est en attente laissait auparavant le fichier accessible ici.
 * Trois conditions cumulatives sont exigees pour un lecteur non identifie :
 * profil publie, video `approved`, titulaire majeur.
 *
 * Le titulaire et l'administration gardent l'acces : le premier doit pouvoir
 * revoir ce qu'il a depose, la seconde doit pouvoir le moderer.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;

  const [row] = await db
    .select({
      status: profile.status,
      userId: profile.userId,
      videoStatus: profile.videoStatus,
      birthDate: user.birthDate,
    })
    .from(profile)
    .innerJoin(user, eq(user.id, profile.userId))
    .where(eq(profile.id, id))
    .limit(1);
  if (!row) return notFound();

  const publiclyVisible =
    row.status === "published" && row.videoStatus === "approved" && !isMinor(row.birthDate);

  if (!publiclyVisible) {
    const session = await auth.api.getSession({ headers: await headers() });
    const allowed =
      !!session && (session.user.id === row.userId || session.user.role === "admin");
    if (!allowed) return notFound();
  }

  const file = await findProfileVideo(id);
  if (!file) return notFound();

  const { status, headers: rangeHeaders, stream } = openVideoStream(
    file.path,
    file.size,
    request.headers.get("range"),
  );

  return new Response(stream, {
    status,
    headers: {
      "Content-Type": file.mime,
      "Cache-Control": "private, max-age=0, must-revalidate",
      ...rangeHeaders,
    },
  });
}
