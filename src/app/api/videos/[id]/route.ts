import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/db";
import { profile, user } from "@/db/schema";
import { auth } from "@/lib/auth";
import { isMinor } from "@/lib/age";
import { findProfileVideo, openVideoStream } from "@/server/services/video";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function notFound(): Response {
  return Response.json(
    { error: { code: "not_found", message: "Vidéo introuvable." } },
    { status: 404 },
  );
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;

  const [row] = await db
    .select({ status: profile.status, userId: profile.userId, birthDate: user.birthDate })
    .from(profile)
    .innerJoin(user, eq(user.id, profile.userId))
    .where(eq(profile.id, id))
    .limit(1);
  if (!row) return notFound();

  /**
   * Deux motifs distincts de restriction, un seul controle d'acces.
   *
   * - profil non publie : la moderation ne l'a pas encore valide ;
   * - titulaire mineur (16-18 ans) : sa video n'est pas diffusee publiquement
   *   par defaut (R.1). Le profil peut exister et etre publie, la video reste
   *   reservee a son titulaire et a l'administration.
   *
   * Dans les deux cas la reponse est 404 et non 403 : un 403 confirmerait
   * l'existence d'une video de mineur a qui la demande.
   */
  const restricted = row.status !== "published" || isMinor(row.birthDate);

  if (restricted) {
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
