import { expect, test, type APIRequestContext } from "@playwright/test";

/**
 * Moderation des videos avant publication (R.2).
 *
 * Ce que ces tests etablissent, dans l'ordre du courrier :
 *
 * 1. une video nouvellement deposee est `pending` et n'est PAS visible ;
 * 2. son URL directe repond 404 a un visiteur non connecte et a un recruteur —
 *    la restriction tient a la route, pas au fait que l'interface ne montre
 *    pas de lien ;
 * 3. l'administration valide ou refuse, avec motif, auteur et date ;
 * 4. le motif de refus revient au candidat sur `/api/me/profile`.
 *
 * PREREQUIS : base peuplee (`npm run db:seed`).
 */

const PASSWORD = "demo1234";
/**
 * Candidat dedie a ce fichier.
 *
 * Surtout PAS « amina@exemple.fr », qui sert deja a e2e/video.spec.ts : les
 * fichiers de test tournent en parallele, et deux specs qui deposent puis
 * suppriment la video du meme compte se retirent mutuellement le fichier sous
 * les pieds.
 */
const CANDIDATE = "karim.vasseur@exemple.fr";
const ADMIN = "admin@jeb.gouv.fr";
const RECRUITER = "recruteur@exemple.fr";

const FAKE_MP4 = Buffer.alloc(4096, 0x21);

async function contextFor(
  playwright: typeof import("@playwright/test"),
  baseURL: string,
  email: string,
): Promise<APIRequestContext> {
  const context = await playwright.request.newContext({ baseURL });
  const login = await context.post("/api/auth/sign-in/email", { data: { email, password: PASSWORD } });
  expect(login.status(), `connexion ${email}`).toBe(200);
  return context;
}

/** Depose une video et rend le profil ainsi que le chemin de lecture. */
async function uploadVideo(candidate: APIRequestContext) {
  const upload = await candidate.put("/api/me/profile/video", {
    headers: { "content-type": "video/mp4" },
    data: FAKE_MP4,
  });
  expect(upload.status(), "PUT vidéo").toBe(200);
  const profile = await upload.json();
  return { profile, videoPath: profile.videoUrl.split("?")[0] as string };
}

test.describe("Modération des vidéos (R.2)", () => {
  test("une vidéo déposée est en attente et inaccessible, y compris par son URL directe", async ({
    playwright,
    baseURL,
    request,
    browser,
  }) => {
    const candidate = await contextFor(playwright, baseURL!, CANDIDATE);
    const recruiter = await contextFor(playwright, baseURL!, RECRUITER);
    const admin = await contextFor(playwright, baseURL!, ADMIN);

    const { profile, videoPath } = await uploadVideo(candidate);
    expect(profile.videoModeration.status, "statut à l'upload").toBe("pending");
    expect(profile.videoModeration.decidedAt).toBeNull();

    // Le coeur de l'exigence : l'URL directe ne sert rien tant que la video
    // n'est pas validee, meme si le profil, lui, est publie.
    expect((await request.get(videoPath)).status(), "visiteur anonyme").toBe(404);
    expect((await recruiter.get(videoPath)).status(), "recruteur connecté").toBe(404);

    // Le titulaire et l'administration la voient : sans cela, personne ne
    // pourrait la moderer ni la relire avant de la remplacer.
    expect((await candidate.get(videoPath)).status(), "titulaire").toBe(200);
    expect((await admin.get(videoPath)).status(), "administration").toBe(200);

    // La fiche publique n'annonce pas non plus de lecteur.
    const publicProfile = await (await request.get(`/api/profiles/${profile.id}`)).json();
    expect(publicProfile.videoUrl, "URL absente de la fiche publique").toBeNull();

    /**
     * Preuve en navigation privee.
     *
     * Un contexte Playwright neuf est exactement cela : pas de cookie, pas de
     * session, pas de cache partage avec les requetes ci-dessus. La capture
     * montre donc ce que verrait n'importe qui a qui on transmettrait l'URL.
     */
    const privateContext = await browser.newContext();
    const page = await privateContext.newPage();
    const direct = await page.goto(`${baseURL}${videoPath}`);
    expect(direct?.status(), "URL directe en navigation privée").toBe(404);
    await page.screenshot({ path: "docs/captures/r2/01-video-pending-navigation-privee.png", fullPage: true });

    // Seconde preuve, cote interface : la meme fiche, vue du meme contexte
    // vierge, n'affiche aucun lecteur — « Aucune presentation video ».
    await page.goto(`${baseURL}/profils/${profile.id}`);
    await page.screenshot({ path: "docs/captures/r2/02-fiche-publique-sans-video.png", fullPage: true });
    await privateContext.close();

    await candidate.delete("/api/me/profile/video");
    await Promise.all([candidate.dispose(), recruiter.dispose(), admin.dispose()]);
  });

  test("l'administration valide : la vidéo devient publique", async ({ playwright, baseURL, request }) => {
    const candidate = await contextFor(playwright, baseURL!, CANDIDATE);
    const admin = await contextFor(playwright, baseURL!, ADMIN);

    const { profile, videoPath } = await uploadVideo(candidate);
    expect((await request.get(videoPath)).status()).toBe(404);

    const decision = await admin.patch(`/api/admin/videos/${profile.id}`, {
      data: { decision: "approved" },
    });
    expect(decision.status()).toBe(200);
    const row = await decision.json();
    expect(row.videoStatus).toBe("approved");
    expect(row.decidedBy, "auteur de la décision").toBeTruthy();
    expect(row.decidedAt, "date de la décision").toBeTruthy();

    expect((await request.get(videoPath)).status(), "vidéo validée, visiteur anonyme").toBe(200);

    await candidate.delete("/api/me/profile/video");
    await Promise.all([candidate.dispose(), admin.dispose()]);
  });

  test("un refus exige un motif, l'enregistre et le montre au candidat", async ({ playwright, baseURL, request }) => {
    const candidate = await contextFor(playwright, baseURL!, CANDIDATE);
    const admin = await contextFor(playwright, baseURL!, ADMIN);

    const { profile, videoPath } = await uploadVideo(candidate);

    const withoutReason = await admin.patch(`/api/admin/videos/${profile.id}`, {
      data: { decision: "rejected" },
    });
    expect(withoutReason.status(), "refus sans motif").toBe(400);

    const reason = "Le visage n'est pas visible : reprenez la vidéo de face, en lumière suffisante.";
    const rejected = await admin.patch(`/api/admin/videos/${profile.id}`, {
      data: { decision: "rejected", reason },
    });
    expect(rejected.status()).toBe(200);
    expect((await rejected.json()).videoStatus).toBe("rejected");

    expect((await request.get(videoPath)).status(), "vidéo refusée, visiteur anonyme").toBe(404);

    const mine = await (await candidate.get("/api/me/profile")).json();
    expect(mine.videoModeration.status).toBe("rejected");
    expect(mine.videoModeration.reason, "motif communiqué au candidat").toBe(reason);
    expect(mine.videoModeration.decidedBy).toBeTruthy();

    // Une nouvelle video efface la decision : elle porte sur un autre fichier.
    const again = await uploadVideo(candidate);
    expect(again.profile.videoModeration.status).toBe("pending");
    expect(again.profile.videoModeration.reason).toBeNull();

    await candidate.delete("/api/me/profile/video");
    await Promise.all([candidate.dispose(), admin.dispose()]);
  });

  test("la file de modération est réservée à l'administration", async ({ playwright, baseURL, request }) => {
    expect((await request.get("/api/admin/videos")).status(), "anonyme").toBe(401);

    const candidate = await contextFor(playwright, baseURL!, CANDIDATE);
    expect((await candidate.get("/api/admin/videos")).status(), "candidat").toBe(403);
    await candidate.dispose();

    const admin = await contextFor(playwright, baseURL!, ADMIN);
    const queue = await admin.get("/api/admin/videos?status=pending");
    expect(queue.status()).toBe(200);
    for (const row of (await queue.json()).items) expect(row.videoStatus).toBe("pending");
    await admin.dispose();
  });
});
