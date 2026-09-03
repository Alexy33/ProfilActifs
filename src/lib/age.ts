/**
 * Verification de l'age (R.1, courrier Pontaillac).
 *
 * Source de verite UNIQUE des seuils et du calcul : l'inscription, le catalogue
 * et les tests importent d'ici. Deux implementations du meme calcul finiraient
 * par diverger d'un jour, et ce jour-la est precisement celui qui compte.
 *
 * La date de naissance est DECLARATIVE : le dispositif ne verifie aucune piece
 * d'identite. C'est ce que demande le courrier, et la note de registre doit le
 * dire ainsi plutot que de laisser croire a un controle documentaire.
 */

/** En dessous de cet age, l'inscription est refusee. */
export const MINIMUM_AGE = 16;

/** En dessous de cet age, le compte suit le parcours mineur (16-18 ans). */
export const MAJORITY_AGE = 18;

/** Date civile « AAAA-MM-JJ », telle que stockee dans `user.birth_date`. */
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Age revolu, en annees, a la date de reference.
 *
 * Renvoie `null` si la date est absente, mal formee, ou ne designe pas un jour
 * reel (« 2010-02-30 »). Un appelant qui recoit `null` ne sait pas l'age : il
 * ne doit jamais en deduire « majeur ».
 *
 * Le calcul se fait sur les composantes civiles, sans passer par un Date local :
 * comparer des timestamps ferait dependre le resultat du fuseau du serveur.
 */
export function ageOn(birthDate: string | null | undefined, reference: Date = new Date()): number | null {
  if (!birthDate) return null;

  const match = ISO_DATE.exec(birthDate.trim());
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  // Rejette les jours qui n'existent pas : `new Date(2010, 1, 30)` glisse
  // silencieusement au 2 mars et donnerait un age plausible pour une saisie
  // absurde.
  const asDate = new Date(Date.UTC(year, month - 1, day));
  if (
    asDate.getUTCFullYear() !== year ||
    asDate.getUTCMonth() !== month - 1 ||
    asDate.getUTCDate() !== day
  ) {
    return null;
  }

  let age = reference.getFullYear() - year;

  // L'anniversaire n'est pas encore passe cette annee : une annee de moins.
  const monthDelta = reference.getMonth() + 1 - month;
  if (monthDelta < 0 || (monthDelta === 0 && reference.getDate() < day)) {
    age -= 1;
  }

  // Date dans le futur : ce n'est pas un age, c'est une saisie absurde. On rend
  // `null` plutot qu'un nombre negatif, pour que l'appelant la traite comme une
  // date illisible et non comme « tres jeune » — la distinction compte le jour
  // ou quelqu'un ajoutera un seuil maximum.
  if (age < 0) return null;

  return age;
}

/**
 * L'inscription est-elle permise ?
 *
 * Une date absente ou illisible repond `false` : le doute ne profite pas a
 * l'inscription. C'est le sens du blocage strict demande.
 */
export function isAllowedToRegister(birthDate: string | null | undefined, reference?: Date): boolean {
  const age = ageOn(birthDate, reference);
  return age !== null && age >= MINIMUM_AGE;
}

/**
 * Le titulaire est-il mineur (parcours 16-18 ans) ?
 *
 * Une date absente repond `false` : ce sont les comptes anterieurs a
 * l'exigence, qu'on ne peut pas presumer mineurs. Le blocage a l'inscription
 * garantit qu'aucun compte cree APRES cette mesure ne peut avoir moins de 16
 * ans sans date.
 */
export function isMinor(birthDate: string | null | undefined, reference?: Date): boolean {
  const age = ageOn(birthDate, reference);
  return age !== null && age < MAJORITY_AGE;
}

/** Date de naissance la plus recente autorisant l'inscription, pour l'attribut `max` du formulaire. */
export function latestAllowedBirthDate(reference: Date = new Date()): string {
  const limit = new Date(
    Date.UTC(reference.getFullYear() - MINIMUM_AGE, reference.getMonth(), reference.getDate()),
  );
  return limit.toISOString().slice(0, 10);
}
