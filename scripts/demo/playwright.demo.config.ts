import { defineConfig, devices } from "@playwright/test";

/**
 * Configuration dediee a l'enregistrement de la video de demonstration.
 *
 * Separee de `playwright.config.ts` pour que la suite de tests ne paie ni
 * l'enregistrement video, ni le ralentissement volontaire du scenario.
 *
 *   npm run demo
 */

const PORT = Number(process.env.PORT ?? 3000);
const baseURL = process.env.DEMO_BASE_URL ?? `http://localhost:${PORT}`;

// 1280x720 : le format 16/9 attendu d'une video, et une largeur qui declenche
// les mises en page « bureau » de l'application.
const VIEWPORT = { width: 1280, height: 720 };

export default defineConfig({
  testDir: ".",
  testMatch: "demo.spec.ts",

  // Un seul parcours, joue une fois : ni parallelisme, ni reprise sur echec —
  // une seconde tentative produirait une deuxieme video.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  timeout: 15 * 60 * 1000,

  use: {
    baseURL,
    viewport: VIEWPORT,
    video: { mode: "on", size: VIEWPORT },
    // Ralentit chaque action : sans cela, les clics sont instantanes et le
    // film devient illisible.
    launchOptions: { slowMo: 260 },
  },

  outputDir: "../../test-results/demo",

  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
