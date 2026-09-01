import { ApiReference } from "@scalar/nextjs-api-reference";

/**
 * Documentation interactive Scalar, servie sur /api/docs.
 * Elle lit la specification exposee par /api/openapi : une seule source de
 * verite, la page n'a rien a dupliquer.
 */
export const GET = ApiReference({
  url: "/api/openapi",
  pageTitle: "ProfilsActifs — Documentation API",
  theme: "bluePlanet",
  // Coupe l'assistant « Ask AI » que Scalar ajoute par defaut sur chaque route :
  // il envoie la specification a un service tiers, inutile ici.
  agent: { disabled: true },
});
