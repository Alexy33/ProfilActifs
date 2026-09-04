# Charte graphique ministérielle (R.10)

Valeurs applicables au produit ProfilsActifs. Elles priment sur toute autre
indication d'identité visuelle, y compris les demandes d'inspiration produit
formulées par ailleurs.

## Couleurs

Le parti pris est une interface **en nuances de bleu** : le bleu institutionnel
porte les titres et les aplats, une échelle de bleus construit le reste, et
seuls les boutons échappent à la gamme — la charte le leur impose.

### Échelle de bleus institutionnels

| Degré | Valeur | Usage |
|---|---|---|
| `accent` | `#1B3A6B` | Bleu de la charte. Titres, icônes, aplats de mise en avant, état actif de navigation, anneau de focus. **Jamais en fond de bouton.** |
| `accent-700` | `#273D4F` | Survols et états appuyés. |
| `accent-600` | `#2F4A6B` | Degré intermédiaire. |
| `accent-500` | `#4A6B8A` | Chiffres décoratifs, éléments secondaires. |
| `accent-400` | `#6B8CB5` | Décor et aplats uniquement — 3.03:1 sur le fond de page, insuffisant pour du texte. |
| `accent-300` → `accent-100` | `#A8C5E0` → `#E8F0F8` | Chips, surfaces, fonds de section. |

### Textes

| Rôle | Valeur | Contraste (fond de page `#ebf0f7`) |
|---|---|---|
| Texte principal | `#22334D` | 9.35:1 |
| Texte secondaire | `#41556E` | 6.67:1 |

Ces deux valeurs sont bleutées et non grises : c'est ce qui fait basculer
l'ensemble de l'interface du côté du bleu. Le contraste y gagne au passage —
le secondaire passe de 5.4:1 (ancien gris `#566274`) à 6.67:1.

### Couleur d'action

| Rôle | Valeur | Usage |
|---|---|---|
| Action | `#2d3748` | Fond des boutons. Neutre sombre, hors gamme bleue. |
| Action — survol | `#1E293B` | État survol / actif. |
| Contour sur fond bleu | `#FFFFFF` | Bordure 2 px lorsque le bouton est posé sur un aplat bleu. |

La couleur d'action est une conséquence directe de l'interdiction du bleu en
fond de bouton. L'anthracite a été retenu précisément parce qu'il **ne
concurrence aucune nuance de bleu** : l'interface se lit comme entièrement
bleue, et le bouton comme un élément neutre posé dessus.

### Contrastes mesurés

Mesures WCAG 2.1 (seuil AA texte : 4.5:1 ; seuil éléments non textuels : 3:1).

| Couple | Rapport | Seuil | Verdict |
|---|---|---|---|
| Blanc sur `#2d3748` | 11.99:1 | 4.5:1 | conforme |
| Blanc sur `#1E293B` (survol) | 14.63:1 | 4.5:1 | conforme |
| `#2d3748` sur fond de page `#ebf0f7` | 10.47:1 | 3:1 | conforme |
| `#2d3748` sur `accent-200` (pire cas) | 8.8:1 | 3:1 | conforme |
| Blanc sur `#1B3A6B` | 11.27:1 | 4.5:1 | conforme |
| `#22334D` sur fond de page | 9.35:1 | 4.5:1 | conforme |
| `#41556E` sur fond de page | 6.67:1 | 4.5:1 | conforme |

**Point de vigilance mesuré.** L'anthracite et le bleu institutionnel ne se
distinguent l'un de l'autre qu'à **1.06:1**. Un bouton posé sur un aplat bleu
resterait donc lisible (son libellé blanc est à 11.99:1) mais perdrait sa
forme. C'est pourquoi la variante sur fond bleu porte un contour blanc :
11.27:1 contre le bleu et 11.99:1 contre l'anthracite, soit au-delà du seuil de
3:1 des éléments non textuels des deux côtés.

Cette contrainte n'est pas propre à l'anthracite : **aucune** couleur sombre
testée ne se détache du bleu institutionnel par elle-même (toutes sous 1.6:1).
Le contour est structurel dès qu'un bouton sombre est posé sur l'aplat bleu.

C'est ce que recouvre l'exigence « elle doit tenir sur fond blanc comme sur
fond bleu » : sur les fonds clairs le bouton se détache seul, sur bleu il lui
faut le contour.

### Mise en œuvre

Les valeurs sont déclarées une fois dans `src/app/globals.css` (`--color-action`,
`--color-action-hover`, `--color-action-contour`) et appliquées par deux
classes, `.bouton-action` et `.bouton-action-sur-bleu`, plutôt que recopiées
dans chaque composant : la charte se corrige alors en un seul endroit.

Le composant `Button` expose les variantes correspondantes (`variant="action"`
et `variant="action-sur-bleu"`).

## Typographie

| Rôle | Police | Chargement |
|---|---|---|
| Titres | **Marianne** | Auto-hébergée, `public/fonts/Marianne-{Regular,Medium,Bold}.woff2` |
| Corps | **Spectral** | Google Fonts |
| Libellés techniques | Mono (JetBrains Mono) | Conservé pour les surtitres et libellés techniques uniquement |

Marianne n'est pas distribuée par Google Fonts : c'est le caractère propre de
l'État, publié avec le Système de Design de l'État (`@gouvfr/dsfr` 1.15.2, sous
Licence Ouverte 2.0, qui autorise la réutilisation sous réserve de mentionner la
source). Les fichiers sont donc auto-hébergés, ce qui évite en outre une requête
vers un domaine tiers sur chaque page publique.

Source des fichiers : <https://github.com/GouvernementFR/dsfr> — version 1.15.2.

## Bloc-marque

Composant unique : `src/components/layout/bloc-marque.tsx`.

- **En haut à gauche** de chaque écran : porté par la barre latérale
  (`SiteShell`), et posé explicitement sur les écrans qui n'en ont pas
  (accueil, parcours d'authentification).
- **Zone de protection** : portée par le `padding` du composant lui-même, afin
  qu'une marge oubliée côté appelant ne puisse pas la supprimer.
- **Jamais sur une photo** : le fond du bloc est opaque et le composant
  n'expose aucune variante transparente — la faute est rendue impossible
  plutôt que déconseillée.

## Captures

Les quatre captures nommées sont produites par
`node scripts/captures-charte.mjs --base <URL> --out docs/captures/r10` et
écrites dans `docs/captures/r10/` :

1. `01-accueil.png`
2. `02-inscription.png`
3. `03-fiche-profil-candidat.png`
4. `04-catalogue-recruteur.png` — pris **sous session recruteur** ; le script
   échoue plutôt que de livrer un catalogue anonyme sous ce nom.

Le script relève également les polices effectivement appliquées sur chaque
écran, une capture ne prouvant pas à elle seule que la charte typographique
est en place.

## Accessibilité

La charte et le contraste AA de R.7 ont été traités ensemble, comme exigé.
Audit après application (`node --experimental-websocket scripts/a11y-audit.mjs`,
rapport `docs/rapports/a11y-charte.json`) :

| Écran | Couples mesurés | Sous le seuil AA |
|---|---|---|
| Parcours d'inscription | 7 | 0 |
| Fiche profil publique | 14 | 0 |
| Catalogue recruteur | 18 | 0 |

Focus : tous les éléments focusables sont atteints au clavier et portent un
indicateur visible (anneau à 9.84:1 minimum, seuil 3:1).
