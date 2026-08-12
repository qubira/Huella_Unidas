/* ===================================================
   HUELLAS UNIDAS — Ficha de detalle + chat privado
=================================================== */
async function initDetailPage(){
  await API.ready;
  const params = new URLSearchParams(location.search);
  const petId = params.get('id');
  const pet = await API.getPetById(petId);
  const host = document.getElementById('detailContent');

  if (!pet){
    host.innerHTML = `<div class="empty-state"><div class="ico">🐾</div><p>No encontramos esta publicación. Puede haber sido eliminada.</p>
      <a href="mascotas.html" class="btn btn-primary" style="margin-top:10px;">Volver al listado</a></div>`;
    return;
  }

  document.title = `${pet.name} — Huellas Unidas`;
  renderDetail(pet);
}

async function renderDetail(pet){
  const host = document.getElementById('detailContent');
  const user = currentUser();
  const owner = pet.owner || null;
  const isOwner = user && user.id === pet.ownerId;
  const isResolved = pet.status==='reunida' || pet.status==='adoptada';
  const emoji = pet.species==='Gato' ? '🐱' : pet.species==='Perro' ? '🐶' : '🐾';
  const photos = pet.photos && pet.photos.length ? pet.photos : [];

  // Conversaciones del usuario actual para esta mascota (ya viene con mascota+otro usuario incluidos).
  // Para el dueño: una entrada por cada persona que le escribió. Para otros: existe si ya inició un hilo.
  const conversations = user ? await API.getConversations(pet.id) : [];
  let isChatParticipant = conversations.length > 0;

  const infoRows = [
    ['Especie', pet.species], ['Raza', pet.breed], ['Sexo', pet.sex], ['Edad', pet.age],
    ['Tamaño', pet.size], ['Color', pet.color], ['Características', pet.features],
    ['Microchip', pet.microchip? 'Sí':'No'], ['Collar', pet.collar? 'Sí':'No'],
    ['Estado de salud', pet.health], ['Recompensa', pet.reward],
    ['Fecha', formatDate(pet.date)], ['Hora', pet.time], ['Dirección', pet.address],
    ['Distrito', pet.district], ['Provincia', pet.province], ['Departamento', pet.department],
    ['Vacunas completas', pet.kind==='adopcion' ? (pet.vaccines? 'Sí':'No') : null],
    ['Esterilizado/a', pet.kind==='adopcion' ? (pet.sterilized? 'Sí':'No') : null],
    ['Requisitos de adopción', pet.requirements],
  ].filter(([,v])=>v);

  let banner = '';
  if (isResolved){
    banner = `<div class="sighting-banner" style="background:#E8F7EF;border-color:var(--color-success);">
      <div><strong>✅ ${pet.kind==='adopcion' ? `${pet.name} ya fue adoptado/a` : `${pet.name} fue reunido/a con su familia`}</strong>
      <br><span class="muted" style="font-size:.85rem;">Confirmado por ambas partes. ¡Gracias por ser parte de esta historia!</span></div>
    </div>`;
  } else if (pet.kind!=='adopcion'){
    banner = `<div class="sighting-banner">
      <div><strong>¿Crees haber visto a ${pet.name}?</strong><br><span class="muted" style="font-size:.85rem;">Contacta de forma segura sin necesidad de compartir tu número.</span></div>
      <button class="btn btn-primary btn-sm" id="sightingBtn">👀 Creo haber visto esta mascota</button>
    </div>`;
  } else {
    banner = `<div class="sighting-banner">
      <div><strong>¿Te interesa adoptar a ${pet.name}?</strong><br><span class="muted" style="font-size:.85rem;">Escribe al refugio para solicitar la adopción o programar una visita.</span></div>
      <button class="btn btn-primary btn-sm" id="adoptBtn">🏠 Solicitar adopción</button>
    </div>`;
  }

  host.innerHTML = `
    ${banner}
    ${pet.flagged && isOwner ? `<div class="sighting-banner" style="background:#FDEDEE;border-color:var(--color-danger);">
      <div><strong>🚩 Esta publicación fue reportada</strong><br><span class="muted" style="font-size:.85rem;">Un administrador la está revisando. Si crees que es un error, contáctanos.</span></div>
    </div>` : ''}

    <div class="flex-between" style="margin-bottom:16px;">
      <span class="status-badge status-${pet.status}" style="position:static;display:inline-block;">${STATUS_LABELS[pet.status]||pet.status}</span>
      <div style="display:flex;gap:8px;flex-wrap:wrap;position:relative;">
        <button class="btn btn-ghost btn-sm" id="favDetailBtn">${pet.isFavorited ? '❤️ Guardado' : '🤍 Guardar'}</button>
        <button class="btn btn-ghost btn-sm" id="shareBtn">🔗 Compartir</button>
        ${!isOwner ? `<button class="btn btn-ghost btn-sm" id="flagBtn" style="color:var(--color-danger);">🚩 Reportar falso</button>` : ''}
        ${isOwner ? `<div id="ownerActions" style="display:flex;gap:8px;"></div>` : ''}
      </div>
    </div>

    <div class="detail-layout">
      <div>
        <div class="gallery-main" id="galleryMain">${photos[0] ? `<img src="${photos[0]}">` : emoji}</div>
        ${photos.length>1 ? `<div class="gallery-thumbs">${photos.map((p,i)=>`<img src="${p}" class="${i===0?'active':''}" data-src="${p}">`).join('')}</div>` : ''}

        <div class="divider"></div>
        <h2 style="margin-bottom:4px;">${pet.name}</h2>
        <p class="muted">${pet.kind==='adopcion' ? (pet.story || pet.description || '') : (pet.description || 'Sin descripción adicional.')}</p>

        <table class="info-table">
          ${infoRows.map(([k,v])=>`<tr><td>${k}</td><td>${v}</td></tr>`).join('')}
        </table>

        ${pet.kind!=='adopcion' && pet.lat ? `<div class="divider"></div><h3>Ubicación y zonas de búsqueda</h3><div id="miniMap" style="height:280px;border-radius:16px;"></div>` : ''}

        ${pet.kind!=='adopcion' ? `<div class="divider"></div><h3>Posibles coincidencias</h3><div id="matchesHost"><p class="muted" style="font-size:.88rem;">Buscando coincidencias…</p></div>` : ''}
      </div>

      <div>
        ${!isResolved ? `<div id="confirmPanel" style="margin-bottom:16px;"></div>` : ''}
        <div class="chat-box" id="privateChatBox">
          <div class="chat-head">
            <div style="display:flex;align-items:center;gap:10px;">
              <button class="chat-back-btn" id="chatBackBtn" style="display:none;" title="Volver">←</button>
              <span class="chat-head-title">💬 Chat privado</span>
            </div>
            <button class="btn btn-ghost btn-sm" id="shareContactBtn">📞 Compartir contacto</button>
          </div>
          <div class="chat-messages" id="chatMessages"></div>
          <div class="chat-input-row">
            <input type="text" id="chatInput" placeholder="Escribe un mensaje seguro...">
            <button class="btn btn-primary btn-sm" id="chatSendBtn">Enviar</button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Galería
  host.querySelectorAll('.gallery-thumbs img').forEach(img=>{
    img.addEventListener('click', ()=>{
      host.querySelectorAll('.gallery-thumbs img').forEach(i=>i.classList.remove('active'));
      img.classList.add('active');
      document.getElementById('galleryMain').innerHTML = `<img src="${img.dataset.src}">`;
    });
  });

  // Favorito
  document.getElementById('favDetailBtn').addEventListener('click', async (e)=>{
    if (!requireAuth('guardar favoritos')) return;
    e.target.disabled = true;
    const isFav = await API.toggleFavorite(pet.id);
    e.target.disabled = false;
    pet.isFavorited = isFav;
    e.target.textContent = isFav ? '❤️ Guardado' : '🤍 Guardar';
  });

  // Compartir
  document.getElementById('shareBtn').addEventListener('click', (e)=>{
    e.stopPropagation();
    toggleSharePanel(pet, e.target);
  });

  // Reportar como falso
  const flagBtn = document.getElementById('flagBtn');
  if (flagBtn){
    flagBtn.addEventListener('click', ()=>{
      if (!requireAuth('reportar una publicación')) return;
      openFlagModal(pet);
    });
  }

  // Acciones del propietario (cambiar estado / editar / eliminar)
  if (isOwner){
    const actionsHost = document.getElementById('ownerActions');
    let stateBtnHtml = '';
    if (pet.kind==='perdida' && pet.status!=='reunida'){
      stateBtnHtml = `<button class="btn btn-secondary btn-sm" id="markReunitedBtn">✅ Marcar como reunida</button>`;
    } else if (pet.kind==='encontrada' && pet.status==='verificacion'){
      stateBtnHtml = `<button class="btn btn-secondary btn-sm" id="markFoundBtn">✅ Confirmar dueño contactado</button>`;
    }
    actionsHost.innerHTML = `
      ${stateBtnHtml}
      <button class="btn btn-ghost btn-sm" id="editPetBtn">✏️ Editar</button>
      <button class="btn btn-ghost btn-sm" id="deletePetBtn" style="color:var(--color-danger);">🗑️ Eliminar</button>
    `;
    const markReunitedBtn = document.getElementById('markReunitedBtn');
    if (markReunitedBtn){
      markReunitedBtn.addEventListener('click', async ()=>{
        markReunitedBtn.disabled = true;
        const res = await API.updatePet(pet.id, { status:'reunida' });
        if (res.error){ toast('No se pudo actualizar', res.error, 'error'); markReunitedBtn.disabled = false; return; }
        toast('¡Felicidades!', `${pet.name} ha sido marcado como reunido con su familia.`, 'success');
        renderDetail(res.pet);
      });
    }
    const markFoundBtn = document.getElementById('markFoundBtn');
    if (markFoundBtn){
      markFoundBtn.addEventListener('click', async ()=>{
        markFoundBtn.disabled = true;
        const res = await API.updatePet(pet.id, { status:'encontrada' });
        if (res.error){ toast('No se pudo actualizar', res.error, 'error'); markFoundBtn.disabled = false; return; }
        toast('Estado actualizado', 'El reporte ahora aparece como Encontrada.', 'success');
        renderDetail(res.pet);
      });
    }
    document.getElementById('editPetBtn').addEventListener('click', ()=> openEditModal(pet));
    document.getElementById('deletePetBtn').addEventListener('click', async ()=>{
      if (!confirm(`¿Seguro que deseas eliminar la publicación de ${pet.name}? Esta acción no se puede deshacer.`)) return;
      const res = await API.deletePet(pet.id);
      if (res.error){ toast('No se pudo eliminar', res.error, 'error'); return; }
      toast('Publicación eliminada', '', 'info');
      setTimeout(()=> location.href='mascotas.html', 700);
    });
  }

  // Mini mapa con zonas
  if (pet.kind!=='adopcion' && pet.lat && window.L){
    const mini = L.map('miniMap').setView([pet.lat,pet.lng], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution:'&copy; OpenStreetMap', maxZoom:19 }).addTo(mini);
    [[5000,'#3BA776'],[3000,'#F2A93B'],[1000,'#F2D43B'],[500,'#E25563']].forEach(([r,c])=>{
      L.circle([pet.lat,pet.lng], { radius:r, color:c, weight:2, fillOpacity:.07, fillColor:c }).addTo(mini);
    });
    L.marker([pet.lat,pet.lng]).addTo(mini);
  }

  // Coincidencias (calculadas en el servidor)
  if (pet.kind!=='adopcion'){
    const matchesHost = document.getElementById('matchesHost');
    const matches = await API.getMatches(pet.id, 30);
    if (!matches.length){
      matchesHost.innerHTML = `<p class="muted" style="font-size:.88rem;">Aún no hay coincidencias sugeridas para este reporte.</p>`;
    } else {
      matchesHost.innerHTML = `<div class="pets-grid match-list" style="grid-template-columns:1fr;">${
        matches.slice(0,3).map(m=>petCard(m.pet, { matchPercent:m.percent })).join('')
      }</div>`;
      bindFavButtons(matchesHost);
    }
  }

  // ---------------- Panel de confirmación mutua de entrega/adopción ----------------
  function renderConfirmPanel(){
    const panel = document.getElementById('confirmPanel');
    if (!panel) return;
    if (!user || !(isOwner || isChatParticipant)){
      panel.innerHTML = '';
      return;
    }
    const confirmedBy = pet.confirmedBy || [];
    const youConfirmed = confirmedBy.includes(user.id);
    const counterpartConfirmed = isOwner ? confirmedBy.some(id=>id!==pet.ownerId) : confirmedBy.includes(pet.ownerId);
    const label = pet.kind==='adopcion' ? 'la adopción' : 'el reencuentro';
    panel.innerHTML = `
      <div class="form-wrap" style="padding:18px;">
        <strong style="display:block;margin-bottom:10px;font-size:.92rem;">Confirmación de ${label}</strong>
        <div style="display:flex;justify-content:space-between;font-size:.85rem;margin-bottom:6px;">
          <span>Tú</span><span>${youConfirmed ? '✅ Confirmado' : '⏳ Pendiente'}</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:.85rem;margin-bottom:14px;">
          <span>Otra parte</span><span>${counterpartConfirmed ? '✅ Confirmado' : '⏳ Pendiente'}</span>
        </div>
        <button class="btn btn-secondary btn-sm btn-block" id="confirmDeliveryBtn" ${youConfirmed?'disabled':''}>
          ${youConfirmed ? 'Ya confirmaste' : `✅ Confirmar ${label}`}
        </button>
        <p class="hint" style="margin-top:8px;">Cuando ambas partes confirmen, esta publicación se moverá automáticamente al historial.</p>
      </div>`;
    const btn = document.getElementById('confirmDeliveryBtn');
    if (btn && !youConfirmed){
      btn.addEventListener('click', async ()=>{
        btn.disabled = true;
        const result = await API.confirmDelivery(pet.id);
        if (result.error){ toast('No se pudo confirmar', result.error, 'error'); btn.disabled = false; return; }
        if (result.finalized){
          toast('¡Confirmado por ambas partes!', `${pet.name} se movió al historial. Gracias por usar Huellas Unidas.`, 'success', 6000);
        } else {
          toast('Confirmación registrada', 'Quedamos a la espera de que la otra parte también confirme.', 'info');
        }
        renderDetail(result.pet);
      });
    }
  }
  renderConfirmPanel();

  // ---------------- Chat Privado ----------------
  function renderChatSection(){
    const chatMessages = document.getElementById('chatMessages');
    const chatInputRow = document.querySelector('.chat-input-row');

    if (!user) {
      chatMessages.innerHTML = `
        <div class="chat-login-wall">
          <div style="font-size:2rem;">🔒</div>
          <p><strong>Inicia sesión para chatear</strong></p>
          <p style="font-size:.85rem;color:var(--color-text-soft);">Necesitas una cuenta para contactar al publicador de forma segura.</p>
          <button class="btn btn-primary btn-sm" onclick="openAuthModal('login')">Iniciar sesión</button>
        </div>`;
      if (chatInputRow) chatInputRow.style.display = 'none';
      return;
    }

    if (chatInputRow) chatInputRow.style.display = 'flex';

    if (isOwner) {
      renderOwnerInbox();
    } else {
      renderUserThread();
    }
  }

  let activeThreadUserId = null;

  function renderOwnerInbox() {
    const chatMessages = document.getElementById('chatMessages');

    if (!conversations.length) {
      chatMessages.innerHTML = `<p class="muted" style="font-size:.85rem;text-align:center;margin-top:30px;">Nadie te ha escrito sobre esta mascota aún.</p>`;
      document.querySelector('.chat-input-row').style.display = 'none';
      return;
    }

    if (!activeThreadUserId) {
      document.querySelector('.chat-input-row').style.display = 'none';
      chatMessages.innerHTML = `
        <div style="padding:8px 0;">
          <p style="font-size:.8rem;color:var(--color-text-soft);padding:0 16px;margin-bottom:8px;text-transform:uppercase;letter-spacing:.05em;font-weight:700;">Conversaciones</p>
          ${conversations.map(c => {
            const initials = c.otherUserName.split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase();
            const time = c.lastMessage ? new Date(c.lastMessage.createdAt).toLocaleDateString('es-PE',{day:'2-digit',month:'short'}) : '';
            const preview = c.lastMessage ? c.lastMessage.text.substring(0,50)+(c.lastMessage.text.length>50?'…':'') : '';
            return `<div class="conv-item" data-uid="${c.otherUserId}">
              <div class="conv-avatar">${initials}</div>
              <div class="conv-info">
                <div class="conv-name">${c.otherUserName}</div>
                <div class="conv-preview">${preview}</div>
              </div>
              <div class="conv-time">${time}</div>
            </div>`;
          }).join('')}
        </div>`;
      chatMessages.querySelectorAll('.conv-item').forEach(el => {
        el.addEventListener('click', () => {
          activeThreadUserId = el.dataset.uid;
          document.querySelector('.chat-input-row').style.display = 'flex';
          const backBtn = document.getElementById('chatBackBtn');
          if (backBtn) backBtn.style.display = 'flex';
          renderOwnerThread(activeThreadUserId);
        });
      });
    } else {
      renderOwnerThread(activeThreadUserId);
    }
  }

  async function renderOwnerThread(otherUserId) {
    const msgs = await API.getThread(pet.id, otherUserId);
    renderMessages(msgs);
    const conv = conversations.find(c => c.otherUserId === otherUserId);
    const head = document.querySelector('.chat-head-title');
    if (head && conv) head.textContent = `💬 Chat con ${conv.otherUserName.split(' ')[0]}`;
  }

  async function renderUserThread() {
    const msgs = await API.getThread(pet.id, pet.ownerId);
    const head = document.querySelector('.chat-head-title');
    if (head && owner) head.textContent = `💬 Chat con ${owner.name.split(' ')[0]}`;
    renderMessages(msgs);
  }

  function renderMessages(msgs) {
    const box = document.getElementById('chatMessages');
    if (!msgs.length) {
      box.innerHTML = `<p class="muted" style="font-size:.85rem;text-align:center;margin-top:30px;">Aún no hay mensajes. ¡Sé el primero en escribir!</p>`;
    } else {
      box.innerHTML = msgs.map(m => {
        const mine = user && m.fromId === user.id;
        const time = new Date(m.createdAt).toLocaleString('es-PE',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
        return `<div class="chat-msg ${mine ? 'me' : 'them'}">
          ${!mine && m.fromName ? `<div class="chat-sender">${m.fromName.split(' ')[0]}</div>` : ''}
          <div class="chat-bubble">${m.text}</div>
          <span class="time">${time}</span>
        </div>`;
      }).join('');
      box.scrollTop = box.scrollHeight;
    }
  }

  async function sendChatMsg() {
    if (!requireAuth('chatear con el publicador')) return;
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    if (!text) return;
    const toId = isOwner ? (activeThreadUserId || null) : pet.ownerId;
    if (!toId && isOwner) { toast('Selecciona una conversación', 'Haz clic en un contacto para responder.', 'info'); return; }
    const res = await API.sendMessage({ petId: pet.id, toId, text, shared: false });
    if (res.error){ toast('No se pudo enviar', res.error, 'error'); return; }
    isChatParticipant = true;
    input.value = '';
    if (isOwner) await renderOwnerThread(activeThreadUserId);
    else await renderUserThread();
    renderConfirmPanel();
  }

  renderChatSection();

  document.getElementById('chatSendBtn').addEventListener('click', sendChatMsg);
  document.getElementById('chatInput').addEventListener('keydown', e => { if (e.key === 'Enter') sendChatMsg(); });

  const chatBackBtn = document.getElementById('chatBackBtn');
  if (chatBackBtn) {
    chatBackBtn.addEventListener('click', () => {
      activeThreadUserId = null;
      const head = document.querySelector('.chat-head-title');
      if (head) head.textContent = '💬 Chat con interesados';
      renderOwnerInbox();
    });
  }

  document.getElementById('shareContactBtn').addEventListener('click', async () => {
    if (!requireAuth('compartir tu contacto')) return;
    const toId = isOwner ? activeThreadUserId : pet.ownerId;
    if (!toId) { toast('Selecciona una conversación primero', '', 'info'); return; }
    const res = await API.sendMessage({ petId: pet.id, toId, text: `📞 Compartí mi contacto: ${user.phone}`, shared: true });
    if (res.error){ toast('No se pudo compartir', res.error, 'error'); return; }
    toast('Contacto compartido', `Tu teléfono se envió al otro usuario.`, 'success');
    if (isOwner) await renderOwnerThread(activeThreadUserId);
    else await renderUserThread();
  });

  const sightingBtn = document.getElementById('sightingBtn');
  if (sightingBtn) {
    sightingBtn.addEventListener('click', () => {
      if (!requireAuth('reportar un avistamiento')) return;
      document.getElementById('chatInput').value = `👀 Creo haber visto a ${pet.name} cerca de la zona reportada.`;
      document.getElementById('chatInput').focus();
    });
  }
  const adoptBtn = document.getElementById('adoptBtn');
  if (adoptBtn) {
    adoptBtn.addEventListener('click', () => {
      if (!requireAuth('solicitar una adopción')) return;
      document.getElementById('chatInput').value = `🏠 Hola, estoy interesado/a en adoptar a ${pet.name}. ¿Podríamos coordinar?`;
      document.getElementById('chatInput').focus();
    });
  }
}

// ---------------- Compartir ----------------
function toggleSharePanel(pet, anchorBtn){
  let panel = document.getElementById('sharePanel');
  if (panel){ panel.remove(); return; }
  const url = location.href;
  panel = document.createElement('div');
  panel.id = 'sharePanel';
  panel.style.cssText = 'position:absolute;top:46px;right:0;background:#fff;border:1px solid var(--color-border);border-radius:12px;box-shadow:var(--shadow-md);min-width:220px;z-index:600;overflow:hidden;';
  panel.innerHTML = `
    <a href="https://wa.me/?text=${encodeURIComponent('Ayúdame a difundir: '+pet.name+' — '+url)}" target="_blank" style="display:block;padding:10px 16px;font-size:.86rem;color:var(--color-text);">📲 WhatsApp</a>
    <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}" target="_blank" style="display:block;padding:10px 16px;font-size:.86rem;color:var(--color-text);">📘 Facebook</a>
    <a href="#" id="copyLinkBtn" style="display:block;padding:10px 16px;font-size:.86rem;color:var(--color-text);">🔗 Copiar enlace</a>
  `;
  anchorBtn.parentElement.appendChild(panel);
  panel.querySelector('#copyLinkBtn').addEventListener('click', (e)=>{
    e.preventDefault();
    navigator.clipboard.writeText(url).then(()=> toast('Enlace copiado', 'Ya puedes compartirlo donde quieras.', 'success', 2500));
    panel.remove();
  });
  setTimeout(()=>{
    document.addEventListener('click', function closeP(e){
      if (!panel.contains(e.target) && e.target!==anchorBtn){ panel.remove(); document.removeEventListener('click', closeP); }
    });
  },0);
}

// ---------------- Reportar como falso ----------------
function openFlagModal(pet){
  let overlay = document.getElementById('flagModal');
  if (overlay) overlay.remove();
  overlay = document.createElement('div');
  overlay.className = 'modal-overlay open';
  overlay.id = 'flagModal';
  overlay.innerHTML = `
    <div class="modal-box">
      <button class="modal-close" data-close>✕</button>
      <h2>🚩 Reportar publicación</h2>
      <p class="muted">Ayúdanos a mantener la comunidad segura. Cuéntanos por qué crees que esta publicación es falsa o fraudulenta.</p>
      <div class="field"><textarea id="flagReason" placeholder="Ej. Pide dinero por adelantado, fotos repetidas de otra mascota, datos inconsistentes..."></textarea></div>
      <div class="form-actions">
        <button class="btn btn-ghost" data-close>Cancelar</button>
        <button class="btn btn-danger" id="submitFlagBtn">Enviar reporte</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click', ()=>overlay.remove()));
  overlay.addEventListener('click', (e)=>{ if (e.target===overlay) overlay.remove(); });
  overlay.querySelector('#submitFlagBtn').addEventListener('click', async ()=>{
    const reason = overlay.querySelector('#flagReason').value.trim();
    if (!reason){ toast('Falta información', 'Describe brevemente el motivo del reporte.', 'error'); return; }
    const submitBtn = overlay.querySelector('#submitFlagBtn');
    submitBtn.disabled = true;
    const res = await API.flagPet(pet.id, reason);
    if (res.error){ toast('No se pudo enviar el reporte', res.error, 'error'); submitBtn.disabled = false; return; }
    toast('Gracias por tu reporte', 'Nuestro equipo de moderación lo revisará pronto.', 'success');
    overlay.remove();
  });
}

// ---------------- Editar publicación ----------------
function openEditModal(pet){
  let overlay = document.getElementById('editModal');
  if (overlay) overlay.remove();
  overlay = document.createElement('div');
  overlay.className = 'modal-overlay open';
  overlay.id = 'editModal';
  const isAdopt = pet.kind==='adopcion';
  overlay.innerHTML = `
    <div class="modal-box wide">
      <button class="modal-close" data-close>✕</button>
      <h2>✏️ Editar publicación</h2>
      <div class="form-grid">
        <div class="field"><label>Nombre</label><input type="text" id="edName" value="${pet.name||''}"></div>
        <div class="field"><label>Edad</label><input type="text" id="edAge" value="${pet.age||''}"></div>
        <div class="field"><label>Color</label><input type="text" id="edColor" value="${pet.color||''}"></div>
        <div class="field"><label>Estado de salud</label><input type="text" id="edHealth" value="${pet.health||''}"></div>
        ${!isAdopt ? `<div class="field full"><label>Recompensa</label><input type="text" id="edReward" value="${pet.reward||''}"></div>` : ''}
        <div class="field full"><label>Características especiales</label><textarea id="edFeatures">${pet.features||''}</textarea></div>
        <div class="field full"><label>${isAdopt? 'Historia':'Descripción'}</label><textarea id="edDescription">${isAdopt ? (pet.story||'') : (pet.description||'')}</textarea></div>
        ${isAdopt ? `<div class="field full"><label>Requisitos de adopción</label><textarea id="edRequirements">${pet.requirements||''}</textarea></div>` : ''}
      </div>
      <div class="form-actions">
        <button class="btn btn-ghost" data-close>Cancelar</button>
        <button class="btn btn-primary" id="saveEditBtn">Guardar cambios</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click', ()=>overlay.remove()));
  overlay.addEventListener('click', (e)=>{ if (e.target===overlay) overlay.remove(); });
  overlay.querySelector('#saveEditBtn').addEventListener('click', async ()=>{
    const patch = {
      name: overlay.querySelector('#edName').value || pet.name,
      age: overlay.querySelector('#edAge').value,
      color: overlay.querySelector('#edColor').value,
      health: overlay.querySelector('#edHealth').value,
      features: overlay.querySelector('#edFeatures').value,
    };
    if (isAdopt){
      patch.story = overlay.querySelector('#edDescription').value;
      patch.requirements = overlay.querySelector('#edRequirements').value;
    } else {
      patch.description = overlay.querySelector('#edDescription').value;
      patch.reward = overlay.querySelector('#edReward').value;
    }
    const saveBtn = overlay.querySelector('#saveEditBtn');
    saveBtn.disabled = true;
    const res = await API.updatePet(pet.id, patch);
    if (res.error){ toast('No se pudo guardar', res.error, 'error'); saveBtn.disabled = false; return; }
    toast('Publicación actualizada', '', 'success');
    overlay.remove();
    renderDetail(res.pet);
  });
}
