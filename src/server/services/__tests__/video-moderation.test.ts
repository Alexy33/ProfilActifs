import { describe, expect, it } from "vitest";
import { isVideoPublic, publicVideoUrl, resetVideoReview } from "../video-moderation";

/**
 * Regle de diffusion des videos (mesure Cabinet du 2026-09-02, point 2).
 *
 * Le Cabinet a demande que la mesure porte sur ce que le SERVEUR renvoie, pas
 * seulement sur ce que l'interface affiche. Ces cas verrouillent la fonction
 * par laquelle passent toutes les lectures publiques.
 */

const URL = "https://youtu.be/abc";

describe("isVideoPublic", () => {
  it("diffuse une video validee d'un majeur", () => {
    expect(isVideoPublic({ videoUrl: URL, videoStatus: "approved" }, false)).toBe(true);
  });

  it("ne diffuse pas une video en attente", () => {
    expect(isVideoPublic({ videoUrl: URL, videoStatus: "pending" }, false)).toBe(false);
  });

  it("ne diffuse pas une video refusee", () => {
    expect(isVideoPublic({ videoUrl: URL, videoStatus: "rejected" }, false)).toBe(false);
  });

  it("ne diffuse jamais la video d'un mineur, meme validee", () => {
    expect(isVideoPublic({ videoUrl: URL, videoStatus: "approved" }, true)).toBe(false);
  });

  it("traite une URL vide comme une absence de video", () => {
    // Une colonne renseignee puis videe reste une chaine vide : sans ce cas,
    // le filtre « avec video » proposerait des cartes sans lecteur.
    expect(isVideoPublic({ videoUrl: "", videoStatus: "approved" }, false)).toBe(false);
    expect(isVideoPublic({ videoUrl: "   ", videoStatus: "approved" }, false)).toBe(false);
    expect(isVideoPublic({ videoUrl: null, videoStatus: "approved" }, false)).toBe(false);
  });
});

describe("publicVideoUrl", () => {
  it("renvoie null plutot que l'URL quand la video n'est pas diffusable", () => {
    // Le point important : l'adresse ne doit pas SORTIR du serveur. La retirer
    // de la page tout en la laissant dans la reponse laisserait la donnee
    // publiee.
    expect(publicVideoUrl({ videoUrl: URL, videoStatus: "pending" }, false)).toBeNull();
    expect(publicVideoUrl({ videoUrl: URL, videoStatus: "rejected" }, false)).toBeNull();
    expect(publicVideoUrl({ videoUrl: URL, videoStatus: "approved" }, true)).toBeNull();
  });

  it("renvoie l'URL quand la video est diffusable", () => {
    expect(publicVideoUrl({ videoUrl: URL, videoStatus: "approved" }, false)).toBe(URL);
  });
});

describe("resetVideoReview", () => {
  it("remet la video en attente et efface la decision precedente", () => {
    // Sans cette remise a zero, un candidat validerait une video anodine puis
    // la remplacerait par une autre sans repasser la moderation.
    expect(resetVideoReview()).toEqual({
      videoStatus: "pending",
      videoReviewReason: null,
      videoReviewedBy: null,
      videoReviewedAt: null,
      videoSeenBeforeReview: false,
    });
  });
});
