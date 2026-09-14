// Images spécifiques à un espace précis (et non à tout un type d'espace).
// Utile pour les "Place publique", "Parc/Jardin public", etc. quand on veut
// que chaque emplacement affiche SA propre photo réelle au lieu de l'image
// générique définie dans data-images-espaces.js (SPACE_IMAGES).
//
// Clé  : "<_layer>_<fid>" — les deux valeurs sont visibles dans le panneau de
//        détail de l'espace (elles apparaissent aussi dans l'URL de la clé de
//        couleur individuelle, cf. customColors dans main.js).
// Valeur : chemin vers l'image, ex. "img/espaces/places/grand-place.jpg".
//
// Priorité d'affichage (voir renderPanel() dans main.js) :
//   1. SPACE_IMAGES_BY_ID[_layer_fid]  (ce fichier — la plus spécifique)
//   2. SPACE_IMAGES[type_espace]       (image générique du type)
//   3. champ "Illustration" du GeoJSON (si rempli)
//   4. "Photo non disponible"
//
// Les 6 "Place publique" actuelles du jeu de données (fid → à identifier sur
// la carte pour savoir laquelle est laquelle) :
//   espaces_urbains_16, espaces_urbains_126, espaces_urbains_321,
//   espaces_urbains_854, espaces_urbains_856, espaces_urbains_857
const SPACE_IMAGES_BY_ID = {
  // "espaces_urbains_16":  "img/espaces/places/place-1.jpg",
  // "espaces_urbains_126": "img/espaces/places/place-2.jpg",
  // "espaces_urbains_321": "img/espaces/places/place-3.jpg",
  // "espaces_urbains_854": "img/espaces/places/place-4.jpg",
  // "espaces_urbains_856": "img/espaces/places/place-5.jpg",
  // "espaces_urbains_857": "img/espaces/places/place-6.jpg",
};
