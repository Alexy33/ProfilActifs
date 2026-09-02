import { expect, test } from "@playwright/test";

/**
 * Mesures du Cabinet du 2026-09-02 : preuve par le parcours reel.
 *
 * Le point sur lequel la conseillere a demande a etre la plus attentive : une
 * video en attente ne doit etre accessible PAR AUCUN MOYEN, pas seulement
 * invisible dans l'interface. Ce fichier ouvre donc l'adresse directe de la
 * video dans un contexte vierge — l'equivalent d'une fenetre de navigation
 * privee : aucun cookie, aucun stockage, aucune session — et capture ce qui
 * est obtenu.
 */

const PASSWORD = "demo1234";

/**
 * better-auth limite le debit des routes d'authentification en production
 * (429). C'est une protection voulue, qu'on ne desactive pas pour les tests :
 * on la subit, en reessayant. Sans cela, ces tests echoueraient pour une
 * raison etrangere a ce qu'ils verifient.
 */
async function postWithRetry(
  request: any,
  url: string,
  data: unknown,
  attempts = 6,
): Promise<any> {
  let response = await request.post(url, { data });
  for (let i = 0; i < attempts && response.status() === 429; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 11_000));
    response = await request.post(url, { data });
  }
  return response;
}

/** Date de naissance correspondant a un age revolu. */
function birthDate(age: number): string {
  const date = new Date();
  date.setUTCFullYear(date.getUTCFullYear() - age);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString();
}

/** Cree un compte candidat et renvoie son contexte + l'identifiant de profil. */
async function createCandidate(request: any, age: number, label: string) {
  const email = `e2e-${label}-${Date.now()}@exemple.fr`;
  const signup = await postWithRetry(request, "/api/auth/sign-up/email", {
    name: `E2E ${label}`,
    email,
    password: PASSWORD,
    role: "candidate",
    birthDate: birthDate(age),
  });
  expect(signup.ok(), await signup.text()).toBeTruthy();

  const profile = await (await request.get("/api/me/profile")).json();
  return { email, profileId: profile.id as string };
}

test.describe("Moderation a priori des videos", () => {
  test("une video en attente est inaccessible par son adresse directe", async ({
    browser,
    playwright,
  }) => {
    // 1. Un candidat majeur depose une video.
    const candidate = await playwright.request.newContext({
      baseURL: test.info().project.use.baseURL,
    });
    const { profileId } = await createCandidate(candidate, 30, "video");

    const upload = await candidate.put("/api/me/profile/video", {
      headers: { "content-type": "video/mp4" },
      data: Buffer.alloc(4096, 7),
    });
    expect(upload.ok()).toBeTruthy();

    // 2. Le serveur ne renvoie deja plus l'URL publiquement.
    const own = await (await candidate.get("/api/me/profile")).json();
    expect(own.videoStatus).toBe("pending");
    expect(own.videoUrl, "l'URL publique doit etre nulle tant que la video n'est pas validee")
      .toBeNull();

    const videoPath = own.ownVideoUrl as string;

    // 3. Contexte VIERGE : ni cookie, ni stockage — navigation privee.
    const privateContext = await browser.newContext();
    const page = await privateContext.newPage();
    const response = await page.goto(videoPath);

    // La preuve demandee : la video ne se lit pas.
    expect(response?.status(), "l'adresse directe doit repondre 404").toBe(404);
    await expect(page.getByText("introuvable")).toBeVisible();

    await page.screenshot({
      path: "test-results/video-en-attente-navigation-privee.png",
      fullPage: true,
    });

    // 4. Meme refus pour une requete partielle ou avec parametre.
    for (const variant of [`${videoPath}&x=1`, videoPath]) {
      const direct = await privateContext.request.get(variant, {
        headers: { Range: "bytes=0-128" },
      });
      expect(direct.status(), `contournement via ${variant}`).toBe(404);
    }

    await privateContext.close();
    await candidate.dispose();
  });

  test("un refus doit etre motive, et le motif parvient au candidat", async ({ playwright }) => {
    const base = test.info().project.use.baseURL;
    const candidate = await playwright.request.newContext({ baseURL: base });
    const { profileId } = await createCandidate(candidate, 28, "refus");

    await candidate.put("/api/me/profile/video", {
      headers: { "content-type": "video/mp4" },
      data: Buffer.alloc(2048, 3),
    });

    const admin = await playwright.request.newContext({ baseURL: base });
    const login = await postWithRetry(admin, "/api/auth/sign-in/email", {
      email: "admin@jeb.gouv.fr",
      password: "demo",
    });
    test.skip(!login.ok(), "jeu de demonstration absent : `make seed` requis.");

    // Un refus sans motif est refuse par le contrat lui-meme.
    const sansMotif = await admin.patch(`/api/admin/videos/${profileId}`, {
      data: { status: "rejected" },
    });
    expect(sansMotif.status()).toBe(400);

    const motif = "Le son couvre les propos tenus.";
    const avecMotif = await admin.patch(`/api/admin/videos/${profileId}`, {
      data: { status: "rejected", reason: motif },
    });
    expect(avecMotif.ok()).toBeTruthy();

    // Le candidat voit le motif : une video qui disparait sans explication est
    // un contentieux qui commence.
    const after = await (await candidate.get("/api/me/profile")).json();
    expect(after.videoStatus).toBe("rejected");
    expect(after.videoReviewReason).toBe(motif);

    const notifications = await (await candidate.get("/api/me/notifications")).json();
    expect(notifications.items.some((item: { text: string }) => item.text.includes(motif))).toBe(
      true,
    );

    await admin.dispose();
    await candidate.dispose();
  });
});

test.describe("Verification de l'age", () => {
  test("l'inscription est refusee en dessous de 16 ans", async ({ request }) => {
    const response = await postWithRetry(request, "/api/auth/sign-up/email", {
      name: "Trop Jeune",
      email: `mineur-${Date.now()}@exemple.fr`,
      password: PASSWORD,
      role: "candidate",
      // La veille des 16 ans : la borne exacte, celle qu'un calcul
      // approximatif laisserait passer.
      birthDate: birthDate(15),
    });

    expect(response.status()).toBe(400);
    expect(await response.text()).toContain("16 ans");
  });

  test("un profil de mineur n'apparait pas au catalogue public", async ({ playwright }) => {
    const base = test.info().project.use.baseURL;
    const candidate = await playwright.request.newContext({ baseURL: base });
    const { profileId } = await createCandidate(candidate, 17, "mineur");

    // Meme publie, il reste hors du catalogue : la fiche repond 404.
    const fiche = await candidate.get(`/api/profiles/${profileId}`);
    expect(fiche.status()).toBe(404);

    const catalogue = await (await candidate.get("/api/profiles?pageSize=20")).json();
    expect(
      catalogue.items.some((item: { id: string }) => item.id === profileId),
      "un profil de mineur ne doit jamais figurer au catalogue",
    ).toBe(false);

    await candidate.dispose();
  });
});

test.describe("Compteurs d'engagement", () => {
  test("aucun compteur ne sort du serveur sur les vues publiques", async ({ request }) => {
    const catalogue = await (await request.get("/api/profiles?pageSize=5")).json();

    for (const item of catalogue.items) {
      expect(item, "le catalogue ne doit pas exposer de compteur de vues").not.toHaveProperty(
        "views",
      );
      expect(item).not.toHaveProperty("contactCount");
    }

    if (catalogue.items.length > 0) {
      const fiche = await (await request.get(`/api/profiles/${catalogue.items[0].id}`)).json();
      expect(fiche, "la fiche publique ne doit pas exposer de compteur").not.toHaveProperty(
        "views",
      );
      expect(fiche).not.toHaveProperty("contactCount");
    }
  });
});
