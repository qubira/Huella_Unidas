/* ===================================================
   HUELLAS UNIDAS — Utilidades para formularios de reporte
   (subida de fotos a Cloudinary, selector de mapa, geolocalización)
=================================================== */

// ---------- Subida de fotos (Cloudinary, vía /api/upload-sign) ----------
function setupPhotoUpload(slotsContainerId, maxSlots=4){
  const container = document.getElementById(slotsContainerId);
  if (!container) return { getPhotos: ()=>[], isUploading: ()=>false };
  let photos = [];      // URLs ya subidas a Cloudinary
  let uploading = 0;    // subidas en curso

  function render(){
    container.innerHTML = '';
    photos.forEach((src, i)=>{
      const slot = document.createElement('div');
      slot.className = 'photo-slot';
      slot.innerHTML = `<img src="${src}"><span class="remove" data-i="${i}">✕</span>`;
      container.appendChild(slot);
    });
    if (photos.length + uploading < maxSlots){
      const addSlot = document.createElement('label');
      addSlot.className = 'photo-slot';
      addSlot.innerHTML = `+<input type="file" accept="image/*">`;
      addSlot.querySelector('input').addEventListener('change', async (e)=>{
        const file = e.target.files[0];
        if (!file) return;
        uploading++;
        const progressSlot = document.createElement('div');
        progressSlot.className = 'photo-slot photo-slot-uploading';
        progressSlot.innerHTML = `<span class="upload-progress">0%</span>`;
        container.insertBefore(progressSlot, addSlot);
        addSlot.remove();
        try{
          const url = await API.uploadPhoto(file, (pct)=>{
            const span = progressSlot.querySelector('.upload-progress');
            if (span) span.textContent = pct + '%';
          });
          photos.push(url);
        }catch(err){
          toast('No se pudo subir la foto', err.message || 'Intenta de nuevo.', 'error');
        }finally{
          uploading--;
          render();
        }
      });
      container.appendChild(addSlot);
    }
    container.querySelectorAll('.remove').forEach(btn=>{
      btn.addEventListener('click', (e)=>{
        e.preventDefault(); e.stopPropagation();
        photos.splice(Number(btn.dataset.i),1);
        render();
      });
    });
  }
  render();
  return {
    getPhotos: ()=>photos,
    setPhotos:(p)=>{photos=p; render();},
    isUploading: ()=>uploading > 0,
  };
}

// ---------- Selector de ubicación en mapa (Leaflet) ----------
function setupMapPicker(mapElId, opts={}){
  const defaultCenter = opts.center || [-12.0464, -77.0428]; // Lima, Perú
  const map = L.map(mapElId).setView(defaultCenter, 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors', maxZoom: 19
  }).addTo(map);

  let marker = null;
  const onPick = opts.onPick || function(){};

  function setMarker(lat, lng){
    if (marker) marker.setLatLng([lat,lng]);
    else marker = L.marker([lat,lng], {draggable:true}).addTo(map);
    marker.on('dragend', ()=>{ const p = marker.getLatLng(); onPick(p.lat,p.lng); });
    onPick(lat,lng);
  }

  map.on('click', (e)=> setMarker(e.latlng.lat, e.latlng.lng));

  // Botón "usar mi ubicación actual"
  if (opts.geoButtonId){
    document.getElementById(opts.geoButtonId).addEventListener('click', ()=>{
      if (!navigator.geolocation){ toast('No disponible','Tu navegador no soporta geolocalización.','error'); return; }
      navigator.geolocation.getCurrentPosition(
        (pos)=>{
          map.setView([pos.coords.latitude, pos.coords.longitude], 15);
          setMarker(pos.coords.latitude, pos.coords.longitude);
          toast('Ubicación detectada', 'Hemos marcado tu ubicación actual en el mapa.', 'success', 2500);
        },
        ()=> toast('No se pudo obtener ubicación', 'Por favor selecciona el punto manualmente en el mapa.', 'error')
      );
    });
  }

  return {
    map,
    setMarker,
    getLatLng(){ return marker ? marker.getLatLng() : null; }
  };
}

// Distritos de referencia (Lima) para selects
const DISTRITOS_LIMA = [
  'Miraflores','San Isidro','Surco','Barranco','La Molina','San Borja','Jesús María',
  'Lince','Magdalena del Mar','Pueblo Libre','San Miguel','Surquillo','Chorrillos',
  'Comas','Los Olivos','San Juan de Lurigancho','Ate','Villa El Salvador','Callao','Otro'
];

function fillDistritoSelect(selectEl){
  selectEl.innerHTML = '<option value="">Selecciona un distrito</option>' +
    DISTRITOS_LIMA.map(d=>`<option value="${d}">${d}</option>`).join('');
}
