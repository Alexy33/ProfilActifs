import { describe, expect, it } from "vitest";
import {
  MAJORITY_AGE,
  MINIMUM_AGE,
  ageOn,
  isAllowedToRegister,
  isMinor,
  latestAllowedBirthDate,
} from "@/lib/age";

/**
 * Verification de l'age (R.1).
 *
 * Tous les cas sont ancres sur une date de reference FIXE : un test qui
 * dependrait de `new Date()` passerait aujourd'hui et echouerait le jour d'un
 * anniversaire, ce qui est exactement le bug qu'on veut exclure.
 */
const REFERENCE = new Date(2026, 8, 3); // 3 septembre 2026

describe("ageOn", () => {
  it("compte les annees revolues", () => {
    expect(ageOn("1990-01-01", REFERENCE)).toBe(36);
  });

  it("ne compte pas l'annee en cours avant l'anniversaire", () => {
    // Anniversaire le lendemain de la reference : encore 15 ans.
    expect(ageOn("2010-09-04", REFERENCE)).toBe(15);
  });

  it("compte l'annee le jour meme de l'anniversaire", () => {
    expect(ageOn("2010-09-03", REFERENCE)).toBe(16);
  });

  it("compte l'annee le lendemain de l'anniversaire", () => {
    expect(ageOn("2010-09-02", REFERENCE)).toBe(16);
  });

  it("gere un anniversaire un mois plus tard dans l'annee", () => {
    expect(ageOn("2010-12-31", REFERENCE)).toBe(15);
  });

  it("rend null sur une date absente", () => {
    expect(ageOn(null, REFERENCE)).toBeNull();
    expect(ageOn(undefined, REFERENCE)).toBeNull();
    expect(ageOn("", REFERENCE)).toBeNull();
  });

  it("rend null sur un format non reconnu", () => {
    expect(ageOn("03/09/2010", REFERENCE)).toBeNull();
    expect(ageOn("2010-9-3", REFERENCE)).toBeNull();
    expect(ageOn("hier", REFERENCE)).toBeNull();
  });

  it("rend null sur une date dans le futur", () => {
    expect(ageOn("2030-01-01", REFERENCE)).toBeNull();
  });

  it("rend null sur un jour qui n'existe pas", () => {
    // Sans ce garde-fou, Date glisse au 2 mars et renvoie un age plausible.
    expect(ageOn("2010-02-30", REFERENCE)).toBeNull();
    expect(ageOn("2010-13-01", REFERENCE)).toBeNull();
  });

  it("gere le 29 fevrier", () => {
    expect(ageOn("2008-02-29", REFERENCE)).toBe(18);
  });
});

describe("isAllowedToRegister", () => {
  it("refuse en dessous du seuil", () => {
    expect(isAllowedToRegister("2011-01-01", REFERENCE)).toBe(false);
  });

  it("refuse la veille des 16 ans", () => {
    expect(isAllowedToRegister("2010-09-04", REFERENCE)).toBe(false);
  });

  it("accepte le jour des 16 ans", () => {
    expect(isAllowedToRegister("2010-09-03", REFERENCE)).toBe(true);
  });

  it("accepte un majeur", () => {
    expect(isAllowedToRegister("1990-05-05", REFERENCE)).toBe(true);
  });

  it("refuse une date absente : le doute ne profite pas a l'inscription", () => {
    expect(isAllowedToRegister(null, REFERENCE)).toBe(false);
    expect(isAllowedToRegister("", REFERENCE)).toBe(false);
  });

  it("refuse une date illisible", () => {
    expect(isAllowedToRegister("pas une date", REFERENCE)).toBe(false);
  });

  it("refuse une date dans le futur", () => {
    expect(isAllowedToRegister("2030-01-01", REFERENCE)).toBe(false);
  });
});

describe("isMinor", () => {
  it("reconnait la tranche 16-18 ans", () => {
    expect(isMinor("2010-09-03", REFERENCE)).toBe(true); // 16 ans
    expect(isMinor("2009-01-01", REFERENCE)).toBe(true); // 17 ans
  });

  it("ne compte pas un majeur", () => {
    expect(isMinor("2008-09-03", REFERENCE)).toBe(false); // 18 ans pile
    expect(isMinor("1990-01-01", REFERENCE)).toBe(false);
  });

  it("ne presume pas mineur un compte sans date", () => {
    // Comptes anterieurs a l'exigence : on ne peut rien en deduire, et le
    // blocage a l'inscription garantit qu'aucun compte NOUVEAU n'est dans ce cas.
    expect(isMinor(null, REFERENCE)).toBe(false);
  });
});

describe("latestAllowedBirthDate", () => {
  it("rend la date de naissance la plus recente encore acceptee", () => {
    expect(latestAllowedBirthDate(REFERENCE)).toBe("2010-09-03");
  });

  it("est coherente avec isAllowedToRegister", () => {
    const limit = latestAllowedBirthDate(REFERENCE);
    expect(isAllowedToRegister(limit, REFERENCE)).toBe(true);
  });
});

describe("seuils", () => {
  it("sont ceux du courrier", () => {
    expect(MINIMUM_AGE).toBe(16);
    expect(MAJORITY_AGE).toBe(18);
  });
});
