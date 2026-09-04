# R.5 — Registre des traitements

> Une ligne par traitement, chacune renvoyée au **modèle réel**
> (`src/db/schema.ts`, `docs/schema-bdd.md`). Une fiche qui ne renvoie pas au
> modèle est un exercice de style : ici, chaque catégorie de données nomme sa
> table et sa colonne, et chaque durée de conservation nomme le code qui
> l'applique.
>
> Ce document et le projet de CGU (`docs/cgu.md`) ont été rédigés **ensemble**
> et se lisent côte à côte. S'ils divergent, l'un des deux est faux.
>
> **Responsable de traitement** : ProfilsActifs (JEB/DNI/2026-003).
> **Périmètre** : le démonstrateur tel qu'il est déployé, pas la feuille de
> route.

---

## 0. Ce qu'il faut savoir avant de lire le tableau

**Aucun sous-traitant.** La base SQLite et les fichiers vidéo vivent sur le
serveur du dispositif (volume `/data`, cf. `docs/video.md`). Pas de service
d'analyse d'audience, pas de régie publicitaire, pas de cookie tiers, pas de
transfert hors Union européenne. Le seul cookie déposé est le cookie de session
`better-auth.session_token`, strictement nécessaire au fonctionnement.

**Une exception, et elle est réelle** : un profil peut référencer une vidéo
hébergée chez YouTube ou Vimeo (`profile.video_url` portant une URL externe).
La lecture se fait alors dans une `iframe`, et le visiteur communique son
adresse IP à ce tiers, sans que le dispositif l'intercepte. Cette exception est
écrite dans les CGU au même titre qu'ici.

**Les durées sont appliquées par du code**, pas déclarées. Elles vivent dans
`RETENTION` (`src/server/services/retention.ts`), sont exécutées au démarrage
puis toutes les 24 heures (`src/instrumentation.ts`), peuvent être relancées à
la demande (`POST /api/admin/retention`) et lues telles qu'appliquées
(`GET /api/admin/retention`). Le comportement est éprouvé par
`src/server/services/__tests__/retention.test.ts`, sur une vraie base.

**La durée du compte se mesure sur `user.last_seen_at`** — colonne ajoutée pour
ce registre (`drizzle/0006_retention_last_seen.sql`), écrite à chaque ouverture
de session. Sans elle, aucune durée « d'inactivité » n'était mesurable :
`updated_at` bouge dès qu'on touche au profil, et les lignes `session` sont
elles-mêmes purgées bien avant.

---

## 1. Registre

| # | Traitement | Finalité | Base légale | Catégories de données | Table / champ | Durée de conservation | Destinataires |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **T1** | **Compte et authentification** | Créer et tenir un compte, authentifier son titulaire, vérifier qu'il a au moins 16 ans | Exécution du contrat (CGU), art. 6.1.b — le contrôle d'âge est une condition d'accès posée par les CGU | Identité déclarative, adresse e-mail, date de naissance, rôle, empreinte du mot de passe, date de dernière connexion | `user.name`, `user.email`, `user.email_verified`, `user.birth_date`, `user.role`, `user.image`, `user.last_seen_at`, `user.created_at` ; `account.password` (haché), `account.provider_id`, `account.issuer` | **24 mois** après la dernière connexion (`user.last_seen_at`, à défaut `user.created_at`), puis suppression du compte et de tout ce qui en dépend | Équipe du dispositif (comptes `admin`). Le titulaire lui-même |
| **T2** | **Profil publié au catalogue** | Rendre visible un demandeur d'emploi auprès des recruteurs | Exécution du contrat, art. 6.1.b — la publication **est** le service demandé | Intitulé recherché, secteur, ville, présentation libre, compétences, statut de publication | `profile.title`, `profile.sector`, `profile.city`, `profile.bio`, `profile.status`, `profile.created_at` ; `profile_skill.skill` | Vie du compte (**24 mois** d'inactivité, T1) ; effacement immédiat sur demande du titulaire | **Public** : le catalogue (`GET /api/profiles`) est consultable sans compte. Recruteurs inscrits. Équipe du dispositif |
| **T3** | **Vidéo de présentation** | Diffuser une présentation filmée du candidat | **Consentement**, art. 6.1.a — image et voix d'une personne identifiable (R.3) | Fichier vidéo (image, voix), ou URL d'une vidéo externe ; preuve du consentement : date, version du texte acceptée, date de retrait | `profile.video_url` + fichier `{profileId}.{mp4\|webm\|ogv\|mov}` sur `/data/uploads` ; `profile.video_consent_granted`, `video_consent_at`, `video_consent_version`, `video_consent_revoked_at` | Fichier : vie du compte, **effacé immédiatement** au retrait du consentement ou à la suppression de la vidéo. Trace du consentement : **36 mois** après le retrait. Vidéo refusée par la modération : fichier effacé **30 jours** après la décision | **Public** si le profil est publié **et** la vidéo validée. Sinon : titulaire et équipe du dispositif seuls. Pour une URL externe : **YouTube / Vimeo** (voir §0) |
| **T4** | **Modération des profils et des vidéos** | Vérifier avant diffusion qu'un contenu ne porte pas atteinte à une personne | Intérêt légitime, art. 6.1.f — protection des personnes filmées et des tiers | Décision, motif communiqué au candidat, auteur et date de la décision | `profile.status`, `profile.video_status`, `profile.video_review_reason`, `profile.video_reviewed_by`, `profile.video_reviewed_at` | Vie du compte. La décision et son motif **survivent au fichier** : ils disent pourquoi il n'y a plus rien à voir | Équipe du dispositif. Le motif est montré au candidat |
| **T5** | **Questionnaire de certification** | Évaluer les compétences et délivrer le badge JEB | Exécution du contrat, art. 6.1.b | Réponses au questionnaire, score, réussite, dates | `certification_attempt.status`, `.score`, `.passed`, `.submitted_at` ; `certification_answer.value` ; report sur `profile.score`, `profile.certified_at` | Tentative **soumise : 24 mois** après la soumission. Tentative ouverte puis abandonnée : **30 jours**. Le badge en cours (`profile.certified_at`) vit avec le profil | Équipe du dispositif. Le titulaire. Le **résultat** (badge, score) est public sur le profil publié |
| **T6** | **Contact recruteur → candidat** | Permettre à un recruteur de solliciter un candidat et d'en suivre l'échange | Exécution du contrat, art. 6.1.b (des deux côtés : le candidat est là pour être contacté) | Message libre rédigé par le recruteur, statut de suivi, dates ; identité du recruteur et du candidat par les clés | `contact.message`, `contact.status`, `contact.recruiter_id`, `contact.profile_id`, `contact.created_at`, `contact.updated_at` | **24 mois** après le dernier changement (`updated_at`) — un échange repris repart pour 24 mois | Le recruteur émetteur. Le candidat destinataire (notification, T8). Équipe du dispositif |
| **T7** | **Favoris recruteur** | Mettre de côté un profil intéressant | Exécution du contrat, art. 6.1.b | Association recruteur ↔ profil, date | `favorite.recruiter_id`, `favorite.profile_id`, `favorite.created_at` | **24 mois** | Le recruteur seul. Équipe du dispositif. **Jamais** le candidat concerné |
| **T8** | **Notifications** | Informer un candidat d'un contact, d'une décision de modération ou d'un résultat | Exécution du contrat, art. 6.1.b | Texte de la notification, type, date de lecture | `notification.text`, `.type`, `.read_at`, `.created_at` | **12 mois** après émission, lue ou non | Le destinataire seul. Équipe du dispositif |
| **T9** | **Entreprise du recruteur** | Savoir **au nom de qui** un candidat est contacté | Exécution du contrat, art. 6.1.b, et intérêt légitime, art. 6.1.f (loyauté de la mise en relation) | Raison sociale, SIREN, fonction du titulaire, adresse, secteur, téléphone et site (facultatifs) | `company.name`, `.siren`, `.position`, `.address`, `.postal_code`, `.city`, `.sector`, `.phone`, `.website` | Vie du compte recruteur (T1) — cascade | Équipe du dispositif. Le titulaire. La raison sociale accompagne la prise de contact |
| **T10** | **Journal de connexion** | Rattacher une session à un compte, et pouvoir établir l'origine d'un accès en cas d'incident | Intérêt légitime, art. 6.1.f — sécurité du dispositif | **Adresse IP**, agent utilisateur, jeton de session, dates | `session.ip_address`, `session.user_agent`, `session.token`, `session.expires_at`, `session.created_at` | **6 mois** après création de la session — bien avant les 24 mois du compte, ce qui suppose une durée propre et non un effacement par ricochet | Équipe du dispositif |
| **T11** | **Jetons de vérification** | Vérifier une adresse e-mail, réinitialiser un mot de passe | Exécution du contrat, art. 6.1.b | Identifiant visé (e-mail), valeur du jeton, expiration | `verification.identifier`, `.value`, `.expires_at` | **30 jours** après expiration du jeton | Personne : usage interne au socle d'authentification |
| **T12** | **Mesure d'activité du dispositif** | Piloter le démonstrateur (nombre de profils, de contacts, vues d'un profil) | Intérêt légitime, art. 6.1.f | Compteurs, **sans identification d'un visiteur** : aucun visiteur n'est tracé, seul un total est incrémenté | `profile.views`, `profile.contact_count` ; agrégats servis par `/api/stats` et `/api/admin/stats` | Vie du profil. Les compteurs **ne sont pas décrémentés** par la purge d'un contact : ce sont des totaux, pas des listes de personnes | `profile.views` n'est montré **qu'à son titulaire** (schéma `MyProfile`) : ni au catalogue, ni aux recruteurs, ni à un export. On ne classe pas des personnes par audience |

### Traitements que ce registre ne contient pas, et pourquoi

`question`, `question_option` et `setting` ne portent **aucune donnée
personnelle** : ce sont le barème et les réglages du dispositif. `ping` est une
table de démonstration sans autre contenu qu'une date (purgée à 7 jours).

---

## 2. Les durées, et pourquoi celles-là

Elles sont décidées ici. Aucune ne préexistait au document : c'était le trou
que R.5 demandait de combler.

| Durée | Valeur | Justification |
| --- | --- | --- |
| Inactivité d'un compte | **24 mois** | Durée usuelle pour un compte de service en ligne. Un demandeur d'emploi qui ne s'est pas connecté depuis deux ans n'attend plus d'être contacté ; conserver son visage et sa voix « au cas où » n'a plus de finalité |
| Journal de connexion | **6 mois** | Aligné sur la durée de conservation admise pour les journaux de connexion. Assez pour instruire un incident, pas assez pour reconstituer les déplacements de quelqu'un |
| Prise de contact | **24 mois** depuis le dernier échange | Un recrutement se joue sur quelques mois ; deux ans après le dernier mot échangé, le message n'a plus d'objet. Le compteur repart à chaque reprise de l'échange |
| Favori | **24 mois** | Même horizon qu'un contact : un vivier qu'on ne rouvre pas en deux ans n'est plus un vivier |
| Notification | **12 mois** | Elle informe d'un événement daté ; passé un an, elle ne rend plus service et ne fait que dupliquer une donnée conservée ailleurs |
| Tentative soumise | **24 mois** | Le badge doit pouvoir être réexaminé, et le candidat repasser le questionnaire en connaissant son historique. Au-delà, le barème aura changé |
| Tentative abandonnée | **30 jours** | Elle n'a produit aucun résultat. La garder ne documente qu'un renoncement |
| Vidéo refusée | **30 jours** après la décision | Laisse au candidat le temps de lire le motif et de redéposer. Ensuite, conserver l'image d'une personne pour une vidéo qui ne sera jamais diffusée n'a plus de base |
| Trace d'un consentement retiré | **36 mois** | La preuve de ce qui avait été accepté doit survivre au retrait (R.3), mais pas éternellement : passé trois ans, plus aucune diffusion n'est défendable ni contestable |
| Jeton de vérification | **30 jours** après expiration | Un jeton expiré ne sert plus qu'à diagnostiquer un incident récent |

**Les comptes `admin` sont hors purge automatique.** Ils sont créés en base
(`src/db/seed.ts`) et non par l'inscription ; les supprimer au bout de deux ans
retirerait la modération au dispositif. Leur cycle de vie est une décision
d'exploitation, et elle est prise à la main.

---

## 3. Droits des personnes, et où ils s'exercent

Un droit qui n'a pas de bouton n'est pas un droit. Chacun renvoie ici à une
route réelle.

| Droit | Comment | Route |
| --- | --- | --- |
| Accès | L'espace personnel montre exactement ce qui est stocké, statut de modération et compteur de vues compris | `GET /api/me/profile`, `GET /api/me/company` |
| Rectification | Modification directe du profil et de l'entreprise | `PATCH /api/me/profile`, `PATCH /api/me/company` |
| Effacement | Suppression **immédiate et définitive** du compte, avec profil, vidéo, entreprise, sessions, notifications, tentatives, favoris et contacts | `DELETE /api/me/account` |
| Retrait du consentement (vidéo) | Retire l'accord **et efface le fichier** dans le même geste | `DELETE /api/me/profile/video/consent` |
| Retrait de la seule vidéo | Sans toucher au reste du profil | `DELETE /api/me/profile/video` |

---

## 4. Ce qui reste à faire

Le registre décrit le dispositif tel qu'il est. Trois points sont assumés et
non résolus :

1. **Aucune anonymisation des statistiques historiques** : `profile.views` et
   `contact_count` disparaissent avec le profil. Aucun agrégat ne survit, donc
   aucun historique de pilotage non plus. C'est un choix par défaut, pas une
   décision arbitrée.
2. **Pas de journal des purges** : `POST /api/admin/retention` rend un rapport,
   et le démarrage l'écrit dans les logs du conteneur, mais rien n'est conservé
   en base. Prouver *a posteriori* qu'une purge a eu lieu suppose de garder ces
   logs.
3. **Pas d'export des données personnelles** en un fichier (portabilité). Les
   routes d'accès existent, un export unique n'existe pas.
