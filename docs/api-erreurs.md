# API — spécification OpenAPI et réponses d'erreur

## 1. Où lire la spécification

| Ressource | URL | Contenu |
| --- | --- | --- |
| **Swagger UI** | `GET /api/swagger` | interface OpenAPI 3.0, « Try it out » activé |
| Scalar (interface de travail de l'équipe) | `GET /api/docs` | même spécification, autre rendu |
| Spécification brute | `GET /api/openapi` | JSON **OpenAPI 3.0.3**, généré depuis les routes |
| Copie hors ligne | [`../openapi.json`](../openapi.json) | export de `npm run openapi:export` |

La spécification n'est pas écrite à la main : chaque `route.ts` porte son
contrat (schémas Zod) **et** son implémentation. Le document 3.0.3 est produit
par `src/server/openapi/` ; `downgrade.ts` ramène le JSON Schema 2020-12 de Zod
à la sémantique 3.0. Validé avec `@apidevtools/swagger-cli validate` →
*openapi.json is valid*.

## 2. Modèle d'erreur unique

Toute réponse non-2xx a la **même** forme (`components.schemas.ApiError`) :

```jsonc
{
  "error": {
    "code": "bad_request",      // bad_request | unauthorized | forbidden | not_found | conflict | unprocessable | internal
    "message": "…",             // message lisible, en clair
    "details": [                // présent uniquement sur les erreurs de validation (400/422)
      { "path": "query.pageSize", "message": "Too big: expected number to be <=20" }
    ]
  }
}
```

Correspondance code ↔ statut : `bad_request` 400, `unauthorized` 401,
`forbidden` 403, `not_found` 404, `conflict` 409, `unprocessable` 422,
`internal` 500.

`401` vs `403` : **401** = aucune session (le front redirige vers la connexion) ;
**403** = session valide mais rôle insuffisant.

## 3. Les trois routes principales et leurs erreurs

Chaque réponse d'erreur ci-dessous est documentée dans la spécification avec le
**corps réellement renvoyé** en `example` (visible dans Swagger UI, section
*Responses*).

### 3.1 `GET /api/profiles` — catalogue public (tag *Catalogue*)

| Statut | Quand | Corps |
| --- | --- | --- |
| `200` | page de résultats | `ProfilePage` |
| `400` | paramètre hors vocabulaire, ou `pageSize > 20` (plafond CDC 3.4) | `ApiError` (`bad_request`, avec `details`) |

Fiche d'un profil — `GET /api/profiles/{id}` (même tag) :

| Statut | Quand | Corps |
| --- | --- | --- |
| `200` | profil publié | `Profile` |
| `404` | identifiant inconnu **ou** profil non `published` | `ApiError` (`not_found`) |

### 3.2 `PATCH /api/me/profile` — mise à jour de son profil (tag *Espace demandeur*)

| Statut | Quand | Corps |
| --- | --- | --- |
| `200` | profil mis à jour | `MyProfile` |
| `400` | corps refusé par la validation (ex. `title` > 120 caractères) | `ApiError` (`bad_request`, avec `details`) |
| `401` | pas de session | `ApiError` (`unauthorized`) |
| `403` | session `recruiter` ou `admin` (route réservée `candidate`) | `ApiError` (`forbidden`) |
| `404` | compte candidat sans profil rattaché | `ApiError` (`not_found`) |

### 3.3 `PUT /api/me/certification/answers` — enregistrer des réponses (tag *Certification*)

| Statut | Quand | Corps |
| --- | --- | --- |
| `200` | réponses fusionnées, état recalculé | `CertificationState` |
| `400` | corps illisible : `answers` absent, ou valeur non entière | `ApiError` (`bad_request`, avec `details`) |
| `401` | pas de session | `ApiError` (`unauthorized`) |
| `403` | session de rôle autre que `candidate` | `ApiError` (`forbidden`) |
| `422` | corps valide mais clé ne désignant aucune question, ou valeur hors barème de la question | `ApiError` (`unprocessable`) |

## 4. Preuve par `curl`

Serveur : `http://localhost:3000`, base peuplée par `npm run db:seed`.
Session ouverte au préalable pour les cas authentifiés :

```bash
curl -s http://localhost:3000/api/auth/sign-in/email \
  -H 'Content-Type: application/json' -H 'Origin: http://localhost:3000' \
  -c cookies.txt -d '{"email":"amina@exemple.fr","password":"demo"}'   # compte candidate
```

### 400 — `GET /api/profiles`, `pageSize` au-delà du plafond

```console
$ curl -s -i 'http://localhost:3000/api/profiles?pageSize=50'
HTTP/1.1 400 Bad Request

{"error":{"code":"bad_request","message":"Parametres invalides (query).","details":[{"path":"query.pageSize","message":"Too big: expected number to be <=20"}]}}
```

### 401 — `GET /api/me/profile` sans session

```console
$ curl -s -i http://localhost:3000/api/me/profile
HTTP/1.1 401 Unauthorized

{"error":{"code":"unauthorized","message":"Authentification requise."}}
```

### 403 — session `candidate` sur une route `admin`

```console
$ curl -s -i -b cookies.txt http://localhost:3000/api/admin/stats
HTTP/1.1 403 Forbidden

{"error":{"code":"forbidden","message":"Cette ressource est reservee au role « admin »."}}
```

> La même erreur sur une route principale :
> `curl -s -i -b cookies_recruteur.txt -X PATCH http://localhost:3000/api/me/profile -d '{"title":"x"}' -H 'Content-Type: application/json' -H 'Origin: http://localhost:3000'`
> →`403` `{"error":{"code":"forbidden","message":"Cette ressource est reservee au role « candidate »."}}`

### 404 — `GET /api/profiles/{id}` inconnu

```console
$ curl -s -i http://localhost:3000/api/profiles/profil-inexistant
HTTP/1.1 404 Not Found

{"error":{"code":"not_found","message":"Ce profil n'existe pas ou n'est pas publie."}}
```

### 422 — `PUT /api/me/certification/answers`, question inexistante

```console
$ curl -s -i -X PUT http://localhost:3000/api/me/certification/answers \
    -b cookies.txt -H 'Content-Type: application/json' -H 'Origin: http://localhost:3000' \
    -d '{"answers":{"question-inexistante":3}}'
HTTP/1.1 422 Unprocessable Entity

{"error":{"code":"unprocessable","message":"Question inconnue : question-inexistante."}}
```

### 400 avec `details` de validation de corps (bonus)

```console
$ curl -s -X PUT http://localhost:3000/api/me/certification/answers \
    -b cookies.txt -H 'Content-Type: application/json' -H 'Origin: http://localhost:3000' -d '{}'
{"error":{"code":"bad_request","message":"Parametres invalides (body).","details":[{"path":"body.answers","message":"Invalid input: expected record, received undefined"}]}}
```
