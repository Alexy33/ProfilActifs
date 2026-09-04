import { expect, test, type APIRequestContext } from "@playwright/test";

/**
 * Parcours complets de l'API, joues contre l'application reellement servie.
 *
 * Ces tests sont la contrepartie de la documentation Scalar : la doc dit ce que
 * l'API promet, ceux-ci verifient qu'elle le tient. Ils couvrent aussi les
 * refus (401, 403, 404, 400), qui sont la partie la plus facile a casser sans
 * s'en apercevoir.
 *
 * PREREQUIS : la base doit etre peuplee (`npm run db:seed`). Les comptes de
 * demonstration et les profils publies viennent de la.
 */

const PASSWORD = "demo1234";
/** Date de naissance majeure : l'inscription la refuse desormais si elle manque (R.1). */
const ADULT_BIRTH_DATE = "1990-05-17";

async function signIn(request: APIRequestContext, email: string) {
  const response = await request.post("/api/auth/sign-in/email", {
    data: { email, password: PASSWORD },
  });
  expect(response.status(), `connexion de ${email}`).toBe(200);
}

/** Contexte isole par role : chaque acteur garde son propre cookie de session. */
async function contextFor(browserBaseURL: string, playwright: typeof import("@playwright/test"), email: string) {
  const context = await playwright.request.newContext({ baseURL: browserBaseURL });
  await signIn(context, email);
  return context;
}

test.describe("Catalogue public", () => {
  test("sert les profils publies, pagines", async ({ request }) => {
    const response = await request.get("/api/profiles?page=1&pageSize=5");
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.items.length).toBeGreaterThan(0);
    expect(body.items.length).toBeLessThanOrEqual(5);
    expect(body.meta).toMatchObject({ page: 1, pageSize: 5 });
    expect(body.meta.total).toBeGreaterThan(0);
  });

  test("refuse une taille de page au-dela du plafond reglementaire", async ({ request }) => {
    // CDC 3.4 : 20 profils par page au maximum. La borne est refusee a
    // l'entree, elle n'est pas corrigee en silence.
    const response = await request.get("/api/profiles?pageSize=50");
    expect(response.status()).toBe(400);
    expect((await response.json()).error.code).toBe("bad_request");
  });

  test("refuse une valeur hors vocabulaire", async ({ request }) => {
    const response = await request.get("/api/profiles?sector=Pas%20un%20secteur");
    expect(response.status()).toBe(400);
  });

  test("cumule les competences demandees", async ({ request }) => {
    const response = await request.get("/api/profiles?skills=Rigueur&skills=Autonomie");
    expect(response.status()).toBe(200);

    for (const item of (await response.json()).items) {
      expect(item.skills).toEqual(expect.arrayContaining(["Rigueur", "Autonomie"]));
    }
  });

  test("ne divulgue pas les profils non publies", async ({ request }) => {
    const response = await request.get("/api/profiles/identifiant-inexistant");
    expect(response.status()).toBe(404);
  });
});

test.describe("Controle d'acces", () => {
  test("refuse 401 sans session", async ({ request }) => {
    for (const path of ["/api/me/profile", "/api/me/favorites", "/api/admin/stats"]) {
      expect((await request.get(path)).status(), path).toBe(401);
    }
  });

  test("refuse 403 avec une session de role insuffisant", async ({ playwright, baseURL }) => {
    const candidate = await contextFor(baseURL!, playwright, "amina@exemple.fr");

    // Distinguer 401 et 403 compte : le front doit rediriger vers la connexion
    // dans un cas, afficher « acces refuse » dans l'autre.
    expect((await candidate.get("/api/admin/stats")).status()).toBe(403);
    expect((await candidate.get("/api/me/favorites")).status()).toBe(403);

    await candidate.dispose();
  });

  test("l'inscription publique ne peut pas fabriquer un administrateur", async ({ request }) => {
    // Le role est un champ d'inscription, donc fourni par le client : sans
    // garde-fou cote serveur, n'importe qui obtiendrait la moderation.
    const response = await request.post("/api/auth/sign-up/email", {
      data: {
        name: "Tentative",
        email: `escalade-${Date.now()}@test.fr`,
        password: PASSWORD,
        birthDate: ADULT_BIRTH_DATE,
        role: "admin",
      },
    });

    expect(response.status()).toBe(200);
    expect((await response.json()).user.role).toBe("candidate");
  });
});

test.describe("Espace demandeur", () => {
  test("lit et met a jour son profil", async ({ playwright, baseURL }) => {
    const candidate = await contextFor(baseURL!, playwright, "amina@exemple.fr");

    expect((await candidate.get("/api/me/profile")).status()).toBe(200);

    const updated = await candidate.patch("/api/me/profile", {
      data: { title: "Responsable relation client", skills: ["Communication", "Rigueur"] },
    });
    expect(updated.status()).toBe(200);

    const body = await updated.json();
    expect(body.title).toBe("Responsable relation client");
    expect(body.skills.sort()).toEqual(["Communication", "Rigueur"]);

    // Un champ hors vocabulaire est refuse, pas ignore.
    const rejected = await candidate.patch("/api/me/profile", { data: { sector: "Inexistant" } });
    expect(rejected.status()).toBe(400);

    await candidate.dispose();
  });
});

test.describe("Certification", () => {
  test("un sans-faute delivre le badge", async ({ playwright, baseURL, request }) => {
    const candidate = await contextFor(baseURL!, playwright, "amina@exemple.fr");

    await candidate.post("/api/me/certification/restart");

    const questionnaire = await (await request.get("/api/certification/questions")).json();
    expect(questionnaire.questions.length).toBeGreaterThan(0);

    // La ponderation ne doit jamais fuiter vers le candidat.
    expect(questionnaire.questions[0]).not.toHaveProperty("weight");

    const answers: Record<string, number> = {};
    for (const question of questionnaire.questions) {
      answers[question.id] = question.options.length - 1;
    }

    const saved = await candidate.put("/api/me/certification/answers", { data: { answers } });
    expect(saved.status()).toBe(200);
    expect((await saved.json()).answered).toBe(questionnaire.questions.length);

    const result = await candidate.post("/api/me/certification/submit");
    expect(result.status()).toBe(200);
    expect(await result.json()).toMatchObject({ score: 100, passed: true, certified: true });

    await candidate.dispose();
  });

  test("refuse une reponse qui n'existe pas", async ({ playwright, baseURL }) => {
    const candidate = await contextFor(baseURL!, playwright, "amina@exemple.fr");

    const response = await candidate.put("/api/me/certification/answers", {
      data: { answers: { "question-fantome": 1 } },
    });
    expect(response.status()).toBe(422);

    await candidate.dispose();
  });
});

test.describe("Espace recruteur", () => {
  test("favoris, contact et suivi", async ({ playwright, baseURL, request }) => {
    const recruiter = await contextFor(baseURL!, playwright, "recruteur@exemple.fr");

    const catalog = await (await request.get("/api/profiles?pageSize=20")).json();
    const target = catalog.items.find((item: { name: string }) => item.name === "Amina Berthier");
    expect(target, "profil de demonstration attendu — lancez `npm run db:seed`").toBeTruthy();

    // Ajouter deux fois ne cree pas de doublon : la route est idempotente.
    expect((await recruiter.put(`/api/me/favorites/${target.id}`)).status()).toBe(200);
    expect((await recruiter.put(`/api/me/favorites/${target.id}`)).status()).toBe(200);

    const favorites = await (await recruiter.get("/api/me/favorites")).json();
    expect(favorites.items.filter((f: { profile: { id: string } }) => f.profile.id === target.id)).toHaveLength(1);

    const contact = await recruiter.post(`/api/profiles/${target.id}/contact`, {
      data: { message: "Bonjour, seriez-vous disponible cette semaine ?" },
    });
    expect(contact.status()).toBe(201);
    const contactId = (await contact.json()).id;

    const advanced = await recruiter.patch(`/api/me/contacts/${contactId}`, {
      data: { status: "Entretien planifié" },
    });
    expect(advanced.status()).toBe(200);

    const stats = await (await recruiter.get("/api/me/stats")).json();
    expect(stats.interviewsPlanned).toBeGreaterThanOrEqual(1);

    // Le suivi d'un autre recruteur est introuvable, pas « interdit ».
    expect((await recruiter.patch("/api/me/contacts/inexistant", { data: { status: "Retenu" } })).status()).toBe(404);

    // Le candidat contacte doit avoir ete notifie (CDC 2.3).
    const candidate = await contextFor(baseURL!, playwright, "amina@exemple.fr");
    const notifications = await (await candidate.get("/api/me/notifications")).json();
    expect(notifications.items.some((n: { type: string }) => n.type === "contact")).toBe(true);

    await candidate.dispose();
    await recruiter.dispose();
  });
});

test.describe("Administration", () => {
  test("modere, gere les questions et les reglages", async ({ playwright, baseURL }) => {
    const admin = await contextFor(baseURL!, playwright, "admin@jeb.gouv.fr");

    expect((await admin.get("/api/admin/stats")).status()).toBe(200);

    // La file de moderation est la seule vue qui expose les profils non publies.
    const queue = await (await admin.get("/api/admin/profiles")).json();
    expect(queue.items.length).toBeGreaterThan(0);

    const created = await admin.post("/api/admin/questions", {
      data: {
        text: "Question ajoutee par le test ?",
        weight: 3,
        options: [
          { label: "Reponse faible", value: 0 },
          { label: "Reponse forte", value: 1 },
        ],
      },
    });
    expect(created.status()).toBe(201);
    const questionId = (await created.json()).id;

    expect((await admin.patch(`/api/admin/questions/${questionId}`, { data: { weight: 5 } })).status()).toBe(200);
    expect((await admin.delete(`/api/admin/questions/${questionId}`)).status()).toBe(200);
    expect((await admin.delete(`/api/admin/questions/${questionId}`)).status()).toBe(404);

    // Un reglage modifie doit etre visible du front immediatement.
    expect((await admin.patch("/api/admin/settings", { data: { certificationThreshold: 75 } })).status()).toBe(200);
    const reference = await (await admin.get("/api/reference")).json();
    expect(reference.certificationThreshold).toBe(75);

    expect((await admin.patch("/api/admin/settings", { data: { certificationThreshold: 500 } })).status()).toBe(400);

    await admin.patch("/api/admin/settings", { data: { certificationThreshold: 70 } });
    await admin.dispose();
  });
});

test.describe("Consentement video (R.3)", () => {
  /**
   * Parcours complet sur un compte cree pour l'occasion : sans consentement le
   * fichier est refuse, avec consentement il est servi, et le retrait le fait
   * disparaitre du stockage. C'est cette derniere assertion qui compte : un
   * simple masquage laisserait `/api/videos/{id}` repondre 200.
   */
  test("accord horodate et versionne, retrait qui supprime le fichier", async ({ playwright, baseURL }) => {
    const email = `consent-${Date.now()}@exemple.fr`;
    const context = await playwright.request.newContext({ baseURL });

    const signUp = await context.post("/api/auth/sign-up/email", {
      data: { name: "Consentement Test", email, password: PASSWORD, birthDate: ADULT_BIRTH_DATE },
    });
    expect(signUp.status()).toBe(200);

    const profileId = (await (await context.get("/api/me/profile")).json()).id as string;

    // Un MP4 minimal suffit : le service stocke un flux, il ne decode rien.
    const payload = Buffer.concat([
      Buffer.from([0, 0, 0, 0x18]),
      Buffer.from("ftypmp42"),
      Buffer.alloc(64, 0x21),
    ]);

    // 1. Sans accord, rien n'entre en stockage.
    const refused = await context.put("/api/me/profile/video", {
      headers: { "Content-Type": "video/mp4" },
      data: payload,
    });
    expect(refused.status()).toBe(403);

    // 2. L'accord est enregistre avec sa date et la version du texte.
    const granted = await (await context.post("/api/me/profile/video/consent")).json();
    expect(granted.granted).toBe(true);
    expect(granted.version).toBeTruthy();
    expect(Number.isNaN(Date.parse(granted.grantedAt))).toBe(false);
    expect(granted.revokedAt).toBeNull();

    // 3. La video est acceptee, puis reellement servie depuis le stockage.
    expect((await context.put("/api/me/profile/video", {
      headers: { "Content-Type": "video/mp4" },
      data: payload,
    })).status()).toBe(200);
    expect((await context.get(`/api/videos/${profileId}`)).status()).toBe(200);

    // 3 bis. Un lien externe est une mise en diffusion comme une autre : la
    // meme garde doit s'appliquer, sinon le consentement se contourne en
    // collant une URL YouTube au lieu d'envoyer un fichier.
    await context.delete("/api/me/profile/video/consent");
    const lienRefuse = await context.patch("/api/me/profile", {
      data: { videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
    });
    expect(lienRefuse.status()).toBe(403);

    // Retirer le lien reste permis sans accord : on n'exige pas de
    // consentement pour cesser de diffuser.
    expect((await context.patch("/api/me/profile", { data: { videoUrl: null } })).status()).toBe(200);

    // Une fois l'accord redonne, le lien passe.
    await context.post("/api/me/profile/video/consent");
    expect((await context.patch("/api/me/profile", {
      data: { videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
    })).status()).toBe(200);

    // On remet un fichier pour la suite du scenario.
    expect((await context.put("/api/me/profile/video", {
      headers: { "Content-Type": "video/mp4" },
      data: payload,
    })).status()).toBe(200);

    // 4. Le retrait supprime le fichier : l'URL ne repond plus.
    const revoked = await (await context.delete("/api/me/profile/video/consent")).json();
    expect(revoked.granted).toBe(false);
    expect(Number.isNaN(Date.parse(revoked.revokedAt))).toBe(false);
    // La trace de ce qui avait ete accepte survit au retrait.
    expect(revoked.grantedAt).toBe(granted.grantedAt);
    expect(revoked.version).toBe(granted.version);

    expect((await context.get(`/api/videos/${profileId}`)).status()).toBe(404);

    // Le profil, lui, existe toujours : le retrait n'est pas un masquage.
    const after = await (await context.get("/api/me/profile")).json();
    expect(after.id).toBe(profileId);
    expect(after.videoUrl).toBeNull();

    await context.dispose();
  });
});

test.describe("Documentation", () => {
  test("la specification couvre toutes les routes du domaine", async ({ request }) => {
    const spec = await (await request.get("/api/openapi")).json();
    expect(spec.openapi).toMatch(/^3\./);

    // Un echantillon representatif de chaque espace : si le manifeste oublie un
    // fichier de route, la doc devient muette dessus sans que rien n'echoue.
    for (const path of [
      "/api/profiles",
      "/api/profiles/{id}",
      "/api/me/profile",
      "/api/me/certification",
      "/api/me/favorites/{profileId}",
      "/api/admin/questions",
      "/api/auth/sign-in/email",
    ]) {
      expect(spec.paths[path], `${path} absent de la specification`).toBeDefined();
    }
  });

  test("Scalar est servie et lit la specification", async ({ page }) => {
    await page.goto("/api/docs");
    await expect(page).toHaveTitle(/ProfilsActifs/);
  });
});
