import { describe, expect, it } from "vitest";

import { cn } from "@/lib/utils";
import { SECTORS, MAX_PAGE_SIZE, mutable } from "@/lib/vocabulary";
import { buttonVariants } from "@/components/ui/button";
import { extensionForMime } from "@/server/services/video";
import { computeScore, type LoadedQuestion } from "@/server/services/certification";

//FRONTEND

describe("front — cn (fusion de classes Tailwind)", () => {
  it("concatene les classes", () => {
    expect(cn("px-2", "py-1")).toBe("px-2 py-1");
  });

  it("laisse la derniere classe en conflit gagner", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("ignore les valeurs falsy", () => {
    expect(cn("px-2", false, undefined, null, "")).toBe("px-2");
  });
});

describe("front — buttonVariants (variantes du bouton)", () => {
  it("applique la variante et la taille par defaut", () => {
    const classes = buttonVariants();
    expect(classes).toContain("bg-primary");
    expect(classes).toContain("h-8");
  });

  it("applique la variante demandee", () => {
    expect(buttonVariants({ variant: "destructive" })).toContain("text-destructive");
  });

  it("applique la taille demandee", () => {
    expect(buttonVariants({ size: "icon" })).toContain("size-8");
  });

  it("conserve une classe personnalisee", () => {
    expect(buttonVariants({ className: "ma-classe" })).toContain("ma-classe");
  });
});

//BACKEND

describe("back — extensionForMime (upload video)", () => {
  it("associe un type MIME connu a son extension", () => {
    expect(extensionForMime("video/mp4")).toBe("mp4");
    expect(extensionForMime("video/webm")).toBe("webm");
    expect(extensionForMime("video/quicktime")).toBe("mov");
  });

  it("ignore les parametres et la casse du type MIME", () => {
    expect(extensionForMime("VIDEO/MP4; codecs=avc1")).toBe("mp4");
  });

  it("rend null pour un type inconnu ou absent", () => {
    expect(extensionForMime("application/pdf")).toBeNull();
    expect(extensionForMime(null)).toBeNull();
    expect(extensionForMime(undefined)).toBeNull();
  });
});

describe("back — vocabulaire (listes fermees du dispositif)", () => {
  it("plafonne la pagination a 20 (CDC 3.4)", () => {
    expect(MAX_PAGE_SIZE).toBe(20);
  });

  it("expose les secteurs sans doublon", () => {
    expect(new Set(SECTORS).size).toBe(SECTORS.length);
  });

  it("mutable() renvoie une copie independante", () => {
    const copie = mutable(SECTORS);
    expect(copie).toEqual([...SECTORS]);
    expect(copie).not.toBe(SECTORS as unknown as string[]);
  });
});

describe("back — computeScore (bareme de la certification)", () => {
  const question = (id: string, weight: number, values: number[]): LoadedQuestion => ({
    id,
    text: id,
    weight,
    position: 0,
    options: values.map((value, index) => ({ id: `${id}-${index}`, label: `${value}`, value })),
  });

  it("rend 100 quand toutes les meilleures reponses sont choisies", () => {
    expect(computeScore([question("a", 1, [0, 1, 2])], { a: 2 })).toBe(100);
  });

  it("rend 0 sans aucune reponse", () => {
    expect(computeScore([question("a", 1, [0, 1])], {})).toBe(0);
  });

  it("ne divise pas par zero sur un questionnaire vide", () => {
    expect(computeScore([], {})).toBe(0);
  });
});
