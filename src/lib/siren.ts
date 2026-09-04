/**
 * Numero SIREN d'une entreprise (INSEE).
 *
 * Source de verite UNIQUE de la normalisation et du controle : le formulaire
 * d'inscription, le contrat Zod de la route et les tests importent d'ici. Deux
 * implementations du meme controle finiraient par diverger, et c'est alors la
 * base qui porterait des numeros invalides.
 *
 * Le SIREN est une donnee PUBLIQUE (annuaire des entreprises) : le dispositif
 * la demande pour identifier le recruteur, pas pour le tracer. Elle n'est
 * verifiee ici que par sa forme — aucun appel a l'API Sirene n'est fait, ce qui
 * serait une dependance externe pour un demonstrateur. La cle de Luhn suffit a
 * ecarter les saisies fantaisistes et les fautes de frappe.
 */

/** Neuf chiffres, sans espace : forme canonique stockee en base. */
const NINE_DIGITS = /^\d{9}$/;

/**
 * Retire les separateurs de saisie.
 *
 * « 552 100 554 » et « 552-100-554 » designent le meme SIREN : les refuser
 * serait un piege de saisie, puisque l'INSEE et les Kbis l'ecrivent groupe par
 * trois. On normalise avant de controler, et c'est la forme normalisee qui est
 * stockee — sans quoi deux lignes pourraient designer la meme entreprise.
 */
export function normalizeSiren(raw: string | null | undefined): string {
  return (raw ?? "").replace(/[\s.\-]/g, "");
}

/**
 * Controle de forme : neuf chiffres et cle de Luhn valide.
 *
 * L'INSEE attribue les SIREN avec une cle de Luhn : « 123456789 », saisi par
 * habitude dans un formulaire, est rejete la ou un simple `\d{9}` le laisserait
 * passer.
 *
 * « 000000000 » satisfait Luhn mais n'identifie rien : il est ecarte a part,
 * sinon un champ rempli de zeros serait accepte comme une entreprise.
 */
export function isValidSiren(raw: string | null | undefined): boolean {
  const siren = normalizeSiren(raw);
  if (!NINE_DIGITS.test(siren)) return false;
  if (siren === "000000000") return false;

  return luhnSum(siren) % 10 === 0;
}

/**
 * Somme de Luhn : un chiffre sur deux double en partant de la droite, et un
 * resultat a deux chiffres se ramene a la somme de ses chiffres (12 -> 3).
 */
function luhnSum(digits: string): number {
  let total = 0;

  for (let index = 0; index < digits.length; index += 1) {
    let value = Number(digits[index]);

    // Les positions paires en partant de la GAUCHE sur neuf chiffres sont les
    // positions impaires en partant de la droite : ce sont celles qui doublent.
    if (index % 2 === 1) {
      value *= 2;
      if (value > 9) value -= 9;
    }

    total += value;
  }

  return total;
}

/** « 552100554 » -> « 552 100 554 », pour l'affichage seulement. */
export function formatSiren(siren: string): string {
  const normalized = normalizeSiren(siren);
  if (!NINE_DIGITS.test(normalized)) return siren;
  return `${normalized.slice(0, 3)} ${normalized.slice(3, 6)} ${normalized.slice(6)}`;
}
