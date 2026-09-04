import { describe, expect, it } from "vitest";

import { formatSiren, isValidSiren, normalizeSiren } from "@/lib/siren";

describe("normalizeSiren", () => {
  it("retire les separateurs de saisie", () => {
    expect(normalizeSiren("552 100 554")).toBe("552100554");
    expect(normalizeSiren("552-100-554")).toBe("552100554");
    expect(normalizeSiren("552.100.554")).toBe("552100554");
  });

  it("rend une chaine vide pour une valeur absente", () => {
    expect(normalizeSiren(null)).toBe("");
    expect(normalizeSiren(undefined)).toBe("");
  });
});

describe("isValidSiren", () => {
  it("accepte des SIREN valides, groupes ou non", () => {
    expect(isValidSiren("552100554")).toBe(true);
    expect(isValidSiren("552 100 554")).toBe(true);
    expect(isValidSiren("732829320")).toBe(true);
    expect(isValidSiren("855200507")).toBe(true);
  });

  it("refuse ce qui n'a pas neuf chiffres", () => {
    expect(isValidSiren("")).toBe(false);
    expect(isValidSiren("55210055")).toBe(false);
    expect(isValidSiren("5521005544")).toBe(false);
    expect(isValidSiren("55210055A")).toBe(false);
    expect(isValidSiren(null)).toBe(false);
  });

  it("refuse une cle de Luhn fausse", () => {
    expect(isValidSiren("123456789")).toBe(false);
    expect(isValidSiren("999999999")).toBe(false);
    // Un seul chiffre change suffit a invalider.
    expect(isValidSiren("552100553")).toBe(false);
  });

  it("refuse le numero nul, qui satisfait pourtant Luhn", () => {
    expect(isValidSiren("000000000")).toBe(false);
  });
});

describe("formatSiren", () => {
  it("groupe par trois pour l'affichage", () => {
    expect(formatSiren("552100554")).toBe("552 100 554");
  });

  it("rend la valeur telle quelle si elle n'est pas un SIREN", () => {
    expect(formatSiren("abc")).toBe("abc");
  });
});
