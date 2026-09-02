/**
 * Client HTTP unique de l'application.
 *
 * Toutes les ecritures de l'interface passent par ici, et par les routes
 * `/api/*` documentees dans Scalar — jamais par un acces direct a la base
 * depuis un composant client. Les lectures initiales, elles, sont faites en
 * composant serveur via `src/server/services/*` : pas d'aller-retour reseau
 * pour afficher une page.
 *
 * Le serveur ne renvoie qu'une seule forme d'erreur (`ApiError`, cf.
 * src/server/http.ts) : on la deballe ici pour que chaque appelant recoive un
 * message deja lisible plutot que d'inventer le sien.
 */

export interface ApiErrorDetail {
  path: string;
  message: string;
}

export class ApiClientError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details: ApiErrorDetail[];

  constructor(status: number, code: string, message: string, details: ApiErrorDetail[] = []) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
}

export async function api<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, signal } = options;

  const response = await fetch(path, {
    method,
    signal,
    // Le cookie de session better-auth est httpOnly : sans cela, toute route
    // authentifiee repondrait 401 depuis le navigateur.
    credentials: "same-origin",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (response.status === 204) return undefined as T;

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const error = (payload as { error?: { code?: string; message?: string; details?: ApiErrorDetail[] } })
      ?.error;
    throw new ApiClientError(
      response.status,
      error?.code ?? "internal",
      error?.message ?? "Le serveur n'a pas pu traiter la demande.",
      error?.details ?? [],
    );
  }

  return payload as T;
}

/** Message affichable pour n'importe quelle exception remontee d'un appel. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiClientError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return "Une erreur inattendue est survenue.";
}
