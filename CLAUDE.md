# CLAUDE.md

Ce fichier décrit le projet web dans ce dossier et donne les points à vérifier lorsque vous ouvrez `index.html` sur un autre appareil.

## Projet

Atlas interactif de la désimperméabilisation de Bergues. Le site est construit avec une page HTML (`index.html`) qui charge des feuilles de style locales et des scripts locaux, et qui s'appuie sur des ressources externes.

## Fichiers importants

- `index.html` — page principale
- `css/style.css` — styles de l'interface
- `js/main.js` — logique de la carte, palette, panneau, modals
- `js/data-geodata.js` — données GeoJSON des espaces
- `js/data-images-espaces.js` — images des espaces
- `js/data-images-tech.js` — images / icônes des techniques
- `img/` — images et logos utilisés par la page

## Dépendances externes (CDN)

`index.html` charge ces ressources depuis Internet :

- `https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Source+Sans+3:wght@300;400;600&display=swap`

> Leaflet est maintenant disponible localement dans `lib/leaflet/`.
> MapLibre GL (+ plugin `leaflet-maplibre-gl`) est disponible localement dans `lib/maplibre-gl/`. Il sert à afficher les fonds "CartoDB Clair"/"CartoDB Sombre" sous forme vectorielle : le service raster historique de CartoDB (`basemaps.cartocdn.com/light_all`, `/dark_all`) exige désormais une clé API et affiche un filigrane "API KEY REQUIRED" ; les styles vectoriels officiels (`basemaps.cartocdn.com/gl/positron-gl-style`, `.../dark-matter-gl-style`) restent eux librement accessibles sans clé, d'où ce changement de mécanisme (toujours dans `js/main.js`, `BASEMAPS`).
> Si vous ouvrez `index.html` sur un autre appareil sans connexion Internet, la carte fonctionnera mieux, mais les fonds de carte (tuiles Leaflet et styles/tuiles vectorielles MapLibre) resteront toujours dépendants d'Internet.

## Pourquoi ça peut mal fonctionner sur un autre appareil

1. `index.html` doit être copié avec les dossiers `css/`, `js/`, `img/`.
2. Si vous ne copiez que `index.html`, les styles et scripts locaux ne seront pas trouvés.
3. Si le navigateur est hors ligne, les fichiers CSS/JS/CDN externes ne chargeront pas.

## Solutions recommandées

- Copier tout le dossier `Dernière version` complet sur l'autre appareil.
- Conserver la structure :
  - `css/style.css`
  - `js/main.js`
  - `js/data-geodata.js`
  - `js/data-images-espaces.js`
  - `js/data-images-tech.js`
  - `img/...`
- Si vous devez utiliser le fichier sans connexion Internet, créer une version autonome en embarquant :
  - Leaflet local
  - Google Fonts local ou font-safe fallback
  - CSS et JS injectés dans `index.html`

## Structure de l'application

### Interface
- `#header` : sélection de fond de carte et bouton de palette
- `#map` : zone de carte Leaflet
- `#legende` : légende dynamique
- `#palette-modal` : gestion des couleurs et filtres
- `#panel` : panneau détaillé de l'espace sélectionné
- `#fiche-overlay` : fiche technique d'une solution
- `#info-modal` : modals d'aide / grilles / sources

### Fonctionnement

- La carte utilise Leaflet et charge le GeoJSON depuis `js/data-geodata.js`.
- Les couleurs des espaces sont calculées via `PALETTES` dans `js/main.js`.
- Les logos et illustrations sont chargés à partir du dossier `img/`.
- Le pied de page affiche des logos locaux : `img/logos/logo-agur.png`, `img/logos/logo-agence-eau.png`, `img/logos/logo-cofinancement.png`.

## À vérifier si la page ne s'affiche pas

- Est-ce que `css/style.css` est présent et accessible ?
- Est-ce que `js/main.js` et les fichiers `js/data-*.js` sont présents ?
- Est-ce que les images de `img/` existent et sont copiées ?
- Est-ce que le navigateur a accès à Internet pour charger Leaflet/Google Fonts ?

## Remarque technique

La page fonctionne mieux si elle est ouverte depuis un dossier local complet ou un serveur local. Sur certains navigateurs, l'ouverture d'un fichier local (`file://`) peut bloquer certaines ressources externes ou les polices.
