import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/db";
import { profile } from "@/db/schema";
import { auth } from "@/lib/auth";
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
    .select({ status: profile.status, userId: profile.userId })
    .from(profile)
    .where(eq(profile.id, id))
    .limit(1);
  if (!row) return notFound();

  if (row.status !== "published") {
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
