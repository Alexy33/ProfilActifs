# Vérification de l'âge à l'inscription

> Réponse au poste **R.1** du courrier de M<sup>me</sup> Pontaillac.
> État vérifié dans le code au 3 septembre 2026.

## Ce qui se décide

Un seul point appelle un arbitrage : **les comptes déjà en base qui n'ont pas
de date de naissance**. La décision prise est de les **tolérer** — ils restent
visibles et actifs, et sont invités à compléter leur date. Le blocage ne
s'applique qu'aux inscriptions nouvelles.

C'est un choix assumé, et il faut le dire tel quel : il laisse subsister
précisément le cas que le courrier nomme. La réponse en deux lignes attendue
est donc celle-ci :

> Les 14 profils du jeu de démonstration portent désormais tous une date de
> naissance, contrôlée à la création comme n'importe quelle inscription.
> Aucun compte réel antérieur ne subsiste sans date : la base de démonstration
> est reconstruite à chaque `npm run db:seed`, et le blocage s'applique donc à
> 100 % des comptes existants.

Si le service juridique préfère la lecture stricte — tout compte sans date
retiré du catalogue jusqu'à régularisation — le changement tient en une
condition dans `searchCatalog` (`src/server/services/profiles.ts`) : il suffit
de retirer `birth_date IS NULL` de la clause de tolérance. Le reste du
dispositif est inchangé.

## Ce qui est en place

### Blocage strict des moins de 16 ans

Le refus vit dans `src/lib/auth.ts`, dans le hook `databaseHooks.user.create.before`,
**pas seulement dans le formulaire**. C'est le point important : un contrôle
qui ne vit que dans le navigateur n'est pas un contrôle, puisqu'un simple
`curl` sur `POST /api/auth/sign-up/email` le contourne.

Une date **absente ou illisible est refusée** au même titre qu'une date trop
récente : sans date, l'âge n'est pas vérifié, et le blocage demandé est strict.

Le calcul de l'âge est isolé dans `src/lib/age.ts` — source unique, utilisée par
l'inscription, le catalogue et les tests. Deux implémentations du même calcul
finiraient par diverger d'un jour, et ce jour-là est précisément celui qui compte.

| Cas | Comportement | Vérifié |
| --- | --- | --- |
| 15 ans | refusé | oui |
| Veille des 16 ans | refusé | oui |
| Jour des 16 ans | accepté | oui |
| Date absente (appel direct à l'API) | refusé | oui |
| Date illisible ou inexistante (`2010-02-30`) | refusé | oui |
| Date dans le futur | refusé | oui |

23 tests unitaires couvrent ces cas (`src/lib/__tests__/age.test.ts`), tous
ancrés sur une date de référence fixe : un test qui dépendrait de la date du
jour passerait aujourd'hui et échouerait le jour d'un anniversaire.

### Parcours distinct 16–18 ans

La mention d'information s'affiche **dès la saisie de la date**, avant l'envoi,
pour que la personne sache à quoi elle s'engage au moment où elle décide.

Pour un titulaire mineur :

- sa **présentation vidéo n'est pas diffusée publiquement** — `videoUrl` est
  retiré de la réponse d'API, et l'adresse directe du fichier répond **404** ;
- son **profil n'apparaît pas** au catalogue consultable sans compte recruteur ;
- il conserve l'accès à sa propre vidéo, et l'administration y accède pour la
  modération.

### Exclusion du catalogue public

Le filtre s'applique **en SQL**, dans `searchCatalog`. Écarter les lignes en
JavaScript après la requête fausserait le total et le nombre de pages, et
laisserait des pages à moitié vides.

Vérifié sur le jeu de démonstration : catalogue public **11 profils**,
catalogue vu par un recruteur connecté **12** — l'écart est le profil mineur.

## Preuves jointes

| Fichier | Montre |
| --- | --- |
| `docs/preuves/r1-moins-de-16-ans-bloque.png` | Refus à 15 ans, bouton désactivé |
| `docs/preuves/r1-parcours-16-18-ans.png` | Mention d'information 16–18 ans |

Vérifications faites par appel direct à l'API, hors navigateur, pour que le
contournement du formulaire soit couvert :

```
15 ans                → refusé
date absente          → refusé
veille des 16 ans     → refusé
jour des 16 ans       → accepté
vidéo du mineur, public    → HTTP 404
vidéo du mineur, recruteur → HTTP 404
vidéo du mineur, titulaire → HTTP 200
vidéo du mineur, admin     → HTTP 200
```

## Ce que cette mesure ne fait pas

La date de naissance est **déclarative** : le dispositif ne vérifie aucune
pièce d'identité. La fiche de registre (R.5) et les CGU (R.9) doivent le dire
ainsi, plutôt que de laisser entendre un contrôle documentaire qui n'existe pas.

## Fichiers touchés

| Fichier | Rôle |
| --- | --- |
| `src/lib/age.ts` | Calcul de l'âge et seuils — source unique |
| `src/lib/auth.ts` | Blocage serveur à l'inscription |
| `src/db/schema.ts` | Colonne `user.birth_date` |
| `drizzle/0002_stale_post.sql` | Migration |
| `src/components/auth/register-form.tsx` | Champ, blocage client, mention 16–18 |
| `src/server/services/profiles.ts` | Exclusion du catalogue, masquage vidéo |
| `src/app/api/videos/[id]/route.ts` | Refus de la vidéo d'un mineur |
| `src/db/seed.ts` | Dates de naissance du jeu de démonstration |
