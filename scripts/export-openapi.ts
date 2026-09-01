import { writeFileSync } from "node:fs";
import { buildOpenApiDocument } from "@/server/openapi/document";

/**
 * Ecrit la specification dans `openapi.json`, a la racine.
 *
 * Sert a la partager hors ligne : le fichier s'ouvre dans Scalar, Swagger UI ou
 * Postman, et alimente les generateurs de client TypeScript cote front. Il est
 * regenere, jamais edite a la main.
 *
 *   npm run openapi:export
 */
const target = process.argv[2] ?? "openapi.json";
const document = buildOpenApiDocument();

writeFileSync(target, `${JSON.stringify(document, null, 2)}\n`);

const operations = Object.values(document.paths).reduce<number>(
  (total, methods) => total + Object.keys(methods as object).length,
  0,
);

console.log(
  `[openapi] ${target} — ${Object.keys(document.paths).length} chemins, ${operations} operations, ${Object.keys(document.components.schemas).length} schemas.`,
);
