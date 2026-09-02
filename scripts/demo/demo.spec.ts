import { expect, test, type Page } from "@playwright/test";

/**
 * Scenario de la video de demonstration.
 *
 * Ce n'est PAS un test : rien n'y est verifie pour lui-meme. C'est un parcours
 * joue lentement et filme par Playwright, qui traverse les trois roles du
 * dispositif. Les `expect` presents servent de points de synchronisation — ils
 * evitent de filmer une page a moitie chargee — pas de verification.
 *
 *   npm run demo
 *
 * Le fichier vit dans `scripts/demo/` et non dans `e2e/` : il ne doit pas
 * partir avec la suite de tests, qu'il ralentirait pour rien.
 */

const PASSWORD = "demo";

const ACCOUNTS = {
  candidate: "amina@exemple.fr",
  recruiter: "recruteur@exemple.fr",
  admin: "admin@jeb.gouv.fr",
} as const;

/* --------------------------------------------------------------------------
 * Rythme
 *
 * Une demonstration lue par un humain a besoin de temps morts : sans eux, les
 * transitions sont illisibles au montage. Ces pauses sont le seul « decor » du
 * film — tout le reste est l'application reelle.
 * ----------------------------------------------------------------------- */

const BEAT = 900;
const READ = 1900;

async function beat(page: Page, ms = BEAT) {
  await page.waitForTimeout(ms);
}

/** Fait defiler doucement jusqu'a un element, puis marque un temps. */
async function reveal(page: Page, selector: ReturnType<Page["locator"]>, pause = READ) {
  await selector.scrollIntoViewIfNeeded();
  await beat(page, pause);
}

async function signIn(page: Page, email: string) {
  await page.goto("/connexion");

  // Une session peut deja etre ouverte : on repart d'une session fermee.
  if (!(await page.getByLabel("Adresse e-mail").isVisible().catch(() => false))) {
    await page.getByRole("button", { name: "Déconnexion" }).click();
    await expect(page.getByTestId("session-name")).toHaveCount(0);
    await page.goto("/connexion");
  }

  await page.getByLabel("Adresse e-mail").fill(email);
  await beat(page, 400);
  await page.getByLabel("Mot de passe").fill(PASSWORD);
  await beat(page, 400);
  await page.getByRole("button", { name: "Ouvrir la session" }).click();
  await expect(page.getByTestId("session-name")).toBeVisible();
  await beat(page);
}

test("ProfilsActifs — demonstration", async ({ page }) => {
  // Le parcours complet est long : il traverse trois roles et une douzaine
  // d'ecrans, au rythme de lecture.
  test.setTimeout(15 * 60 * 1000);

  /* ---------------------------------------------------------------- 1. Accueil */
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("La compétence");
  await beat(page, READ);

  // Les compteurs viennent de la base : ils bougent avec le dispositif.
  await reveal(page, page.getByText("profils publiés").first());
  await reveal(page, page.getByText("Comptes de démonstration").first());

  /* -------------------------------------------------- 2. Catalogue (visiteur) */
  await page.goto("/catalogue");
  await expect(page.getByTestId("result-count")).toBeVisible();
  await beat(page, READ);

  // Recherche libre : elle couvre le nom, l'intitule, le secteur et les
  // competences.
  await page.getByPlaceholder("Nom, métier, mot-clé").fill("infirmi");
  await beat(page, READ);
  await page.getByPlaceholder("Nom, métier, mot-clé").fill("");
  await beat(page);

  // Les filtres vivent dans l'URL : la page reste partageable et rechargeable.
  await page.getByLabel("Secteur").selectOption("Santé");
  await expect(page).toHaveURL(/sector=Sant/);
  await beat(page, READ);

  await page.getByLabel("Secteur").selectOption("");
  await beat(page, 600);

  // Filtre « certifies » : seuls les profils badges JEB restent.
  await page.goto("/catalogue?certified=true");
  await expect(page.getByRole("article").first()).toBeVisible();
  await beat(page, READ);

  /* ------------------------------------------------------- 3. Fiche publique */
  await page.goto("/catalogue");
  await expect(page.getByRole("article").first()).toBeVisible();
  await beat(page);

  await page
    .getByRole("article")
    .first()
    .getByRole("link", { name: "Voir le profil" })
    .click();
  await page.waitForURL(/\/profils\//);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await beat(page, READ);

  // La fiche ne porte AUCUN compteur d'engagement public (mesure Cabinet du
  // 2026-09-02) : ni vues, ni contacts recus.
  await reveal(page, page.getByText("Compétences déclarées"));
  await beat(page, READ);

  /* ------------------------------------------- 4. Espace demandeur d'emploi */
  await signIn(page, ACCOUNTS.candidate);
  await page.goto("/mon-espace");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await beat(page, READ);

  // Les compteurs d'engagement subsistent ICI, pour le seul titulaire.
  await reveal(page, page.getByText("vues du profil").first());

  // Enregistrement automatique du profil.
  const title = page.getByLabel("Intitulé recherché");
  const original = await title.inputValue();
  await title.fill("Responsable relation client");
  await expect(page.getByTestId("autosave-status")).toContainText("Modifications enregistrées");
  await beat(page, READ);
  await title.fill(original);
  await expect(page.getByTestId("autosave-status")).toContainText("Modifications enregistrées");
  await beat(page);

  /* ------------------------------------------------ 5. Video et moderation */
  await reveal(page, page.getByText("Vidéo de présentation").first());

  await page.getByLabel("Fichier vidéo de présentation").setInputFiles({
    name: "presentation.mp4",
    mimeType: "video/mp4",
    buffer: Buffer.alloc(64 * 1024, 0x21),
  });
  await expect(page.getByTestId("toast")).toContainText("téléversée");
  await beat(page, BEAT);

  // Moderation A PRIORI : la video est deposee, mais en attente de validation.
  // Elle n'est diffusee a personne pour l'instant.
  await expect(page.getByTestId("video-status-pending")).toBeVisible();
  await reveal(page, page.getByTestId("video-status-pending"));
  await beat(page, READ);

  /* ------------------------------------------------------ 6. Certification */
  await page.goto("/certification");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await beat(page, READ);

  const restart = page.getByRole("button", { name: "Repasser" });
  if (await restart.isVisible().catch(() => false)) {
    await restart.click();
    await beat(page);
  }

  const counter = page.getByTestId("quiz-counter");
  if (await counter.isVisible().catch(() => false)) {
    const total = Number((await counter.innerText()).split("/")[1]);

    // On ne joue que les premieres questions a l'ecran : le film montre le
    // mecanisme, il n'a pas a derouler les douze.
    const shown = Math.min(3, total);
    for (let step = 1; step <= shown; step += 1) {
      await page.getByTestId("quiz-option").last().click();
      await beat(page, 700);
      await page.getByRole("button", { name: /Suivant/ }).click();
      await beat(page, 500);
    }

    // Les suivantes sont enchainees rapidement, jusqu'au score.
    for (let step = shown + 1; step <= total; step += 1) {
      await page.getByTestId("quiz-option").last().click();
      await page
        .getByRole("button", { name: step === total ? /Valider et calculer/ : /Suivant/ })
        .click();
      await page.waitForTimeout(120);
    }

    await expect(page.getByTestId("quiz-score")).toBeVisible({ timeout: 15_000 });
    await beat(page, READ + 800);
  }

  /* --------------------------------------------------- 7. Espace recruteur */
  await signIn(page, ACCOUNTS.recruiter);
  await page.goto("/catalogue");
  await expect(page.getByRole("article").first()).toBeVisible();
  await beat(page);

  // Un recruteur connecte dispose des favoris directement sur les cartes.
  const card = page.getByRole("article").first();
  await card.getByRole("button", { name: /favori/i }).first().click().catch(() => {});
  await beat(page, BEAT);

  await card.getByRole("link", { name: "Voir le profil" }).click();
  await page.waitForURL(/\/profils\//);
  await expect(page.getByTestId("profile-actions")).toBeVisible();

  // Le nom se lit sur la FICHE : sur la carte du catalogue, il est rendu dans
  // un `div` stylise et non dans un element de titre.
  const candidateName = (await page.getByRole("heading", { level: 1 }).innerText()).trim();
  await beat(page, READ);

  // Prise de contact.
  await page.getByRole("button", { name: "Prendre contact" }).click();
  await beat(page, BEAT);
  await page
    .getByLabel("Message")
    .fill("Bonjour, votre profil correspond à un poste que nous ouvrons. Seriez-vous disponible pour un échange ?");
  await beat(page, READ);
  await page.getByRole("button", { name: "Envoyer" }).click();
  await beat(page, BEAT);

  // Suivi des candidats : le contact devient une ligne de pipeline.
  await page.goto("/mes-candidats");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await beat(page, READ);

  const row = page.getByRole("row").filter({ hasText: candidateName }).first();
  if (await row.isVisible().catch(() => false)) {
    await row.getByRole("combobox").selectOption("Entretien planifié");
    await beat(page, READ);
  } else {
    // Le suivi existe mais la ligne n'a pas ete retrouvee : on montre au moins
    // le tableau plutot que d'interrompre le film.
    await beat(page, READ);
  }

  /* ----------------------------------------------------- 8. Administration */
  await signIn(page, ACCOUNTS.admin);
  await page.goto("/administration");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await beat(page, READ);

  // Tableau de bord : profils actifs, taux de certification, files d'attente.
  await reveal(page, page.getByText("taux de certification").first());

  // Moderation des videos : validation prealable, refus motive, trace de la
  // decision.
  await reveal(page, page.getByText("Modération des vidéos").first());
  await beat(page, READ);

  const videoRow = page.getByTestId("video-review-row").first();
  if (await videoRow.isVisible().catch(() => false)) {
    // Refus : le motif est obligatoire et sera communique au candidat.
    await videoRow.getByRole("button", { name: "Refuser" }).click();
    await beat(page, BEAT);
    await page.getByLabel("Motif du refus").fill("Le son couvre les propos tenus.");
    await beat(page, READ);
    await page.getByRole("button", { name: "Refuser et notifier" }).click();
    await beat(page, READ);

    // Puis validation, pour montrer les deux issues.
    const again = page.getByTestId("video-review-row").first();
    await again.getByRole("button", { name: "Valider" }).click();
    await beat(page, READ);
  }

  // Moderation des profils.
  await reveal(page, page.getByText("Modération des profils").first());
  await beat(page, READ);

  // Bareme du questionnaire : questions, ponderations, seuil.
  await reveal(page, page.getByText("Questionnaire de certification").first());
  await beat(page, READ + 600);

  /* ------------------------------------------------------ 9. Documentation */
  // L'API est documentee et essayable : la specification est produite a partir
  // des memes definitions que les routes servies.
  await page.goto("/api/docs");
  await beat(page, READ + 1200);

  /* ------------------------------------------------------------ 10. Retour */
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await beat(page, READ + 700);
});
