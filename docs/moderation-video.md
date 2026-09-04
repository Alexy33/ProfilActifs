# R.2 — Modération des vidéos avant publication

Une vidéo déposée n'est **visible de personne** tant que l'administration ne l'a
pas validée. Le contrôle tient à la route qui sert le fichier, pas au fait que
l'interface n'affiche pas de lien : l'URL directe répond `404`.

## 1. Un statut propre à la vidéo

Quatre colonnes sur `profile` (`drizzle/0004_chief_black_queen.sql`) :

| Colonne | Rôle |
| --- | --- |
| `video_status` | `pending` \| `approved` \| `rejected` |
| `video_review_reason` | motif de la décision, communiqué au candidat |
| `video_reviewed_by` | administrateur qui a décidé (`user.id`, `ON DELETE SET NULL`) |
| `video_reviewed_at` | date et heure de la décision |

Le statut est **distinct de `profile.status`**. Un profil déjà publié qui
remplace sa vidéo repasse la nouvelle en `pending` sans quitter le catalogue :
confondre les deux obligerait à dépublier une personne entière pour réexaminer
un seul fichier. Symétriquement, refuser une vidéo ne dépublie pas le profil.

`video_reviewed_by` est en `SET NULL` et non en `CASCADE` : la suppression d'un
compte d'administration ne doit pas effacer les décisions prises, seulement leur
auteur.

## 2. Ce qui remet une vidéo en attente

`resetVideoModeration` (`src/server/services/video.ts`) est appelé à chaque fois
que le contenu change :

| Événement | Route |
| --- | --- |
| Téléversement d'un fichier | `PUT /api/me/profile/video` (dans `saveProfileVideo`) |
| Suppression du fichier | `DELETE /api/me/profile/video` |
| Changement du lien YouTube/Vimeo | `PATCH /api/me/profile` (si `videoUrl` diffère) |
| Retrait du consentement (R.3) | `DELETE /api/me/profile/video/consent` |

La décision précédente est **effacée**, pas conservée : elle portait sur un autre
fichier. La garder afficherait au candidat le motif d'un refus qui ne concerne
plus rien, ou — pire — laisserait un fichier neuf hériter d'une validation.

### Un refus n'est pas une conservation indéfinie (R.5)

Le fichier d'une vidéo **refusée** est effacé **30 jours** après la décision
(`src/server/services/retention.ts`). Trente jours laissent au candidat le temps
de lire le motif et de redéposer ; au-delà, conserver l'image et la voix d'une
personne pour une vidéo qui ne sera jamais diffusée n'a plus de finalité.

Ce qui part est le fichier, et lui seul : `video_status`,
`video_review_reason`, `video_reviewed_by` et `video_reviewed_at` survivent et
disent pourquoi il n'y a plus rien à voir. Voir
`docs/registre-traitements.md`.

## 3. L'interface d'administration

Onglet **Vidéos** de `/admin` (`src/components/admin/video-moderation.tsx`). Un
onglet et non une colonne de plus dans la file des profils : l'objet est
différent, le critère de décision est différent (il faut *regarder* le fichier),
et l'effet n'est pas le même.

L'administrateur y voit la vidéo **avant** qu'elle soit diffusable — c'est le
seul endroit du dispositif où une vidéo `pending` est servie, et c'est ce qui
rend la décision possible. Le badge de l'onglet compte les vidéos en attente.

```
PATCH /api/admin/videos/{profileId}
{ "decision": "approved" }
{ "decision": "rejected", "reason": "Le son est inaudible…" }
```

Le motif est **obligatoire au refus** et **refusé à la validation**
(`DecideVideoBody`, `src/server/contracts/admin.ts`) : un refus sans motif ne
serait pas communicable, et un motif accroché à une validation laisserait croire
à une réserve là où il n'y en a pas. La règle est portée par le contrat, donc
appliquée à l'entrée **et** visible dans Scalar.

Chaque décision écrit les quatre colonnes ensemble et notifie le titulaire
(`notification`, type `moderation`).

## 4. Ce que voit le candidat

`GET /api/me/profile` porte `videoModeration` (statut, motif, nom du décideur,
date). L'espace candidat affiche un bandeau au-dessus du bloc de consentement :

- `pending` — « visible de vous seul et de l'administration » ;
- `approved` — « visible des recruteurs » ;
- `rejected` — **le motif tel qu'il a été saisi**, avec la date et l'auteur.

`videoModeration` ne sort **pas** de l'espace du titulaire : comme le
consentement (R.3), il est retiré de la fiche publique par `findProfileById`. Un
recruteur n'a pas à savoir ce qui a été reproché à une vidéo — il ne voit que
celles qui sont validées.

## 5. Une vidéo `pending` est inaccessible

Deux verrous, volontairement redondants :

1. **La route** `GET /api/videos/{id}` (`src/app/api/videos/[id]/route.ts`)
   répond `404` si `video_status !== 'approved'`, sauf au titulaire et à
   l'administration. `404` et non `403` : un `403` confirmerait l'existence de
   la vidéo à qui la demande.
2. **Le contrat** : `toFull` (`src/server/services/profiles.ts`) retire
   `videoUrl` de la fiche pour tout autre lecteur — sinon la page afficherait un
   lecteur qui ne charge jamais.

Le premier suffit à la sécurité ; le second évite une interface qui ment. C'est
la même mécanique que le masquage des vidéos de mineurs (R.1), et elle est
écrite au même endroit.

## 6. Migration des vidéos existantes

État choisi : **`pending`** (`drizzle/0004_chief_black_queen.sql`).

Aucune des vidéos déjà en base n'avait été examinée. Les laisser visibles
reviendrait à exempter de modération tout ce qui précède l'exigence,
c'est-à-dire à ne pas la satisfaire. Elles redeviennent visibles dès qu'un
administrateur les valide, sans que leur profil ne quitte le catalogue.

La migration porte un `UPDATE` explicite **en plus** du `DEFAULT 'pending'` de
la colonne : la décision doit se lire dans la migration, pas se déduire d'une
valeur par défaut.

### Celles qui avaient déjà été consultées par un recruteur

Trois options se présentaient : les retirer, les laisser, les signaler. **Nous
les retirons**, sans exception ni traitement particulier.

Les laisser aurait créé deux régimes selon un critère qui n'a rien à voir avec
le contenu : une vidéo problématique serait restée en ligne parce qu'elle avait
été vue, pendant qu'une vidéo irréprochable attendait parce qu'elle ne l'avait
pas été. C'est l'inverse de ce que la modération a priori cherche à établir.

Les signaler — les marquer « vue avant modération » et les laisser accessibles —
revenait à laisser en ligne un contenu dont nous disons nous-mêmes qu'il n'a pas
été examiné. Le signalement ne déplace pas la responsabilité, il la documente.

Nous ne disposons d'ailleurs pas de l'information : le dispositif ne journalise
pas qui a consulté quelle vidéo. `profile.views` est un compteur agrégé, privé
au titulaire (R.4), sans identité ni date. Distinguer les vidéos « déjà vues »
supposerait de créer ce journal, c'est-à-dire d'enregistrer qui regarde qui —
une collecte que nous n'avons ni la finalité ni la base légale d'ouvrir, et que
le registre des traitements ne prévoit pas.

**Aucun recruteur n'est prévenu** qu'une vidéo qu'il avait consultée est
redevenue indisponible. Une notification supposerait le même journal, et elle
n'apporterait rien : le recruteur constate l'absence sur la fiche, et rien ne
lui avait été promis quant à la permanence du contenu.

**Le candidat, lui, voit le changement** : son espace affiche « Vidéo en attente
de validation » et la vidéo reste lisible pour lui seul. Il n'est pas notifié pour
autant — le lot migré concerne tout le monde en même temps, et une notification
de masse annonçant un retour en attente serait plus inquiétante
qu'informative. Il retrouve la diffusion dès la validation.

Le jeu de démonstration (`npm run db:seed`) montre les trois états : la vidéo de
**Marion Estève** reste en attente (profil pourtant publié), celle de **Yann
Kervella** est refusée avec motif, les autres sont validées.

## 7. Preuves

`e2e/video-moderation.spec.ts` — quatre scénarios :

1. dépôt → `pending`, `404` pour l'anonyme **et** pour le recruteur connecté,
   `200` pour le titulaire et l'administration, `videoUrl` absente de la fiche
   publique ;
2. validation → la même URL répond `200` à un visiteur anonyme ;
3. refus sans motif → `400` ; refus motivé → `404` public et motif rendu au
   candidat sur `/api/me/profile` ; nouveau dépôt → retour à `pending` ;
4. `/api/admin/videos` : `401` anonyme, `403` candidat, `200` admin.

### Captures en navigation privée

| Fichier | Ce qu'il montre |
| --- | --- |
| `docs/captures/r2/01-video-pending-navigation-privee.png` | l'URL directe d'une vidéo `pending` → `{"error":{"code":"not_found"}}` |
| `docs/captures/r2/02-fiche-publique-sans-video.png` | la fiche publique du même profil → « Aucune présentation vidéo » |
| `docs/captures/r2/03-admin-onglet-videos.png` | l'onglet **Vidéos** de `/admin` : les trois états, le lecteur, le motif |
| `docs/captures/r2/04-candidat-motif-refus.png` | l'espace candidat de Yann Kervella : « Vidéo refusée » et son motif |

Les deux premières sont prises en navigation privée ; les deux suivantes sont
les écrans correspondants, côté administration et côté candidat.

Elles sont produites par le test lui-même, dans un contexte navigateur **neuf**
(`browser.newContext()`) : aucun cookie, aucune session, aucun cache partagé
avec les requêtes authentifiées du test — exactement ce que verrait quelqu'un à
qui on transmettrait l'URL.

Pour la refaire à la main : `npm run db:seed`, puis dans une fenêtre de
navigation privée, ouvrir `/api/videos/<id de Marion Estève>` (id lisible dans
l'onglet Vidéos de `/admin`, ou par `GET /api/admin/videos?status=pending`).
