# ProfilsActifs — socle technique

Demonstrateur pour le Ministere du Job et Bonheur (JEB/DNI/2026-003).

Ce depot contient **l'application complete** : les huit ecrans de la maquette
fonctionnelle, l'API qui les alimente, et sa documentation interactive sur
[`/api/docs`](http://localhost:3000/api/docs).

## Stack

| Brique | Choix | Ou ca vit |
| --- | --- | --- |
| Framework | Next.js 16 (App Router) | `src/app/` |
| Authentification | better-auth (email + mot de passe, 3 roles) | `src/lib/auth.ts` |
| Base de donnees | SQLite + Drizzle ORM | `src/db/` |
| Documentation API | OpenAPI 3.0.3 generee depuis les routes — Swagger UI (`/api/swagger`) et Scalar (`/api/docs`) | `src/server/openapi/`, `docs/api-erreurs.md` |
| Contrats d'API | Zod 4 (validation + OpenAPI) | `src/server/contracts/` |
| Styles | Tailwind v4 | `src/app/globals.css` |
| Composants | shadcn/ui | `src/components/ui/` |
| Tests | Vitest (unitaire) + Playwright (e2e) | `src/**/*.test.ts`, `e2e/` |
| Conteneurisation | Docker (profils dev / prod) | `Dockerfile`, `docker-compose.yml` |

## Demarrer

Dans les deux cas, commencer par le fichier d'environnement :

```bash
cp .env.example .env
openssl rand -base64 32      # coller le resultat dans BETTER_AUTH_SECRET
```

### Avec Docker (recommande)

```bash
make dev          # http://localhost:3000, migrations jouees au demarrage
make seed         # jeu de demonstration (dans un second terminal)
```

`make` seul liste toutes les cibles.

### Sans Docker

```bash
npm install
npm run db:migrate    # cree ./local.db
npm run db:seed       # comptes de demonstration + 14 profils + 12 questions
npm run dev           # http://localhost:3000
```

Puis ouvrir **http://localhost:3000/api/docs** : toute l'API y est essayable.

### Ou vit la base

Deux emplacements distincts, et c'est voulu :

| Contexte | Fichier | Defini par |
| --- | --- | --- |
| Hors Docker | `./local.db` | `DATABASE_URL` dans `.env` |
| Docker | `/data/profilsactifs.db` (volume `db-data-dev`) | `docker-compose.yml`, qui **ignore** le `.env` |

Les deux bases sont independantes : peupler l'une ne peuple pas l'autre.

`DATABASE_URL` dans `.env` ne sert donc **qu'aux commandes locales**
(`db:migrate`, `db:seed`, `db:studio`, `npm run dev`). Y remettre
`file:/data/…` les casserait toutes : `/data` n'existe pas sur l'hote, et
drizzle-kit repond « Cannot open database because the directory does not
exist ».

### Inspecter la base

```bash
npm run db:studio                     # hors Docker, lit ./local.db
docker compose --profile dev exec web-dev npx drizzle-kit studio   # base du conteneur
```

Drizzle Studio ecoute sur `127.0.0.1:4983` et s'ouvre via
https://local.drizzle.studio.

## Les ecrans

| Route | Ecran | Acces |
| --- | --- | --- |
| `/` | Accueil : compteurs du dispositif, comptes de demonstration | public |
| `/connexion` | Connexion et inscription (`?mode=inscription`) | public |
| `/catalogue` | Catalogue filtrable et pagine | public |
| `/profils/[id]` | Fiche publique d'un candidat | public |
| `/mon-espace` | Profil, certification, notifications | demandeur |
| `/certification` | Questionnaire, une question a la fois | demandeur |
| `/mes-candidats` | Suivi des contacts et favoris | recruteur |
| `/administration` | Moderation, bareme, seuil | admin |

Un visiteur anonyme est renvoye vers `/connexion` ; un role qui n'a rien a
faire sur un ecran est renvoye a l'accueil. La regle est la meme que celle de
l'API (`requireRole` dans `src/lib/session.ts` reprend `requireAccess` de
`src/server/openapi/routes.ts`).

### Comment c'est cable

**Lecture par composant serveur, ecriture par l'API.** Une page appelle
directement les services de `src/server/services/*` — pas d'aller-retour HTTP
vers son propre serveur pour s'afficher. Toute modification, en revanche, passe
par une route `/api/*` documentee, puis `router.refresh()` : l'interface est le
premier consommateur de l'API, et non un chemin parallele.

**Les filtres du catalogue vivent dans l'URL.** `?q=&sector=&city=&certified=
&skills=&page=` est valide par `CatalogQuery` — le contrat de
`GET /api/profiles` — de sorte que la page et l'API acceptent exactement les
memes entrees. Une recherche se partage par copier-coller et le bouton
« precedent » du navigateur remonte le fil.

**Le systeme graphique « Industry »** de la maquette est porte en Tailwind v4 :
les jetons dans `@theme` (`src/app/globals.css`), le cadre filaire et ses
marques de reperage en `@layer components`, et le reste en composants React
sous `src/components/ui/` (`Blueprint`, `Tag`, `Field`, `Segmented`,
`DataTable`, `Dialog`, `StatGrid`).

## L'API

Toute la surface est documentee et **essayable** sur
[`/api/swagger`](http://localhost:3000/api/swagger) (Swagger UI) ou
[`/api/docs`](http://localhost:3000/api/docs) (Scalar). La specification
**OpenAPI 3.0.3** brute est sur `/api/openapi` (copie hors ligne : `openapi.json`).
Le catalogue des reponses d'erreur, avec les corps reels et des appels `curl`,
est dans [`docs/api-erreurs.md`](docs/api-erreurs.md). Le schema de la base est
dans [`docs/schema-bdd.md`](docs/schema-bdd.md).

### Une route se declare une seule fois

Il n'existe pas de specification ecrite a la main : elle est **generee depuis
les routes**. Un fichier de route porte son contrat (schemas Zod) et son
implementation dans le meme objet, donc la documentation ne peut pas mentir sur
ce que le serveur fait.

```ts
// src/app/api/profiles/route.ts
export const { GET } = defineRoute({
  method: "GET",
  path: "/api/profiles",
  tags: ["Catalogue"],
  summary: "Catalogue des profils publies",
  query: CatalogQuery,          // valide l'entree ET documente les parametres
  responses: {
    "200": { description: "Page de resultats.", schema: ProfilePageSchema },
  },
  handler: ({ query }) => searchCatalog(query),  // `query` est deja typee
});
```

Le meme schema Zod sert a trois choses : valider la requete, typer le handler,
et remplir Scalar. Changer un champ met les trois a jour d'un seul geste.

### Ajouter une route

1. Ecrire le contrat dans `src/server/contracts/`.
2. Creer `src/app/api/.../route.ts` avec `defineRoute`.
3. **L'ajouter a `src/server/openapi/manifest.ts`.**
4. `npm test` — le test du manifeste echoue si l'etape 3 est oubliee.

L'etape 3 est la seule qui ne se voit pas : Next.js ne charge un `route.ts` que
lorsqu'on l'appelle, donc sans cet import la route fonctionne mais disparait de
la documentation. C'est precisement ce que le test verifie.

### Conventions

| Sujet | Regle |
| --- | --- |
| Erreurs | Toutes les reponses non-2xx suivent le schema `ApiError` : `{ error: { code, message, details? } }` |
| Session | Cookie httpOnly pose par better-auth. Rien a stocker cote front |
| 401 vs 403 | `401` = pas de session (rediriger vers la connexion). `403` = session valide, role insuffisant |
| Pagination | `{ items, meta: { page, pageSize, total, totalPages } }`, `pageSize` plafonne a 20 (CDC 3.4) |
| Vocabulaires | Secteurs, villes, competences : servis par `/api/reference`, jamais recopies cote front |

### Pour l'equipe front

```ts
// Le cookie de session doit accompagner chaque requete.
await fetch("http://localhost:3000/api/me/profile", { credentials: "include" });
```

Toute origine autre que `http://localhost:3000` doit etre ajoutee a
`trustedOrigins` dans `src/lib/auth.ts`, sinon better-auth repond 403.

Pour generer un client type sans lancer le backend :

```bash
npx openapi-typescript openapi.json -o src/api-types.ts
```

`openapi.json` est regenere par `npm run openapi:export` (ou `make openapi`).

### Comptes de demonstration

Crees par `npm run db:seed`, mot de passe `demo` :

| Adresse | Role |
| --- | --- |
| `amina@exemple.fr` | `candidate` — profil publie et certifie |
| `recruteur@exemple.fr` | `recruiter` |
| `admin@jeb.gouv.fr` | `admin` |

Le seed installe aussi 14 profils (dont 2 en attente de moderation) et les 12
questions de certification, pour que le catalogue et la doc ne soient pas vides.

**Les comptes `admin` ne se creent pas par l'API.** L'inscription publique
ramene tout role inattendu a `candidate` : sans ce garde-fou, un
`POST /api/auth/sign-up/email` avec `{"role":"admin"}` suffirait a obtenir la
moderation.

### Surface actuelle

| Espace | Routes |
| --- | --- |
| Systeme | `GET /api/health`, `POST /api/ping` |
| Reference | `GET /api/reference`, `GET /api/stats` |
| Authentification | `/api/auth/*` (better-auth) |
| Catalogue | `GET /api/profiles`, `GET /api/profiles/{id}` |
| Espace demandeur | `GET|PATCH /api/me/profile`, `GET /api/me/notifications`, `POST /api/me/notifications/read` |
| Certification | `GET /api/certification/questions`, `GET /api/me/certification`, `PUT .../answers`, `POST .../submit`, `POST .../restart` |
| Espace recruteur | `GET /api/me/favorites`, `PUT|DELETE /api/me/favorites/{profileId}`, `POST /api/profiles/{id}/contact`, `GET /api/me/contacts`, `PATCH /api/me/contacts/{id}`, `GET /api/me/stats` |
| Administration | `GET /api/admin/stats`, `GET /api/admin/profiles`, `PATCH /api/admin/profiles/{id}`, `GET|POST /api/admin/questions`, `PATCH|DELETE /api/admin/questions/{id}`, `GET|PATCH /api/admin/settings` |

## Tests

```bash
npm test          # Vitest : bareme de certification + garde-fous de la specification
npm run test:e2e  # Playwright : parcours d'API et d'interface (demarre l'app tout seul)

# Contre le conteneur deja lance :
E2E_BASE_URL=http://localhost:3000 npx playwright test
```

- `e2e/api.spec.ts` — ce que l'API promet, refus compris (401, 403, 404, 400).
- `e2e/ui.spec.ts` — les memes parcours a travers l'interface : filtres,
  questionnaire, prise de contact, moderation.
- `e2e/stack.spec.ts` — les briques (sonde de sante, ecriture en base, session
  qui survit a un rechargement, documentation Scalar).

Les tests supposent la base peuplee (`npm run db:seed`) : ils se connectent
avec les comptes de demonstration.

Toute la suite tourne **en serie, sur un seul worker** : les fichiers partagent
une base SQLite unique et les memes comptes. Deux fichiers qui modifient le
seuil de certification ou une tentative en parallele se font echouer l'un
l'autre.

## Base de donnees

Le schema vit dans `src/db/schema.ts`. Apres toute modification :

```bash
npm run db:generate   # ecrit une migration dans drizzle/
npm run db:migrate    # l'applique
```

Les migrations sont **rejouees automatiquement au demarrage** par
`src/instrumentation.ts` : rien a lancer a la main dans le conteneur.

Les quatre tables `user`, `session`, `account`, `verification` sont imposees
par better-auth — ne pas les renommer. La table `ping` est temporaire.

Les vocabulaires fermes (secteurs, villes, competences, statuts) vivent dans
`src/lib/vocabulary.ts` et **nulle part ailleurs** : le schema Drizzle, les
contrats Zod et `/api/reference` les lisent tous les trois depuis ce fichier.
Ajouter un secteur, c'est modifier une seule liste.

```bash
npm run db:seed   # jeu de demonstration (destructif, rejouable)
```

## Prochaines etapes

L'application couvre le perimetre de la maquette fonctionnelle. Restent
ouverts :

- [ ] Heberger et lire les videos, plutot que referencer une URL YouTube/Vimeo
      (l'emplacement est dessine, le jeu d'essai ne contient pas de vraie video)
- [ ] Notifications par e-mail (aujourd'hui uniquement en base)
- [ ] Supprimer la route `/api/ping` et sa table, vestiges de la verification
      du socle
- [ ] `npm run lint` : `next lint` a ete **supprime** dans Next.js 16. Le script
      de `package.json` ne fait plus rien ; brancher Biome ou ESLint
      directement. En attendant, `npm run typecheck` est le garde-fou.

## Points a savoir

- **`better-sqlite3` est un module natif.** Ne jamais monter le
  `node_modules` de l'hote dans le conteneur : le `docker-compose.yml` le
  masque volontairement avec un volume anonyme.
- **La connexion a la base est paresseuse** (`src/db/index.ts`). L'ouvrir a
  l'import ferait echouer `next build` : plusieurs workers se disputeraient le
  meme fichier SQLite.
- **Dev et prod ont chacun leur volume de base** (`db-data-dev`,
  `db-data-prod`). Docker fige le proprietaire d'un volume a sa creation, et
  les deux images tournent sous des utilisateurs differents (`node`/1000 en
  dev, `nextjs`/1001 en prod) : un volume partage finirait en lecture seule
  pour l'un des deux (`SQLITE_READONLY`). Les deux bases sont donc
  independantes — normal que `make dev` ne montre pas les donnees de
  `make prod`.
- **better-auth verifie l'en-tete `Origin`.** `localhost` et `127.0.0.1` sont
  deux origines differentes : toute nouvelle origine doit etre ajoutee a
  `trustedOrigins` dans `src/lib/auth.ts`, sinon les requetes repondent 403.
