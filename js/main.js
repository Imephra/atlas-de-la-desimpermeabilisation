// ═══════════════════════════════════════════
// PALETTES
// ═══════════════════════════════════════════
// Construit dynamiquement une palette + légende à partir des valeurs
// réellement présentes dans le GeoJSON pour un champ donné (ex: "Revêtement",
// "Gestionnaires"). Ainsi la légende contient toujours exactement l'ensemble
// des valeurs renseignées pour ce champ, et chaque espace reçoit la couleur
// exacte correspondant à sa propre valeur (pas de correspondance approximative
// par sous-chaîne qui peut mal classer ou "oublier" des catégories).
function _distinctFieldValues(field){
  const vals=new Set();
  (typeof GEODATA!=='undefined'?GEODATA.features||[]:[]).forEach(f=>{
    const p=f.properties||{};
    if(p._layer==='bati'||p._layer==='eau')return;
    const v=(p[field]||'').trim();
    if(v)vals.add(v);
  });
  return[...vals].sort((a,b)=>a.localeCompare(b,'fr'));
}
function _categoricalColor(i,total){
  const hue=Math.round((i*(360/Math.max(total,1)))%360);
  return`hsl(${hue},58%,42%)`;
}
const FIELD_PALETTE_FALLBACK='#999999';
function buildFieldPalette(field,name){
  const values=_distinctFieldValues(field);
  const colorMap={};
  const legend=values.map((v,i)=>{const c=_categoricalColor(i,values.length);colorMap[v]=c;return{color:c,label:v};});
  legend.push({color:FIELD_PALETTE_FALLBACK,label:'Non renseigné'});
  legend.push({color:'#b0a090',label:'Bâtiment'});
  return{
    name,
    legend,
    fn:(p)=>{
      if(p._layer==='bati')return'#b0a090';
      if(p._layer==='eau')return'#5ba3d0';
      const v=(p[field]||'').trim();
      if(!v)return FIELD_PALETTE_FALLBACK;
      return colorMap[v]||FIELD_PALETTE_FALLBACK;
    }
  };
}
// Palette dédiée "Par revêtement" : chaque revêtement est classé imperméable
// (nuances grises/oranges) ou perméable (nuances vertes/bleues) plutôt que
// de recevoir une couleur arbitraire, afin que la légende porte aussi
// l'information de perméabilité.
const REVETEMENT_IMPERMEABLE_COLORS={
  'Béton':'#6b6b6b',
  'Bitume':'#3f3f3f',
  'Carrelage':'#9c8570',
  'Gravier':'#a67c52',
  'Pierre':'#8c8378',
  'Résine':'#d98736',
  'Non renseigné':'#999999',
};
const REVETEMENT_PERMEABLE_COLORS={
  'Dalles alvéolaires':'#52b788',
  'Dominance boisée':'#2d6a4f',
  'Dominance herbacée':'#74c69d',
  'Gazon synthétique':'#40916c',
  'Pavé avec joints drainants':'#457b9d',
};
function buildRevetementPalette(){
  const values=_distinctFieldValues('Revêtement');
  const colorMap={};
  const fallback='#999999';
  const legendImp=[],legendPerm=[];
  values.forEach(v=>{
    if(REVETEMENT_IMPERMEABLE_COLORS[v]){
      colorMap[v]=REVETEMENT_IMPERMEABLE_COLORS[v];
      legendImp.push({color:colorMap[v],label:v});
    }else if(REVETEMENT_PERMEABLE_COLORS[v]){
      colorMap[v]=REVETEMENT_PERMEABLE_COLORS[v];
      legendPerm.push({color:colorMap[v],label:v});
    }else{
      // valeur inconnue : couleur neutre par défaut
      colorMap[v]=fallback;
      legendImp.push({color:fallback,label:v});
    }
  });
  const legend=[...legendImp,{color:REVETEMENT_IMPERMEABLE_COLORS['Non renseigné'],label:'Non renseigné'},...legendPerm,{color:'#b0a090',label:'Bâtiment'}];
  return{
    name:"Par revêtement",
    legend,
    fn:(p)=>{
      if(p._layer==='bati')return'#b0a090';
      if(p._layer==='eau')return'#5ba3d0';
      const v=(p['Revêtement']||'').trim();
      if(!v)return REVETEMENT_IMPERMEABLE_COLORS['Non renseigné'];
      return colorMap[v]||fallback;
    }
  };
}
const PALETTES = {
  permeabilite:{
    name:"Perméabilité (défaut)",
    legend:[{color:'#c1440e',label:'Imperméable'},{color:'#2d6a4f',label:'Perméable'},{color:'#5ba3d0',label:'Cours d\'eau'},{color:'#b0a090',label:'Bâtiment'}],
    fn:(p)=>{if(p._layer==='bati')return'#b0a090';if(p._layer==='eau')return'#5ba3d0';const v=(p['Perméabilité']||'').toLowerCase();if(v.includes('im'))return'#c1440e';if(v.includes('p'))return'#2d6a4f';return'#8b8680';}
  },
  revetement:buildRevetementPalette(),
  gestionnaire:buildFieldPalette('Gestionnaires',"Par gestionnaire"),
  monochrome:{
    name:"Monochrome bleu",
    legend:[{color:'#1a4a7a',label:'Imperméable'},{color:'#5ba3d0',label:'Perméable'},{color:'#b0a090',label:'Bâtiment'}],
    fn:(p)=>{if(p._layer==='bati')return'#b0a090';if(p._layer==='eau')return'#5ba3d0';const v=(p['Perméabilité']||'').toLowerCase();if(v.includes('im'))return'#1a4a7a';if(v.includes('p'))return'#5ba3d0';return'#a0c0d8';}
  },
  ocre:{
    name:"Palette ocre & terre",
    legend:[{color:'#8b4513',label:'Imperméable'},{color:'#daa520',label:'Perméable'},{color:'#c8b090',label:'Bâtiment'}],
    fn:(p)=>{if(p._layer==='bati')return'#c8b090';if(p._layer==='eau')return'#5ba3d0';const v=(p['Perméabilité']||'').toLowerCase();if(v.includes('im'))return'#8b4513';if(v.includes('p'))return'#daa520';return'#cd853f';}
  },
};
let currentPalette='permeabilite';
const customColors={};
const typeColors={};

const _randomizedTypes=new Set();
function applyRandomColors(){
  if(!geoLayer)return;
  const types=new Set();
  geoLayer.eachLayer(l=>{
    if(!l.feature)return;
    const p=l.feature.properties;
    if(p._layer==='bati'||p._layer==='eau')return;
    const te=p.type_espace||'';
    if(te)types.add(te);
  });
  types.forEach(te=>{
    const h=Math.floor(Math.random()*360);
    const s=50+Math.floor(Math.random()*25);
    const l=38+Math.floor(Math.random()*20);
    typeColors[te]=`hsl(${h},${s}%,${l}%)`;
    _randomizedTypes.add(te);
  });
  refreshLayerStyles();
}
function resetRandomColors(){
  _randomizedTypes.forEach(te=>delete typeColors[te]);
  _randomizedTypes.clear();
  refreshLayerStyles();
}
window.applyRandomColors=applyRandomColors;
window.resetRandomColors=resetRandomColors;
let _filterPublic=true,_filterPrive=true;
function applyFilter(){
  _filterPublic=document.getElementById('filter-public').checked;
  _filterPrive=document.getElementById('filter-prive').checked;
  refreshLayerStyles();
}
window.applyFilter=applyFilter;
function getFeatureColor(p){
  const key=p._layer+'_'+p.fid;
  if(customColors[key])return customColors[key];
  const te=p.type_espace||'';
  if(typeColors[te])return typeColors[te];
  return PALETTES[currentPalette].fn(p);
}

// Couleur de légende actuellement mise en avant sur la carte (null = aucune).
// Un clic sur une entrée de légende bascule cette valeur ; featureStyle() s'en
// sert pour estomper tous les espaces qui n'appartiennent pas à la catégorie.
let legendHighlight=null;
function toggleLegendHighlight(color){
  legendHighlight=(legendHighlight===color)?null:color;
  typeHighlight=null;
  refreshLayerStyles();
  updateLegende();
  buildTypeColorList();
}
window.toggleLegendHighlight=toggleLegendHighlight;
// Idem, mais pour un type d'espace précis mis en avant depuis la liste des
// espaces urbains du panneau couleurs (clic sur le libellé).
let typeHighlight=null;
function toggleTypeHighlight(te){
  typeHighlight=(typeHighlight===te)?null:te;
  legendHighlight=null;
  refreshLayerStyles();
  updateLegende();
  buildTypeColorList();
}
window.toggleTypeHighlight=toggleTypeHighlight;
function updateLegende(){
  const pal=PALETTES[currentPalette];
  document.getElementById('legende-title').textContent=pal.name;
  document.getElementById('legende-items').innerHTML=pal.legend.map(l=>`<div class="leg-item${l.color===legendHighlight?' active':''}" onclick="toggleLegendHighlight('${l.color}')" title="Isoler ces espaces sur la carte"><div class="leg-dot" style="background:${l.color};opacity:.85"></div> ${l.label}</div>`).join('');
}

// ═══════════════════════════════════════════
// BASEMAPS
// ═══════════════════════════════════════════
// Note : le service raster de CartoDB (basemaps.cartocdn.com/light_all,
// dark_all...) exige désormais une clé API ("API KEY REQUIRED" en filigrane
// sur les tuiles). En revanche, les styles vectoriels officiels CARTO
// (Positron / Dark Matter) restent librement accessibles sans clé — on les
// affiche via MapLibre GL (lib/maplibre-gl/) pour retrouver le rendu
// CartoDB d'origine.
// keepBuffer plus large + updateWhenZooming : les tuiles autour de la vue
// visible restent en mémoire/se chargent pendant le zoom au lieu d'attendre
// la fin du geste, ce qui évite les zones blanches le temps que ça rafraîchisse.
const RASTER_OPTS={keepBuffer:4,updateWhenZooming:true,updateWhenIdle:false};
const BASEMAPS={
  carto:L.maplibreGL({style:'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',attribution:'© OpenStreetMap contributors © CARTO',updateInterval:16}),
  osm:L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap contributors',maxZoom:19,...RASTER_OPTS}),
  humanitarian:L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap contributors, HOT',subdomains:'abc',maxZoom:20,...RASTER_OPTS}),
  cartodark:L.maplibreGL({style:'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',attribution:'© OpenStreetMap contributors © CARTO',updateInterval:16}),
  esri:L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{attribution:'© Esri',maxZoom:19,...RASTER_OPTS}),
};
let currentBasemap='carto';
// preferCanvas : avec plusieurs milliers de polygones, le rendu SVG par défaut
// crée un nœud DOM par forme et redessine chaque nœud à chaque zoom/pan/survol,
// ce qui sature le thread principal. Le rendu Canvas dessine tout sur une seule
// surface bitmap (un seul redraw), ce qui rend le zoom, le pan et les clics
// nettement plus fluides sur un jeu de données de cette taille.
const map=L.map('map',{center:[50.9685,2.4315],zoom:15,zoomControl:false,zoomSnap:0.25,zoomDelta:0.25,maxZoom:22,preferCanvas:true,wheelPxPerZoomLevel:90});
BASEMAPS.carto.addTo(map);
L.control.zoom({position:'bottomright'}).addTo(map);
// On ajoute le nouveau fond AVANT de retirer l'ancien (au lieu de couper puis
// recharger) : l'ancien fond reste visible pendant que le nouveau charge ses
// tuiles/tiles vectorielles, donc pas d'écran blanc pendant la transition.
function changeBasemap(key){
  updateBasemapMenuUI(key);
  toggleBasemapMenu(false);
  if(key===currentBasemap)return;
  const old=BASEMAPS[currentBasemap];
  const next=BASEMAPS[key];
  currentBasemap=key;
  next.addTo(map);
  if(next.bringToBack)next.bringToBack();
  const swapOut=()=>{if(map.hasLayer(old))map.removeLayer(old);};
  if(next instanceof L.TileLayer)next.once('load',swapOut);
  setTimeout(swapOut,700); // filet de sécurité (couvre aussi MapLibre GL, qui ne remonte pas d'évènement 'load' fiable)
}
function updateBasemapMenuUI(key){
  const opt=document.querySelector(`#basemap-modal .bm-option[data-key="${key}"]`);
  if(!opt)return;
  document.querySelectorAll('#basemap-modal .bm-option').forEach(o=>o.classList.remove('active'));
  opt.classList.add('active');
  document.getElementById('basemap-label').textContent=opt.textContent.replace('✓','').trim();
}
function toggleBasemapMenu(force){
  const modal=document.getElementById('basemap-modal');
  const open=typeof force==='boolean'?force:!modal.classList.contains('open');
  modal.classList.toggle('open',open);
  document.getElementById('basemap-btn').classList.toggle('open',open);
  if(open)document.getElementById('palette-modal').classList.remove('open');
}

// ═══════════════════════════════════════════
// PALETTE UI
// ═══════════════════════════════════════════
function buildPaletteList(){
  document.getElementById('palette-list').innerHTML=Object.entries(PALETTES).map(([k,p])=>`<div class="palette-row ${k===currentPalette?'active':''}" onclick="applyPalette('${k}')"><div class="palette-swatches">${p.legend.slice(0,4).map(l=>`<div class="swatch" style="background:${l.color}"></div>`).join('')}</div><div class="palette-name">${p.name}</div></div>`).join('');
}
function buildTypeColorList(){
  const seen=new Set();
  if(geoLayer)geoLayer.eachLayer(l=>{if(l.feature){const te=l.feature.properties.type_espace||'';if(te&&!seen.has(te))seen.add(te);}});
  const types=[...seen].sort();
  document.getElementById('type-color-list').innerHTML=types.map(te=>{
    const col=typeColors[te]||PALETTES[currentPalette].fn({type_espace:te,'Perméabilité':'','Revêtement':'','Gestionnaires':'',_layer:'espaces_urbains',fid:0});
    const safe=te.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
    return`<div class="type-color-row"><input type="color" value="${col}" oninput="applyTypeColor('${safe}',this.value)"/><span class="${te===typeHighlight?'active':''}" onclick="toggleTypeHighlight('${safe}')" title="Isoler ces espaces sur la carte">${te}</span>${typeColors[te]?`<button onclick="resetTypeColor('${safe}')">↺</button>`:''}</div>`;
  }).join('');
}
function togglePalette(){buildPaletteList();buildTypeColorList();document.getElementById('palette-modal').classList.toggle('open');toggleBasemapMenu(false);}
function applyPalette(key){currentPalette=key;legendHighlight=null;typeHighlight=null;buildPaletteList();refreshLayerStyles();updateLegende();}
function applyTypeColor(te,color){typeColors[te]=color;refreshLayerStyles();}
function resetTypeColor(te){delete typeColors[te];refreshLayerStyles();buildTypeColorList();}
function resetAllColors(){Object.keys(customColors).forEach(k=>delete customColors[k]);Object.keys(typeColors).forEach(k=>delete typeColors[k]);legendHighlight=null;typeHighlight=null;refreshLayerStyles();buildTypeColorList();updateLegende();document.getElementById('palette-modal').classList.remove('open');}
window.applyTypeColor=applyTypeColor;window.resetTypeColor=resetTypeColor;
document.addEventListener('click',e=>{
  if(!e.target.closest('#palette-modal')&&!e.target.closest('.hbtn'))document.getElementById('palette-modal').classList.remove('open');
  if(!e.target.closest('.basemap-picker'))toggleBasemapMenu(false);
});

// ═══════════════════════════════════════════
// INFO MODAL
// ═══════════════════════════════════════════
function openInfoModal(contentHTML){
  document.getElementById('info-modal-content').innerHTML=contentHTML;
  document.getElementById('info-modal').classList.add('open');
}
function closeInfoModal(){document.getElementById('info-modal').classList.remove('open');}
window.closeInfoModal=closeInfoModal;
document.getElementById('info-modal').addEventListener('click',e=>{if(e.target===document.getElementById('info-modal'))closeInfoModal();});

const GRILLE_HTML=`<h3>Grille de lecture des évaluations</h3>
<table class="grille-table">
<tr><th>Note</th><th>Coût / Profondeur / Entretien</th><th>Biodiversité / Infiltration</th></tr>
<tr><td><span style="color:var(--brun)">●○○○○</span> 1/5</td><td>Très faible / quasi nul</td><td>Très faible</td></tr>
<tr><td><span style="color:var(--brun)">●●○○○</span> 2/5</td><td>Faible / léger</td><td>Faible</td></tr>
<tr><td><span style="color:var(--brun)">●●●○○</span> 3/5</td><td>Moyen / modéré</td><td>Modéré</td></tr>
<tr><td><span style="color:var(--brun)">●●●●○</span> 4/5</td><td>Élevé / soutenu</td><td>Élevé</td></tr>
<tr><td><span style="color:var(--brun)">●●●●●</span> 5/5</td><td>Très élevé / fréquent</td><td>Très élevé</td></tr>
</table>
<div class="key-point"><strong>⚠ Colmatage</strong>C'est l'ennemi n°1 des sols perméables (pavés, dalles). Si la poussière et la boue bouchent les trous, l'eau ne passe plus. Un entretien annuel est souvent nécessaire.</div>
<div class="key-point"><strong>🌿 Biodiversité</strong>Plus vous avez de couches de végétation différentes (herbe, arbustes, arbres), plus l'indice de biodiversité grimpe.</div>
<div class="key-point"><strong>🌊 Infiltration</strong>Elle dépend énormément de la nature de votre sol naturel (argileux vs sableux). Avant de choisir une technique profonde comme le puits, un test de perméabilité est indispensable.</div>`

const SOURCES_HTML=`<h3>Ressources pour aller plus loin</h3>
<a class="source-link" href="https://www.adopta.fr" target="_blank"><span class="src-icon">🌧️</span><div class="src-info"><strong>Adopta</strong><span>Ressources sur la gestion des eaux pluviales</span></div><span style="margin-left:auto;color:var(--gris)">→</span></a>
<a class="source-link" href="https://www.cerema.fr/fr" target="_blank"><span class="src-icon">🏗️</span><div class="src-info"><strong>CEREMA</strong><span>Centre d'expertise sur les risques, l'environnement, la mobilité et l'aménagement</span></div><span style="margin-left:auto;color:var(--gris)">→</span></a>
<a class="source-link" href="https://caue69.fr" target="_blank"><span class="src-icon">🏛️</span><div class="src-info"><strong>CAUE 69</strong><span>Conseil d'Architecture, d'Urbanisme et de l'Environnement du Rhône</span></div><span style="margin-left:auto;color:var(--gris)">→</span></a><a class="source-link" href="https://asso.graie.org/portail/" target="_blank"><span class="src-icon">💧</span><div class="src-info"><strong>GRAIE</strong><span>Groupe de Recherche Rhône-Alpes sur les Infrastructures et l'Eau</span></div><span style="margin-left:auto;color:var(--gris)">→</span></a>`;

// ═══════════════════════════════════════════
// TECHNIQUES DATA
// ═══════════════════════════════════════════
const TECHNIQUES = {"L'arbre de pluie": {"cout": 3, "profondeur": 3, "entretien": 3, "biodiversite": 4, "infiltration": 3, "coutDetail": "150 à 300 €/m²", "profDetail": "0,8 à 1,5 m", "entretienDetail": "Modéré à conséquent", "biodivDetail": "Élevé — habitats faunistiques, sol enrichi", "infiltDetail": "Bonne — infiltration par la fosse drainante", "desc": "L'arbre de pluie est un arbre dont la fosse de plantation a été pensée et dimensionnée en surface et en dépression pour gérer une partie des eaux de ruissellement, favoriser le développement de l'arbre et la biodiversité y compris celle du sol. Il permet de créer de l'ombre, de rafraîchir l'espace environnant, et de limiter les eaux de ruissellement grâce à l'infiltration et l'évapotranspiration.", "avantages": ["Réduction des effets d'îlots de chaleur urbains grâce à l'absorption du CO2 et la purification de l'air", "Plus-value paysagère et possibilité de créer des habitats pour la biodiversité", "Création de zones d'ombre", "Absorption du bruit", "Longévité élevée", "Amélioration du cadre de vie", "Réduit l'effet d'îlot de chaleur urbain"], "inconvenients": ["Entretien modéré à élevé les premières années", "Risque de gêne si mal positionné", "Effet d'ombrage pas suffisant les premières années", "Nécessité d'une protection contre les piétinements et les dépôts de déchets"], "espaces": {"Aire de jeux": "oui", "Allée entrée privée": "non", "Cour d'école": "oui", "Cour privée": "oui", "Parking": "oui", "Place publique": "oui", "Quai": "oui", "Chemin piéton": "non", "Chaussée": "non", "Piste cyclable": "non", "Terrain de sport": "non", "Terre-plein central": "oui", "Zone de retournement": "non", "Zone de stockage/livraison": "oui", "Allée entrée publique": "non", "Devanture de garage": "non", "Stationnement sur voirie": "non", "Trottoir": "maybe", "Zone de rencontre": "oui"}}, "La chaussée à structure réservoir": {"cout": 3, "profondeur": 2, "entretien": 1, "biodiversite": 1, "infiltration": 4, "coutDetail": "100 à 130 €/m²", "profDetail": "30 à 60 cm", "entretienDetail": "Faible", "biodivDetail": "Très faible — surface minérale, aucun habitat", "infiltDetail": "Bonne — stockage souterrain puis infiltration", "desc": "La chaussée à structure réservoir est une chaussée qui intègre sous sa surface une couche de matériaux à granulométrie discontinue permettant de stocker temporairement les eaux de pluie. Celles-ci s'infiltrent ensuite dans le sol, tandis que l'excédent est évacué à débit limité vers le milieu naturel ou le réseau d'assainissement. Deux configurations existent : avec un enrobé poreux permettant l'infiltration directe de l'eau, ou avec un enrobé classique où l'eau est acheminée vers la structure réservoir par une bouche d'injection et un drain.", "avantages": ["Compatible avec la circulation routière, parkings, zones piétonnes", "Pas de perte de place", "Aspect identique à une chaussée classique", "Infiltration directe des eaux pluviales"], "inconvenients": ["Sensibilité au gel", "Mise en œuvre légèrement plus complexe que des solutions de surface", "Demande la fermeture de la route pendant les travaux"], "espaces": {"Aire de jeux": "oui", "Allée entrée privée": "oui", "Cour d'école": "oui", "Cour privée": "oui", "Parking": "oui", "Place publique": "oui", "Quai": "oui", "Chemin piéton": "oui", "Chaussée": "oui", "Piste cyclable": "oui", "Terrain de sport": "maybe", "Terre-plein central": "oui", "Zone de retournement": "oui", "Zone de stockage/livraison": "oui", "Allée entrée publique": "oui", "Devanture de garage": "oui", "Stationnement sur voirie": "oui", "Trottoir": "oui", "Zone de rencontre": "oui"}}, "Les dalles alvéolaires": {"cout": 2, "profondeur": 1, "entretien": 1, "biodiversite": 2, "infiltration": 3, "coutDetail": "40 à 100 €/m²", "profDetail": "15 à 40 cm", "entretienDetail": "Faible", "biodivDetail": "Faible — intérêt si engazonnées", "infiltDetail": "Modérée — volumes drainés limités", "desc": "Les dalles alvéolaires sont des plaques en plastique ou en béton, dont les trous en forme de nid d'abeilles permettent à l'eau de pluie de s'infiltrer tout en gardant une surface stable pour marcher ou rouler. Bien que remplis de terre, de sable de graviers, ou de gazon, elles combinent solidité et perméabilité.", "avantages": ["Infiltration directe des eaux pluviales", "Support du passage de véhicules", "Intégration verte (remplies de gazon) ou patrimoniale (remplies de gravier)", "Sensibilisation des habitants", "Installation simple", "Longue durée de vie si bien posées et entretenues", "Captage des polluants"], "inconvenients": ["Accessibilité contraignante pour les PMR", "Volumes d'eau drainés assez limités", "Acceptabilité sociale complexe en raison de la perception de saleté associée au système", "Peu adapté au passage des vélos"], "espaces": {"Aire de jeux": "oui", "Allée entrée privée": "oui", "Cour d'école": "oui", "Cour privée": "oui", "Parking": "oui", "Place publique": "oui", "Quai": "oui", "Chemin piéton": "oui", "Chaussée": "maybe", "Piste cyclable": "non", "Terrain de sport": "non", "Terre-plein central": "oui", "Zone de retournement": "oui", "Zone de stockage/livraison": "oui", "Allée entrée publique": "oui", "Devanture de garage": "oui", "Stationnement sur voirie": "oui", "Trottoir": "oui", "Zone de rencontre": "oui"}}, "Les éléments libres": {"cout": 3, "profondeur": 2, "entretien": 2, "biodiversite": 2, "infiltration": 3, "coutDetail": "50 à 120 €/m²", "profDetail": "30 à 40 cm", "entretienDetail": "Faible", "biodivDetail": "Faible à modéré selon le matériau choisi", "infiltDetail": "Modérée — volumes drainés limités", "desc": "Afin de mettre en place des sols souples et perméables pour des usages spécifiques tels que des aires de jeux, accès secondaires, allées de parcs et jardins, cours d'écoles, etc., il est possible de mettre en œuvre des revêtements de sols naturellement drainants tels que les copeaux de bois, les gravillons roulés, le sable, le liège, etc.", "avantages": ["Infiltration directe des eaux pluviales", "Supportent le passage de véhicules", "Large gamme de matériaux", "Sensibilisation des habitants", "Installation simple", "Longue durée de vie si bien posées et entretenues"], "inconvenients": ["Risque de perte de perméabilité si pas entretenu", "Accessibilité contraignante pour les PMR", "Peut nécessiter un balayage ou désherbage pour maintenir la performance", "Volumes d'eau drainés assez limités"], "espaces": {"Aire de jeux": "oui", "Allée entrée privée": "oui", "Cour d'école": "oui", "Cour privée": "oui", "Parking": "oui", "Place publique": "oui", "Quai": "oui", "Chemin piéton": "oui", "Chaussée": "non", "Piste cyclable": "non", "Terrain de sport": "oui", "Terre-plein central": "oui", "Zone de retournement": "non", "Zone de stockage/livraison": "oui", "Allée entrée publique": "oui", "Devanture de garage": "oui", "Stationnement sur voirie": "maybe", "Trottoir": "maybe", "Zone de rencontre": "maybe"}}, "Les espaces d'eau permanents": {"cout": 4, "profondeur": 2, "entretien": 1, "biodiversite": 5, "infiltration": 2, "coutDetail": "160 à 300 €/m²", "profDetail": "20 cm à 1,5 m", "entretienDetail": "Faible", "biodivDetail": "Très élevé — milieu aquatique, faune et flore riches", "infiltDetail": "Faible — rétention prioritaire, infiltration lente", "desc": "Les espaces d'eau permanents constituent des bassins de stockage des eaux pluviales, naturels ou artificiels, prenant la forme de jardins d'eau, de mares, ou d'étangs. Ils recueillent les eaux par ruissellement direct ou indirect. Ces zones en eau sont parmi les milieux écologiques les plus propices au développement d'une faune et d'une flore.", "avantages": ["Parcours de l'eau à ciel ouvert qui permet une surveillance visuelle du réseau (qualité, quantité, incidents)", "Traite de grand volume d'eau", "Plus-value paysagère et possibilité de créer des habitats pour la biodiversité", "Sensibilisation des habitants", "Entretien demandant une technicité peu élevée", "Réduction des effets d'îlots de chaleur urbains", "Amélioration du cadre de vie : effet de bien-être associé à la présence de l'eau"], "inconvenients": ["Nécessité d'une protection contre les dépôts de déchets", "Emprise foncière non négligeable"], "espaces": {"Aire de jeux": "oui", "Allée entrée privée": "non", "Cour d'école": "oui", "Cour privée": "maybe", "Parking": "maybe", "Place publique": "oui", "Quai": "non", "Chemin piéton": "non", "Chaussée": "non", "Piste cyclable": "non", "Terrain de sport": "non", "Terre-plein central": "oui", "Zone de retournement": "non", "Zone de stockage/livraison": "oui", "Allée entrée publique": "non", "Devanture de garage": "non", "Stationnement sur voirie": "non", "Trottoir": "non", "Zone de rencontre": "non"}}, "La fosse de Stockholm": {"cout": 5, "profondeur": 5, "entretien": 3, "biodiversite": 4, "infiltration": 5, "coutDetail": "400 à 700 €/m²", "profDetail": "1,5 à 2,5 m", "entretienDetail": "Modéré", "biodivDetail": "Élevé — favorise la croissance arborée en ville", "infiltDetail": "Très bonne — grand volume d'absorption et infiltration", "desc": "La fosse de Stockholm se structure par des tuyaux enterrés dans lesquels l'eau de ruissellement est acheminée et qui l'amène vers les racines des arbres. Un mélange poreux laisse passer l'eau et l'air jusqu'aux racines, tout en stockant l'eau comme une réserve. Ainsi, les arbres grandissent mieux et l'eau de pluie s'infiltre naturellement au lieu de partir directement à l'égout.", "avantages": ["Traite de grand volume d'eau", "Bon développement du système racinaire", "Bonne capacité de gestion des eaux de pluie par son grand volume d'absorption et d'infiltration", "Adapté à tout type de site (place, rue, parking, toiture)", "Réduction des effets d'îlots de chaleur urbains grâce à l'absorption du CO2 et la purification de l'air"], "inconvenients": ["Particulièrement coûteux", "Installation uniquement dans des zones fortement urbanisées et qui drainent de très grandes quantités d'eau", "Nécessite un entretien et un arrosage fréquent"], "espaces": {"Aire de jeux": "oui", "Allée entrée privée": "maybe", "Cour d'école": "oui", "Cour privée": "maybe", "Parking": "maybe", "Place publique": "oui", "Quai": "maybe", "Chemin piéton": "maybe", "Chaussée": "maybe", "Piste cyclable": "maybe", "Terrain de sport": "maybe", "Terre-plein central": "oui", "Zone de retournement": "maybe", "Zone de stockage/livraison": "oui", "Allée entrée publique": "maybe", "Devanture de garage": "non", "Stationnement sur voirie": "maybe", "Trottoir": "maybe", "Zone de rencontre": "oui"}}, "Le jardin de pluie": {"cout": 4, "profondeur": 2, "entretien": 3, "biodiversite": 5, "infiltration": 3, "coutDetail": "160 à 300 €/m²", "profDetail": "10 à 40 cm", "entretienDetail": "Modéré", "biodivDetail": "Très élevé — îlot de biodiversité en milieu urbain", "infiltDetail": "Modérée — faible volume de rétention", "desc": "Le jardin de pluie est un bassin végétalisé de forme libre et de faible profondeur. Il stocke et infiltre temporairement les eaux pluviales et de ruissellement. Avec l'installation d'une végétation hygrophile, elle se révèle être un véritable îlot de biodiversité en zone urbaine.", "avantages": ["Traite de grand volume d'eau", "Plus-value paysagère et possibilité de créer des habitats pour la biodiversité", "Sensibilisation des habitants", "Réduction des effets d'îlots de chaleur urbains", "Amélioration du cadre de vie : effet de bien-être associé à la présence de l'eau"], "inconvenients": ["Risque de stagnation de l'eau si mal conçu", "Emprise foncière non négligeable"], "espaces": {"Aire de jeux": "oui", "Allée entrée privée": "non", "Cour d'école": "oui", "Cour privée": "maybe", "Parking": "maybe", "Place publique": "oui", "Quai": "non", "Chemin piéton": "non", "Chaussée": "non", "Piste cyclable": "non", "Terrain de sport": "non", "Terre-plein central": "oui", "Zone de retournement": "non", "Zone de stockage/livraison": "oui", "Allée entrée publique": "non", "Devanture de garage": "non", "Stationnement sur voirie": "non", "Trottoir": "non", "Zone de rencontre": "non"}}, "Les joints drainants": {"cout": 2, "profondeur": 2, "entretien": 2, "biodiversite": 2, "infiltration": 2, "coutDetail": "40 à 80 €/m²", "profDetail": "20 à 40 cm", "entretienDetail": "Faible", "biodivDetail": "Faible — léger intérêt si végétalisés", "infiltDetail": "Faible à modéré — volumes d'eau drainés limités", "desc": "Les joints drainants sont des espaces perméables laissés entre les pavés. Ils sont remplis de sable, de graviers, ou végétalisés, et permettent à l'eau de pluie de s'infiltrer directement dans le sol plutôt que ruisseler. C'est une solution simple et discrète qui permet de garder l'aspect d'un pavage classique.", "avantages": ["Infiltration directe des eaux pluviales", "Support du passage de véhicules", "Adapté à un grand nombre d'espaces différents", "Intégration patrimoniale", "Installation simple", "Longue durée de vie si bien posées et entretenues", "Captage des polluants"], "inconvenients": ["Accessibilité contraignante pour les PMR", "Volumes d'eau drainés assez limités", "Acceptabilité sociale complexe en raison de la perception de saleté si végétalisé", "Peu adapté au passage des vélos"], "espaces": {"Aire de jeux": "oui", "Allée entrée privée": "oui", "Cour d'école": "oui", "Cour privée": "oui", "Parking": "oui", "Place publique": "oui", "Quai": "oui", "Chemin piéton": "oui", "Chaussée": "oui", "Piste cyclable": "oui", "Terrain de sport": "non", "Terre-plein central": "oui", "Zone de retournement": "oui", "Zone de stockage/livraison": "oui", "Allée entrée publique": "oui", "Devanture de garage": "oui", "Stationnement sur voirie": "oui", "Trottoir": "oui", "Zone de rencontre": "oui"}}, "La microforêt": {"cout": 1, "profondeur": 3, "entretien": 1, "biodiversite": 5, "infiltration": 4, "coutDetail": "20 à 50 €/m²", "profDetail": "1 m", "entretienDetail": "Faible", "biodivDetail": "Très élevé — forte diversité végétale et faunistique", "infiltDetail": "Bonne — infiltration croissante à long terme", "desc": "Une microforêt est un petit espace densément planté, rassemblant une grande diversité d'arbres et d'arbustes. Grâce à cette forte densité végétale, les sols s'enrichissent naturellement, favorisant une meilleure infiltration des eaux de pluie et un développement rapide de la biodiversité. Ce type d'aménagement contribue également à la régulation thermique urbaine en apportant fraîcheur et ombrage. De plus, l'eau absorbée par les végétaux est ensuite évapotranspirée, limitant ainsi le ruissellement vers le réseau d'assainissement et réduisant la pression sur les infrastructures hydrauliques.", "avantages": ["Bonne capacité d'infiltration à long terme", "Plus-value paysagère et possibilité de créer des habitats pour la biodiversité", "Milieu autonome en 2-3 ans", "Croissance accélérée de la microforêt grâce à la densité", "Réduction des effets d'îlots de chaleur urbains"], "inconvenients": ["Peut être perçu comme \"désordonné\" ou \"mal entretenu\"", "Demande davantage de foncier par rapport à d'autres solutions"], "espaces": {"Aire de jeux": "oui", "Allée entrée privée": "non", "Cour d'école": "oui", "Cour privée": "maybe", "Parking": "maybe", "Place publique": "oui", "Quai": "non", "Chemin piéton": "non", "Chaussée": "non", "Piste cyclable": "non", "Terrain de sport": "non", "Terre-plein central": "oui", "Zone de retournement": "non", "Zone de stockage/livraison": "oui", "Allée entrée publique": "non", "Devanture de garage": "non", "Stationnement sur voirie": "non", "Trottoir": "non", "Zone de rencontre": "non"}}, "Le module végétalisé": {"cout": 5, "profondeur": 2, "entretien": 1, "biodiversite": 3, "infiltration": 3, "coutDetail": "300 à 900 €/m²", "profDetail": "0 à 1,2 m", "entretienDetail": "Pas d'entretien", "biodivDetail": "Modéré — végétation plantée, habitats ponctuels", "infiltDetail": "Modérée — stockage tampon, irrigation des plantations", "desc": "Le module végétalisé est un dispositif d'aménagement modulaire qui peut être soit composé en partie souterraine d'une réserve alimentée par les eaux pluviales de voiries et/ou de toitures, ou bien en partie supérieure d'une végétation plantée. L'eau est stockée temporairement et alimente les plantations, pour limiter les arrosages en période de sécheresse. Cette méthode permet un entretien minime et est entièrement personnalisable selon l'espace.", "avantages": ["Ne demande aucun entretien", "Dispositif multifonctionnel (gestion de l'eau, mobilier urbain, etc.)", "Ne nécessite pas de travaux lourds (plug & play)", "Adapté à grand nombre d'espaces urbains", "Plus-value paysagère et possibilité de créer des habitats pour la biodiversité", "Sensibilisation des habitants", "Réduction des effets d'îlots de chaleur urbains"], "inconvenients": ["Plus cher qu'une technique traditionnelle"], "espaces": {"Aire de jeux": "oui", "Allée entrée privée": "maybe", "Cour d'école": "oui", "Cour privée": "oui", "Parking": "oui", "Place publique": "oui", "Quai": "maybe", "Chemin piéton": "non", "Chaussée": "non", "Piste cyclable": "non", "Terrain de sport": "maybe", "Terre-plein central": "oui", "Zone de retournement": "non", "Zone de stockage/livraison": "oui", "Allée entrée publique": "maybe", "Devanture de garage": "non", "Stationnement sur voirie": "non", "Trottoir": "maybe", "Zone de rencontre": "oui"}}, "La noue": {"cout": 4, "profondeur": 2, "entretien": 2, "biodiversite": 4, "infiltration": 4, "coutDetail": "250 à 350 €/m²", "profDetail": "30 cm à 1 m", "entretienDetail": "Faible", "biodivDetail": "Élevé — milieu végétalisé, habitat humide temporaire", "infiltDetail": "Bonne — grand volume, recharge des nappes", "desc": "La noue est un espace linéaire planté présentant une légère dépression afin de recevoir les eaux pluviales, issues d'un ruissellement direct (voirie, cheminement piéton) ou indirect (toitures). Les eaux pluviales sont infiltrées sur place et contribuent au rechargement des nappes phréatiques. Si les conditions ne sont pas propices à l'infiltration, la noue stocke temporairement les eaux avant de les renvoyer à débit limité vers le milieu naturel. Grâce à l'eau, la noue est un espace propice au développement d'une végétation riche et diversifiée.", "avantages": ["Parcours de l'eau à ciel ouvert qui permet une surveillance visuelle du réseau", "Traite de grand volume d'eau", "Plus-value paysagère et possibilité de créer des habitats pour la biodiversité", "Sensibilisation des habitants", "Entretien demandant une technicité peu élevée", "Réduction des effets d'îlots de chaleur urbains", "Amélioration du cadre de vie"], "inconvenients": ["Risque de stagnation de l'eau si mal conçu", "Nécessité d'une protection contre les dépôts de déchets", "Emprise foncière non négligeable"], "espaces": {"Aire de jeux": "oui", "Allée entrée privée": "maybe", "Cour d'école": "oui", "Cour privée": "oui", "Parking": "oui", "Place publique": "oui", "Quai": "maybe", "Chemin piéton": "non", "Chaussée": "non", "Piste cyclable": "non", "Terrain de sport": "non", "Terre-plein central": "oui", "Zone de retournement": "non", "Zone de stockage/livraison": "oui", "Allée entrée publique": "maybe", "Devanture de garage": "non", "Stationnement sur voirie": "non", "Trottoir": "maybe", "Zone de rencontre": "oui"}}, "Les pavés perméables": {"cout": 3, "profondeur": 2, "entretien": 2, "biodiversite": 1, "infiltration": 3, "coutDetail": "50 à 120 €/m²", "profDetail": "30 à 40 cm", "entretienDetail": "Faible", "biodivDetail": "Très faible — surface minérale sans végétation", "infiltDetail": "Modérée — volumes d'eau drainés limités", "desc": "Les pavés perméables présentent une apparence similaire à celle des pavés traditionnels, mais leur conception repose sur une structure poreuse permettant l'infiltration de l'eau. Ils constituent une solution à la fois fonctionnelle et esthétiquement adaptée à de nombreux espaces urbains.", "avantages": ["Infiltration directe des eaux pluviales", "Adapté au passage des véhicules et des vélos", "Large gamme de matériaux", "Installation simple", "Longue durée de vie si bien posées et entretenues", "Entretien faible"], "inconvenients": ["Colmatage possible si mal entretenu", "Volumes d'eau drainés assez limités"], "espaces": {"Aire de jeux": "oui", "Allée entrée privée": "oui", "Cour d'école": "oui", "Cour privée": "oui", "Parking": "oui", "Place publique": "oui", "Quai": "oui", "Chemin piéton": "oui", "Chaussée": "oui", "Piste cyclable": "oui", "Terrain de sport": "oui", "Terre-plein central": "oui", "Zone de retournement": "oui", "Zone de stockage/livraison": "oui", "Allée entrée publique": "oui", "Devanture de garage": "oui", "Stationnement sur voirie": "oui", "Trottoir": "oui", "Zone de rencontre": "oui"}}, "Le puit d'infiltration": {"cout": 4, "profondeur": 5, "entretien": 3, "biodiversite": 1, "infiltration": 5, "coutDetail": "300 à 800 € par unité", "profDetail": "2 à 10 m", "entretienDetail": "Modéré", "biodivDetail": "Très faible — ouvrage enterré, aucune valeur paysagère", "infiltDetail": "Très bonne — recharge directe de la nappe phréatique", "desc": "Un puit d'infiltration est un ouvrage en béton ou en plastique, enterré dans le sol, permettant de collecter, stocker, et infiltrer les eaux pluviales. À l'aide de tuyaux, il permet de réduire le ruissellement en milieu urbain et de recharger la nappe phréatique.", "avantages": ["Entièrement enterré et n'empiète pas sur l'espace public", "Traite de grand volume d'eau", "Adapté pour les zones densément bâties ou patrimoniales", "Dimensionnable selon les besoins"], "inconvenients": ["Pas de valeur paysagère ni pédagogique", "Nécessite une protection contre les dépôts de déchets", "Nécessite étude du sol, perméabilité, nappe phréatique, risques de pollution"], "espaces": {"Aire de jeux": "oui", "Allée entrée privée": "oui", "Cour d'école": "oui", "Cour privée": "oui", "Parking": "oui", "Place publique": "oui", "Quai": "oui", "Chemin piéton": "oui", "Chaussée": "oui", "Piste cyclable": "oui", "Terrain de sport": "oui", "Terre-plein central": "oui", "Zone de retournement": "oui", "Zone de stockage/livraison": "oui", "Allée entrée publique": "oui", "Devanture de garage": "oui", "Stationnement sur voirie": "oui", "Trottoir": "oui", "Zone de rencontre": "oui"}}, "La tranchée d'infiltration": {"cout": 3, "profondeur": 2, "entretien": 3, "biodiversite": 1, "infiltration": 4, "coutDetail": "30 à 150 €/m²", "profDetail": "0,7 à 1 m", "entretienDetail": "Modéré", "biodivDetail": "Très faible — ouvrage minéral, sans végétation", "infiltDetail": "Bonne — filtration et réalimentation de la nappe", "desc": "La tranchée d'infiltration est un ouvrage linéaire de faible profondeur rempli de matériaux perméables. L'eau y est amenée soit par des canalisations, soit par ruissellement direct. Elle assure la filtration et le stockage temporaire des eaux pluviales avant infiltration. Elle permet aussi de guider les racines vers le bas et empêche ainsi les racines de dégrader la chaussée.", "avantages": ["Faciles à mettre en œuvre", "Aménagement discret", "Faible coût à la réalisation et à l'exploitation", "Dépollution des eaux pluviales par filtration", "Réalimentation de la nappe si infiltration"], "inconvenients": ["Difficiles à mettre en œuvre lorsque la pente du projet est forte", "Sensibles au colmatage"], "espaces": {"Aire de jeux": "oui", "Allée entrée privée": "oui", "Cour d'école": "oui", "Cour privée": "oui", "Parking": "oui", "Place publique": "oui", "Quai": "oui", "Chemin piéton": "oui", "Chaussée": "maybe", "Piste cyclable": "maybe", "Terrain de sport": "oui", "Terre-plein central": "oui", "Zone de retournement": "maybe", "Zone de stockage/livraison": "oui", "Allée entrée publique": "oui", "Devanture de garage": "oui", "Stationnement sur voirie": "maybe", "Trottoir": "oui", "Zone de rencontre": "oui"}}};

const TECH_ICONS={
  "L'arbre de pluie":"🌳",
  "La chaussée à structure réservoir":"🛣️",
  "Les dalles alvéolaires":"🔶",
  "Les éléments libres":"🪨",
  "Les espaces d'eau permanents":"🏞️",
  "La fosse de Stockholm":"🌲",
  "Le jardin de pluie":"🌸",
  "Les joints drainants":"🧱",
  "La microforêt":"🌿",
  "Le module végétalisé":"📦",
  "La noue":"〰️",
  "Les pavés perméables":"🔲",
  "Le puit d'infiltration":"⚙️",
  "La tranchée d'infiltration":"🔧",
};

// Map type_espace -> applicable techniques (oui + maybe)
const SPACES_NORM={
  "Cour école":"Cour d'école","Cour d'école":"Cour d'école",
  "Trottoirs":"Trottoir","Trottoir":"Trottoir",
  "Allée entrée":"Allée entrée privée","Allée entrée privée":"Allée entrée privée",
  "Terre plein central":"Terre-plein central","Terre-plein central":"Terre-plein central",
};
function getTechniques(te){
  const norm=SPACES_NORM[te]||te;
  return Object.entries(TECHNIQUES).filter(([,t])=>{
    const s=t.espaces[norm]||'non';
    return s==='oui'||s==='maybe';
  }).map(([name,t])=>({name,status:t.espaces[norm]||'non'}));
}

// ═══════════════════════════════════════════
// PICTOS SVG
// ═══════════════════════════════════════════
function makePictos(name,note,color){
  const s={
    cout:f=>`<svg viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="${f?color:'#ccc'}" stroke-width="2" fill="${f?color+'22':'none'}"/><text x="10" y="14" text-anchor="middle" font-size="9" font-family="sans-serif" fill="${f?color:'#ccc'}">€</text></svg>`,
    profondeur:f=>`<svg viewBox="0 0 20 20" fill="none"><line x1="10" y1="2" x2="10" y2="18" stroke="${f?color:'#ccc'}" stroke-width="2" stroke-linecap="round"/><polyline points="6,14 10,18 14,14" stroke="${f?color:'#ccc'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/><line x1="6" y1="2" x2="14" y2="2" stroke="${f?color:'#ccc'}" stroke-width="2" stroke-linecap="round"/></svg>`,
    entretien:f=>`<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
  <line x1="10" y1="2" x2="10" y2="12" stroke="${f?color:'#ccc'}" stroke-width="1.6" stroke-linecap="round"/>
  <line x1="7.5" y1="2" x2="12.5" y2="2" stroke="${f?color:'#ccc'}" stroke-width="1.6" stroke-linecap="round"/>
  <path d="M7 12 L13 12 L13 15 Q13 18 10 18 Q7 18 7 15 Z" fill="${f?color:'#ccc'}" stroke="none"/>
</svg>`,
    biodiversite:f=>`<svg viewBox="0 0 20 20" fill="none"><path d="M10 17 C10 17 4 13 4 8 C4 5.8 5.8 4 8 4 C9.1 4 10 4.5 10 4.5 C10 4.5 10.9 4 12 4 C14.2 4 16 5.8 16 8 C16 13 10 17 10 17 Z" stroke="${f?color:'#ccc'}" stroke-width="1.5" fill="${f?color+'33':'none'}"/></svg>`,
    infiltration:f=>`<svg viewBox="0 0 20 20" fill="none"><path d="M10 3 C10 3 6 8 6 12 C6 14.2 7.8 16 10 16 C12.2 16 14 14.2 14 12 C14 8 10 3 10 3 Z" stroke="${f?color:'#ccc'}" stroke-width="1.5" fill="${f?color+'33':'none'}"/></svg>`,
  };
  return Array.from({length:5},(_,i)=>(s[name]||s.cout)(i<note)).join('');
}
const PICTO_CFG={cout:{label:'Coût',color:'#c1440e'},profondeur:{label:'Profondeur',color:'#6b4c9a'},entretien:{label:'Entretien',color:'#a0522d'},biodiversite:{label:'Biodiversité',color:'#2d6a4f'},infiltration:{label:'Infiltration',color:'#1a6b9e'}};
function renderPictos(tech){
  return Object.entries(PICTO_CFG).map(([key,cfg])=>{
    const note=tech[key];
    if(note==null)return`<div class="picto-card"><div class="picto-label">${cfg.label}</div><div style="font-size:.72rem;color:#aaa;font-style:italic">N/A</div></div>`;
    const detail={cout:tech.coutDetail,profondeur:tech.profDetail,entretien:tech.entretienDetail,biodiversite:tech.biodivDetail,infiltration:tech.infiltDetail}[key];
    return`<div class="picto-card"><div class="picto-label">${cfg.label}</div><div class="picto-icons">${makePictos(key,note,cfg.color)}</div><div class="picto-detail">${detail}</div></div>`;
  }).join('');
}

// ═══════════════════════════════════════════
// GEOJSON LAYER
// ═══════════════════════════════════════════
let geoLayer=null,currentFeatureProps=null,currentLeafletLayer=null;
function featureStyle(f){
  const p=f.properties;
  if(p._layer==='eau'){
    const base={color:'#1a6b9e',weight:0.7,opacity:0.8,fillColor:'#5ba3d0',fillOpacity:0.5};
    return applyHighlight(base,'#5ba3d0',p.type_espace||'');
  }
  const color=getFeatureColor(p),isBati=p._layer==='bati';
  const base={color:isBati?'#8a7060':color,weight:isBati?0.5:0.7,opacity:0.8,fillColor:color,fillOpacity:isBati?0.85:0.55};
  const styled=applyHighlight(base,color,p.type_espace||'');
  // Filtre public/privé : ne s'applique pas au bâti/eau (toujours visibles),
  // et se combine avec la mise en avant légende/type ci-dessus plutôt que de
  // l'écraser après coup — sinon un refreshLayerStyles() déclenché ailleurs
  // (clic légende, changement de type, etc.) effaçait le filtre en cours.
  if(p._layer!=='bati'){
    const isPriv=p._acces==='privé';
    const show=(isPriv&&_filterPrive)||(!isPriv&&_filterPublic);
    if(!show)return{...styled,opacity:0,fillOpacity:0};
  }
  return styled;
}
// Si une catégorie de légende ou un type d'espace est sélectionné (clic sur la
// légende, ou sur le libellé d'un type dans la liste de couleurs), fait
// ressortir les espaces concernés (contour épais et net) et estompe les
// autres (quasi transparents). Un seul de ces deux filtres est actif à la fois.
function applyHighlight(style,catColor,typeEspace){
  if(typeHighlight){
    return typeEspace===typeHighlight
      ?{...style,weight:3,opacity:1,fillOpacity:Math.min(1,style.fillOpacity+0.3)}
      :{...style,weight:style.weight*0.6,opacity:0.15,fillOpacity:style.fillOpacity*0.12};
  }
  if(legendHighlight){
    return catColor===legendHighlight
      ?{...style,weight:3,opacity:1,fillOpacity:Math.min(1,style.fillOpacity+0.3)}
      :{...style,weight:style.weight*0.6,opacity:0.15,fillOpacity:style.fillOpacity*0.12};
  }
  return style;
}
function refreshLayerStyles(){if(!geoLayer)return;geoLayer.eachLayer(l=>{if(l.setStyle)l.setStyle(featureStyle(l.feature));});}

function loadGeoJSON(data){
  if(geoLayer)map.removeLayer(geoLayer);
  geoLayer=L.geoJSON(data,{
    style:featureStyle,
    onEachFeature:(feature,layer)=>{
      const p=feature.properties;
      if(p._layer==='eau'){
  const nom=p['Nom cours eau']||"Cours d'eau";
  layer.bindTooltip('<img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NCA2NCIgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0Ij4KICA8IS0tIENhbmFsIGJhbmtzIChlYXJ0aC9ncm91bmQpIC0tPgogIDxyZWN0IHg9IjAiIHk9IjE0IiB3aWR0aD0iNjQiIGhlaWdodD0iMTIiIHJ4PSIyIiBmaWxsPSIjOEI2OTE0Ii8+CiAgPHJlY3QgeD0iMCIgeT0iMzgiIHdpZHRoPSI2NCIgaGVpZ2h0PSIxMiIgcng9IjIiIGZpbGw9IiM4QjY5MTQiLz4KICA8IS0tIFdhdGVyIGJvZHkgLS0+CiAgPHJlY3QgeD0iMCIgeT0iMjYiIHdpZHRoPSI2NCIgaGVpZ2h0PSIxMiIgZmlsbD0iIzFhNmI5ZSIvPgogIDwhLS0gV2F0ZXIgd2F2ZXMgLS0+CiAgPHBhdGggZD0iTTQgMzAgUTEwIDI3IDE2IDMwIFEyMiAzMyAyOCAzMCBRMzQgMjcgNDAgMzAgUTQ2IDMzIDUyIDMwIFE1OCAyNyA2MiAzMCIgCiAgICAgICAgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgb3BhY2l0eT0iMC43Ii8+CiAgPHBhdGggZD0iTTQgMzQgUTEwIDMxIDE2IDM0IFEyMiAzNyAyOCAzNCBRMzQgMzEgNDAgMzQgUTQ2IDM3IDUyIDM0IFE1OCAzMSA2MiAzNCIgCiAgICAgICAgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgb3BhY2l0eT0iMC41Ii8+CiAgPCEtLSBHcmFzcy92ZWdldGF0aW9uIG9uIGJhbmtzIC0tPgogIDxyZWN0IHg9IjAiIHk9IjE0IiB3aWR0aD0iNjQiIGhlaWdodD0iMyIgcng9IjEiIGZpbGw9IiM0YTdjM2YiLz4KICA8cmVjdCB4PSIwIiB5PSI0NyIgd2lkdGg9IjY0IiBoZWlnaHQ9IjMiIHJ4PSIxIiBmaWxsPSIjNGE3YzNmIi8+Cjwvc3ZnPg==" style="width:16px;height:12px;vertical-align:middle;margin-right:3px;"/><strong>'+nom+'</strong>',{sticky:true,direction:'top',className:'eau-tooltip'});
  layer.on('click',()=>{
    document.getElementById('panel-title').textContent=nom;
    document.getElementById('panel-body').innerHTML='<div style="padding:12px 0;font-size:.9rem;color:var(--brun)"><div style="margin-bottom:12px"><img src=\"data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NCA2NCIgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0Ij4KICA8IS0tIENhbmFsIGJhbmtzIChlYXJ0aC9ncm91bmQpIC0tPgogIDxyZWN0IHg9IjAiIHk9IjE0IiB3aWR0aD0iNjQiIGhlaWdodD0iMTIiIHJ4PSIyIiBmaWxsPSIjOEI2OTE0Ii8+CiAgPHJlY3QgeD0iMCIgeT0iMzgiIHdpZHRoPSI2NCIgaGVpZ2h0PSIxMiIgcng9IjIiIGZpbGw9IiM4QjY5MTQiLz4KICA8IS0tIFdhdGVyIGJvZHkgLS0+CiAgPHJlY3QgeD0iMCIgeT0iMjYiIHdpZHRoPSI2NCIgaGVpZ2h0PSIxMiIgZmlsbD0iIzFhNmI5ZSIvPgogIDwhLS0gV2F0ZXIgd2F2ZXMgLS0+CiAgPHBhdGggZD0iTTQgMzAgUTEwIDI3IDE2IDMwIFEyMiAzMyAyOCAzMCBRMzQgMjcgNDAgMzAgUTQ2IDMzIDUyIDMwIFE1OCAyNyA2MiAzMCIgCiAgICAgICAgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgb3BhY2l0eT0iMC43Ii8+CiAgPHBhdGggZD0iTTQgMzQgUTEwIDMxIDE2IDM0IFEyMiAzNyAyOCAzNCBRMzQgMzEgNDAgMzQgUTQ2IDM3IDUyIDM0IFE1OCAzMSA2MiAzNCIgCiAgICAgICAgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgb3BhY2l0eT0iMC41Ii8+CiAgPCEtLSBHcmFzcy92ZWdldGF0aW9uIG9uIGJhbmtzIC0tPgogIDxyZWN0IHg9IjAiIHk9IjE0IiB3aWR0aD0iNjQiIGhlaWdodD0iMyIgcng9IjEiIGZpbGw9IiM0YTdjM2YiLz4KICA8cmVjdCB4PSIwIiB5PSI0NyIgd2lkdGg9IjY0IiBoZWlnaHQ9IjMiIHJ4PSIxIiBmaWxsPSIjNGE3YzNmIi8+Cjwvc3ZnPg==\" style=\"width:56px;height:44px;\"/></div><strong>'+nom+'</strong><br><span style="color:var(--gris);font-size:.8rem">Cours d\'eau — territoire de Bergues</span></div>';
    document.getElementById('panel').classList.add('open');
  });
  return;
}
layer.on('click',()=>{
    if(currentLeafletLayer&&currentLeafletLayer!==layer)currentLeafletLayer.setStyle(featureStyle(currentLeafletLayer.feature));
    currentFeatureProps=p;currentLeafletLayer=layer;
    layer.setStyle({...featureStyle(layer.feature),color:'#ffffff',weight:2.5,opacity:1});
    if(layer.bringToFront)layer.bringToFront();
    renderPanel(p,layer);
  });
      layer.on('mouseover',function(){this.setStyle({fillOpacity:0.82,weight:1.2});});
      layer.on('mouseout',function(){if(this!==currentLeafletLayer)this.setStyle(featureStyle(feature));});
    }
  });
  geoLayer.addTo(map);
}

// ═══════════════════════════════════════════
// PANNEAU ESPACE
// ═══════════════════════════════════════════
const panel=document.getElementById('panel');
document.getElementById('panel-close').addEventListener('click',()=>{
  panel.classList.remove('open');
  document.getElementById('fiche-overlay').classList.remove('open');
  if(currentLeafletLayer){currentLeafletLayer.setStyle(featureStyle(currentLeafletLayer.feature));currentLeafletLayer=null;}
  currentFeatureProps=null;
});
document.getElementById('fiche-close').addEventListener('click',()=>document.getElementById('fiche-overlay').classList.remove('open'));
document.getElementById('fiche-overlay').addEventListener('click',e=>{if(e.target===document.getElementById('fiche-overlay'))document.getElementById('fiche-overlay').classList.remove('open');});

function renderPanel(p,layer){
  currentLeafletLayer=layer;
  document.getElementById('fiche-overlay').classList.remove('open');
  const perm=p['Perméabilité']||'',badgeClass=perm.toLowerCase().includes('im')?'imperm':'perm';
  const te_key=p['type_espace']||'';const _simg=SPACE_IMAGES[te_key]||(()=>{const _ill=p['Illustration']||'';const _m=_ill.match(/src="([^"]+)"/);return _m?_m[1]:null;})();const ill=_simg?'<img src="'+_simg+'">':(p['Illustration']||''),src=_simg?{1:_simg}:ill.match(/src="([^"]+)/);
  const photoHTML=src?`<div class="photo-box"><img src="${src[1]}" alt="Photo" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'photo-placeholder\\'>Photo non disponible</div>'"/></div>`:`<div class="photo-box"><div class="photo-placeholder">Aucune photo disponible</div></div>`;
  const layerLabel={'espaces_urbains':'Espace urbain','circulation':'Voirie','trottoirs':'Trottoir','vegetation':'Végétation','bati':'Bâtiment'}[p._layer]||p._layer;
  const typeEspace=(p['type_espace']||p._layer)===p._layer?layerLabel:(p['type_espace']||'');
  const nomRue=p['Nom de rue']||'';
  const colorKey=p._layer+'_'+p.fid,currentColor=customColors[colorKey]||getFeatureColor(p);
  const techList=getTechniques(typeEspace);
  const hasTech=['espaces_urbains','circulation','trottoirs'].includes(p._layer);
  let techHTML='';
  if(hasTech&&techList.length>0){
    techHTML=techList.map(({name,status})=>{
      const icon=TECH_ICONS[name]||'🔧';
      const safe=name.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
      return`<button class="tech-chip ${status==='maybe'?'maybe':''}" onclick="openFiche('${safe}')"><span class="tech-icon">${icon}</span><span class="tech-name">${name}</span>${status==='maybe'?'<span class="tech-badge maybe">Possible</span>':''}<span class="tech-arrow">→</span></button>`;
    }).join('');
    if(techList.some(t=>t.status==='maybe')){
      techHTML+=`<div class="tech-note">La mention « Possible » indique que la faisabilité de la technique doit être étudiée au cas par cas sur ce type d'espace.</div>`;
    }
  } else {
    techHTML=`<div style="font-size:.8rem;color:var(--gris);font-style:italic">Aucune intervention de désimperméabilisation nécessaire : surface déjà perméable</div>`;
  }
  document.getElementById('panel-title').textContent=typeEspace||layerLabel;
  document.getElementById('panel-body').innerHTML=`
    <div id="color-editor"><label>Couleur individuelle</label><div class="color-editor-row"><input type="color" id="individual-color" value="${currentColor}" oninput="applyIndividualColor('${colorKey}',this.value)"/></div></div>
    ${photoHTML}
    <div class="info-grid">
      <div class="info-tag"><div class="label">Type</div><div class="value">${typeEspace||layerLabel}</div></div>
      <div class="info-tag"><div class="label">Perméabilité</div><div class="value"><span class="badge ${badgeClass}">${perm||'—'}</span></div></div>
      <div class="info-tag"><div class="label">Revêtement</div><div class="value">${p['Revêtement']||'—'}</div></div>
      <div class="info-tag"><div class="label">Gestionnaire</div><div class="value">${p['Gestionnaires']||'—'}</div></div>
      ${nomRue?`<div class="info-tag full"><div class="label">Nom de rue</div><div class="value">${nomRue}</div></div>`:''}
      ${p['Superficie']?`<div class="info-tag"><div class="label">Superficie</div><div class="value">${p['Superficie']}</div></div>`:''}
      ${p['Souterrain']?`<div class="info-tag full"><div class="label">Souterrain</div><div class="value">${p['Souterrain']}</div></div>`:''}
    </div>
    <div class="section-title">Techniques de désimperméabilisation applicables <button class="info-btn" onclick="openInfoModal(SOURCES_HTML)" title="Sources">i</button></div>
    ${techHTML}`;
  panel.classList.add('open');
}

function applyIndividualColor(key,color){customColors[key]=color;if(geoLayer)geoLayer.eachLayer(l=>{if(l.feature&&l.feature.properties._layer+'_'+l.feature.properties.fid===key)l.setStyle({fillColor:color,color:color});});}
function resetIndividualColor(key){delete customColors[key];if(geoLayer)geoLayer.eachLayer(l=>{if(l.feature&&l.feature.properties._layer+'_'+l.feature.properties.fid===key)l.setStyle(featureStyle(l.feature));});if(currentFeatureProps)document.getElementById('individual-color').value=getFeatureColor(currentFeatureProps);}
window.applyIndividualColor=applyIndividualColor;window.resetIndividualColor=resetIndividualColor;

// ═══════════════════════════════════════════
// FICHE TECHNIQUE
// ═══════════════════════════════════════════
function openFiche(name){
  const tech=TECHNIQUES[name];
  if(!tech)return;
  const img=TECH_IMAGES[name]||'';
  document.getElementById('fiche-title').textContent=name;
  const espacesHTML=`<div class="espaces-grid">${Object.entries(tech.espaces).map(([esp,status])=>`<div class="espace-badge ${status}">${esp}</div>`).join('')}</div>`;
  document.getElementById('fiche-body').innerHTML=`
    <div id="fiche-layout">
      <div id="fiche-left">
        <div class="fiche-desc-box"><div class="fiche-desc-label">Description</div><div class="fiche-desc-text">${tech.desc}</div></div>
        <div class="section-title">Évaluations <button class="info-btn" onclick="openInfoModal(GRILLE_HTML)" title="Grille de lecture">i</button></div>
        <div class="pictos-grid">${renderPictos(tech)}</div>
        <div class="av-inconv">
          <div class="av-box"><h4>✔ Avantages</h4><ul>${tech.avantages.map(a=>`<li>${a}</li>`).join('')}</ul></div>
          <div class="inc-box"><h4>✘ Inconvénients</h4><ul>${tech.inconvenients.map(i=>`<li>${i}</li>`).join('')}</ul></div>
        </div>
      </div>
      <div id="fiche-right">
        ${img?`<div class="fiche-illus"><img src="${img}" alt="Illustration" class="${['L\'arbre de pluie','La chaussée à structure réservoir'].includes(name)?'full-view':''}" /></div>`:''}
        <div class="section-title">Espaces applicables</div>
        ${espacesHTML}
      </div>
    </div>`;
  document.getElementById('fiche-overlay').classList.add('open');
}
window.openFiche=openFiche;

// Init
updateLegende();
loadGeoJSON(GEODATA);