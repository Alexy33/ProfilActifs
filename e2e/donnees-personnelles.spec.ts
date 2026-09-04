import { expect, test } from "@playwright/test";

/**
 * Conservation et effacement des donnees (R.5).
 *
 * Le registre des traitements (`docs/registre-traitements.md`) et les CGU
 * (`docs/cgu.md`) annoncent deux choses que du texte ne prouve pas :
 *
 * 1. un titulaire peut supprimer son compte lui-meme, immediatement et
 *    definitivement — c'est le droit d'effacement des CGU §10 ;
 * 2. les durees de conservation sont APPLIQUEES, et l'administration peut
 *    l'etablir a la demande.
 *
 * Ces tests passent par l'API et non par l'ecran : ce qui est en jeu est ce que
 * le serveur fait, pas ce qu'un bouton affiche.
 */

const PASSWORD = "demo1234";
const ADULT = "1990-05-17";
/** PREREQUIS de ce fichier : base peuplee (`npm run db:seed`). */
const ADMIN = "admin@jeb.gouv.fr";

/** Adresse unique par execution : la base de demonstration n'est pas remise a zero. */
const unique = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}@exemple.fr`;

test.describe("Donnees personnelles", () => {
  test("un titulaire supprime son compte, et ne peut plus s'y connecter", async ({
    playwright,
    baseURL,
  }) => {
    const context = await playwright.request.newContext({ baseURL: baseURL! });
    const email = unique("effacement");

    const created = await context.post("/api/register", {
      data: { role: "candidate", name: "Alex Test", email, password: PASSWORD, birthDate: ADULT },
    });
    expect(created.status()).toBe(201);

    // Le compte existe : son profil est servi.
    expect((await context.get("/api/me/profile")).status()).toBe(200);

    const deleted = await context.delete("/api/me/account");
    expect(deleted.status()).toBe(200);
    expect(await deleted.json()).toEqual({ ok: true });

    // Rien a rattacher : la session ne designe plus personne.
    expect((await context.get("/api/me/profile")).status()).toBe(401);

    // Et le compte n'est pas seulement « desactive » : se reconnecter echoue.
    const fresh = await playwright.request.newContext({ baseURL: baseURL! });
    const retry = await fresh.post("/api/auth/sign-in/email", { data: { email, password: PASSWORD } });
    expect(retry.ok()).toBe(false);
  });

  test("l'administration lit les durees appliquees et rejoue la purge", async ({
    playwright,
    baseURL,
  }) => {
    const context = await playwright.request.newContext({ baseURL: baseURL! });
    const login = await context.post("/api/auth/sign-in/email", {
      data: { email: ADMIN, password: PASSWORD },
    });
    expect(login.status(), "connexion administrateur").toBe(200);

    const policy = await context.get("/api/admin/retention");
    expect(policy.status()).toBe(200);
    const durees = await policy.json();
    // Le journal de connexion part avant le compte : sinon il n'aurait pas de
    // duree propre, seulement un effacement par ricochet.
    expect(durees.sessionLogMonths).toBeLessThan(durees.accountInactivityMonths);

    const run = await context.post("/api/admin/retention");
    expect(run.status()).toBe(200);
    const report = await run.json();
    // La base de demonstration est fraiche : la purge ne doit rien emporter.
    // C'est le garde-fou qui compte — une purge qui effacerait le jeu de
    // demonstration effacerait des comptes vivants en production.
    expect(report.deleted.accounts).toBe(0);
    expect(report.deleted.contacts).toBe(0);
  });

  test("la purge est refusee a qui n'est pas administrateur", async ({ playwright, baseURL }) => {
    const context = await playwright.request.newContext({ baseURL: baseURL! });
    const email = unique("candidat-purge");
    await context.post("/api/register", {
      data: { role: "candidate", name: "Sam Test", email, password: PASSWORD, birthDate: ADULT },
    });

    expect((await context.post("/api/admin/retention")).status()).toBe(403);

    // Menage : ce test cree un compte, il le reprend.
    await context.delete("/api/me/account");
  });
});
