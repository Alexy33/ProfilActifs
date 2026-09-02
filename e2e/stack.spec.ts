import { expect, test } from "@playwright/test";

/**
 * Verification de viabilite de la stack : chaque brique est testee a travers
 * l'application reellement servie, pas en isolation.
 *
 * L'interface de verification qui servait a cela (page « Verification de la
 * stack », bouton de ping) a laisse place au produit ; les briques, elles, sont
 * toujours verifiees ici — la base par la route d'ecriture, la session par un
 * parcours de connexion reel, la specification par la page Scalar.
 */

test("la sonde de sante confirme que SQLite repond", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.ok()).toBe(true);
  expect(await response.json()).toMatchObject({ status: "ok", db: "up" });
});

test("la page d'accueil est rendue par le serveur", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("se certifie");
  // Le pied de page annonce les briques ; leur presence prouve que le layout
  // racine a bien ete rendu.
  await expect(page.getByText("Next.js", { exact: true }).first()).toBeVisible();
});

test("l'ecriture en base fonctionne", async ({ request }) => {
  const before = await (await request.get("/api/health")).json();
  expect(before.db).toBe("up");

  const written = await request.post("/api/ping");
  expect(written.ok()).toBe(true);
});

test("la documentation Scalar est servie et lit la specification", async ({ page, request }) => {
  const spec = await request.get("/api/openapi");
  expect(spec.ok()).toBe(true);
  const body = await spec.json();
  expect(body.openapi).toMatch(/^3\./);
  expect(body.paths["/api/health"]).toBeDefined();

  await page.goto("/api/docs");
  await expect(page).toHaveTitle(/ProfilsActifs/);
});

test("better-auth ouvre une session qui survit a un rechargement", async ({ page }) => {
  await page.goto("/connexion");

  await page.getByLabel("Adresse e-mail").fill("amina@exemple.fr");
  await page.getByLabel("Mot de passe").fill("demo");
  await page.getByRole("button", { name: "Ouvrir la session" }).click();

  await expect(page.getByTestId("session-name")).toContainText("Amina Berthier");

  // Le rechargement prouve que le cookie httpOnly est bien pose, et qu'il ne
  // s'agit pas d'un simple etat React.
  await page.reload();
  await expect(page.getByTestId("session-name")).toContainText("Amina Berthier");

  await page.getByRole("button", { name: "Déconnexion" }).click();
  await expect(page.getByRole("link", { name: "Connexion" })).toBeVisible();
});
