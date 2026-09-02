import { expect, test, type Page } from "@playwright/test";

/**
 * Parcours d'interface, joues dans un vrai navigateur.
 *
 * Complementaires de `api.spec.ts` : celui-la verifie ce que l'API promet,
 * celui-ci verifie que l'interface s'en sert correctement — que le rendu
 * serveur affiche bien les donnees de la base, et que chaque geste declenche
 * l'appel attendu.
 *
 * PREREQUIS : base peuplee (`npm run db:seed`).
 */

const PASSWORD = "demo";

const ACCOUNTS = {
  candidate: "amina@exemple.fr",
  recruiter: "recruteur@exemple.fr",
  admin: "admin@jeb.gouv.fr",
} as const;

async function signIn(page: Page, email: string) {
  await page.goto("/connexion");
  await page.getByLabel("Adresse e-mail").fill(email);
  await page.getByLabel("Mot de passe").fill(PASSWORD);
  await page.getByRole("button", { name: "Ouvrir la session" }).click();
  // La redirection depend du role porte par la session, pas du formulaire.
  await expect(page.getByTestId("session-name")).toBeVisible();
}

/**
 * Saisit une valeur et attend sa confirmation, en rejouant si besoin.
 *
 * Les formulaires ne reagissent qu'une fois le composant client hydrate. Juste
 * apres un `goto` ou un `reload`, une saisie peut arriver avant que React n'ait
 * attache ses gestionnaires : elle change alors le DOM sans rien declencher.
 * On rejoue donc la saisie jusqu'a ce que l'enregistrement se manifeste.
 */
async function fillUntilConfirmed(
  page: Page,
  label: string,
  value: string,
  confirmation: { testId: string; text: string | RegExp },
) {
  await expect(async () => {
    await page.getByLabel(label).fill(value);
    await expect(page.getByTestId(confirmation.testId)).toContainText(confirmation.text, {
      timeout: 2500,
    });
  }).toPass({ timeout: 20_000 });
}

test.describe("Accueil et navigation", () => {
  test("l'accueil affiche les compteurs du dispositif", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("La compétence");

    // Les compteurs viennent de la base, pas d'un tableau en dur.
    const panel = page.getByText("Fiche technique — démonstrateur").locator("..");
    await expect(panel).toContainText("profils publiés");
    await expect(panel.getByText(/^\d+$/).first()).toBeVisible();
  });

  test("les espaces prives redirigent un visiteur anonyme", async ({ page }) => {
    for (const path of ["/mon-espace", "/certification", "/mes-candidats", "/administration"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/connexion/);
    }
  });

  test("un compte de demonstration ouvre la bonne session", async ({ page }) => {
    await page.goto("/");
    await page
      .getByText("Comptes de démonstration")
      .locator("..")
      .getByRole("button", { name: "Se connecter" })
      .first()
      .click();

    await expect(page).toHaveURL(/\/mon-espace/);
    await expect(page.getByTestId("session-name")).toContainText("Amina");
  });
});

test.describe("Catalogue", () => {
  test("les filtres vivent dans l'URL et survivent au rechargement", async ({ page }) => {
    await page.goto("/catalogue");
    const total = await page.getByTestId("result-count").innerText();

    await page.getByLabel("Secteur").selectOption("Santé");
    await expect(page).toHaveURL(/sector=Sant/);

    const filtered = page.getByTestId("result-count");
    await expect(filtered).not.toHaveText(total);
    const narrowed = await filtered.innerText();

    // Le rendu vient du serveur a partir de l'URL : recharger doit redonner
    // exactement la meme page.
    await page.reload();
    await expect(page.getByTestId("result-count")).toHaveText(narrowed);
    await expect(page.getByLabel("Secteur")).toHaveValue("Santé");
  });

  test("le filtre « certifies » ne laisse que des profils badges", async ({ page }) => {
    await page.goto("/catalogue?certified=true");

    const cards = page.getByRole("article");
    await expect(cards.first()).toBeVisible();

    for (const card of await cards.all()) {
      await expect(card.getByText(/✓ JEB \d+/)).toBeVisible();
    }
  });

  test("ouvrir une fiche incremente le compteur de vues", async ({ page }) => {
    await page.goto("/catalogue");
    await page.getByRole("article").first().getByRole("link", { name: "Voir le profil" }).click();
    await page.waitForURL(/\/profils\//);

    const views = page.getByTestId("profile-views");
    const before = Number(await views.innerText());

    await page.reload();
    await expect(views).toHaveText(String(before + 1));
  });
});

test.describe("Espace demandeur", () => {
  test("le profil s'enregistre tout seul et le rechargement le confirme", async ({ page }) => {
    await signIn(page, ACCOUNTS.candidate);
    await page.goto("/mon-espace");

    const original = await page.getByLabel("Intitulé recherché").inputValue();
    const updated = `${original} (e2e)`;

    // « Enregistrement automatique » est le libelle au repos : on attend la
    // confirmation, pas la simple presence du mot.
    const saved = { testId: "autosave-status", text: "Modifications enregistrées" };
    await fillUntilConfirmed(page, "Intitulé recherché", updated, saved);

    await page.reload();
    await expect(page.getByLabel("Intitulé recherché")).toHaveValue(updated);

    // Remise en etat : les tests partagent une base unique.
    await fillUntilConfirmed(page, "Intitulé recherché", original, saved);
    await page.reload();
    await expect(page.getByLabel("Intitulé recherché")).toHaveValue(original);
  });

  test("le questionnaire se reprend la ou il a ete quitte", async ({ page }) => {
    await signIn(page, ACCOUNTS.candidate);

    // On repart d'une tentative vierge pour ne pas dependre de l'etat laisse
    // par un autre test.
    await page.goto("/certification");
    const restart = page.getByRole("button", { name: "Repasser" });
    if (await restart.isVisible().catch(() => false)) await restart.click();

    await expect(page.getByTestId("quiz-counter")).toContainText("Question 1 /");
    await page.getByTestId("quiz-option").first().click();
    await page.getByRole("button", { name: /Suivant/ }).click();
    await expect(page.getByTestId("quiz-counter")).toContainText("Question 2 /");

    await page.getByRole("button", { name: "Enregistrer et quitter" }).click();
    await expect(page).toHaveURL(/\/mon-espace/);
    await expect(page.getByText(/Questionnaire de certification interrompu/)).toBeVisible();

    // La reprise repart de la premiere question sans reponse.
    await page.goto("/certification");
    await expect(page.getByTestId("quiz-counter")).toContainText("Question 2 /");
  });

  test("valider le questionnaire calcule un score et affiche le verdict", async ({ page }) => {
    await signIn(page, ACCOUNTS.candidate);
    await page.goto("/certification");

    const restart = page.getByRole("button", { name: "Repasser" });
    if (await restart.isVisible().catch(() => false)) await restart.click();

    // Une tentative laissee en cours par un autre test reprend a la premiere
    // question SANS reponse : on remonte au debut pour recouvrir les reponses
    // deja donnees, sinon le sans-faute est impossible.
    for (;;) {
      const previous = page.getByRole("button", { name: /Précédent/ });
      if (await previous.isDisabled()) break;
      await previous.click();
    }

    // La derniere option est toujours la mieux notee : sa valeur est son rang.
    const total = Number((await page.getByTestId("quiz-counter").innerText()).split("/")[1]);

    for (let step = 1; step <= total; step += 1) {
      await expect(page.getByTestId("quiz-counter")).toContainText(`Question ${step} /`);
      await page.getByTestId("quiz-option").last().click();
      await page
        .getByRole("button", { name: step === total ? /Valider et calculer/ : /Suivant/ })
        .click();
    }

    await expect(page.getByTestId("quiz-score")).toHaveText("100");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Certification obtenue");
  });
});

test.describe("Espace recruteur", () => {
  test("favori, prise de contact et avancement du suivi", async ({ page }) => {
    await signIn(page, ACCOUNTS.recruiter);
    await page.goto("/catalogue");

    await page.getByRole("article").first().getByRole("link", { name: "Voir le profil" }).click();
    await page.waitForURL(/\/profils\//);
    const name = await page.getByRole("heading", { level: 1 }).innerText();

    // L'aside de la fiche, pour ne pas viser les etoiles des cartes du catalogue.
    await page.getByTestId("profile-actions").getByRole("button", { name: /favoris/ }).click();
    await expect(page.getByTestId("toast")).toBeVisible();

    await page.getByRole("button", { name: "Prendre contact" }).click();
    await page.getByLabel("Message").fill("Bonjour, seriez-vous disponible pour un échange ?");
    await page.getByRole("button", { name: "Envoyer" }).click();

    await page.goto("/mes-candidats");
    const row = page.getByRole("row").filter({ hasText: name });
    await expect(row).toBeVisible();

    await row.getByRole("combobox").selectOption("Entretien planifié");
    await expect(page.getByTestId("toast")).toContainText("Entretien planifié");

    await page.reload();
    await expect(page.getByTestId("stat-entretiens-planifies")).not.toHaveText("0");
  });
});

test.describe("Administration", () => {
  test("publier un profil le fait apparaitre au catalogue", async ({ page }) => {
    await signIn(page, ACCOUNTS.admin);
    await page.goto("/administration");

    const pending = page.getByRole("row").filter({ hasText: "En attente" }).first();
    test.skip(!(await pending.isVisible().catch(() => false)), "aucun profil en attente");

    const name = (await pending.innerText()).split("\n")[0].trim();
    await pending.getByRole("button", { name: "Publier" }).click();
    await expect(page.getByTestId("toast")).toContainText("publié");

    await page.goto(`/catalogue?q=${encodeURIComponent(name)}`);
    await expect(page.getByText(name).first()).toBeVisible();
  });

  test("le seuil de certification est modifiable", async ({ page }) => {
    await signIn(page, ACCOUNTS.admin);
    await page.goto("/administration");

    const threshold = page.getByLabel("Seuil de certification sur 100");
    const original = await threshold.inputValue();

    const label = "Seuil de certification sur 100";
    await fillUntilConfirmed(page, label, "65", { testId: "toast", text: "65" });

    await page.reload();
    await expect(page.getByLabel(label)).toHaveValue("65");

    // Remise en etat : le seuil decide de qui obtient le badge, le laisser a 65
    // fausserait les tests de certification suivants.
    await fillUntilConfirmed(page, label, original, { testId: "toast", text: original });
    await page.reload();
    await expect(page.getByLabel(label)).toHaveValue(original);
  });
});
