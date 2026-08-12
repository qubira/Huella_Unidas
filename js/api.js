/* ===================================================
   HUELLAS UNIDAS — Cliente de la API (reemplaza el antiguo
   objeto DB basado en localStorage; todo va contra /api/* y Neon)
=================================================== */
const API = (() => {
  let _cachedUser = null;

  async function request(method, url, body){
    const opts = { method, credentials: 'same-origin', headers: {} };
    if (body !== undefined){
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    let res;
    try{
      res = await fetch(url, opts);
    }catch(e){
      return { error: 'No se pudo conectar con el servidor. Revisa tu conexión.' };
    }
    let json = {};
    try{ json = await res.json(); }catch(e){ /* respuesta vacía */ }
    if (!res.ok && !json.error) json.error = `Error ${res.status}`;
    return json;
  }

  // -------- Sesión --------
  // API.ready se resuelve cuando ya sabemos si hay sesión activa; las páginas
  // deben esperarlo antes del primer render que dependa de currentUser().
  const ready = (async () => {
    const json = await request('GET', '/api/auth/me');
    _cachedUser = json.user || null;
    return _cachedUser;
  })();

  function getSession(){ return _cachedUser; }

  async function login(email, password){
    const json = await request('POST', '/api/auth/login', { email, password });
    if (json.user) _cachedUser = json.user;
    return json;
  }
  async function registerUser({ name, email, phone, password }){
    const json = await request('POST', '/api/auth/register', { name, email, phone, password });
    if (json.user) _cachedUser = json.user;
    return json;
  }
  async function clearSession(){
    await request('POST', '/api/auth/logout');
    _cachedUser = null;
  }

  // -------- Mascotas --------
  async function getPets(){
    const json = await request('GET', '/api/pets');
    return json.pets || [];
  }
  async function getPetById(id){
    const json = await request('GET', `/api/pets/${id}`);
    return json.pet || null;
  }
  async function addPet(pet){
    const json = await request('POST', '/api/pets', pet);
    return json;
  }
  async function updatePet(id, patch){
    const json = await request('PATCH', `/api/pets/${id}`, patch);
    return json;
  }
  async function deletePet(id){
    return request('DELETE', `/api/pets/${id}`);
  }
  async function getMatches(petId, minPercent){
    const q = minPercent != null ? `?min=${minPercent}` : '';
    const json = await request('GET', `/api/pets/${petId}/matches${q}`);
    return json.matches || [];
  }
  async function confirmDelivery(petId){
    return request('POST', `/api/pets/${petId}/confirm`);
  }
  async function flagPet(petId, reason){
    return request('POST', `/api/pets/${petId}/flag`, { reason });
  }
  async function toggleFavorite(petId){
    const json = await request('POST', `/api/pets/${petId}/favorite`);
    return json.isFavorited;
  }

  // -------- Mensajería --------
  async function getConversations(petId){
    const q = petId ? `?petId=${petId}` : '';
    const json = await request('GET', `/api/messages/conversations${q}`);
    return json.conversations || [];
  }
  async function getThread(petId, otherId){
    const json = await request('GET', `/api/messages/thread?petId=${petId}&with=${otherId}`);
    return json.messages || [];
  }
  async function sendMessage({ petId, toId, text, shared }){
    const json = await request('POST', '/api/messages', { petId, toId, text, shared });
    return json;
  }

  // -------- Notificaciones --------
  async function getNotifs(){
    const json = await request('GET', '/api/notifs');
    return json.notifs || [];
  }
  async function markNotifsRead(){
    return request('POST', '/api/notifs/mark-read');
  }
  async function addNotif({ type, title, body, petId }){
    const json = await request('POST', '/api/notifs', { type, title, body, petId });
    return json.notif || null;
  }

  // -------- Admin --------
  async function getUsers(){
    const json = await request('GET', '/api/admin/users');
    return json.users || [];
  }
  async function blockUser(userId){
    return request('POST', `/api/admin/users/${userId}/block`);
  }
  async function unblockUser(userId){
    return request('POST', `/api/admin/users/${userId}/unblock`);
  }
  async function approvePet(petId){
    return request('POST', `/api/admin/pets/${petId}/approve`);
  }

  // -------- Subida de fotos (Cloudinary) --------
  async function uploadPhoto(file, onProgress){
    const sign = await request('POST', '/api/upload-sign');
    if (sign.error) throw new Error(sign.error);

    const form = new FormData();
    form.append('file', file);
    form.append('api_key', sign.apiKey);
    form.append('timestamp', sign.timestamp);
    form.append('signature', sign.signature);
    form.append('folder', sign.folder);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `https://api.cloudinary.com/v1_1/${sign.cloudName}/image/upload`);
      if (onProgress){
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
        });
      }
      xhr.onload = () => {
        try{
          const data = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300 && data.secure_url) resolve(data.secure_url);
          else reject(new Error(data.error?.message || 'No se pudo subir la imagen.'));
        }catch(e){ reject(new Error('No se pudo subir la imagen.')); }
      };
      xhr.onerror = () => reject(new Error('No se pudo subir la imagen.'));
      xhr.send(form);
    });
  }

  // -------- Distancia (Haversine, mismo cálculo que antes) --------
  function distanceMeters(lat1, lng1, lat2, lng2){
    const R = 6371000;
    const toRad = d => d * Math.PI / 180;
    const dLat = toRad(lat2-lat1), dLng = toRad(lng2-lng1);
    const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLng/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }

  return {
    ready, getSession, login, registerUser, clearSession,
    getPets, getPetById, addPet, updatePet, deletePet,
    getMatches, confirmDelivery, flagPet, toggleFavorite,
    getConversations, getThread, sendMessage,
    getNotifs, markNotifsRead, addNotif,
    getUsers, blockUser, unblockUser, approvePet,
    uploadPhoto, distanceMeters,
  };
})();
