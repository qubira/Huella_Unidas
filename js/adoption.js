/* ===================================================
   HUELLAS UNIDAS — Módulo de adopción
=================================================== */
function adoptionCard(pet){
  const photo = pet.photos && pet.photos[0];
  const emoji = pet.species==='Gato' ? '🐱' : pet.species==='Perro' ? '🐶' : '🐾';
  return `
    <div class="pet-card">
      <div class="pet-photo">
        ${photo ? `<img src="${photo}" alt="${pet.name}">` : emoji}
        <span class="status-badge status-${pet.status}">${STATUS_LABELS[pet.status]||pet.status}</span>
        ${pet.flagged ? `<span class="status-flagged">🔍 En observación</span>` : ''}
        ${favBtnHtml(pet)}
      </div>
      <div class="pet-body">
        <h3>${pet.name}</h3>
        <div class="pet-meta">
          <span>${pet.species}</span>
          ${pet.breed?`<span>${pet.breed}</span>`:''}
          <span>${pet.sex}</span>
          <span>${pet.age||''}</span>
        </div>
        <div class="pet-loc">📍 ${pet.district || 'Sin distrito'}</div>
      </div>
      <div class="pet-footer">
        <span class="muted" style="font-size:.8rem;">${pet.vaccines? '💉 Vacunado · ':''}${pet.sterilized? '✂️ Esterilizado':''}</span>
        <a href="detalle.html?id=${pet.id}" class="btn btn-primary btn-sm">Conocer a ${pet.name}</a>
      </div>
    </div>`;
}

async function initAdoptionPage(){
  await API.ready;
  const grid = document.getElementById('adoptGrid');
  grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><p>Cargando mascotas…</p></div>`;
  const allPets = await API.getPets();

  function getFiltered(){
    let pets = allPets.filter(p=>p.kind==='adopcion');
    const species = document.getElementById('aSpecies').value;
    const sex = document.getElementById('aSex').value;
    const size = document.getElementById('aSize').value;
    const showAdopted = document.getElementById('aShowAdopted').checked;
    return pets.filter(p=>
      (!species || p.species===species) &&
      (!sex || p.sex===sex) &&
      (!size || p.size===size) &&
      (showAdopted || p.status!=='adoptada')
    ).sort((a,b)=>b.createdAt-a.createdAt);
  }
  function render(){
    const pets = getFiltered();
    document.getElementById('adoptCount').textContent = pets.length;
    if (!pets.length){
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><div class="ico">🏠</div><p>No hay mascotas en adopción con estos filtros.</p></div>`;
      return;
    }
    grid.innerHTML = pets.map(adoptionCard).join('');
    bindFavButtons(grid);
  }
  ['aSpecies','aSex','aSize','aShowAdopted'].forEach(id=> document.getElementById(id).addEventListener('change', render));
  render();
}

function setupAdoptionForm(){
  const form = document.getElementById('adoptForm');
  const photoCtl = setupPhotoUpload('adoptPhotoSlots', 4);
  fillDistritoSelect(document.getElementById('adDistrict'));

  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    if (!requireAuth('publicar una mascota en adopción')) return;
    const species = document.getElementById('adSpecies').value;
    if (!species){ toast('Falta información', 'Selecciona la especie.', 'error'); return; }
    if (photoCtl.isUploading()){ toast('Espera un momento', 'Todavía se están subiendo las fotos.', 'info'); return; }
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;
    const petInput = {
      kind:'adopcion', status:'adopcion',
      name: document.getElementById('adName').value || 'Sin nombre',
      species, breed: document.getElementById('adBreed').value,
      sex: document.querySelector('input[name=adSex]:checked').value,
      age: document.getElementById('adAge').value,
      size: document.getElementById('adSize').value,
      color:'', features:'', microchip:false, collar:false,
      health: document.getElementById('adHealth').value,
      vaccines: document.getElementById('adVaccines').checked,
      sterilized: document.getElementById('adSterilized').checked,
      story: document.getElementById('adStory').value,
      requirements: document.getElementById('adRequirements').value,
      photos: photoCtl.getPhotos(),
      date: new Date().toISOString().slice(0,10), time:'',
      address: document.getElementById('adAddress').value,
      district: document.getElementById('adDistrict').value,
      province:'Lima', department:'Lima', lat:null, lng:null,
      description:'',
    };
    const res = await API.addPet(petInput);
    if (submitBtn) submitBtn.disabled = false;
    if (res.error){ toast('No se pudo publicar', res.error, 'error'); return; }
    toast('¡Publicado!', `${res.pet.name} ya está disponible para adopción.`, 'success');
    closeModal('adoptModal');
    setTimeout(()=>location.href=`detalle.html?id=${res.pet.id}`, 1000);
  });
}

function openModal(id){ document.getElementById(id).classList.add('open'); }
function closeModal(id){ document.getElementById(id).classList.remove('open'); }
