import type { NextRequest } from "next/server";
import { z } from "zod";
import { auth, type Session } from "@/lib/auth";
import { ApiError, type ApiErrorDetail } from "../http";
import { inlineSchema, schemaObject } from "./schemas";

/**
 * Definition de route : contrat ET implementation au meme endroit.
 *
 * C'est le coeur du dispositif. Une route se declare une fois ; la
 * specification OpenAPI et le code execute sont produits a partir du MEME
 * objet. Il devient donc impossible que la documentation mente sur ce que le
 * serveur fait vraiment : ajouter un champ au schema le rend visible dans
 * Scalar et valide dans le handler d'un seul geste.
 */

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/** Niveau d'acces exige. Absent = route publique. */
export type Access = "authenticated" | "candidate" | "recruiter" | "admin";

export interface ResponseSpec {
  description: string;
  schema?: z.ZodType;
  example?: unknown;
}

type Infer<T> = T extends z.ZodType ? z.output<T> : undefined;

interface HandlerContext<P, Q, B, A> {
  params: Infer<P>;
  query: Infer<Q>;
  body: Infer<B>;
  request: NextRequest;
  /** Non nul des qu'un `access` est declare : le wrapper a deja refuse sinon. */
  session: A extends Access ? Session : Session | null;
}

export interface RouteDefinition<
  P extends z.ZodType | undefined = undefined,
  Q extends z.ZodType | undefined = undefined,
  B extends z.ZodType | undefined = undefined,
  A extends Access | undefined = undefined,
> {
  method: HttpMethod;
  /** Chemin OpenAPI, accolades comprises : `/api/profiles/{id}`. */
  path: string;
  tags: string[];
  summary: string;
  description?: string;
  access?: A;
  params?: P;
  query?: Q;
  body?: B;
  /** Statut renvoye quand le handler rend des donnees. 200 par defaut. */
  successStatus?: number;
  responses: Record<string, ResponseSpec>;
  handler: (ctx: HandlerContext<P, Q, B, A>) => Promise<unknown> | unknown;
}

/** Table alimentee a l'import de chaque fichier de route. */
const registered: RouteDefinition<any, any, any, any>[] = [];

export function registeredRoutes(): readonly RouteDefinition<any, any, any, any>[] {
  return registered;
}

/* --------------------------------------------------------------------------
 * Lecture de la requete
 * ----------------------------------------------------------------------- */

/** Transforme les `issues` Zod en details d'erreur exploitables par le front. */
function toDetails(error: z.ZodError, scope: string): ApiErrorDetail[] {
  return error.issues.map((issue) => ({
    path: [scope, ...issue.path.map(String)].filter(Boolean).join("."),
    message: issue.message,
  }));
}

function parseOrThrow<T extends z.ZodType>(schema: T, value: unknown, scope: string): z.output<T> {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  throw ApiError.badRequest(
    `Parametres invalides (${scope}).`,
    toDetails(result.error, scope),
  );
}

/**
 * Champs de la requete declares comme tableaux.
 *
 * `?skills=Rigueur&skills=Autonomie` doit donner un tableau meme quand une
 * seule valeur est presente : sans cette liste, une valeur unique arriverait
 * en chaine et la validation echouerait. On lit la reponse dans le JSON Schema
 * plutot que dans les internes de Zod.
 */
function arrayFields(schema: z.ZodType): Set<string> {
  const json = inlineSchema(schema, "input") as {
    properties?: Record<string, { type?: string }>;
  };
  const out = new Set<string>();
  for (const [key, prop] of Object.entries(json.properties ?? {})) {
    if (prop?.type === "array") out.add(key);
  }
  return out;
}

function readQuery(url: URL, arrays: Set<string>): Record<string, unknown> {
  const raw: Record<string, unknown> = {};
  for (const key of new Set(url.searchParams.keys())) {
    const all = url.searchParams.getAll(key);
    raw[key] = arrays.has(key) ? all : all[all.length - 1];
  }
  return raw;
}

async function readBody(request: NextRequest): Promise<unknown> {
  const text = await request.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw ApiError.badRequest("Corps de requete illisible : JSON attendu.");
  }
}

async function requireAccess(request: NextRequest, access: Access): Promise<Session> {
  const session = (await auth.api.getSession({ headers: request.headers })) as Session | null;
  if (!session) throw ApiError.unauthorized();
  if (access === "authenticated") return session;
  if (session.user.role !== access) {
    throw ApiError.forbidden(`Cette ressource est reservee au role « ${access} ».`);
  }
  return session;
}

/* --------------------------------------------------------------------------
 * Fabrique de handlers
 * ----------------------------------------------------------------------- */

type NextRouteContext = { params?: Promise<Record<string, string | string[]>> };

/**
 * Declare une route et renvoie le handler Next.js correspondant.
 *
 * Usage dans `src/app/api/.../route.ts` :
 * `export const { GET } = defineRoute({ method: "GET", ... })`
 */
export function defineRoute<
  const M extends HttpMethod,
  P extends z.ZodType | undefined = undefined,
  Q extends z.ZodType | undefined = undefined,
  B extends z.ZodType | undefined = undefined,
  A extends Access | undefined = undefined,
>(
  definition: RouteDefinition<P, Q, B, A> & { method: M },
): { [K in M]: (request: NextRequest, context: NextRouteContext) => Promise<Response> } {
  registered.push(definition);

  // Memoise : le calcul du JSON Schema ne sert qu'a connaitre les champs
  // tableau, inutile de le refaire a chaque requete.
  let arrays: Set<string> | null = null;

  const handler = async (request: NextRequest, context: NextRouteContext): Promise<Response> => {
    try {
      const session = definition.access
        ? await requireAccess(request, definition.access)
        : null;

      let params: unknown;
      if (definition.params) {
        params = parseOrThrow(definition.params, (await context.params) ?? {}, "path");
      }

      let query: unknown;
      if (definition.query) {
        arrays ??= arrayFields(definition.query);
        query = parseOrThrow(definition.query, readQuery(new URL(request.url), arrays), "query");
      }

      let body: unknown;
      if (definition.body) {
        body = parseOrThrow(definition.body, await readBody(request), "body");
      }

      const result = await definition.handler({
        params,
        query,
        body,
        request,
        session,
      } as HandlerContext<P, Q, B, A>);

      if (result instanceof Response) return result;

      const status = definition.successStatus ?? 200;
      if (status === 204) return new Response(null, { status: 204 });
      return Response.json(result, { status });
    } catch (error) {
      if (error instanceof ApiError) {
        return Response.json(error.toJSON(), { status: error.status });
      }
      console.error(`[api] ${definition.method} ${definition.path} :`, error);
      return Response.json(
        { error: { code: "internal", message: "Erreur interne du serveur." } },
        { status: 500 },
      );
    }
  };

  return { [definition.method]: handler } as {
    [K in M]: (request: NextRequest, context: NextRouteContext) => Promise<Response>;
  };
}

/* --------------------------------------------------------------------------
 * Projection vers OpenAPI
 * ----------------------------------------------------------------------- */

interface OpenApiParameter {
  name: string;
  in: "path" | "query";
  required: boolean;
  description?: string;
  schema: Record<string, unknown>;
  style?: string;
  explode?: boolean;
}

/** Eclate un objet Zod en parametres OpenAPI individuels. */
function parametersFrom(
  schema: z.ZodType,
  location: "path" | "query",
): OpenApiParameter[] {
  const json = inlineSchema(schema, "input") as {
    properties?: Record<string, Record<string, unknown>>;
    required?: string[];
  };
  const required = new Set(json.required ?? []);

  return Object.entries(json.properties ?? {}).map(([name, propertySchema]) => {
    const { description, ...rest } = propertySchema;
    const parameter: OpenApiParameter = {
      name,
      in: location,
      required: location === "path" ? true : required.has(name),
      schema: rest,
    };
    if (typeof description === "string") parameter.description = description;
    if (rest.type === "array") {
      // `?skills=A&skills=B` : la forme que lit `readQuery`.
      parameter.style = "form";
      parameter.explode = true;
    }
    return parameter;
  });
}

/** Traduit une definition de route en objet « Operation » OpenAPI. */
export function operationOf(route: RouteDefinition<any, any, any, any>) {
  const parameters: OpenApiParameter[] = [
    ...(route.params ? parametersFrom(route.params, "path") : []),
    ...(route.query ? parametersFrom(route.query, "query") : []),
  ];

  const responses: Record<string, unknown> = {};
  for (const [status, spec] of Object.entries(route.responses)) {
    const media = spec.schema
      ? {
          schema: schemaObject(spec.schema, "output"),
          ...(spec.example !== undefined ? { example: spec.example } : {}),
        }
      : undefined;
    responses[status] = {
      description: spec.description,
      ...(media ? { content: { "application/json": media } } : {}),
    };
  }

  return {
    tags: route.tags,
    summary: route.summary,
    ...(route.description ? { description: route.description } : {}),
    operationId: operationIdOf(route),
    ...(parameters.length ? { parameters } : {}),
    ...(route.body
      ? {
          requestBody: {
            required: true,
            content: {
              "application/json": { schema: schemaObject(route.body, "input") },
            },
          },
        }
      : {}),
    responses,
    ...(route.access ? { security: [{ sessionCookie: [] }] } : {}),
  };
}

/** Identifiant stable, utilise par les generateurs de client cote front. */
function operationIdOf(route: RouteDefinition<any, any, any, any>): string {
  const segments = route.path
    .replace(/^\/api\//, "")
    .split("/")
    .filter(Boolean)
    .map((segment) =>
      segment.startsWith("{") ? `By${capitalize(segment.slice(1, -1))}` : capitalize(segment),
    );
  return route.method.toLowerCase() + segments.join("");
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
