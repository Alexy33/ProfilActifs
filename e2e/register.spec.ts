import { expect, test } from "@playwright/test";

/**
 * Inscription multi-roles (CDC 3.1).
 *
 * Ce que ces tests etablissent :
 *
 * 1. un compte se cree en demandeur d'emploi OU en recruteur ;
 * 2. un recruteur declare son entreprise dans la MEME requete — sans elle,
 *    l'inscription est refusee et aucun compte n'est cree ;
 * 3. le SIREN est controle (cle de Luhn) et unique dans le dispositif ;
 * 4. l'inscription publique ne permet pas de se faire administrateur.
 */

const PASSWORD = "demo1234";
const ADULT = "1990-05-17";

/** Adresse unique par execution : la base de demonstration n'est pas remise a zero entre deux passages. */
const unique = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}@exemple.fr`;

/**
 * SIREN valides au sens de Luhn, generes a la volee.
 *
 * Une constante serait rejouee au second passage des tests et tomberait sur la
 * contrainte d'unicite : le test echouerait pour une raison qui n'est pas celle
 * qu'il verifie.
 */
function makeSiren(): string {
  for (;;) {
    const base = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10)).join("");
    let total = 0;
    for (let index = 0; index < 9; index += 1) {
      let value = Number(base[index]);
      if (index % 2 === 1) {
        value *= 2;
        if (value > 9) value -= 9;
      }
      total += value;
    }
    if (total % 10 === 0 && base !== "000000000") return base;
  }
}

const companyOf = (siren: string) => ({
  name: "Fonderie de la Loire",
  siren,
  position: "Responsable du recrutement",
  address: "8 quai de la Fosse",
  postalCode: "44000",
  city: "Nantes",
  sector: "Industrie",
});

test.describe("Inscription multi-roles", () => {
  test("cree un compte demandeur d'emploi, avec son profil", async ({ playwright, baseURL }) => {
    const context = await playwright.request.newContext({ baseURL: baseURL! });
    const email = unique("candidat");

    const response = await context.post("/api/register", {
      data: { role: "candidate", name: "Claire Test", email, password: PASSWORD, birthDate: ADULT },
    });
    expect(response.status(), "creation du compte").toBe(201);
    expect((await response.json()).role).toBe("candidate");

    // La session est ouverte par l'inscription elle-meme : le profil est
    // lisible sans repasser par la page de connexion. C'est ce qui permet au
    // formulaire de rediriger directement vers l'espace du nouveau compte.
    const mine = await context.get("/api/me/profile");
    expect(mine.status(), "profil cree a l'inscription").toBe(200);

    // Un candidat n'a pas d'entreprise : la route lui est fermee par son role.
    expect((await context.get("/api/me/company")).status()).toBe(403);

    await context.dispose();
  });

  test("cree un compte recruteur avec son entreprise", async ({ playwright, baseURL }) => {
    const context = await playwright.request.newContext({ baseURL: baseURL! });
    const email = unique("recruteur");
    const siren = makeSiren();

    const response = await context.post("/api/register", {
      data: {
        role: "recruiter",
        name: "Hugo Test",
        email,
        password: PASSWORD,
        birthDate: ADULT,
        // Saisi avec des espaces, comme sur un Kbis : la normalisation est
        // faite par le serveur, pas exigee de la personne.
        company: { ...companyOf(`${siren.slice(0, 3)} ${siren.slice(3, 6)} ${siren.slice(6)}`) },
      },
    });

    expect(response.status(), "creation du compte recruteur").toBe(201);
    expect((await response.json()).role).toBe("recruiter");

    const mine = await context.get("/api/me/company");
    expect(mine.status()).toBe(200);
    const stored = await mine.json();
    expect(stored.siren, "SIREN normalise").toBe(siren);
    expect(stored.position).toBe("Responsable du recrutement");
    expect(stored.city).toBe("Nantes");

    // Le role est bien recruteur : les routes candidat lui sont fermees, celles
    // du recruteur ouvertes.
    expect((await context.get("/api/me/profile")).status()).toBe(403);
    expect((await context.get("/api/me/favorites")).status()).toBe(200);

    // Il peut corriger sa fiche entreprise.
    const patched = await context.patch("/api/me/company", {
      data: { position: "Directeur des ressources humaines" },
    });
    expect(patched.status()).toBe(200);
    expect((await patched.json()).position).toBe("Directeur des ressources humaines");

    await context.dispose();
  });

  test("refuse un recruteur sans entreprise, et ne cree aucun compte", async ({ playwright, baseURL }) => {
    const context = await playwright.request.newContext({ baseURL: baseURL! });
    const email = unique("sans-entreprise");

    const response = await context.post("/api/register", {
      data: { role: "recruiter", name: "Sans Entreprise", email, password: PASSWORD, birthDate: ADULT },
    });
    expect(response.status()).toBe(400);

    // Le compte ne doit pas exister : la connexion echoue.
    const login = await context.post("/api/auth/sign-in/email", { data: { email, password: PASSWORD } });
    expect(login.status(), "aucun compte cree").not.toBe(200);

    await context.dispose();
  });

  test("refuse un SIREN invalide puis un SIREN deja declare", async ({ playwright, baseURL }) => {
    const context = await playwright.request.newContext({ baseURL: baseURL! });

    const invalid = await context.post("/api/register", {
      data: {
        role: "recruiter",
        name: "Faux Siren",
        email: unique("faux-siren"),
        password: PASSWORD,
        birthDate: ADULT,
        company: companyOf("123456789"),
      },
    });
    expect(invalid.status(), "cle de Luhn fausse").toBe(400);

    const siren = makeSiren();
    const first = await context.post("/api/register", {
      data: {
        role: "recruiter",
        name: "Premier Inscrit",
        email: unique("premier"),
        password: PASSWORD,
        birthDate: ADULT,
        company: companyOf(siren),
      },
    });
    expect(first.status()).toBe(201);

    const duplicate = await context.post("/api/register", {
      data: {
        role: "recruiter",
        name: "Second Inscrit",
        email: unique("second"),
        password: PASSWORD,
        birthDate: ADULT,
        company: companyOf(siren),
      },
    });
    expect(duplicate.status(), "SIREN deja declare").toBe(409);

    await context.dispose();
  });

  test("le formulaire propose les deux roles et mene a l'espace correspondant", async ({ page }) => {
    const email = unique("formulaire");
    const siren = makeSiren();

    await page.goto("/register");

    // Le choix du role commande le formulaire : les champs entreprise
    // n'existent pas tant que « Recruteur » n'est pas selectionne.
    await expect(page.getByLabel("SIREN")).toHaveCount(0);
    await page.getByRole("radio", { name: /Recruteur/ }).click();
    await expect(page.getByLabel("SIREN")).toBeVisible();

    await page.getByLabel("Nom complet").fill("Inscription Formulaire");
    await page.getByLabel("Adresse e-mail").fill(email);
    await page.getByLabel("Date de naissance").fill(ADULT);
    await page.getByLabel("Mot de passe").fill(PASSWORD);

    await page.getByLabel("Raison sociale").fill("Fonderie de la Loire");
    await page.getByLabel("SIREN").fill(siren);
    await page.getByLabel("Votre poste dans l'entreprise").fill("Responsable du recrutement");
    await page.getByLabel("Adresse", { exact: true }).fill("8 quai de la Fosse");
    await page.getByLabel("Code postal").fill("44000");
    await page.getByLabel("Ville").fill("Nantes");
    await page.getByLabel("Secteur d'activité").selectOption("Industrie");

    await page.getByRole("button", { name: "Créer le compte recruteur" }).click();

    // Redirection vers l'espace recruteur, et non l'espace demandeur : le role
    // choisi commande aussi la suite du parcours.
    await page.waitForURL("**/recruiter", { timeout: 20000 });
    await expect(page.getByRole("heading", { name: "Mon entreprise" })).toBeVisible();
    await expect(page.getByText("Fonderie de la Loire")).toBeVisible();
  });

  test("refuse les moins de 16 ans et le role administrateur", async ({ playwright, baseURL }) => {
    const context = await playwright.request.newContext({ baseURL: baseURL! });

    const tooYoung = new Date();
    tooYoung.setFullYear(tooYoung.getFullYear() - 14);

    const minor = await context.post("/api/register", {
      data: {
        role: "candidate",
        name: "Trop Jeune",
        email: unique("mineur"),
        password: PASSWORD,
        birthDate: tooYoung.toISOString().slice(0, 10),
      },
    });
    expect(minor.status(), "moins de 16 ans (R.1)").toBe(400);

    const asAdmin = await context.post("/api/register", {
      data: {
        role: "admin",
        name: "Faux Admin",
        email: unique("faux-admin"),
        password: PASSWORD,
        birthDate: ADULT,
      },
    });
    expect(asAdmin.status(), "role hors vocabulaire").toBe(400);

    await context.dispose();
  });
});
