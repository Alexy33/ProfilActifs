/**
 * Modele d'erreur unique de l'API.
 *
 * Toute reponse non-2xx sort d'ici, avec la meme forme JSON. Le front n'a donc
 * qu'un seul cas a coder, et la specification n'a qu'un seul schema d'erreur a
 * documenter (`ApiError`).
 */

export type ApiErrorCode =
  | "bad_request"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "unprocessable"
  | "internal";

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  bad_request: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  unprocessable: 422,
  internal: 500,
};

/** Detail de validation, aligne sur la forme des `issues` de Zod. */
export interface ApiErrorDetail {
  /** Chemin du champ fautif, ex. `body.title` ou `query.page`. */
  path: string;
  message: string;
}

/**
 * Erreur metier levee depuis un handler. Le wrapper de route la transforme en
 * reponse JSON : c'est le SEUL moyen de renvoyer une erreur, pour qu'aucune
 * route ne puisse inventer sa propre forme.
 */
export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly details?: ApiErrorDetail[];

  constructor(code: ApiErrorCode, message: string, details?: ApiErrorDetail[]) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = STATUS_BY_CODE[code];
    this.details = details;
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.details?.length ? { details: this.details } : {}),
      },
    };
  }

  static badRequest(message: string, details?: ApiErrorDetail[]) {
    return new ApiError("bad_request", message, details);
  }
  static unauthorized(message = "Authentification requise.") {
    return new ApiError("unauthorized", message);
  }
  static forbidden(message = "Vous n'avez pas les droits necessaires.") {
    return new ApiError("forbidden", message);
  }
  static notFound(message = "Ressource introuvable.") {
    return new ApiError("not_found", message);
  }
  static conflict(message: string) {
    return new ApiError("conflict", message);
  }
  static unprocessable(message: string, details?: ApiErrorDetail[]) {
    return new ApiError("unprocessable", message, details);
  }
}
