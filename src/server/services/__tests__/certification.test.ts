import { describe, expect, it } from "vitest";
import { computeScore, type LoadedQuestion } from "../certification";

/**
 * Bareme de la certification.
 *
 * Seule logique metier reellement calculatoire du backend : elle decide qui
 * obtient le badge JEB, donc elle est testee sur ses cas limites plutot que sur
 * un exemple heureux.
 */

const question = (id: string, weight: number, values: number[]): LoadedQuestion => ({
  id,
  text: id,
  weight,
  position: 0,
  options: values.map((value, index) => ({ id: `${id}-${index}`, label: `${value}`, value })),
});

describe("computeScore", () => {
  it("rend 100 quand toutes les meilleures reponses sont choisies", () => {
    const questions = [question("a", 3, [0, 1, 2, 3]), question("b", 2, [0, 1, 2])];
    expect(computeScore(questions, { a: 3, b: 2 })).toBe(100);
  });

  it("rend 0 quand aucune reponse n'est donnee", () => {
    expect(computeScore([question("a", 3, [0, 1, 2, 3])], {})).toBe(0);
  });

  it("compte les questions sans reponse dans le maximum", () => {
    // Une seule question sur deux repondue parfaitement : abandonner en cours
    // de route ne doit pas gonfler le score.
    const questions = [question("a", 1, [0, 1]), question("b", 1, [0, 1])];
    expect(computeScore(questions, { a: 1 })).toBe(50);
  });

  it("fait peser la ponderation sur le resultat", () => {
    // « a » pese 4 fois plus que « b » : reussir « a » seul doit valoir 80 %.
    const questions = [question("a", 4, [0, 1]), question("b", 1, [0, 1])];
    expect(computeScore(questions, { a: 1, b: 0 })).toBe(80);
  });

  it("ne divise pas par zero sur un questionnaire vide", () => {
    expect(computeScore([], {})).toBe(0);
  });

  it("ignore une reponse dont la question n'existe plus", () => {
    const questions = [question("a", 1, [0, 1])];
    expect(computeScore(questions, { a: 1, disparue: 5 })).toBe(100);
  });
});
