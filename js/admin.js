/* ===================================================
   HUELLAS UNIDAS — Panel de administrador
=================================================== */
async function initAdminPage(){
  await API.ready;
  const user = currentUser();
  const guard = document.getElementById('adminGuard');
  const content = document.getElementById('adminContent');
  if (!user || user.role!=='admin'){
    guard.style.display = 'block';
    content.style.display = 'none';
    return;
  }
  guard.style.display = 'none';
  content.style.display = 'block';

  const [pets, users] = await Promise.all([API.getPets(), API.getUsers()]);

  renderMetrics(pets, users);
  renderFlagged(pets);
  renderAllPets(pets);
  renderUsers(users);

  document.getElementById('petSearch')?.addEventListener('input', () => renderAllPets(pets));
}

function renderMetrics(pets, users){
  document.getElementById('mPets').textContent = pets.length;
  document.getElementById('mUsers').textContent = users.length;
  document.getElementById('mFlagged').textContent = pets.filter(p=>p.flagged).length;
  document.getElementById('mBlocked').textContent = users.filter(u=>u.blocked).length;
}

function renderFlagged(pets){
  const host = document.getElementById('flaggedList');
  const flagged = pets.filter(p=>p.flagged);
  if (!flagged.length){
    host.innerHTML = `<p class="muted" style="font-size:.88rem;">No hay publicaciones reportadas por la comunidad.</p>`;
    return;
  }
  host.innerHTML = flagged.map(p=>{
    const lastFlag = (p.flags||[]).slice(-1)[0];
    return `
      <div class="mini-pet-item" style="align-items:flex-start;background:#FDEDEE;border-radius:10px;margin-bottom:8px;">
        <div class="thumb">${p.photos&&p.photos[0]?`<img src="${p.photos[0]}">`:'🐾'}</div>
        <div style="flex:1;">
          <strong>${p.name}</strong> <span class="muted">(${p.species} · ${p.district||'—'})</span>
          <p style="font-size:.8rem;margin:4px 0;color:var(--color-text-soft);">Motivo: ${lastFlag? lastFlag.reason : '—'} · ${(p.flags||[]).length} reporte(s)</p>
          <div style="display:flex;gap:8px;">
            <a href="detalle.html?id=${p.id}" class="btn btn-ghost btn-sm" target="_blank">Ver ficha</a>
            <button class="btn btn-secondary btn-sm" data-approve="${p.id}">✅ Aprobar (quitar reporte)</button>
            <button class="btn btn-danger btn-sm" data-delete="${p.id}">🗑️ Eliminar publicación</button>
          </div>
        </div>
      </div>`;
  }).join('');
  host.querySelectorAll('[data-approve]').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      btn.disabled = true;
      const res = await API.approvePet(btn.dataset.approve);
      if (res.error){ toast('No se pudo aprobar', res.error, 'error'); btn.disabled = false; return; }
      toast('Publicación aprobada', 'Se quitó la marca de reporte.', 'success');
      initAdminPage();
    });
  });
  host.querySelectorAll('[data-delete]').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      if (!confirm('¿Eliminar esta publicación de forma permanente?')) return;
      btn.disabled = true;
      const res = await API.deletePet(btn.dataset.delete);
      if (res.error){ toast('No se pudo eliminar', res.error, 'error'); btn.disabled = false; return; }
      toast('Publicación eliminada', '', 'info');
      initAdminPage();
    });
  });
}

function renderAllPets(pets){
  const host = document.getElementById('allPetsList');
  const q = (document.getElementById('petSearch')?.value || '').toLowerCase();
  const filtered = pets.filter(p => !q || (p.name||'').toLowerCase().includes(q) || (p.species||'').toLowerCase().includes(q));
  if (!filtered.length){
    host.innerHTML = `<p class="muted" style="font-size:.88rem;">No hay publicaciones.</p>`;
    return;
  }
  host.innerHTML = `
    <table style="width:100%;border-collapse:collapse;font-size:.85rem;">
      <thead><tr style="text-align:left;border-bottom:1px solid var(--color-border);">
        <th style="padding:8px;">Mascota</th><th style="padding:8px;">Tipo</th><th style="padding:8px;">Estado</th><th style="padding:8px;">Distrito</th><th style="padding:8px;"></th>
      </tr></thead>
      <tbody>
      ${filtered.map(p=>`
        <tr style="border-bottom:1px solid var(--color-border);">
          <td style="padding:8px;">${p.name}${p.flagged?' 🚩':''}</td>
          <td style="padding:8px;text-transform:capitalize;">${p.kind}</td>
          <td style="padding:8px;"><span class="status-badge status-${p.status}" style="position:static;display:inline-block;">${STATUS_LABELS[p.status]||p.status}</span></td>
          <td style="padding:8px;">${p.district||'—'}</td>
          <td style="padding:8px;display:flex;gap:6px;">
            <a href="detalle.html?id=${p.id}" class="btn btn-ghost btn-sm" target="_blank">Ver</a>
            <button class="btn btn-danger btn-sm" data-del-pet="${p.id}">Eliminar</button>
          </td>
        </tr>`).join('')}
      </tbody>
    </table>`;
  host.querySelectorAll('[data-del-pet]').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      if (!confirm('¿Eliminar esta publicación de forma permanente?')) return;
      btn.disabled = true;
      const res = await API.deletePet(btn.dataset.delPet);
      if (res.error){ toast('No se pudo eliminar', res.error, 'error'); btn.disabled = false; return; }
      toast('Publicación eliminada', '', 'info');
      initAdminPage();
    });
  });
}

function renderUsers(users){
  const host = document.getElementById('usersList');
  host.innerHTML = `
    <table style="width:100%;border-collapse:collapse;font-size:.85rem;">
      <thead><tr style="text-align:left;border-bottom:1px solid var(--color-border);">
        <th style="padding:8px;">Nombre</th><th style="padding:8px;">Correo</th><th style="padding:8px;">Rol</th><th style="padding:8px;">Estado</th><th style="padding:8px;"></th>
      </tr></thead>
      <tbody>
      ${users.map(u=>`
        <tr style="border-bottom:1px solid var(--color-border);">
          <td style="padding:8px;">${u.name}</td>
          <td style="padding:8px;">${u.email}</td>
          <td style="padding:8px;text-transform:capitalize;">${u.role}</td>
          <td style="padding:8px;">${u.blocked ? '<span class="badge-soft" style="background:rgba(226,85,99,.12);color:var(--color-danger);">Bloqueado</span>' : '<span class="badge-soft">Activo</span>'}</td>
          <td style="padding:8px;">
            ${u.role!=='admin' ? (u.blocked
              ? `<button class="btn btn-secondary btn-sm" data-unblock="${u.id}">Desbloquear</button>`
              : `<button class="btn btn-ghost btn-sm" data-block="${u.id}" style="color:var(--color-danger);">Bloquear</button>`)
              : ''}
          </td>
        </tr>`).join('')}
      </tbody>
    </table>`;
  host.querySelectorAll('[data-block]').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      btn.disabled = true;
      const res = await API.blockUser(btn.dataset.block);
      if (res.error){ toast('No se pudo bloquear', res.error, 'error'); btn.disabled = false; return; }
      toast('Usuario bloqueado', 'Ya no podrá iniciar sesión.', 'success');
      initAdminPage();
    });
  });
  host.querySelectorAll('[data-unblock]').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      btn.disabled = true;
      const res = await API.unblockUser(btn.dataset.unblock);
      if (res.error){ toast('No se pudo desbloquear', res.error, 'error'); btn.disabled = false; return; }
      toast('Usuario desbloqueado', '', 'success');
      initAdminPage();
    });
  });
}
