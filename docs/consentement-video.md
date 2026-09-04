# R.3 — Consentement à la diffusion vidéo : horodaté, versionné, révocable

Les vidéos hébergées portent l'image et la voix de personnes identifiables. Le
consentement à leur diffusion est donc enregistré comme une preuve, pas comme un
interrupteur, et son retrait efface réellement le fichier.

## Ce qui est enregistré

Quatre colonnes sur `profile` (`drizzle/0003_red_moonstone.sql`) :

| Colonne | Rôle |
| --- | --- |
| `video_consent_granted` | état courant de l'accord |
| `video_consent_at` | date et heure de l'accord |
| `video_consent_version` | version du texte effectivement acceptée |
| `video_consent_revoked_at` | date et heure du retrait |

Un booléen seul ne suffirait pas : il faut pouvoir établir non pas « cette
personne a accepté » mais « cette personne a accepté **ceci**, à **cette**
date ». Sans la version, une réécriture du texte déplacerait silencieusement la
portée de ce qui avait été consenti.

La version en vigueur et sa rédaction vivent dans `src/lib/vocabulary.ts`
(`VIDEO_CONSENT_VERSION`, `VIDEO_CONSENT_TEXT`). Toute réécriture du texte impose
d'incrémenter la version. C'est le serveur qui enregistre la version — jamais le
client, qui pourrait déclarer un accord sur une rédaction qui n'est plus la
sienne.

`video_consent_at` et `video_consent_version` sont **conservés après un
retrait** : ils disent ce qui avait été accepté et quand, et c'est ce qui rend le
registre auditable.

## Le retrait supprime le fichier

`revokeVideoConsent` (`src/server/services/video.ts`) appelle
`deleteProfileVideo`, le service d'effacement **déjà utilisé** par la suppression
d'un profil par l'administration (`src/app/api/admin/profiles/[id]/route.ts`).
Un seul chemin d'effacement, donc un seul endroit où se tromper.

L'ordre est délibéré : le fichier part **d'abord**, la base est mise à jour
ensuite. Si l'écriture échouait après coup, on aurait un consentement encore
marqué valide pour une vidéo qui n'existe plus — cela se corrige. L'inverse
laisserait le fichier sur le disque sans accord pour le couvrir, ce qui est la
faute à éviter.

Le profil n'est **pas masqué** : il subsiste, avec son statut inchangé, seuls le
fichier et l'URL qui y menait disparaissent.

Symétriquement, rien ne se met en diffusion sans accord en cours (403). La garde
est `assertVideoConsent`, et **les deux chemins y passent** :

| Chemin | Route | Gardé par |
| --- | --- | --- |
| Fichier déposé chez nous | `PUT /api/me/profile/video` | `saveProfileVideo` |
| Lien YouTube / Vimeo | `PATCH /api/me/profile` (`videoUrl`) | le handler, avant écriture |

Le consentement porte sur la **diffusion**, pas sur le mode d'hébergement : un
lien externe expose l'image et la voix exactement comme un fichier déposé, et le
fait que l'octet vive ailleurs ne change rien pour la personne filmée. Ne garder
que le chemin fichier laissait le consentement se contourner en collant une URL.

Retirer le lien (`videoUrl: null`) reste permis sans accord : on n'exige pas de
consentement pour *cesser* de diffuser.

## API

| Méthode | Route | Effet |
| --- | --- | --- |
| `GET` | `/api/me/profile/video/consent` | texte en vigueur, sa version, état de l'accord |
| `POST` | `/api/me/profile/video/consent` | accord horodaté sur la version en vigueur |
| `DELETE` | `/api/me/profile/video/consent` | retrait **et** suppression physique du fichier |

L'état du consentement figure dans le seul schéma `MyProfile` : c'est une donnée
personnelle du titulaire, pas un attribut public de la fiche. Un recruteur n'a
pas à savoir à quelle date quelqu'un a accepté quoi — même raisonnement que pour
le compteur de vues (voir `docs/reponse-r4-compteurs.md`).

## Vérification

Parcours joué sur un compte de test dédié (`test-r3@exemple.fr`), stockage
`/data/uploads` dans le conteneur de développement.

| # | Capture | Ce qu'elle montre |
| --- | --- | --- |
| 1 | `captures/r3/01-stockage-avant.png` | le fichier `<profileId>.mp4` (62 657 octets) est dans le stockage |
| 2 | `captures/r3/02-profil-consentement.png` | le profil : état « Accordé », date, version acceptée, texte en vigueur, et le bouton de retrait |
| 3 | `captures/r3/03-stockage-apres.png` | même répertoire après retrait : `total 0`, et aucune trace du fichier sur tout le volume |
| 4 | `captures/r3/04-profil-apres-retrait.png` | le profil **existe toujours**, sans vidéo, portant la date d'accord, la version et la date de retrait |

La capture 4 est celle qui distingue une suppression d'un masquage : le profil
est toujours là, c'est le fichier qui est parti.

Le parcours est couvert en automatique par `e2e/api.spec.ts`
(« Consentement video (R.3) ») : envoi refusé sans accord, accord horodaté et
versionné, vidéo servie, puis `404` sur `/api/videos/{id}` après retrait.
