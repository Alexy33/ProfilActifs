/**
 * Les quatre captures nommees par la charte graphique (R.10) :
 * accueil, inscription, fiche profil candidat, catalogue recruteur.
 *
 * Pourquoi un script plutot que des captures a la main : la charte sera
 * revue, et une capture refaite a la main ne montre jamais tout a fait le
 * meme cadrage. Ici les quatre ecrans sont pris dans les memes conditions
 * (meme viewport, memes polices chargees), et le script verifie ce qu'il
 * capture au lieu de laisser croire que l'image est conforme.
 *
 * Le catalogue est pris SOUS SESSION RECRUTEUR : c'est ce que la charte
 * nomme « catalogue recruteur », et une capture anonyme n'y montrerait pas
 * les memes actions. La session est ouverte par l'API puis injectee en
 * cookie, ce qui est plus stable que de piloter le formulaire.
 *
 * Usage : node scripts/captures-charte.mjs [--base URL] [--out DIR]
 */
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(name);
  return i === -1 ? fallback : args[i + 1];
};

const BASE = opt("--base", process.env.BASE ?? "http://localhost:3000");
const OUT = opt("--out", process.env.OUT ?? "docs/captures/r10");
const EMAIL = process.env.RECRUITER_EMAIL ?? "recruteur@exemple.fr";
const PASSWORD = process.env.RECRUITER_PASSWORD ?? "demo1234";

mkdirSync(OUT, { recursive: true });

/* L'indicateur de developpement de Next.js se pose en overlay au-dessus de la
   page. Il n'existe pas en production : le masquer evite de livrer une capture
   ou une pastille d'outillage passe pour un element de l'interface.
 *
 * Pose via addInitScript et non addStyleTag : la regle doit survivre a chaque
 * navigation, alors qu'une balise ajoutee a la main dispararait avec le
 * document qu'elle decorait. L'overlay vit dans un shadow DOM, d'ou le
 * masquage de l'hote <nextjs-portal> lui-meme. */
const MASQUER_OVERLAY = `
  nextjs-portal,
  [data-nextjs-toast],
  #__next-build-watcher { display: none !important; }
`;

/** Installe le masquage pour toutes les navigations d'un contexte. */
async function masquerOutillage(ctx) {
  await ctx.addInitScript((css) => {
    const poser = () => {
      const style = document.createElement("style");
      style.textContent = css;
      document.documentElement.appendChild(style);
    };
    if (document.documentElement) poser();
    else document.addEventListener("DOMContentLoaded", poser);
  }, MASQUER_OVERLAY);
}

/** Ouvre une session et renvoie le cookie, ou echoue franchement. */
async function sessionRecruteur() {
  const res = await fetch(`${BASE}/api/auth/sign-in/email`, {
    method: "POST",
    // better-auth refuse une requete sans Origin (protection CSRF).
    headers: { "Content-Type": "application/json", Origin: BASE },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });

  if (!res.ok) {
    throw new Error(`connexion recruteur refusee (HTTP ${res.status}) : ${await res.text()}`);
  }

  const entetes = res.headers.getSetCookie?.() ?? [];
  const brut = entetes.join("; ") || (res.headers.get("set-cookie") ?? "");
  const token = /better-auth\.session_token=([^;]+)/.exec(brut)?.[1];
  if (!token) throw new Error("cookie de session absent de la reponse");

  const { user } = await res.json();
  return { token: decodeURIComponent(token), user };
}

/** Tire une capture et renvoie les polices effectivement appliquees. */
async function capturer(page, chemin, nom) {
  await page.goto(`${BASE}${chemin}`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/${nom}.png`, fullPage: true });

  return page.evaluate(() => {
    const titre = document.querySelector("h1");
    return {
      titre: titre ? getComputedStyle(titre).fontFamily : null,
      corps: getComputedStyle(document.body).fontFamily,
    };
  });
}

const navigateur = await chromium.launch();
const echecs = [];

/* --- 1 a 3 : ecrans publics ---------------------------------------------- */
const publique = await navigateur.newContext({ viewport: { width: 1440, height: 900 } });
await masquerOutillage(publique);
const anon = await publique.newPage();

for (const [chemin, nom] of [["/", "01-accueil"], ["/register", "02-inscription"]]) {
  const polices = await capturer(anon, chemin, nom);
  console.log(`${nom.padEnd(24)} titre=${polices.titre} | corps=${polices.corps}`);
}

/* La fiche capturee est celle d'un profil certifie : c'est l'etat que la
   charte donne a voir (badge, aplat bleu institutionnel). */
const { items } = await fetch(`${BASE}/api/profiles?limit=20`).then((r) => r.json());
const fiche = items.find((p) => p.certified) ?? items[0];
if (!fiche) throw new Error("aucun profil publie : lancer le seed avant les captures");
const policesFiche = await capturer(anon, `/profils/${fiche.id}`, "03-fiche-profil-candidat");
console.log(
  `${"03-fiche-profil-candidat".padEnd(24)} titre=${policesFiche.titre} | corps=${policesFiche.corps}`,
);
console.log(`   profil : ${fiche.name} (certifie : ${fiche.certified})`);
await publique.close();

/* --- 4 : catalogue sous session recruteur -------------------------------- */
const { token, user } = await sessionRecruteur();
const ctx = await navigateur.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addCookies([
  {
    name: "better-auth.session_token",
    value: token,
    domain: new URL(BASE).hostname,
    path: "/",
    httpOnly: true,
    sameSite: "Lax",
  },
]);

await masquerOutillage(ctx);
const recruteur = await ctx.newPage();
const polices = await capturer(recruteur, "/catalogue", "04-catalogue-recruteur");

/* Verifie que la page est bien rendue en session : sans ce controle, une
   capture anonyme pourrait etre livree sous le nom « catalogue recruteur ». */
const connecte = await recruteur.evaluate(
  () => document.body.innerText.includes("Recruteur") ||
        document.body.innerText.includes("Mes candidats"),
);
console.log(`${"04-catalogue-recruteur".padEnd(24)} titre=${polices.titre} | corps=${polices.corps}`);
console.log(`   session : ${user.name} (${user.role}) — visible dans la page : ${connecte ? "oui" : "NON"}`);
if (!connecte) echecs.push("le catalogue n'a pas ete rendu en session recruteur");
await ctx.close();

await navigateur.close();

if (echecs.length) {
  for (const e of echecs) console.error(`ECHEC : ${e}`);
  process.exit(1);
}
console.log(`\nQuatre captures ecrites dans ${OUT}/`);
