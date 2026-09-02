import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PORT ?? 3000);
// localhost, et non 127.0.0.1 : better-auth compare l'Origin a BETTER_AUTH_URL.
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",

  // Toute la suite s'execute en serie, un seul worker.
  //
  // Les tests partagent une base SQLite unique ET les memes comptes de
  // demonstration : le test qui modifie le questionnaire (administration) et
  // celui qui calcule un score (certification) font varier le bareme l'un pour
  // l'autre. Tant que api.spec.ts et ui.spec.ts jouent les memes parcours sur
  // les memes comptes, les fichiers ne peuvent pas non plus tourner en
  // parallele entre eux.
  fullyParallel: false,
  // Interdit un .only oublie dans un commit qui passerait la CI en silence.
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",

  use: {
    baseURL,
    trace: "on-first-retry",
  },

  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],

  // Demarre l'app si elle ne tourne pas deja. Avec E2E_BASE_URL defini (ex.
  // tests contre le conteneur Docker), on reutilise le serveur en place.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
