/* ===================================================
   HUELLAS UNIDAS — Lógica del mapa interactivo
=================================================== */
let bigMap, markersLayer, heatLayer, zoneLayer;
const ZONE_RADII = [
  { name:'Zona roja', meters:500, color:'#E25563' },
  { name:'Zona amarilla', meters:1000, color:'#F2D43B' },
  { name:'Zona naranja', meters:3000, color:'#F2A93B' },
  { name:'Zona verde', meters:5000, color:'#3BA776' },
];

function initBigMap(){
  bigMap = L.map('bigmap').setView([-12.0464,-77.0428], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution:'&copy; OpenStreetMap contributors', maxZoom:19
  }).addTo(bigMap);
  markersLayer = L.layerGroup().addTo(bigMap);
  zoneLayer = L.layerGroup().addTo(bigMap);
}

function iconForPet(pet){
  const emoji = pet.species==='Gato' ? '🐱' : pet.species==='Perro' ? '🐶' : pet.species==='Ave' ? '🐦' : '🐾';
  const color = pet.status==='perdida' ? '#E25563' : pet.status==='encontrada' || pet.status==='verificacion' ? '#2D9596' : '#3BA776';
  return L.divIcon({
    className:'', html:`<div style="background:${color};width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.3);">${emoji}</div>`,
    iconSize:[34,34], iconAnchor:[17,34]
  });
}

function drawZones(pet){
  zoneLayer.clearLayers();
  if (!pet || !pet.lat) return;
  ZONE_RADII.slice().reverse().forEach(z=>{
    L.circle([pet.lat,pet.lng], { radius:z.meters, color:z.color, weight:2, fillColor:z.color, fillOpacity:.08 })
      .bindTooltip(`${z.name} · ${z.meters>=1000? (z.meters/1000)+' km' : z.meters+' m'}`)
      .addTo(zoneLayer);
  });
  bigMap.setView([pet.lat,pet.lng], 14);
}

function renderMarkers(pets){
  markersLayer.clearLayers();
  pets.forEach(pet=>{
    if (!pet.lat || !pet.lng) return;
    const m = L.marker([pet.lat,pet.lng], { icon: iconForPet(pet) });
    m.bindPopup(`
      <strong>${pet.name}</strong><br>
      ${pet.species} · ${pet.breed||'—'}<br>
      <span style="text-transform:capitalize;">${pet.status}</span> · ${pet.district}<br>
      <a href="detalle.html?id=${pet.id}" target="_self">Ver ficha completa →</a>
    `);
    m.on('click', ()=> drawZones(pet));
    markersLayer.addLayer(m);
  });
}

function toggleHeatmap(pets, show){
  if (heatLayer){ bigMap.removeLayer(heatLayer); heatLayer=null; }
  if (!show) return;
  const points = pets.filter(p=>p.lat&&p.lng).map(p=>[p.lat,p.lng, 0.6]);
  heatLayer = L.heatLayer(points, { radius:35, blur:25, maxZoom:16 }).addTo(bigMap);
}
