/* ===================================================
   HUELLAS UNIDAS — Listado y búsqueda de mascotas
=================================================== */
const STATUS_LABELS = {
  perdida:'Perdida', verificacion:'En verificación', encontrada:'Encontrada',
  reunida:'Reunida', adopcion:'En adopción', adoptada:'Adoptada'
};

function favBtnHtml(pet){
  return `<button type="button" class="fav-btn" data-fav="${pet.id}" title="Guardar en favoritos">${pet.isFavorited?'❤️':'🤍'}</button>`;
}

function bindFavButtons(host){
  host.querySelectorAll('[data-fav]').forEach(btn=>{
    btn.addEventListener('click', async (e)=>{
      e.preventDefault(); e.stopPropagation();
      if (!requireAuth('guardar favoritos')) return;
      btn.disabled = true;
      const isFav = await API.toggleFavorite(btn.dataset.fav);
      btn.disabled = false;
      btn.textContent = isFav ? '❤️' : '🤍';
    });
  });
}

function petCard(pet, opts={}){
  const photo = pet.photos && pet.photos[0];
  const emoji = pet.species==='Gato' ? '🐱' : pet.species==='Perro' ? '🐶' : pet.species==='Ave' ? '🐦' : '🐾';
  const matchBadge = opts.matchPercent != null ? `<span class="match-badge">✨ ${opts.matchPercent}% coincidencia</span>` : '';
  return `
    <div class="pet-card">
      <div class="pet-photo">
        ${photo ? `<img src="${photo}" alt="${pet.name}">` : emoji}
        <span class="status-badge status-${pet.status}">${STATUS_LABELS[pet.status]||pet.status}</span>
        ${pet.flagged ? `<span class="status-flagged">🔍 En observación</span>` : ''}
        ${matchBadge}
        ${favBtnHtml(pet)}
      </div>
      <div class="pet-body">
        <h3>${pet.name}</h3>
        <div class="pet-meta">
          <span>${pet.species}</span>
          ${pet.breed?`<span>${pet.breed}</span>`:''}
          ${pet.size?`<span>${pet.size}</span>`:''}
          ${pet.color?`<span>${pet.color}</span>`:''}
        </div>
        <div class="pet-loc">📍 ${pet.district || 'Sin distrito'} ${pet.date?`· ${formatDate(pet.date)}`:''}</div>
      </div>
      <div class="pet-footer">
        <span class="muted" style="font-size:.8rem;">${pet.kind==='perdida'?'Perdida por su familia':pet.kind==='encontrada'?'Reportada por un vecino':'Disponible para adopción'}</span>
        <a href="detalle.html?id=${pet.id}" class="btn btn-primary btn-sm">Ver más</a>
      </div>
    </div>`;
}

function formatDate(d){
  if (!d) return '';
  const date = new Date(d+'T00:00:00');
  return date.toLocaleDateString('es-PE', { day:'2-digit', month:'short', year:'numeric' });
}

async function initListingPage(){
  await API.ready;
  fillDistritoSelect(document.getElementById('fDistrict'));
  const params = new URLSearchParams(location.search);
  const onlyMine = params.get('mine') === '1';
  const onlyFav = params.get('fav') === '1';

  const grid = document.getElementById('petsGrid');
  grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><p>Cargando mascotas…</p></div>`;
  const allPets = await API.getPets();

  function getFiltered(){
    let pets = allPets.filter(p=>p.kind!=='adopcion');
    if (onlyMine || onlyFav){
      const user = currentUser();
      if (!user){ return []; }
      pets = onlyMine ? pets.filter(p=>p.ownerId===user.id) : pets.filter(p=>p.isFavorited);
    }
    const q = document.getElementById('searchInput').value.trim().toLowerCase();
    const species = document.getElementById('fSpecies').value;
    const status = document.getElementById('fStatus').value;
    const district = document.getElementById('fDistrict').value;
    const showResolved = document.getElementById('fShowResolved').checked;
    return pets.filter(p=>
      (!species || p.species===species) &&
      (status ? p.status===status : (showResolved || p.status!=='reunida')) &&
      (!district || p.district===district) &&
      (!q || [p.name,p.breed,p.color,p.features,p.description].join(' ').toLowerCase().includes(q))
    ).sort((a,b)=>b.createdAt-a.createdAt);
  }

  function render(){
    const pets = getFiltered();
    document.getElementById('resultCount').textContent = pets.length;
    if ((onlyMine || onlyFav) && !currentUser()){
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><div class="ico">🔒</div><p>Inicia sesión para ver ${onlyFav?'tus favoritos':'tus reportes'}.</p></div>`;
      return;
    }
    if (!pets.length){
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><div class="ico">🐾</div><p>No encontramos mascotas con estos filtros. Intenta ampliar la búsqueda.</p></div>`;
      return;
    }
    grid.innerHTML = pets.map(p=>petCard(p)).join('');
    bindFavButtons(grid);
  }

  ['searchInput','fSpecies','fStatus','fDistrict'].forEach(id=>{
    document.getElementById(id).addEventListener('input', render);
    document.getElementById(id).addEventListener('change', render);
  });
  document.getElementById('fShowResolved').addEventListener('change', render);
  if (onlyMine){
    document.getElementById('pageTitleText').textContent = 'Mis reportes';
    document.getElementById('pageSubtitleText').textContent = 'Reportes que has publicado en Huellas Unidas.';
  } else if (onlyFav){
    document.getElementById('pageTitleText').textContent = '❤️ Mis favoritos';
    document.getElementById('pageSubtitleText').textContent = 'Mascotas que has guardado para seguir su caso.';
  }
  render();
}
