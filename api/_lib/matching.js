// Mismo algoritmo que js/matching.js (frontend), portado al servidor
// para no tener que mandar toda la tabla de mascotas al navegador.
const WEIGHTS = { species:20, breed:15, color:15, size:10, district:15, date:10, features:10, distance:5 };

function normalize(str){ return (str||'').toString().trim().toLowerCase(); }

function similarityText(a,b){
  a = normalize(a); b = normalize(b);
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.7;
  const wa = a.split(/\s+/), wb = b.split(/\s+/);
  const shared = wa.filter(w=>wb.includes(w)).length;
  return shared ? Math.min(0.6, shared/Math.max(wa.length,wb.length)) : 0;
}

function dateScore(d1, d2){
  if (!d1 || !d2) return 0;
  const diffDays = Math.abs(new Date(d1) - new Date(d2)) / (1000*60*60*24);
  if (diffDays <= 1) return 1;
  if (diffDays <= 3) return 0.8;
  if (diffDays <= 7) return 0.55;
  if (diffDays <= 15) return 0.3;
  return 0.1;
}

function distanceMeters(lat1, lng1, lat2, lng2){
  const R = 6371000;
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2-lat1), dLng = toRad(lng2-lng1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function distanceScore(pet1, pet2){
  if ([pet1.lat,pet1.lng,pet2.lat,pet2.lng].some(v=>v===undefined||v===null)) return 0;
  const meters = distanceMeters(pet1.lat,pet1.lng,pet2.lat,pet2.lng);
  if (meters <= 500) return 1;
  if (meters <= 1000) return 0.8;
  if (meters <= 3000) return 0.55;
  if (meters <= 5000) return 0.3;
  return 0.05;
}

function score(lost, found){
  let total = 0, maxTotal = 0;
  const detail = {};
  const add = (key, value) => { detail[key] = value; total += value*WEIGHTS[key]; maxTotal += WEIGHTS[key]; };
  add('species', normalize(lost.species)===normalize(found.species) ? 1 : 0);
  add('breed', similarityText(lost.breed, found.breed));
  add('color', similarityText(lost.color, found.color));
  add('size', normalize(lost.size)===normalize(found.size) ? 1 : (lost.size && found.size ? 0.3 : 0));
  add('district', normalize(lost.district)===normalize(found.district) ? 1 : 0);
  add('date', dateScore(lost.date, found.date));
  add('features', similarityText(lost.features, found.features));
  add('distance', distanceScore(lost, found));
  const pct = maxTotal ? Math.round((total/maxTotal)*100) : 0;
  return { percent: pct, detail };
}

function findMatches(pet, allPets, minPercent=30){
  const targetKind = pet.kind === 'perdida' ? 'encontrada' : (pet.kind === 'encontrada' ? 'perdida' : null);
  if (!targetKind) return [];
  return allPets
    .filter(p => p.kind === targetKind && p.id !== pet.id && normalize(p.species)===normalize(pet.species))
    .map(p => {
      const result = pet.kind === 'perdida' ? score(pet, p) : score(p, pet);
      return { pet: p, percent: result.percent, detail: result.detail };
    })
    .filter(m => m.percent >= minPercent)
    .sort((a,b)=>b.percent - a.percent);
}

module.exports = { score, findMatches, distanceMeters };
