import { describe, expect, it } from "vitest";
import { MINOR_AGE, MIN_SIGNUP_AGE, ageOn, isMinor } from "@/lib/vocabulary";

/**
 * Verification de l'age (mesure Cabinet du 2026-09-02, point 1).
 *
 * Ce sont les bornes qui comptent : un calcul d'age approximatif se trompe
 * exactement sur les cas qui decident d'un blocage — la veille et le jour de
 * l'anniversaire.
 */

/** Date de naissance produisant un age donne a `reference`, au jour pres. */
function birthday(yearsAgo: number, dayShift = 0, reference = new Date("2026-09-02T12:00:00Z")) {
  const date = new Date(reference);
  date.setUTCFullYear(date.getUTCFullYear() - yearsAgo);
  date.setUTCDate(date.getUTCDate() + dayShift);
  return date;
}

const NOW = new Date("2026-09-02T12:00:00Z");

describe("ageOn", () => {
  it("compte l'age revolu le jour de l'anniversaire", () => {
    expect(ageOn(birthday(16), NOW)).toBe(16);
  });

  it("ne compte pas l'annee la veille de l'anniversaire", () => {
    // Ne le comptant pas, la personne a encore 15 ans : c'est le cas qui doit
    // etre refuse a l'inscription.
    expect(ageOn(birthday(16, 1), NOW)).toBe(15);
  });

  it("compte l'annee le lendemain de l'anniversaire", () => {
    expect(ageOn(birthday(16, -1), NOW)).toBe(16);
  });

  it("reste juste pour une naissance un 29 fevrier", () => {
    // 2008 est bissextile ; 2026 ne l'est pas. Un calcul par division de
    // millisecondes derape sur ce cas.
    const born = new Date("2008-02-29T00:00:00Z");
    expect(ageOn(born, new Date("2026-02-28T12:00:00Z"))).toBe(17);
    expect(ageOn(born, new Date("2026-03-01T12:00:00Z"))).toBe(18);
  });
});

describe("isMinor", () => {
  it("traite une date de naissance absente comme mineure", () => {
    // Comptes crees avant la mesure : l'age est INCONNU. Le doute ne peut pas
    // profiter a la publication, sans quoi la mesure laisserait passer
    // exactement les profils deja en base.
    expect(isMinor(null)).toBe(true);
  });

  it("exclut un profil de 17 ans", () => {
    expect(isMinor(birthday(17), NOW)).toBe(true);
  });

  it("n'exclut pas un profil de 18 ans", () => {
    expect(isMinor(birthday(MINOR_AGE), NOW)).toBe(false);
  });

  it("exclut la veille des 18 ans", () => {
    expect(isMinor(birthday(MINOR_AGE, 1), NOW)).toBe(true);
  });
});

describe("bornes reglementaires", () => {
  it("bloque strictement en dessous de 16 ans et distingue les 16-18", () => {
    expect(MIN_SIGNUP_AGE).toBe(16);
    expect(MINOR_AGE).toBe(18);

    // Un compte de 16 ans est autorise a l'inscription mais reste mineur :
    // les deux seuils sont distincts, c'est tout l'objet du parcours 16-18.
    const sixteen = birthday(16);
    expect(ageOn(sixteen, NOW)).toBeGreaterThanOrEqual(MIN_SIGNUP_AGE);
    expect(isMinor(sixteen, NOW)).toBe(true);
  });
});
