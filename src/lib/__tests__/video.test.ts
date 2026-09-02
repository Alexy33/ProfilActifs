import { describe, expect, it } from "vitest";
import { describeVideo, formatBytes } from "@/lib/video";

/**
 * `videoUrl` porte deux sources dans une seule colonne (cf. docs/video.md).
 * C'est `describeVideo` qui tranche, et donc elle qui decide si la fiche
 * affiche un lecteur ou une planche vide : les cas limites comptent.
 */
describe("describeVideo", () => {
  it("traite un chemin de notre API comme un fichier televerse", () => {
    expect(describeVideo("/api/videos/abc-123?t=1700000000")).toEqual({
      kind: "uploaded",
      src: "/api/videos/abc-123?t=1700000000",
    });
  });

  it("reconnait les formes d'URL YouTube", () => {
    const forms = [
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://youtube.com/watch?v=dQw4w9WgXcQ",
      "https://youtu.be/dQw4w9WgXcQ",
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
      "https://www.youtube.com/shorts/dQw4w9WgXcQ",
      // Un candidat colle volontiers l'adresse sans protocole.
      "youtube.com/watch?v=dQw4w9WgXcQ",
    ];

    for (const form of forms) {
      const source = describeVideo(form);
      expect(source, form).toMatchObject({
        kind: "embed",
        provider: "YouTube",
        src: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      });
    }
  });

  it("reconnait les URL Vimeo numeriques", () => {
    expect(describeVideo("https://vimeo.com/76979871")).toMatchObject({
      kind: "embed",
      provider: "Vimeo",
      src: "https://player.vimeo.com/video/76979871",
    });
    expect(describeVideo("https://player.vimeo.com/video/76979871")).toMatchObject({
      kind: "embed",
      provider: "Vimeo",
    });
  });

  it("ne fabrique pas d'integration pour une URL non reconnue", () => {
    // Mieux vaut un lien sortant qu'un <iframe> affichant « indisponible ».
    expect(describeVideo("https://vimeo.com/jeb-karim")).toMatchObject({ kind: "link" });
    expect(describeVideo("https://exemple.fr/ma-video.mp4")).toMatchObject({ kind: "link" });
  });

  it("refuse les protocoles qui ne sont pas du web", () => {
    expect(describeVideo("javascript:alert(1)")).toMatchObject({ kind: "link" });
  });

  it("traite l'absence de video", () => {
    expect(describeVideo(null)).toEqual({ kind: "none" });
    expect(describeVideo("")).toEqual({ kind: "none" });
    expect(describeVideo("   ")).toEqual({ kind: "none" });
  });
});

describe("formatBytes", () => {
  it("annonce un poids lisible", () => {
    expect(formatBytes(4 * 1024 * 1024)).toBe("4,0 Mo");
    expect(formatBytes(100 * 1024 * 1024)).toBe("100 Mo");
  });
});
