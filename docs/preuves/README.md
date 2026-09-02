# Pièces justificatives — mesures du Cabinet (2026-09-02)

## `video-en-attente-navigation-privee.png`

Réponse obtenue en ouvrant **l'adresse directe** d'une vidéo en attente de
validation, dans un contexte de navigateur vierge — sans cookie ni session,
l'équivalent d'une fenêtre de navigation privée :

```json
{"error":{"code":"not_found","message":"Vidéo introuvable."}}
```

La vidéo ne se lit pas. Elle n'est pas seulement masquée dans l'interface :
le serveur refuse de la servir.

La capture est **régénérée** — et donc revérifiée — à chaque exécution de la
suite, par `e2e/moderation-video.spec.ts`, qui contrôle aussi que le refus
tient avec un paramètre de contournement (`?t=…`) et avec un en-tête `Range`,
puis la réécrit dans `test-results/`.

Reproduire à la main :

```bash
make prod
curl -i http://localhost:3000/api/videos/<profileId>   # → 404
```

Règle appliquée : une vidéo n'est servie publiquement que si le profil est
`published`, la vidéo `approved`, **et** le titulaire majeur. Le titulaire et
l'administration y accèdent (l'un pour se relire, l'autre pour modérer) ;
toute autre demande reçoit 404. Voir `docs/video.md` §6.
