import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PORT ?? 3000);
// localhost, et non 127.0.0.1 : better-auth compare l'Origin a BETTER_AUTH_URL.
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",

  // Les tests d'un meme fichier s'executent en serie.
  //
  // Ils partagent une base SQLite unique : lancer en parallele le test qui
  // modifie le questionnaire (administration) et celui qui calcule un score
  // (certification) fait varier le bareme en cours de route, et le second
  // echoue au hasard. Les fichiers, eux, restent paralleles entre eux.
  fullyParallel: false,
  // Interdit un .only oublie dans un commit qui passerait la CI en silence.
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
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
