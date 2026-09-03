# Déclaration d'accessibilité — partielle (R.7)

**Référence :** JEB/DNI/2026-003 — R.7
**Date de mesure :** 3 septembre 2026
**Outil :** `scripts/a11y-audit.mjs` (`npm run a11y`), Chromium 1234 sans affichage

## Ce que cette déclaration couvre — et ce qu'elle ne couvre pas

Elle porte sur **trois écrans**, ceux nommés dans R.7, et sur **trois critères** :
navigation au clavier, visibilité du focus, contraste des couples texte / fond.

| Écran | URL mesurée |
| --- | --- |
| Parcours d'inscription | `/register` |
| Fiche profil publique | `/profils/{id}` |
| Catalogue recruteur | `/catalogue` |

**Le reste du dispositif n'a pas été vérifié** : espace candidat, espace
recruteur, administration, questionnaire de certification, page d'accueil,
connexion. Aucune conformité n'est déclarée pour ces écrans.

N'ont pas non plus été vérifiés, sur les trois écrans couverts : le
fonctionnement avec un lecteur d'écran réel, le zoom à 200 %, l'orientation, les
critères de formulaires au-delà de l'étiquetage, et l'ensemble des 106 critères
RGAA. **Ceci n'est donc pas une déclaration de conformité RGAA AA.** C'est le
relevé exact de ce qui a été mesuré.

## Résultat

### Avant correction — 5 couples sous le seuil

Le risque signalé dans R.7 est confirmé par la mesure : `#718096` ne tient pas
le seuil AA sur les fonds clairs du dispositif.

| Écran | Mesuré | Exigé | Couple | Texte |
| --- | --- | --- | --- | --- |
| Inscription | 3,51:1 | 4,5:1 | `#718096` sur `#ebf0f7` | « Vous avez déjà un compte ? » |
| Fiche profil | 3,51:1 | 4,5:1 | `#718096` sur `#ebf0f7` | « contacts reçus » |
| Fiche profil | 3,80:1 | 4,5:1 | `#718096` sur `#f5f9fe` | « Présentation » |
| Catalogue | 3,51:1 | 4,5:1 | `#718096` sur `#ebf0f7` | « Secteur » |
| Catalogue | 3,80:1 | 4,5:1 | `#718096` sur `#f5f9fe` | « Lyon » |

Les fonds réellement rencontrés sont `#ebf0f7` et `#f5f9fe`, non `#eef6ff`
comme supposé dans R.7 : l'écart mesuré est donc légèrement plus défavorable
que l'estimation.

Deux autres écarts, non anticipés, ont été relevés au même passage :

| Objet | Mesuré | Exigé |
| --- | --- | --- |
| Indicateur de focus (`--ring` à 50 %) | 1,46 – 1,54:1 | 3:1 |
| « Compétences déclarées », `#1d1f20` à 55 % sur `#f5f9fe` | 3,70:1 | 4,5:1 |

L'indicateur de focus est le point le plus lourd : un anneau **existait** sur
chaque élément, mais à 1,5:1 il n'est pas perceptible. « Focus visible en
permanence » n'était donc pas satisfait, alors qu'un contrôle superficiel aurait
conclu l'inverse.

### Après correction — aucun écart sur les trois écrans

| Écran | Couples mesurés | Minimum relevé | Sous le seuil | Arrêts Tab | Anneau de focus |
| --- | --- | --- | --- | --- | --- |
| Inscription | 5 | 5,40:1 | 0 | 6 | 9,84:1 |
| Fiche profil | 9 | 5,40:1 | 0 | 9 | 9,84 – 10,66:1 |
| Catalogue | 19 | 4,53:1 | 0 | 32 | 9,84 – 10,66:1 |

Chaque élément atteignable au clavier est atteint par la tabulation, et chacun
porte un indicateur mesuré au-dessus de 3:1. Aucun piège au clavier n'a été
rencontré sur les trois parcours.

Relevés bruts : `docs/rapports/a11y-avant.json` et `docs/rapports/a11y-apres.json`.

## Écart subsistant, assumé

**Fiche profil publique — lecteur vidéo tiers (YouTube / Vimeo).**
Quand la vidéo est un lien externe, elle est rendue dans une `iframe`. À la
tabulation, le focus entre dans le document embarqué : l'`iframe` ne satisfait
alors ni `:focus`, ni `:focus-visible`, et `:focus-within` ne franchit pas la
frontière d'origine. Aucune règle de notre feuille de style ne peut peindre
d'anneau à ce moment ; l'indicateur dépend du lecteur tiers.

Mesure à l'appui : `docs/rapports/a11y-apres-embed-tiers.json`, ligne
`iframe.aspect-video`, `indicated: false`.

Le lecteur **natif**, servi par `/api/videos/{id}`, ne présente pas ce défaut :
mesuré à 10,66:1 (`docs/rapports/a11y-apres.json`). L'écart ne concerne donc que
les fiches pointant vers une plateforme externe. Le lever suppose de remplacer
l'embed direct par une vignette cliquable maîtrisée — décision de conception à
prendre avec R.10, pas un réglage de feuille de style.

## Ce qui a été corrigé

| Correction | Où |
| --- | --- |
| `#718096` → `#566274` (5,40:1 sur `#ebf0f7`, 5,85:1 sur `#f5f9fe`, 6,19:1 sur `#ffffff`) | 17 fichiers |
| `text-[#1d1f20]/55` → `#566274` | `src/app/profils/[id]/page.tsx` |
| Pagination inactive `#566274` à 50 % → `#606e82` (4,53:1) | `src/components/catalogue/catalogue-pagination.tsx` |
| Indicateur de focus unique : `3px solid #1B3A6B`, décalé de 2px | `src/app/globals.css` |
| Anneau porté par le cadre vidéo pour le compte de l'`iframe` | `src/app/globals.css` |
| Lien d'évitement « Aller au contenu principal » (RGAA 12.7) | `src/components/layout/site-shell.tsx` |
| Respect de `prefers-reduced-motion` | `src/app/globals.css` |

La règle de focus est posée **hors `@layer`**. Plusieurs composants appliquent
`outline-none` en comptant sur un `ring` de remplacement ; une règle non couchée
l'emporte sur les utilitaires Tailwind, de sorte que l'indicateur ne peut plus
être supprimé par mégarde au détour d'une classe.

`#566274` conserve la teinte de `#718096` (bleu-gris, H≈216°) : c'est la valeur
la plus claire de cette teinte qui tienne AA sur tous les fonds du dispositif.
Le choix reste à confirmer avec la charte (R.10) ; il est ici dicté par la
mesure, pas par le goût.

## Captures

| Capture | Ce qu'elle montre |
| --- | --- |
| `captures/r7/01-focus-inscription.png` | inscription, 3ᵉ tabulation : anneau net sur le champ e-mail |
| `captures/r7/02-focus-lien-evitement.png` | catalogue, 1ʳᵉ tabulation : le lien d'évitement apparaît, focus visible |
| `captures/r7/03-focus-filtre-catalogue.png` | catalogue, 17ᵉ tabulation : anneau sur un filtre de compétence |

## Reproduire la mesure

```bash
npm run db:seed                 # le catalogue doit être peuplé
npm run a11y                    # les trois écrans
npm run a11y -- --json rapport.json --profile <id>
```

L'outil mesure dans le DOM rendu, pas dans le code source : un rapport de
contraste dépend du fond effectif, qui peut venir d'un ancêtre ou d'une
transparence. Il fige les transitions avant de relever le focus, faute de quoi
la valeur lue dépend de l'instant de la mesure.

## Limite de la mesure

Le relevé a été fait sur le **serveur de développement**. La vérification sur un
build de production n'a pas pu être faite : `npm run build` échoue au
prérendu de `/_global-error` (`TypeError: Cannot read properties of null
(reading 'useContext')`). Cet échec est **antérieur** à ces corrections —
vérifié en rejouant la construction sur `HEAD` sans elles. Il doit être traité
pour que la mesure puisse être refaite dans les conditions de mise en ligne.

La surcouche de développement `<nextjs-portal>` est écartée du relevé : elle
n'existe pas dans un build de production.
