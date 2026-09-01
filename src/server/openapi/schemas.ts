import { z } from "zod";

/**
 * Registre des schemas nommes de l'API.
 *
 * Tout schema passe par `named()` finit dans `components.schemas` de la
 * specification, et les schemas qui l'utilisent y font `$ref`. Resultat : la
 * documentation montre `Profile` une fois, pas quatorze copies inline, et un
 * generateur de client cote front produit de vrais types reutilisables.
 */
export const apiRegistry = z.registry<{ id: string }>();

/** Enregistre un schema sous un nom et le renvoie inchange. */
export function named<T extends z.ZodType>(id: string, schema: T): T {
  apiRegistry.add(schema, { id });
  return schema;
}

/* --------------------------------------------------------------------------
 * Conversion Zod -> JSON Schema
 * ----------------------------------------------------------------------- */

type JsonSchema = Record<string, unknown>;

/** Bornes ajoutees par Zod sur les entiers : exactes, mais illisibles en doc. */
const SAFE_INT_MIN = -9007199254740991;
const SAFE_INT_MAX = 9007199254740991;

/**
 * Nettoie la sortie de Zod pour OpenAPI : retire les mots-cles propres au
 * document JSON Schema autonome (`$schema`, `$id`) et les bornes d'entier
 * implicites, qui n'apportent rien au lecteur.
 */
function clean(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(clean);
  if (value === null || typeof value !== "object") return value;

  const source = value as JsonSchema;
  const out: JsonSchema = {};
  for (const [key, entry] of Object.entries(source)) {
    if (key === "$schema" || key === "$id") continue;
    if (key === "minimum" && entry === SAFE_INT_MIN && source.type === "integer") continue;
    if (key === "maximum" && entry === SAFE_INT_MAX && source.type === "integer") continue;
    // Un `format` dit deja ce que la regex verifie, et les regexes de dates de
    // Zod font trois lignes : elles rendent la doc illisible pour rien.
    if (key === "pattern" && typeof source.format === "string") continue;
    out[key] = clean(entry);
  }
  return out;
}

const REF_PREFIX = "#/components/schemas/";

/** Construit le bloc `components.schemas` a partir de tout le registre. */
export function buildComponentSchemas(): Record<string, JsonSchema> {
  const generated = z.toJSONSchema(apiRegistry, {
    target: "draft-2020-12",
    uri: (id) => `${REF_PREFIX}${id}`,
    io: "output",
    unrepresentable: "any",
  });

  const out: Record<string, JsonSchema> = {};
  for (const [id, schema] of Object.entries(generated.schemas)) {
    out[id] = clean(schema) as JsonSchema;
  }
  return out;
}

/** Nom sous lequel un schema est enregistre, s'il l'est. */
export function refIdOf(schema: z.ZodType): string | undefined {
  return apiRegistry.get(schema)?.id;
}

/**
 * Reference OpenAPI d'un schema nomme, ou sa forme inline s'il ne l'est pas.
 *
 * Les corps de requete et les reponses passent par ici : un schema nomme reste
 * un `$ref` (une seule definition dans la doc), un schema anonyme est developpe
 * sur place.
 */
export function schemaObject(schema: z.ZodType, io: "input" | "output" = "output"): JsonSchema {
  const id = refIdOf(schema);
  if (id) return { $ref: `${REF_PREFIX}${id}` };
  return inlineSchema(schema, io);
}

/**
 * Convertit un schema sans passer par le registre : utilise pour les parametres
 * de requete, qui doivent etre eclates champ par champ et ne peuvent donc pas
 * etre un `$ref` vers un objet.
 */
export function inlineSchema(schema: z.ZodType, io: "input" | "output" = "output"): JsonSchema {
  return clean(
    z.toJSONSchema(schema, {
      target: "draft-2020-12",
      io,
      unrepresentable: "any",
    }),
  ) as JsonSchema;
}
