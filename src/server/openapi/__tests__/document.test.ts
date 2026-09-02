import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { buildOpenApiDocument } from "../document";
import { registeredRoutes } from "../routes";

/**
 * Garde-fous de la specification.
 *
 * Ces tests ne verifient pas le metier : ils verifient que la documentation ne
 * peut pas mentir. C'est le seul endroit ou une erreur passerait inapercue,
 * puisqu'une route oubliee au manifeste continue de fonctionner — elle
 * disparait simplement de Scalar, et le front ne sait pas qu'elle existe.
 */

const API_DIR = join(process.cwd(), "src/app/api");

/** Routes servies par une bibliotheque ou qui servent la doc elle-meme. */
const NOT_IN_MANIFEST = [
  "auth/[...all]/route.ts",
  "openapi/route.ts",
  "docs/route.ts",
  "swagger/route.ts",
  "me/profile/video/route.ts",
  "videos/[id]/route.ts",
];

function findRouteFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...findRouteFiles(full));
    else if (entry === "route.ts") out.push(relative(API_DIR, full));
  }
  return out;
}

describe("manifeste", () => {
  it("importe tous les fichiers de route du projet", () => {
    const manifest = readFileSync(join(process.cwd(), "src/server/openapi/manifest.ts"), "utf8");

    const missing = findRouteFiles(API_DIR)
      .filter((file) => !NOT_IN_MANIFEST.includes(file))
      .filter((file) => !manifest.includes(`@/app/api/${file.replace(/\.ts$/, "")}`));

    expect(missing, "routes absentes de src/server/openapi/manifest.ts").toEqual([]);
  });
});

describe("document OpenAPI", () => {
  const document = buildOpenApiDocument();

  it("declare toutes les routes enregistrees", () => {
    for (const route of registeredRoutes()) {
      const path = document.paths[route.path] as Record<string, unknown> | undefined;
      expect(path, `${route.method} ${route.path} absent du document`).toBeDefined();
      expect(path![route.method.toLowerCase()]).toBeDefined();
    }
  });

  it("n'attribue jamais deux fois le meme operationId", () => {
    const seen = new Map<string, string>();
    for (const [path, operations] of Object.entries(document.paths)) {
      for (const [method, operation] of Object.entries(operations as Record<string, { operationId?: string }>)) {
        const id = operation.operationId;
        if (!id) continue;
        expect(seen.has(id), `operationId « ${id} » deja utilise par ${seen.get(id)}`).toBe(false);
        seen.set(id, `${method.toUpperCase()} ${path}`);
      }
    }
  });

  it("ne laisse aucune reference pendante vers components.schemas", () => {
    const defined = new Set(Object.keys(document.components.schemas));
    const dangling: string[] = [];

    const walk = (node: unknown) => {
      if (Array.isArray(node)) return node.forEach(walk);
      if (!node || typeof node !== "object") return;
      for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
        if (key === "$ref" && typeof value === "string") {
          const name = value.replace("#/components/schemas/", "");
          if (!defined.has(name)) dangling.push(value);
        } else walk(value);
      }
    };

    walk(document.paths);
    walk(document.components.schemas);
    expect(dangling).toEqual([]);
  });

  it("protege toute route non publique par le cookie de session", () => {
    for (const route of registeredRoutes()) {
      if (!route.access) continue;
      const operation = (document.paths[route.path] as Record<string, { security?: unknown[] }>)[
        route.method.toLowerCase()
      ];
      expect(operation.security, `${route.method} ${route.path}`).toEqual([{ sessionCookie: [] }]);
    }
  });

  it("documente une reponse d'erreur pour chaque route protegee", () => {
    for (const route of registeredRoutes()) {
      if (!route.access) continue;
      expect(Object.keys(route.responses), `${route.method} ${route.path}`).toContain("401");
    }
  });
});
