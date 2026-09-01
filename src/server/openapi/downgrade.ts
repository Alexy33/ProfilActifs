type Json = Record<string, unknown>;

const UNSUPPORTED_KEYWORDS = new Set([
  "propertyNames",
  "patternProperties",
  "prefixItems",
  "unevaluatedProperties",
  "unevaluatedItems",
  "dependentSchemas",
  "dependentRequired",
  "$defs",
  "$anchor",
  "$dynamicRef",
  "$dynamicAnchor",
  "if",
  "then",
  "else",
]);

function isNullType(node: unknown): boolean {
  return (
    !!node &&
    typeof node === "object" &&
    !Array.isArray(node) &&
    (node as Json).type === "null" &&
    Object.keys(node as Json).length === 1
  );
}

export function downgradeToOpenApi30<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => downgradeToOpenApi30(item)) as unknown as T;
  }
  if (value === null || typeof value !== "object") return value;

  const source = value as Json;
  const out: Json = {};

  for (const [key, raw] of Object.entries(source)) {
    if (UNSUPPORTED_KEYWORDS.has(key)) continue;

    if (key === "type" && Array.isArray(raw)) {
      const concrete = raw.filter((t) => t !== "null");
      if (raw.includes("null")) out.nullable = true;
      out.type = concrete.length === 1 ? concrete[0] : concrete;
      continue;
    }

    if ((key === "anyOf" || key === "oneOf") && Array.isArray(raw)) {
      const branches = raw.filter((branch) => !isNullType(branch));
      if (branches.length !== raw.length) out.nullable = true;

      if (branches.length === 1) {
        const merged = downgradeToOpenApi30(branches[0]) as Json;
        for (const [k, v] of Object.entries(merged)) {
          if (!(k in out)) out[k] = v;
        }
      } else {
        out[key] = branches.map((branch) => downgradeToOpenApi30(branch));
      }
      continue;
    }

    if (key === "const") {
      out.enum = [downgradeToOpenApi30(raw)];
      continue;
    }

    if (key === "examples" && Array.isArray(raw)) {
      if (raw.length > 0) out.example = downgradeToOpenApi30(raw[0]);
      continue;
    }

    if ((key === "exclusiveMinimum" || key === "exclusiveMaximum") && typeof raw === "number") {
      out[key === "exclusiveMinimum" ? "minimum" : "maximum"] = raw;
      out[key] = true;
      continue;
    }

    out[key] = downgradeToOpenApi30(raw);
  }

  if (typeof out.$ref === "string" && Object.keys(out).length > 1) {
    const { $ref, ...siblings } = out;
    return { allOf: [{ $ref }], ...siblings } as unknown as T;
  }

  return out as unknown as T;
}
