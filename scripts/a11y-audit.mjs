/**
 * Mesure RGAA/WCAG AA sur les ecrans servis, dans le DOM reellement rendu.
 *
 * Pourquoi mesurer dans le navigateur plutot que lire les couleurs du code :
 * un rapport de contraste depend du fond EFFECTIF, qui peut venir d'un ancetre,
 * d'une transparence ou d'un gradient. Relever `text-[#718096]` dans le JSX ne
 * dit pas sur quoi ce gris se pose. Ici on interroge getComputedStyle sur la
 * page telle qu'elle est servie.
 *
 * Deux relevés :
 *   - contraste : chaque couple texte/fond effectivement rendu ;
 *   - focus : chaque element atteignable au clavier, avec l'indicateur de focus
 *     effectivement peint (outline, box-shadow, bordure ou fond).
 *
 * Usage : node scripts/a11y-audit.mjs [--json rapport.json] [--base URL]
 */
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";

const CHROME =
  process.env.CHROME_PATH ??
  "/home/edgar/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome";

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(name);
  return i === -1 ? fallback : args[i + 1];
};
const BASE = opt("--base", process.env.A11Y_BASE_URL ?? "http://localhost:3000");
const JSON_OUT = opt("--json", null);
/** Force la fiche mesuree : utile pour couvrir le lecteur natif comme l'embed tiers. */
const PROFILE_ID = opt("--profile", null);

/** Les trois ecrans nommes dans R.7, et rien d'autre : on ne declare que ce qu'on mesure. */
const SCREENS = [
  { id: "inscription", label: "Parcours d'inscription", path: "/register" },
  { id: "fiche-profil", label: "Fiche profil publique", path: null },
  { id: "catalogue", label: "Catalogue recruteur", path: "/catalogue" },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* --- pilotage Chrome via CDP ---------------------------------------------- */

async function launch() {
  const port = 9500 + Math.floor(Math.random() * 400);
  const chrome = spawn(
    CHROME,
    [
      "--headless=new", "--disable-gpu", "--no-sandbox", "--hide-scrollbars",
      `--remote-debugging-port=${port}`, "--window-size=1500,1000",
      `--user-data-dir=/tmp/a11y-${port}`, "about:blank",
    ],
    { stdio: "ignore" },
  );

  let wsUrl = null;
  for (let i = 0; i < 80 && !wsUrl; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/json/version`);
      wsUrl = (await r.json()).webSocketDebuggerUrl;
    } catch { await sleep(250); }
  }
  if (!wsUrl) throw new Error("Chrome n'a pas ouvert le port de debug");

  const ws = new WebSocket(wsUrl);
  await new Promise((r) => ws.addEventListener("open", r, { once: true }));

  let id = 0;
  const pending = new Map();
  ws.addEventListener("message", (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  });
  const send = (method, params = {}, sessionId) => {
    const n = ++id;
    return new Promise((resolve, reject) => {
      pending.set(n, (m) => (m.error ? reject(new Error(`${method}: ${m.error.message}`)) : resolve(m.result)));
      ws.send(JSON.stringify({ id: n, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  };

  const { targetId } = await send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
  await send("Page.enable", {}, sessionId);
  await send("Runtime.enable", {}, sessionId);
  await send("Input.enable", {}, sessionId).catch(() => {});

  return {
    async goto(url) {
      await send("Page.navigate", { url }, sessionId);
      await sleep(3500);
    },
    async evaluate(fn) {
      const { result, exceptionDetails } = await send(
        "Runtime.evaluate",
        { expression: `(${fn.toString()})()`, returnByValue: true, awaitPromise: true },
        sessionId,
      );
      if (exceptionDetails) throw new Error(exceptionDetails.text + " " + (exceptionDetails.exception?.description ?? ""));
      return result.value;
    },
    /** Vraie frappe clavier : c'est le seul moyen de declencher :focus-visible. */
    async tab(shift = false) {
      const common = { windowsVirtualKeyCode: 9, key: "Tab", code: "Tab", modifiers: shift ? 8 : 0 };
      await send("Input.dispatchKeyEvent", { type: "rawKeyDown", ...common }, sessionId);
      await send("Input.dispatchKeyEvent", { type: "char", text: "\t", ...common }, sessionId);
      await send("Input.dispatchKeyEvent", { type: "keyUp", ...common }, sessionId);
      await sleep(60);
    },
    async screenshot() {
      const { data } = await send("Page.captureScreenshot", { format: "png" }, sessionId);
      return Buffer.from(data, "base64");
    },
    close() { ws.close(); chrome.kill(); },
  };
}

/* --- releve execute DANS la page ------------------------------------------ */

function collect() {
  /* Luminance relative WCAG 2.1, puis rapport de contraste. */
  const lum = ([r, g, b]) => {
    const f = (c) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const ratio = (a, b) => {
    const [hi, lo] = lum(a) >= lum(b) ? [lum(a), lum(b)] : [lum(b), lum(a)];
    return (hi + 0.05) / (lo + 0.05);
  };
  /* getComputedStyle rend selon les cas rgb(), oklab(), color(srgb ...).
     On les normalise toutes en passant par un canvas : le moteur fait la
     conversion, on lit des octets sRGB. Parser les chaines a la main, c'est
     precisement comme ca qu'on rate une mesure. */
  const cv = document.createElement("canvas");
  cv.width = cv.height = 1;
  const ctx = cv.getContext("2d", { willReadFrequently: true });
  const memo = new Map();
  const parse = (css) => {
    if (!css || css === "transparent" || css === "none") return null;
    if (memo.has(css)) return memo.get(css);
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = "#000";
    ctx.fillStyle = css;
    if (ctx.fillStyle === "#000000" && !/^(#000000|black|rgba?\(0, ?0, ?0)/i.test(css)) {
      memo.set(css, null);
      return null; // couleur refusee par le moteur : on ne devine pas
    }
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillRect(0, 0, 1, 1);
    const d = ctx.getImageData(0, 0, 1, 1).data;
    const out = { rgb: [d[0], d[1], d[2]], a: d[3] / 255 };
    memo.set(css, out);
    return out;
  };
  const over = (fg, bg) => fg.rgb.map((c, i) => Math.round(c * fg.a + bg[i] * (1 - fg.a)));
  const hex = ([r, g, b]) => "#" + [r, g, b].map((c) => Math.round(c).toString(16).padStart(2, "0")).join("");

  /* Fond effectif : on remonte les ancetres jusqu'a une couleur opaque. */
  function effectiveBg(el) {
    let node = el;
    let acc = null;
    while (node && node !== document.documentElement.parentNode) {
      const st = getComputedStyle(node);
      const c = parse(st.backgroundColor);
      const hasImage = st.backgroundImage && st.backgroundImage !== "none";
      if (c && c.a > 0) {
        acc = acc === null ? { rgb: c.rgb, a: c.a } : { rgb: over(acc, c.rgb), a: 1 };
        if (c.a === 1) return { rgb: acc.rgb.map(Math.round), gradient: hasImage };
      } else if (hasImage) {
        // Un gradient ne se mesure pas de facon fiable : on le signale.
        return { rgb: acc ? acc.rgb.map(Math.round) : [255, 255, 255], gradient: true };
      }
      node = node.parentElement;
    }
    return { rgb: acc ? acc.rgb.map(Math.round) : [255, 255, 255], gradient: false };
  }

  const visible = (el) => {
    const st = getComputedStyle(el);
    if (st.display === "none" || st.visibility === "hidden" || parseFloat(st.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };

  /* --- 1. contrastes ------------------------------------------------------ */
  const pairs = new Map();
  for (const el of document.querySelectorAll("body *")) {
    if (!visible(el)) continue;
    const own = Array.from(el.childNodes)
      .filter((n) => n.nodeType === 3 && n.textContent.trim())
      .map((n) => n.textContent.trim())
      .join(" ");
    if (!own) continue;

    const st = getComputedStyle(el);
    const fg = parse(st.color);
    if (!fg || fg.a === 0) continue;

    /* WCAG 1.4.3 exempte les composants d'interface inactifs. On ne les ecarte
       pas du releve pour autant : on les marque, pour que la declaration dise
       ce qui est exempte plutot que de le passer sous silence. */
    const inactive = !!el.closest('[disabled],[aria-disabled="true"]');
    const bg = effectiveBg(el);
    const fgFlat = fg.a < 1 ? over(fg, bg.rgb) : fg.rgb.map(Math.round);

    const size = parseFloat(st.fontSize);
    const weight = parseInt(st.fontWeight, 10) || 400;
    // WCAG "grand texte" : >= 24px, ou >= 18.66px en gras.
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    const required = large ? 3 : 4.5;
    const value = ratio(fgFlat, bg.rgb);

    const key = `${hex(fgFlat)}|${hex(bg.rgb)}|${large}`;
    if (!pairs.has(key) || pairs.get(key).sample.length > own.length) {
      pairs.set(key, {
        fg: hex(fgFlat), bg: hex(bg.rgb),
        ratio: Math.round(value * 100) / 100,
        required, large, size, weight,
        gradient: bg.gradient,
        inactive,
        pass: value >= required || inactive,
        tag: el.tagName.toLowerCase(),
        sample: own.slice(0, 60),
        count: 1,
      });
    } else {
      pairs.get(key).count += 1;
    }
  }

  /* --- 2. focus ----------------------------------------------------------- */
  const focusables = Array.from(
    document.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), video[controls], details, summary',
    ),
  ).filter(visible);

  const snapshot = (el) => {
    const s = getComputedStyle(el);
    return [s.outlineStyle, s.outlineWidth, s.outlineColor, s.outlineOffset,
            s.boxShadow, s.borderColor, s.borderWidth, s.backgroundColor].join("|");
  };

  const focus = focusables.map((el) => {
    const before = snapshot(el);
    el.focus();
    const after = snapshot(el);
    const st = getComputedStyle(el);
    const outlineVisible = st.outlineStyle !== "none" && parseFloat(st.outlineWidth) > 0;
    el.blur();
    return {
      tag: el.tagName.toLowerCase(),
      type: el.getAttribute("type") ?? "",
      label: (el.getAttribute("aria-label") || el.textContent || el.getAttribute("placeholder") || "").trim().slice(0, 48),
      changed: before !== after,
      outlineVisible,
      indicated: before !== after || outlineVisible,
    };
  });

  /* --- 3. reperes de structure ------------------------------------------- */
  const structure = {
    lang: document.documentElement.lang || null,
    title: document.title || null,
    h1: Array.from(document.querySelectorAll("h1")).map((h) => h.textContent.trim().slice(0, 50)),
    headingOrder: Array.from(document.querySelectorAll("h1,h2,h3,h4,h5,h6")).map((h) => +h.tagName[1]),
    landmarks: {
      main: document.querySelectorAll("main").length,
      nav: document.querySelectorAll("nav").length,
      header: document.querySelectorAll("header").length,
      footer: document.querySelectorAll("footer").length,
    },
    skipLink: !!document.querySelector('a[href^="#"]:first-of-type'),
    imagesWithoutAlt: Array.from(document.querySelectorAll("img")).filter((i) => i.alt === null || i.alt === undefined).length,
    inputsWithoutLabel: Array.from(document.querySelectorAll("input,select,textarea")).filter((i) => {
      if (i.type === "hidden") return false;
      if (i.getAttribute("aria-label") || i.getAttribute("aria-labelledby")) return false;
      return !(i.id && document.querySelector(`label[for="${CSS.escape(i.id)}"]`));
    }).map((i) => i.name || i.id || i.type),
    buttonsWithoutName: Array.from(document.querySelectorAll("button")).filter(
      (b) => !(b.textContent.trim() || b.getAttribute("aria-label") || b.getAttribute("title")),
    ).length,
  };

  return { pairs: Array.from(pairs.values()).sort((a, b) => a.ratio - b.ratio), focus, structure };
}

/* --- rapport --------------------------------------------------------------- */

const chrome = await launch();
const report = { base: BASE, measuredAt: new Date().toISOString(), screens: [] };

// La fiche profil a besoin d'un identifiant reel : on le prend au catalogue.
let profileId = PROFILE_ID;
if (!profileId) {
  const catalogue = await (await fetch(`${BASE}/api/profiles?pageSize=1`)).json();
  profileId = catalogue.items?.[0]?.id;
}
if (!profileId) throw new Error("Catalogue vide : lancer `npm run db:seed` avant la mesure.");
SCREENS.find((s) => s.id === "fiche-profil").path = `/profils/${profileId}`;

for (const screen of SCREENS) {
  const url = BASE + screen.path;
  await chrome.goto(url);
  const data = await chrome.evaluate(collect);

  /* Parcours clavier reel : on part du document et on tabule jusqu'a revenir a
     la barre du navigateur. Chaque arret est decrit avec l'indicateur de focus
     effectivement peint — un `:focus-visible` ne se declenche pas sur un
     .focus() programmatique, d'ou la vraie frappe. */
  await chrome.evaluate(() => {
    /* Les composants animent leurs couleurs (`transition-colors`). Mesurer
       60 ms apres la frappe attraperait une valeur intermediaire, differente a
       chaque passage. On fige les transitions : ce qu'on declare, c'est l'etat
       stabilise. */
    const gel = document.createElement("style");
    gel.id = "a11y-gel";
    gel.textContent = "*,*::before,*::after{transition:none!important;animation:none!important}";
    document.head.appendChild(gel);
    document.body.setAttribute("tabindex", "-1");
    document.body.focus();
  });
  const walk = [];
  let firstKey = null;
  let repeats = 0;
  for (let i = 0; i < 120; i++) {
    await chrome.tab();
    const stop = await chrome.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body || el === document.documentElement) return null;
      /* <nextjs-portal> est la surcouche d'erreur du serveur de developpement.
         Elle n'existe pas dans un build de production : la compter fausserait
         le releve dans un sens comme dans l'autre. */
      if (el.tagName.toLowerCase() === "nextjs-portal") return { skip: true };
      /* Un iframe ne matche pas `:focus` : l'anneau se peint sur son cadre.
         On mesure donc la ou il est reellement rendu. */
      const painted = el.tagName.toLowerCase() === "iframe" && el.parentElement
        ? el.parentElement
        : el;
      const st = getComputedStyle(painted);
      const outline = st.outlineStyle !== "none" && parseFloat(st.outlineWidth) > 0;
      const ring = st.boxShadow && st.boxShadow !== "none";
      const r = el.getBoundingClientRect();

      /* Contraste de l'indicateur lui-meme (WCAG 1.4.11 : 3:1 minimum).
         Avec un outline-offset, l'anneau se pose sur le fond de l'ancetre, pas
         sur celui de l'element : c'est donc contre celui-la qu'on mesure. */
      const cv2 = document.createElement("canvas");
      cv2.width = cv2.height = 1;
      const c2 = cv2.getContext("2d", { willReadFrequently: true });
      const px = (css) => {
        if (!css || css === "transparent" || css === "none") return null;
        c2.clearRect(0, 0, 1, 1);
        c2.fillStyle = css;
        c2.fillRect(0, 0, 1, 1);
        const d = c2.getImageData(0, 0, 1, 1).data;
        return { rgb: [d[0], d[1], d[2]], a: d[3] / 255 };
      };
      const relLum = ([r0, g0, b0]) => {
        const f = (c) => { const x = c / 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); };
        return 0.2126 * f(r0) + 0.7152 * f(g0) + 0.0722 * f(b0);
      };
      const contrast = (a, b) => {
        const [hi, lo] = relLum(a) >= relLum(b) ? [relLum(a), relLum(b)] : [relLum(b), relLum(a)];
        return (hi + 0.05) / (lo + 0.05);
      };
      let behind = [255, 255, 255];
      for (let n = painted.parentElement; n; n = n.parentElement) {
        const c = px(getComputedStyle(n).backgroundColor);
        if (c && c.a === 1) { behind = c.rgb.map(Math.round); break; }
      }
      const oc = px(st.outlineColor);
      const ringContrast = oc && outline
        ? Math.round(contrast(oc.rgb.map((c, i) => Math.round(c * oc.a + behind[i] * (1 - oc.a))), behind) * 100) / 100
        : null;
      const hex2 = (a) => "#" + a.map((c) => Math.round(c).toString(16).padStart(2, "0")).join("");
      const path = el.tagName.toLowerCase() + (el.id ? "#" + el.id : "") +
        (el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\s+/)[0] : "");
      return {
        path,
        label: (el.getAttribute("aria-label") || el.textContent || el.getAttribute("placeholder") || "").trim().slice(0, 46),
        outline, ring,
        outlineWidth: st.outlineWidth, outlineColor: st.outlineColor, outlineOffset: st.outlineOffset,
        ringContrast, ringOn: hex2(behind),
        offscreen: r.width === 0 && r.height === 0,
        // « Visible » n'est pas « present » : un anneau sous 3:1 ne se voit pas.
        indicated: (outline && ringContrast !== null && ringContrast >= 3) || (!outline && ring),
      };
    });
    if (!stop) break;
    if (stop.skip) continue;
    const key = stop.path + "|" + stop.label;

    /* Les lecteurs natifs exposent leurs commandes dans un shadow DOM : la
       tabulation y progresse alors que `document.activeElement` reste le
       <video>. On tolere donc la repetition d'un meme arret au lieu de croire
       le parcours termine, et on ne s'arrete qu'au bouclage reel. */
    if (walk.length && key === walk.at(-1).key) {
      if (++repeats > 12) break;
      continue;
    }
    repeats = 0;
    if (firstKey !== null && key === firstKey) break;
    if (firstKey === null) firstKey = key;
    walk.push({ ...stop, key });
  }

  report.screens.push({ ...screen, url, ...data, keyboardWalk: walk });

  const fails = data.pairs.filter((p) => !p.pass);
  const noFocus = data.focus.filter((f) => !f.indicated);
  console.log(`\n=== ${screen.label} — ${url}`);
  console.log(`  couples texte/fond mesures : ${data.pairs.length} | sous le seuil AA : ${fails.length}`);
  for (const p of fails) {
    console.log(`    ECHEC ${p.ratio.toFixed(2)}:1 (exige ${p.required}) ${p.fg} sur ${p.bg} — ${p.size}px/${p.weight} — « ${p.sample} »`);
  }
  const exempted = data.pairs.filter((p) => p.inactive && p.ratio < p.required);
  for (const p of exempted) {
    console.log(`    EXEMPTE (composant inactif, WCAG 1.4.3) ${p.ratio.toFixed(2)}:1 ${p.fg} sur ${p.bg} — « ${p.sample} »`);
  }
  const unmarked = walk.filter((w) => !w.indicated);
  console.log(`  elements focusables : ${data.focus.length} | atteints par Tab : ${walk.length} | sans indicateur visible : ${unmarked.length}`);
  for (const w of unmarked) {
    const detail = w.ringContrast !== null ? `anneau ${w.ringContrast}:1 sur ${w.ringOn}` : "aucun outline";
    console.log(`    INDICATEUR INSUFFISANT ${w.path} « ${w.label} » — ${detail}`);
  }
  const rings = walk.map((w) => w.ringContrast).filter((v) => v !== null);
  if (rings.length) {
    console.log(`  contraste de l'anneau de focus : min ${Math.min(...rings)}:1 / max ${Math.max(...rings)}:1 (exige 3:1)`);
  }
  if (walk.length && walk.length < data.focus.length) {
    console.log(`    ATTENTION : ${data.focus.length - walk.length} element(s) focusable(s) non atteints par Tab`);
  }
  const st = data.structure;
  if (!st.lang) console.log("    lang absent sur <html>");
  if (st.h1.length !== 1) console.log(`    ${st.h1.length} <h1> (attendu : 1)`);
  if (st.inputsWithoutLabel.length) console.log(`    champs sans etiquette : ${st.inputsWithoutLabel.join(", ")}`);
  if (st.buttonsWithoutName) console.log(`    ${st.buttonsWithoutName} bouton(s) sans nom accessible`);
  if (!st.landmarks.main) console.log("    aucun <main>");
}

chrome.close();
if (JSON_OUT) { writeFileSync(JSON_OUT, JSON.stringify(report, null, 2)); console.log(`\nrapport : ${JSON_OUT}`); }

const totalFails = report.screens.reduce(
  (n, s) => n + s.pairs.filter((p) => !p.pass).length + (s.keyboardWalk ?? []).filter((w) => !w.indicated).length,
  0,
);
console.log(`\n${totalFails === 0 ? "Aucun ecart mesure." : `${totalFails} ecart(s) mesure(s).`}`);
process.exit(0);
