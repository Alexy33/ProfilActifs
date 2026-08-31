# ProfilsActifs — socle technique

Demonstrateur pour le Ministere du Job et Bonheur (JEB/DNI/2026-003).

Ce depot contient **le socle**, pas encore le produit : une page unique qui
verifie que chaque brique de la stack fonctionne, et de quoi construire par
dessus.

## Stack

| Brique | Choix | Ou ca vit |
| --- | --- | --- |
| Framework | Next.js 16 (App Router) | `src/app/` |
| Authentification | better-auth (email + mot de passe, 3 roles) | `src/lib/auth.ts` |
| Base de donnees | SQLite + Drizzle ORM | `src/db/` |
| Documentation API | Scalar | `/api/docs` |
| Styles | Tailwind v4 | `src/app/globals.css` |
| Composants | shadcn/ui | `src/components/ui/` |
| Tests | Vitest (unitaire) + Playwright (e2e) | `src/**/*.test.ts`, `e2e/` |
| Conteneurisation | Docker (profils dev / prod) | `Dockerfile`, `docker-compose.yml` |

## Demarrer

```bash
cp .env.example .env
# Generer un vrai secret :
openssl rand -base64 32   # a coller dans BETTER_AUTH_SECRET

make dev                  # http://localhost:3000
```

`make` seul liste toutes les cibles disponibles.

### Sans Docker

```bash
npm install
npm run db:migrate
npm run dev
```

## Ce que la page d'accueil prouve

Elle n'est pas decorative : chaque ligne est verifiee a l'execution.

- **Next.js** — la page est un composant serveur (`src/app/page.tsx`).
- **SQLite + Drizzle** — les compteurs viennent de vrais `COUNT(*)`.
- **better-auth** — le bouton ouvre une session ; elle survit a un F5, ce qui
  prouve que le cookie httpOnly est bien pose (et pas un simple etat React).
- **Ecriture en base** — « Ping la base » insere une ligne et le compteur
  augmente apres re-rendu serveur.
- **Scalar** — la doc est servie sur `/api/docs`, lue depuis `/api/openapi`.

## Routes

| Route | Role |
| --- | --- |
| `/` | Page de verification du socle |
| `/api/health` | Sonde utilisee par le HEALTHCHECK Docker |
| `/api/docs` | Documentation interactive Scalar |
| `/api/openapi` | Specification OpenAPI 3.1 |
| `/api/auth/*` | better-auth (sign-up, sign-in, get-session, sign-out) |
| `/api/ping` | Demo d'ecriture en base — **a supprimer** avec la table `ping` |

## Tests

```bash
npm test          # Vitest
npm run test:e2e  # Playwright (demarre l'app tout seul)

# Contre le conteneur deja lance :
E2E_BASE_URL=http://localhost:3000 npx playwright test
```

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

## Prochaines etapes

Le domaine metier reste entierement a ecrire :

- [ ] Table `profile` + espace demandeur d'emploi (CDC 2.1)
- [ ] Catalogue paginee et filtres (CDC 2.1, 3.4 — 20 profils/page max)
- [ ] Questionnaire de certification + badge JEB (CDC 2.2)
- [ ] Espace recruteur : contact, favoris, suivi (CDC 2.1)
- [ ] Espace administration : moderation, gestion des questions (CDC 2.1)
- [ ] Notifications candidat (CDC 2.3)

## Points a savoir

- **`better-sqlite3` est un module natif.** Ne jamais monter le
  `node_modules` de l'hote dans le conteneur : le `docker-compose.yml` le
  masque volontairement avec un volume anonyme.
- **La connexion a la base est paresseuse** (`src/db/index.ts`). L'ouvrir a
  l'import ferait echouer `next build` : plusieurs workers se disputeraient le
  meme fichier SQLite.
- **better-auth verifie l'en-tete `Origin`.** `localhost` et `127.0.0.1` sont
  deux origines differentes : toute nouvelle origine doit etre ajoutee a
  `trustedOrigins` dans `src/lib/auth.ts`, sinon les requetes repondent 403.
