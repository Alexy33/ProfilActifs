import { buildOpenApiDocument } from "@/server/openapi/document";

/**
 * Specification OpenAPI 3.1, generee a la demande depuis les routes
 * enregistrees (CDC 3.1 : « API RESTful documentee »).
 *
 * Rien n'est ecrit a la main : ajouter une route et l'inscrire au manifeste
 * suffit a la faire apparaitre ici, et donc dans Scalar.
 */
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(buildOpenApiDocument());
}
