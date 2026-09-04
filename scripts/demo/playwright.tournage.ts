import { defineConfig, devices } from "@playwright/test";

/**
 * Configuration du tournage — distincte de `playwright.config.ts`.
 *
 * Trois differences avec la configuration des tests :
 *   - `video: "on"` : c'est tout l'objet de ce fichier ;
 *   - aucun `webServer` : on filme le serveur deja lance (Docker ou `npm run
 *     dev`), parce qu'un serveur demarre a froid passerait ses premieres
 *     secondes a compiler devant la camera ;
 *   - `headless: false` par defaut : le rendu headless diverge parfois sur les
 *     polices et les animations, et une video de presentation se juge a l'oeil.
 */

const baseURL = process.env.DEMO_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: ".",
  testMatch: "tournage.spec.ts",
  timeout: 240_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  outputDir: "../../docs/captures/video",

  use: {
    baseURL,
    headless: process.env.DEMO_HEADED !== "1",
    // Format MacBook. En 1280x720, la barre laterale de 256px ne laissait que
    // ~1024px de contenu et les grilles se tassaient : les mises en page de
    // l'application sont dessinees pour un ecran d'ordinateur portable.
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
    video: { mode: "on", size: { width: 1440, height: 900 } },
  },

  // Le viewport est redefini APRES le spread : `devices["Desktop Chrome"]`
  // embarque son propre 1280x720, qui sinon ecrase celui de `use` — la video
  // sortait alors en 1440x900 avec la page rendue dans un coin de 1280x720.
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
  ],
});
