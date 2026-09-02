import { expect, test, type APIRequestContext } from "@playwright/test";

const PASSWORD = "demo";
const CANDIDATE = "amina@exemple.fr";

const FAKE_MP4 = Buffer.alloc(4096, 0x21);

async function candidateContext(playwright: typeof import("@playwright/test"), baseURL: string): Promise<APIRequestContext> {
  const context = await playwright.request.newContext({ baseURL });
  const login = await context.post("/api/auth/sign-in/email", { data: { email: CANDIDATE, password: PASSWORD } });
  expect(login.status(), "connexion candidate").toBe(200);
  return context;
}

test.describe("Vidéo de présentation", () => {
  test("téléverse, lit, lit par intervalle, puis supprime", async ({ playwright, baseURL }) => {
    const candidate = await candidateContext(playwright, baseURL!);

    const upload = await candidate.put("/api/me/profile/video", {
      headers: { "content-type": "video/mp4" },
      data: FAKE_MP4,
    });
    expect(upload.status(), "PUT vidéo").toBe(200);
    const profile = await upload.json();
    expect(profile.videoUrl).toMatch(/^\/api\/videos\/[^?]+(\?.*)?$/);

    const videoPath = profile.videoUrl.split("?")[0];

    const full = await candidate.get(videoPath);
    expect(full.status()).toBe(200);
    expect(full.headers()["content-type"]).toContain("video/mp4");
    expect(full.headers()["accept-ranges"]).toBe("bytes");
    expect((await full.body()).byteLength).toBe(FAKE_MP4.byteLength);

    const partial = await candidate.get(videoPath, { headers: { Range: "bytes=0-99" } });
    expect(partial.status(), "réponse Range").toBe(206);
    expect(partial.headers()["content-range"]).toBe(`bytes 0-99/${FAKE_MP4.byteLength}`);
    expect((await partial.body()).byteLength).toBe(100);

    const removed = await candidate.delete("/api/me/profile/video");
    expect(removed.status()).toBe(200);
    expect((await removed.json()).videoUrl).toBeNull();

    expect((await candidate.get(videoPath)).status(), "vidéo supprimée").toBe(404);

    await candidate.dispose();
  });

  test("refuse un fichier de plus de 100 Mo", async ({ playwright, baseURL }) => {
    const candidate = await candidateContext(playwright, baseURL!);

    const tooBig = Buffer.alloc(100 * 1024 * 1024 + 1);
    const response = await candidate.put("/api/me/profile/video", {
      headers: { "content-type": "video/mp4" },
      data: tooBig,
    });

    expect(response.status()).toBe(422);
    expect((await response.json()).error.code).toBe("unprocessable");

    await candidate.dispose();
  });

  test("refuse un type de fichier non pris en charge", async ({ playwright, baseURL }) => {
    const candidate = await candidateContext(playwright, baseURL!);

    const response = await candidate.put("/api/me/profile/video", {
      headers: { "content-type": "application/pdf" },
      data: Buffer.from("%PDF-1.4"),
    });

    expect(response.status()).toBe(422);

    await candidate.dispose();
  });

  test("exige une session candidate", async ({ request }) => {
    const anonymous = await request.put("/api/me/profile/video", {
      headers: { "content-type": "video/mp4" },
      data: FAKE_MP4,
    });
    expect(anonymous.status()).toBe(401);
  });

  test("un recruteur ne peut pas téléverser de vidéo", async ({ playwright, baseURL }) => {
    const recruiter = await playwright.request.newContext({ baseURL: baseURL! });
    await recruiter.post("/api/auth/sign-in/email", { data: { email: "recruteur@exemple.fr", password: PASSWORD } });

    const response = await recruiter.put("/api/me/profile/video", {
      headers: { "content-type": "video/mp4" },
      data: FAKE_MP4,
    });
    expect(response.status()).toBe(403);

    await recruiter.dispose();
  });

  test("la spécification OpenAPI décrit les routes vidéo", async ({ request }) => {
    const spec = await (await request.get("/api/openapi")).json();
    expect(spec.paths["/api/me/profile/video"]).toBeDefined();
    expect(spec.paths["/api/me/profile/video"].put).toBeDefined();
    expect(spec.paths["/api/me/profile/video"].delete).toBeDefined();
    expect(spec.paths["/api/videos/{id}"].get).toBeDefined();
  });
});
