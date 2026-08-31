import { expect, test } from "@playwright/test";

/**
 * Verification de viabilite de la stack : chaque brique est testee a travers
 * l'application reellement servie, pas en isolation.
 */

test("la sonde de sante confirme que SQLite repond", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.ok()).toBe(true);
  expect(await response.json()).toMatchObject({ status: "ok", db: "up" });
});

test("la page d'accueil est rendue par le serveur", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Verification de la stack");
  await expect(page.getByText("Next.js 16")).toBeVisible();
});

test("l'ecriture en base fonctionne depuis l'interface", async ({ page }) => {
  await page.goto("/");

  const counter = page.getByTestId("ping-count");
  const before = Number((await counter.innerText()).match(/\d+/)![0]);

  await page.getByRole("button", { name: "Ping la base" }).click();

  // La page est re-rendue cote serveur : le compteur vient d'un COUNT(*).
  await expect(counter).toContainText(`${before + 1} ping`);
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
  await page.goto("/");

  await page.getByLabel("Adresse e-mail").fill("e2e@exemple.fr");
  await page.getByLabel("Mot de passe").fill("demo1234");
  await page.getByRole("button", { name: "Se connecter" }).click();

  const state = page.getByTestId("session-state");
  await expect(state).toContainText("e2e@exemple.fr");

  // Le rechargement prouve que le cookie httpOnly est bien pose, et qu'il ne
  // s'agit pas d'un simple etat React.
  await page.reload();
  await expect(page.getByTestId("session-state")).toContainText("e2e@exemple.fr");

  await page.getByRole("button", { name: "Se deconnecter" }).click();
  await expect(page.getByRole("button", { name: "Se connecter" })).toBeVisible();
});
