# Vidéo de démonstration

Parcours filmé de l'application, joué par Playwright contre l'instance
réellement servie. Rien n'est simulé : les écrans, les données et les
transitions sont ceux du dispositif.

```bash
make prod          # l'application doit tourner et être peuplée (seed)
npm run demo       # ≈ 15 min — écrit test-results/demo/**/video.webm
```

## Ce que le film traverse

| # | Séquence | Ce qu'elle montre |
| --- | --- | --- |
| 1 | Accueil | Compteurs lus en base, les trois rôles |
| 2 | Catalogue (visiteur) | Recherche libre, filtres dans l'URL, filtre « certifiés » |
| 3 | Fiche publique | Badge JEB, compétences — **sans compteur d'engagement** |
| 4 | Espace demandeur | Enregistrement automatique, compteurs visibles du seul titulaire |
| 5 | Vidéo | Dépôt → **en attente de validation**, non diffusée |
| 6 | Certification | Questionnaire pondéré, score sur 100 |
| 7 | Espace recruteur | Favoris, prise de contact, suivi du pipeline |
| 8 | Administration | Tableau de bord, modération vidéo (refus motivé **et** validation), modération des profils, barème |
| 9 | Documentation | Scalar (`/api/docs`), engendré depuis les mêmes définitions que les routes |

## Pourquoi une configuration séparée

`scripts/demo/playwright.demo.config.ts` n'est pas `playwright.config.ts` : la
suite de tests ne doit payer ni l'enregistrement vidéo, ni le ralentissement
(`slowMo`) qui rend le film lisible. Le scénario vit lui aussi hors de `e2e/`,
pour ne pas partir avec les tests.

Les `expect` du scénario sont des **points de synchronisation** — ils évitent de
filmer une page à moitié chargée — et non des vérifications : la validation du
produit, elle, est dans `e2e/`.

## Remarques

- **État de départ.** Rejouer le seed avant d'enregistrer
  (cf. commande dans le tableau ci-dessus) : les comptes laissés par la suite
  de tests encombrent sinon les files de modération à l'écran.
- **Format.** Playwright écrit du `.webm` en 1280×720. Pour un `.mp4` (montage,
  diffusion) :
  ```bash
  ffmpeg -i test-results/demo/*/video.webm -c:v libx264 -crf 23 -preset slow \
         -pix_fmt yuv420p demo.mp4
  ```
- **Muet.** Le film n'a pas de bande-son : il est prévu pour être commenté en
  direct, ou sous-titré au montage.
