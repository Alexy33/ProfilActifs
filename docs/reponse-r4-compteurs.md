# R.4 — Compteurs d'audience : réponse et décision

**Objet :** demande de Mme Pontaillac relative au compteur de « j'aime »
**Référence :** JEB/DNI/2026-003 — R.4
**Échéance :** vendredi 12h00

## 1. La demande est sans objet en l'état

Il n'existe aucun compteur de « j'aime » dans le produit. Vérification faite sur
l'intégralité du dépôt — schéma de base (`src/db/schema.ts`), migrations
(`drizzle/`), contrats d'API (`src/server/contracts/`), spécification publiée
(`openapi.json`) et interfaces (`src/components/`, `src/app/`) : aucun champ, aucune
colonne, aucune route. La fonctionnalité annoncée dans le courrier de synthèse n'a
pas été implémentée.

La seule notion voisine est le **favori recruteur** (`favorite`) : un marque-page
privé au recruteur qui le pose, jamais agrégé ni affiché au candidat. Ce n'est pas
un compteur d'audience.

## 2. La contrainte de conception est enregistrée

Si un compteur de « j'aime » est ajouté par la suite, il suivra la règle suivante,
qui est désormais celle du produit :

> Le compteur est tenu en base, s'affiche au titulaire dans son espace privé, et
> ne sort pas du serveur — ni en réponse d'API, ni en export, ni en vue recruteur,
> ni en aperçu partagé.

Cette règle est inscrite dans `docs/schema-bdd.md`, à l'endroit où se décrivent les
colonnes de `profile`, pour qu'elle soit lue par qui ajoutera la colonne.

## 3. Décision prise sur le compteur `views`

La question posée dans R.4 — le compteur de vues déjà exposé relève-t-il du même
raisonnement ? — appelait une réponse, et la réponse est **oui**. Un compteur de
vues affiché sur chaque fiche et sur chaque carte du catalogue est un classement de
personnes par audience, ce que le dispositif n'a pas vocation à produire.

`views` a donc été aligné sur la règle du point 2 :

| Surface | Avant | Après |
| --- | --- | --- |
| Schéma `ProfileCard` (catalogue) | `views` exposé | retiré |
| Schéma `Profile` (fiche publique) | `views` exposé | retiré |
| Schéma `MyProfile` (espace du titulaire) | `views` exposé | **conservé** |
| Carte du catalogue | vues affichées | retirées |
| Fiche publique `/profils/[id]` | vues affichées | retirées |
| Espace candidat | vues affichées | **conservées** |
| Tri du catalogue | `certifiedAt`, `score`, **`views`** | `certifiedAt`, `score`, `createdAt` |

Le comptage lui-même est inchangé : chaque consultation incrémente la colonne en
base. Ce qui change, c'est qu'elle ne quitte plus le serveur autrement que vers son
titulaire. Le tri du catalogue a été modifié en conséquence : retirer le nombre
affiché sans retirer le classement qu'il pilotait n'aurait réglé que l'apparence.

## 4. Point restant à trancher : `contactCount`

Par cohérence, la même question se pose pour `contactCount`, toujours exposé sur la
fiche publique (`Profile`). C'est une mesure d'activité par personne, visible de
tous, de même nature que `views`. Il n'a pas été modifié faute d'instruction, mais
il devrait l'être si le raisonnement du point 3 est retenu tel quel.

## 5. Voie de contestation

Une contestation de fond sur ces choix reste possible ; elle se fait par écrit.
