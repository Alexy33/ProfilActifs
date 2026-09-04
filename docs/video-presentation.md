# Video de presentation (2 min)

Demonstration filmee de ProfilsActifs (JEB/DNI/2026-003).

Le tournage est **automatise** : Playwright joue le parcours et filme, ffmpeg
incruste les sous-titres. Une demo rejouee a la main derive a chaque prise —
ici, la meme commande redonne la meme video, et les sous-titres restent cales
puisqu'ils sont dates a l'execution et non ecrits d'avance.

```bash
make dev        # ou npm run dev — le serveur doit deja repondre
make video      # tourne, puis incruste les sous-titres
```

| Fichier | Contenu |
| --- | --- |
| `docs/captures/video/presentation.mp4` | la video, sous-titres incrustes |
| `docs/captures/video/presentation-brut.webm` | le rush sans sous-titres |
| `docs/captures/video/sous-titres.srt` | les sous-titres, pour un remontage |

Le parcours vit dans `scripts/demo/tournage.spec.ts`, sa configuration dans
`scripts/demo/playwright.tournage.ts`. Ils sont hors de `e2e/` a dessein : un
`npm run test:e2e` ne doit pas reecrire une video a chaque CI.

Duree obtenue : **1 min 38**, sous les deux minutes demandees.

## Ce qui reste a faire a la main

La voix off. Le fichier `.srt` en porte le texte, minute — il suffit de le lire
en suivant les horodatages, ou de le passer a une synthese vocale.

---

## Le script, sequence par sequence

Ce qui suit documente le parcours filme : les minutages sont ceux du script,
la video reelle peut varier de quelques dixiemes.

## Avant de filmer

```bash
npm run db:migrate
npm run db:seed        # 14 profils, le questionnaire, 2 videos en attente
npm run dev
```

Le scenario se connecte lui-meme par l'API, role par role, en effacant le
cookie entre deux (better-auth refuse une seconde connexion tant qu'une session
est ouverte). Aucun mot de passe n'apparait donc a l'ecran. Comptes utilises,
mot de passe `demo1234` :

| Sequence | Compte | Sert a |
| --- | --- | --- |
| 1-2 | aucun | accueil + catalogue public |
| 3-5 | `amina@exemple.fr` | espace demandeur |
| 6 | `recruteur@exemple.fr` | espace recruteur |
| 7 | `admin@jeb.gouv.fr` | moderation |

Capture en **1440x900** (format ordinateur portable), 25 fps, locale `fr-FR`,
fuseau `Europe/Paris`.

Deux pieges, tous deux vus a l'image avant d'etre corriges :

- **La largeur.** En 1280x720, la barre laterale de 256 px ne laissait que
  ~1024 px de contenu : le catalogue tombait a deux colonnes serrees, les
  badges de certification passaient a la ligne et les competences
  s'empilaient en escalier. Les mises en page sont dessinees pour un ecran
  d'ordinateur portable, il faut les filmer ainsi.
- **Le viewport du projet.** `devices["Desktop Chrome"]` embarque son propre
  1280x720, qui ecrase celui de `use`. Il faut donc redefinir `viewport`
  **apres** le spread, sinon la video sort en 1440x900 avec la page rendue
  dans un coin de 1280x720 et le reste en gris.
- **Le fuseau.** Sans `timezoneId`, les horodatages affiches seraient ceux du
  conteneur, en UTC.

---

## Sequencier

### 00:00 — 00:12 · Accroche (accueil)

**A l'ecran** — `/` en haut de page. Le titre « La competence se voit, se
certifie. » plein cadre, puis un lent scroll jusqu'aux compteurs.

> Un CV dit ce qu'on a fait. Il ne montre pas comment on le fait.
> ProfilsActifs ajoute au dossier ce que le papier ne porte pas : une video de
> presentation, et une certification des competences.

*Note : les compteurs de l'accueil sont de vrais `COUNT(*)` en base — les
laisser une seconde a l'image, c'est la preuve que rien n'est maquette.*

### 00:12 — 00:32 · Le profil vu par un recruteur (catalogue public)

**A l'ecran** — `/catalogue`. Taper « developpeur » dans la recherche, poser un
filtre secteur, puis ouvrir une fiche `/profils/[id]`.

> Le catalogue est public. On filtre par metier, secteur, ville, competence —
> et on tombe sur un profil qui se presente lui-meme, en video, avec son badge
> de certification.

Laisser la video demarrer deux secondes. C'est le coeur du produit : il faut la
voir tourner, pas l'entendre decrire.

### 00:32 — 00:52 · Cote demandeur : le profil (onglet 2)

**A l'ecran** — `/candidate`. Montrer l'edition du profil, puis l'envoi d'une
video (glisser un fichier court, deja pret sur le bureau).

> Cote demandeur, tout tient sur un ecran : le profil, la video, les vues, les
> contacts recus. La video part en moderation avant d'etre diffusable.

### 00:52 — 01:08 · Consentement (onglet 2)

**A l'ecran** — depuis le bloc consentement du tableau de bord, cliquer
« Gerer mon consentement » pour ouvrir `/candidate/consentement`. Faire defiler
la page : etat, texte en vigueur, portee du retrait.

> Aucune video n'est hebergee sans accord explicite, et l'accord se retire d'un
> clic. Le retrait supprime le fichier — la page le dit avant de le faire, et
> garde la trace de ce qui avait ete consenti, pour trente-six mois.

*C'est le passage a ne pas couper : il porte l'exigence R.3.*

### 01:08 — 01:24 · Certification (onglet 2)

**A l'ecran** — `/candidate/certification`. Repondre a deux ou trois questions,
puis montrer le score obtenu et le badge sur le profil.

> Un questionnaire, un bareme pondere, un badge. La certification n'est pas
> declarative : elle est passee sur la plateforme, et le score s'affiche sur le
> profil public.

### 01:24 — 01:40 · Espace recruteur (onglet 3)

**A l'ecran** — `/recruiter`. Montrer les favoris, puis l'envoi d'un message
depuis une fiche profil, puis le suivi des candidats contactes.

> Le recruteur met de cote, contacte, et suit ou en est chaque echange. Le
> demandeur recoit la notification dans son espace : la mise en relation est
> tracee des deux cotes.

### 01:40 — 01:55 · Administration et cloture (onglet 4)

**A l'ecran** — `/admin`, onglet Moderation des videos : valider une video en
attente. Enchainer sur `/api/docs` pendant la derniere phrase.

> L'administration modere les videos avant diffusion, gere le questionnaire et
> pilote la plateforme. Et toute l'API est documentee et essayable, generee
> depuis les routes elles-memes.
>
> ProfilsActifs. La competence se voit, et se certifie.

---

## Ce qu'il ne faut pas filmer

- **Les mots de passe**, meme ceux de demonstration : se connecter avant.
- **Les adresses e-mail reelles** : le seed n'utilise que des `@exemple.fr`.
- **La console du navigateur** et le terminal : ils datent la demo et diluent
  le propos.
- **Une video de test personnelle** : utiliser un rush neutre, libre de droits.

## Montage

Les sous-titres sont deja incrustes par `make video` — l'accessibilite est une
exigence du dossier, et une demo se regarde souvent sans le son.

S'il faut remonter :

- Reprendre `presentation-brut.webm` et `sous-titres.srt` plutot que le MP4,
  pour ne pas reencoder une image deja compressee.
- Pas de musique sous la voix off, ou alors sous -20 dB.
- Pour allonger un plan, augmenter le `hold` de la replique correspondante dans
  `tournage.spec.ts` : le sous-titre suivra, puisqu'il est date a l'execution.

## Duree si besoin de raccourcir

Dans l'ordre de sacrifice : l'edition du profil (00:32), puis l'espace
recruteur reduit aux seuls favoris, puis l'accroche ramenee a une phrase.
Le consentement et la moderation ne se coupent pas : ce sont les deux
exigences que le dossier demande de demontrer.
