import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import {
  account,
  certificationAnswer,
  certificationAttempt,
  contact,
  favorite,
  notification,
  profile,
  profileSkill,
  question,
  questionOption,
  session,
  setting,
  user,
  verification,
} from "@/db/schema";
import type { City, Sector, Skill } from "@/lib/vocabulary";
import { DEFAULT_CERTIFICATION_THRESHOLD, DEFAULT_PAGE_SIZE } from "@/lib/vocabulary";

/**
 * Jeu de donnees de demonstration, repris de la maquette fonctionnelle.
 *
 * Sert deux usages : donner au front une API qui repond de vraies choses des le
 * premier jour, et rendre la documentation Scalar essayable (« Send » sur une
 * route renvoie un resultat parlant, pas une liste vide).
 *
 * Le script est destructif et rejouable : il vide le domaine avant d'ecrire.
 *   npm run db:seed
 */

const PASSWORD = "demo";

interface SeedProfile {
  name: string;
  email: string;
  title: string;
  sector: Sector;
  city: City;
  skills: Skill[];
  score: number;
  videoUrl: string;
  bio: string;
  views: number;
  contactCount: number;
  status: "published" | "pending";
}

const PROFILES: SeedProfile[] = [
  {
    name: "Amina Berthier",
    email: "amina@exemple.fr",
    title: "Chargée de relation client",
    sector: "Commerce",
    city: "Lyon",
    skills: ["Relation client", "Communication", "Adaptabilité"],
    score: 82,
    videoUrl: "https://youtube.com/watch?v=jeb-amina",
    bio: "Sept ans en boutique et en centre d'appels. Je cherche un poste où la relation client est un métier à part entière, pas une case du planning.",
    views: 214,
    contactCount: 6,
    status: "published",
  },
  {
    name: "Karim Vasseur",
    email: "karim.vasseur@exemple.fr",
    title: "Préparateur de commandes",
    sector: "Logistique",
    city: "Lille",
    skills: ["Rigueur", "Autonomie", "Travail en équipe"],
    score: 74,
    videoUrl: "https://vimeo.com/jeb-karim",
    bio: "Entrepôt, inventaire, cariste 1-3-5. Je sais tenir une cadence sans casser la marchandise ni l'ambiance.",
    views: 168,
    contactCount: 4,
    status: "published",
  },
  {
    name: "Sonia Delaunay-Frey",
    email: "sonia.delaunay@exemple.fr",
    title: "Développeuse front-end",
    sector: "Numérique",
    city: "Nantes",
    skills: ["Gestion de projet", "Autonomie", "Communication"],
    score: 91,
    videoUrl: "https://youtube.com/watch?v=jeb-sonia",
    bio: "Reconversion réussie après dix ans en librairie. Je code des interfaces accessibles et je documente ce que je livre.",
    views: 402,
    contactCount: 11,
    status: "published",
  },
  {
    name: "Mathieu Ozanne",
    email: "mathieu.ozanne@exemple.fr",
    title: "Aide-soignant",
    sector: "Santé",
    city: "Marseille",
    skills: ["Adaptabilité", "Travail en équipe", "Rigueur"],
    score: 0,
    videoUrl: "https://youtube.com/watch?v=jeb-mathieu",
    bio: "EHPAD puis service de gériatrie. Je cherche un établissement qui laisse le temps de faire les choses correctement.",
    views: 96,
    contactCount: 2,
    status: "published",
  },
  {
    name: "Fatou Nguyen",
    email: "fatou.nguyen@exemple.fr",
    title: "Assistante de direction",
    sector: "Éducation",
    city: "Paris",
    skills: ["Organisation", "Communication", "Rigueur"],
    score: 88,
    videoUrl: "https://vimeo.com/jeb-fatou",
    bio: "Secrétariat de rectorat pendant six ans. Agenda, comptes rendus, gestion de crise du lundi matin.",
    views: 311,
    contactCount: 9,
    status: "published",
  },
  {
    name: "Tristan Lebel",
    email: "tristan.lebel@exemple.fr",
    title: "Électricien du bâtiment",
    sector: "Bâtiment",
    city: "Bordeaux",
    skills: ["Autonomie", "Rigueur"],
    score: 0,
    videoUrl: "https://youtube.com/watch?v=jeb-tristan",
    bio: "Chantiers neufs et rénovation. Habilitations B1V-BR à jour. Je préfère les équipes petites et les chantiers propres.",
    views: 74,
    contactCount: 1,
    status: "published",
  },
  {
    name: "Leïla Amrani",
    email: "leila.amrani@exemple.fr",
    title: "Conductrice de ligne",
    sector: "Industrie",
    city: "Strasbourg",
    skills: ["Rigueur", "Travail en équipe", "Organisation"],
    score: 79,
    videoUrl: "https://vimeo.com/jeb-leila",
    bio: "Agroalimentaire, 3x8. Je forme les nouveaux arrivants depuis quatre ans et j'aimerais que ça devienne mon poste.",
    views: 132,
    contactCount: 3,
    status: "published",
  },
  {
    name: "Pierre-Yves Caron",
    email: "pierre-yves.caron@exemple.fr",
    title: "Technicien support",
    sector: "Numérique",
    city: "Toulouse",
    skills: ["Relation client", "Adaptabilité", "Autonomie"],
    score: 71,
    videoUrl: "https://youtube.com/watch?v=jeb-pierre",
    bio: "Support niveau 2, parc de 900 postes. Je traduis les problèmes techniques en phrases que les gens comprennent.",
    views: 187,
    contactCount: 5,
    status: "published",
  },
  {
    name: "Marion Estève",
    email: "marion.esteve@exemple.fr",
    title: "Éducatrice de jeunes enfants",
    sector: "Éducation",
    city: "Lyon",
    skills: ["Communication", "Organisation", "Adaptabilité"],
    score: 85,
    videoUrl: "https://vimeo.com/jeb-marion",
    bio: "Crèche associative puis multi-accueil municipal. Je cherche une structure avec un vrai projet pédagogique.",
    views: 205,
    contactCount: 7,
    status: "published",
  },
  {
    name: "Yann Kervella",
    email: "yann.kervella@exemple.fr",
    title: "Magasinier cariste",
    sector: "Logistique",
    city: "Nantes",
    skills: ["Autonomie", "Rigueur"],
    score: 0,
    videoUrl: "https://youtube.com/watch?v=jeb-yann",
    bio: "Quinze ans de quai. Je connais les flux, les erreurs de picking et comment les éviter.",
    views: 61,
    contactCount: 0,
    status: "published",
  },
  {
    name: "Nadia Chevallier",
    email: "nadia.chevallier@exemple.fr",
    title: "Vendeuse conseil",
    sector: "Commerce",
    city: "Paris",
    skills: ["Relation client", "Communication"],
    score: 68,
    videoUrl: "https://vimeo.com/jeb-nadia",
    bio: "Prêt-à-porter et cosmétique. Je vends sans forcer, ça revient plus souvent.",
    views: 143,
    contactCount: 3,
    status: "published",
  },
  {
    name: "Olivier Ranucci",
    email: "olivier.ranucci@exemple.fr",
    title: "Chef de projet junior",
    sector: "Numérique",
    city: "Marseille",
    skills: ["Gestion de projet", "Organisation", "Communication"],
    score: 0,
    videoUrl: "https://youtube.com/watch?v=jeb-olivier",
    bio: "Deux ans en agence, un an en freelance. Je cadre, je planifie, je relance.",
    views: 88,
    contactCount: 1,
    status: "pending",
  },
  {
    name: "Claire Bonnefoy",
    email: "claire.bonnefoy@exemple.fr",
    title: "Infirmière",
    sector: "Santé",
    city: "Lille",
    skills: ["Rigueur", "Adaptabilité", "Travail en équipe"],
    score: 93,
    videoUrl: "https://vimeo.com/jeb-claire",
    bio: "Urgences puis bloc. Je cherche un poste de jour, en clinique ou en libéral.",
    views: 356,
    contactCount: 12,
    status: "published",
  },
  {
    name: "Sébastien Marchal",
    email: "sebastien.marchal@exemple.fr",
    title: "Conducteur de travaux",
    sector: "Bâtiment",
    city: "Toulouse",
    skills: ["Gestion de projet", "Autonomie", "Rigueur"],
    score: 0,
    videoUrl: "https://youtube.com/watch?v=jeb-sebastien",
    bio: "Gros œuvre, marchés publics. Je tiens un planning et je le fais tenir aux autres.",
    views: 119,
    contactCount: 2,
    status: "pending",
  },
];

/**
 * Questionnaire de certification.
 *
 * Les reponses sont ordonnees de la moins a la plus pertinente : la valeur
 * d'une reponse EST le nombre de points qu'elle rapporte. La ponderation de la
 * question multiplie ensuite ces points.
 */
const QUESTIONS: { text: string; weight: number; options: string[] }[] = [
  {
    text: "Une consigne reçue le matin est contredite par une autre l'après-midi. Que faites-vous ?",
    weight: 3,
    options: [
      "J'applique la dernière reçue sans commentaire",
      "J'applique la première, elle était officielle",
      "Je demande un arbitrage écrit avant d'agir",
      "Je remonte la contradiction et propose une solution",
    ],
  },
  {
    text: "Vous devez expliquer un dossier technique à quelqu'un qui n'y connaît rien.",
    weight: 3,
    options: [
      "Je transmets le document tel quel",
      "Je renvoie vers un collègue plus compétent",
      "Je résume à l'oral en évitant le jargon",
      "Je pars de son besoin et j'illustre par un cas concret",
    ],
  },
  {
    text: "Comment organisez-vous une journée où tout est urgent ?",
    weight: 2,
    options: [
      "J'attends que quelqu'un tranche",
      "Dans l'ordre d'arrivée des demandes",
      "Je traite d'abord le plus rapide",
      "Je hiérarchise par impact et j'annonce les délais",
    ],
  },
  {
    text: "Un membre de l'équipe ne tient pas ses engagements depuis deux semaines.",
    weight: 3,
    options: [
      "Je compense en silence",
      "Je réorganise ma part pour ne plus en dépendre",
      "Je le signale directement à la hiérarchie",
      "Je lui en parle en direct avant d'escalader",
    ],
  },
  {
    text: "On vous confie un outil que vous n'avez jamais utilisé, sans formation.",
    weight: 2,
    options: [
      "J'attends une formation officielle",
      "Je refuse tant que le cadre n'est pas posé",
      "Je teste seul et je note mes questions",
      "Je cherche la documentation et un référent interne",
    ],
  },
  {
    text: "Face à un client mécontent dont la demande est hors périmètre :",
    weight: 2,
    options: [
      "J'accepte pour éviter le conflit",
      "Je rappelle les règles et je clos",
      "Je transfère à un supérieur",
      "Je reformule son besoin et propose une alternative",
    ],
  },
  {
    text: "Vous repérez une erreur dans un travail déjà validé par votre responsable.",
    weight: 3,
    options: [
      "J'attends que quelqu'un s'en aperçoive",
      "Je laisse, ce n'est plus mon sujet",
      "Je corrige discrètement",
      "Je signale avec la correction proposée",
    ],
  },
  {
    text: "Votre poste évolue et vos missions changent à 50 %.",
    weight: 2,
    options: [
      "Je demande un retour à l'ancien périmètre",
      "J'attends de voir si ça tient dans le temps",
      "Je m'adapte en observant les collègues",
      "Je fais le point sur mes écarts de compétences et je me forme",
    ],
  },
  {
    text: "Comment rendez-vous compte de votre activité ?",
    weight: 2,
    options: [
      "Seulement quand on me le demande",
      "Je préfère montrer le résultat final",
      "Un point oral en fin de semaine",
      "Un suivi écrit régulier et partagé",
    ],
  },
  {
    text: "Un imprévu fait tomber la moitié de votre planning.",
    weight: 3,
    options: [
      "J'applique le planning quand même",
      "Je repousse tout d'une journée",
      "Je fais des heures supplémentaires",
      "Je préviens les personnes concernées et je repriorise",
    ],
  },
  {
    text: "Que faites-vous d'un retour critique sur votre travail ?",
    weight: 2,
    options: [
      "Je le prends comme une attaque",
      "Je l'accepte sans discuter",
      "Je le compare à d'autres retours avant de conclure",
      "Je l'écoute et je demande des exemples précis",
    ],
  },
  {
    text: "Vous entrez dans une équipe déjà constituée.",
    weight: 2,
    options: [
      "J'attends qu'on vienne vers moi",
      "J'impose vite ma méthode",
      "J'observe les usages avant de proposer",
      "Je demande un référent et je me rends utile rapidement",
    ],
  },
];

/** Vide le domaine ET les comptes : le seed doit pouvoir etre rejoue. */
async function wipe() {
  await db.delete(certificationAnswer);
  await db.delete(certificationAttempt);
  await db.delete(contact);
  await db.delete(favorite);
  await db.delete(notification);
  await db.delete(profileSkill);
  await db.delete(profile);
  await db.delete(questionOption);
  await db.delete(question);
  await db.delete(setting);
  await db.delete(session);
  await db.delete(account);
  await db.delete(verification);
  await db.delete(user);
}

/**
 * Cree un compte via better-auth plutot que par un INSERT direct.
 *
 * C'est la seule facon d'obtenir un mot de passe hache comme le fera la vraie
 * inscription : un INSERT a la main produirait des comptes sur lesquels
 * personne ne peut se connecter.
 *
 * L'inscription publique ne peut pas produire d'administrateur (le garde-fou
 * de `src/lib/auth.ts` ramene tout role inattendu a « candidate »). Le compte
 * d'administration est donc promu ensuite, en base : c'est volontairement le
 * seul chemin qui y mene.
 */
async function createAccount(name: string, email: string, role: "candidate" | "recruiter" | "admin") {
  const result = await auth.api.signUpEmail({
    body: { name, email, password: PASSWORD },
  });

  if (role !== "candidate") {
    await db.update(user).set({ role }).where(eq(user.id, result.user.id));
  }

  return result.user.id;
}

async function seed() {
  console.log("[seed] nettoyage…");
  await wipe();

  console.log("[seed] questions…");
  for (const [index, item] of QUESTIONS.entries()) {
    const questionId = crypto.randomUUID();
    await db.insert(question).values({
      id: questionId,
      text: item.text,
      weight: item.weight,
      position: index,
    });
    await db.insert(questionOption).values(
      item.options.map((label, optionIndex) => ({
        id: crypto.randomUUID(),
        questionId,
        label,
        // La valeur est le rang de la reponse : la derniere vaut le plus.
        value: optionIndex,
        position: optionIndex,
      })),
    );
  }

  console.log("[seed] reglages…");
  await db.insert(setting).values([
    { key: "certificationThreshold", value: String(DEFAULT_CERTIFICATION_THRESHOLD) },
    { key: "catalogPageSize", value: String(DEFAULT_PAGE_SIZE) },
  ]);

  console.log("[seed] comptes et profils…");
  for (const item of PROFILES) {
    const userId = await createAccount(item.name, item.email, "candidate");

    // Le hook better-auth a deja cree un profil vide : on le complete.
    const certifiedAt = item.score > 0 ? new Date() : null;
    await db
      .update(profile)
      .set({
        title: item.title,
        sector: item.sector,
        city: item.city,
        bio: item.bio,
        videoUrl: item.videoUrl,
        status: item.status,
        score: item.score > 0 ? item.score : null,
        certifiedAt,
        views: item.views,
        contactCount: item.contactCount,
      })
      .where(eq(profile.userId, userId));

    const [owned] = await db.select().from(profile).where(eq(profile.userId, userId)).limit(1);
    if (owned && item.skills.length > 0) {
      await db
        .insert(profileSkill)
        .values(item.skills.map((skill) => ({ profileId: owned.id, skill })));
    }
  }

  await createAccount("Hélène Vaugirard", "recruteur@exemple.fr", "recruiter");
  await createAccount("Thomas Vignal", "admin@jeb.gouv.fr", "admin");

  console.log(`[seed] termine — ${PROFILES.length} profils, ${QUESTIONS.length} questions.`);
  console.log(`[seed] comptes de demonstration (mot de passe « ${PASSWORD} ») :`);
  console.log("  amina@exemple.fr      candidate");
  console.log("  recruteur@exemple.fr  recruiter");
  console.log("  admin@jeb.gouv.fr     admin");
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("[seed] echec :", error);
    process.exit(1);
  });
