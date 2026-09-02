# Vidéo de présentation — upload direct et lecture

Référence : CDC §2.1 (« publication de vidéos… lien externe **ou upload** »),
§3.2 (« upload direct… max 100 Mo », « prévisionnement… sans quitter la page »).

## 1. Deux sources, une seule colonne

`profile.videoUrl` (texte, nullable) porte **toujours une URL** :

| Source | Valeur de `videoUrl` | Lecture |
| --- | --- | --- |
| Lien YouTube / Vimeo | l'URL saisie (`https://youtu.be/…`) | `<iframe>` côté front |
| **Upload direct** | `/api/videos/{profileId}?t=<ts>` | `GET /api/videos/{profileId}` (ce doc) |

Aucune migration : le fichier vit sur disque, la ligne ne change pas de forme.
Le front traite les deux cas comme « une URL » : `describeVideo`
(`src/lib/video.ts`) classe la valeur, et `VideoFrame`
(`src/components/profil/video-frame.tsx`) rend selon le cas une balise
`<video>`, un `<iframe>` d'integration, ou la planche « aucune vidéo ».
Une URL non reconnue devient un lien sortant — jamais un lecteur qui
afficherait « vidéo indisponible ».

Le televersement se fait depuis l'espace demandeur
(`src/components/espace/video-field.tsx`) : selecteur de fichier, refus local
au-dela de 100 Mo ou hors format, puis `PUT` du fichier en corps de requete.

## 2. Stockage

| Contexte | Dossier | Défini par |
| --- | --- | --- |
| Hors Docker | `./uploads` | `dirname(DATABASE_URL)/uploads` |
| Docker | `/data/uploads` (volume `db-data-dev` / `-prod`) | idem, `DATABASE_URL=file:/data/…` |
| Forçable | `$VIDEO_UPLOAD_DIR` | variable d'environnement |

`/data` est le **seul point d'écriture** de l'image de production (`read_only`).
Un fichier par profil : `{profileId}.{mp4|webm|ogv|mov}`. Écriture dans un
`.part` puis `rename` atomique — pas de demi-fichier servi.

Logique : `src/server/services/video.ts`.

## 3. Routes

### `PUT /api/me/profile/video` — téléverser

- Accès : session **candidate**.
- Le **corps de la requête est le fichier**. `Content-Type` obligatoire et
  déterminant : `video/mp4`, `video/webm`, `video/ogg`, `video/quicktime`.
- Plafond **100 Mo**, appliqué **en streaming** : le flux est lu par blocs et
  coupé dès le dépassement — la requête n'est jamais mise en mémoire en entier.
- Réponse `200` : le profil (`MyProfile`), `videoUrl` mis à jour.

```bash
curl -X PUT http://localhost:3000/api/me/profile/video \
  -b cookies.txt \
  -H 'Content-Type: video/mp4' \
  --data-binary @presentation.mp4
```

| Statut | Cause |
| --- | --- |
| `400` | corps vide |
| `401` | pas de session |
| `403` | session non `candidate` |
| `404` | aucun profil rattaché au compte |
| `422` | fichier > 100 Mo, ou `Content-Type` non pris en charge |

### `DELETE /api/me/profile/video` — retirer

Accès **candidate**. Supprime le fichier, remet `videoUrl` à `null`. Idempotent.
Réponse `200` : `MyProfile`.

### `GET /api/videos/{id}` — lire

- `id` = `profile.id`.
- **Public seulement si les trois conditions sont réunies** : profil
  `published`, vidéo `approved`, titulaire majeur. Sinon, réservé au titulaire
  ou à un admin ; tout autre appelant reçoit `404`, **y compris en connaissant
  l'adresse directe** (cf. §6).
- Gère l'en-tête **`Range`** → `206 Partial Content` avec `Content-Range`, pour
  que la balise `<video>` puisse chercher dans la timeline sans re-télécharger.
- En-têtes : `Content-Type`, `Accept-Ranges: bytes`, `Cache-Control: private`.

```bash
curl -H 'Range: bytes=0-1048575' http://localhost:3000/api/videos/<profileId>
# → HTTP/1.1 206 Partial Content
#   Content-Range: bytes 0-1048575/5242880
```

## 4. Documentation & tests

- Contrat OpenAPI (routes binaires, décrites à la main) :
  `src/server/openapi/video-paths.ts` → visible dans Scalar (`/api/docs`) et
  Swagger (`/api/swagger`).
- Couverture e2e : `e2e/video.spec.ts` (upload, `Range`, plafond 100 Mo, type
  refusé, 401/403, suppression, présence dans la spec) et
  `e2e/moderation-video.spec.ts` (inaccessibilité d'une vidéo en attente,
  refus motivé, exclusion des mineurs, absence de compteurs publics).

## 5. Ce qui n'est volontairement pas fait (démonstrateur)

Pas de contrôle des *magic bytes* (seul le `Content-Type` est vérifié), pas de
transcodage / vignette / antivirus, pas de table de métadonnées dédiée, pas de
stockage objet. Pour du multi-instance, remplacer les fonctions de
`video.ts` par un client S3 : les routes ne changent pas.

## 6. Modération a priori (mesure Cabinet du 2026-09-02)

Une vidéo déposée **n'est visible de personne** tant qu'un administrateur ne
l'a pas validée. La modération *a posteriori* n'était pas tenable sur un
service public : la responsabilité du contenu court dès sa mise en ligne.

### États

`profile.videoStatus` ∈ `pending` | `approved` | `rejected`.

- Tout dépôt — fichier **ou** lien externe — place la vidéo en `pending`.
  Remplacer une vidéo déjà validée la replace en attente : sans cela, on
  validerait une vidéo anodine avant de lui en substituer une autre.
- `rejected` porte un **motif obligatoire** (`videoReviewReason`), refusé au
  niveau du contrat Zod et non seulement dans l'écran. Une vidéo qui disparaît
  sans explication est un contentieux qui commence.
- La décision est **tracée** : `videoReviewedBy` (l'administrateur) et
  `videoReviewedAt`.

### Où la règle est appliquée

Une seule fonction décide, `isVideoPublic` / `publicVideoUrl`
(`src/server/services/video-moderation.ts`), et **toutes** les lectures y
passent : catalogue, fiche, favoris et suivi recruteur (via `toCard`), flux de
fichier (`GET /api/videos/{id}`). Une route ne peut donc pas diverger par
oubli — et le retrait porte sur ce que le **serveur renvoie**, pas seulement
sur ce que la page affiche : `videoUrl` vaut `null` dans la réponse JSON.

Le titulaire, lui, garde l'accès à son propre dépôt via `ownVideoUrl` : il doit
pouvoir revoir ce qu'il a envoyé, et l'administration doit pouvoir le modérer.

### Vidéos déjà déposées

La migration `0002` bascule **toutes** les vidéos existantes en `pending` : une
mesure qui ne s'appliquerait qu'aux dépôts futurs ne protégerait personne.
Celles qui avaient déjà été consultées (profil avec `views > 0`) sont en outre
marquées `videoSeenBeforeReview` : elles sont retirées comme les autres **et**
signalées en tête de la file de modération, pour être traitées en priorité. Une
vidéo déjà vue ne peut pas être « dé-vue », mais la laisser en ligne en
attendant une revue reviendrait à maintenir un contenu non validé.

### Vérification

```bash
# Vidéo en attente, adresse directe, aucune session (navigation privée) :
curl -i http://localhost:3000/api/videos/<profileId>
# → HTTP/1.1 404 Not Found
#   {"error":{"code":"not_found","message":"Vidéo introuvable."}}
```

Capture jointe au dossier :
`test-results/video-en-attente-navigation-privee.png`, produite par
`e2e/moderation-video.spec.ts` dans un contexte de navigateur vierge.

## 7. Âge et diffusion (mesure Cabinet du 2026-09-02, point 1)

`user.birthDate` est **obligatoire** à l'inscription ; en dessous de 16 ans
(`MIN_SIGNUP_AGE`) le compte n'est pas créé. Le contrôle vit dans le hook
`databaseHooks.user.create.before` (`src/lib/auth.ts`) — c'est-à-dire sur le
seul chemin de création de compte, l'écran seul étant contournable.

En dessous de 18 ans (`MINOR_AGE`), le profil est **exclu du catalogue public**
et la vidéo n'est jamais diffusée, même validée. Une date de naissance
**absente** vaut « mineur » : les comptes antérieurs à la mesure sont donc
retirés du catalogue tant qu'ils ne sont pas régularisés, le doute ne profitant
pas à la publication.

L'exclusion est faite **en SQL, avant le comptage et la pagination**
(`searchCatalog`) : filtrée après coup, elle afficherait « 12 résultats » en
n'en montrant que 9.
