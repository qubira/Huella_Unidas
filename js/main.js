/* ===================================================
   HUELLAS UNIDAS — Núcleo: navegación, auth, toasts, captcha
=================================================== */

// ---------- Toasts ----------
function ensureToastStack(){
  let stack = document.querySelector('.toast-stack');
  if (!stack){
    stack = document.createElement('div');
    stack.className = 'toast-stack';
    document.body.appendChild(stack);
  }
  return stack;
}
function toast(title, msg, type='info', ms=4200){
  const stack = ensureToastStack();
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<strong>${title}</strong>${msg ? `<div>${msg}</div>` : ''}`;
  stack.appendChild(el);
  setTimeout(()=>{ el.style.opacity='0'; el.style.transform='translateX(20px)'; setTimeout(()=>el.remove(),250); }, ms);
}

// ---------- Captcha simple (suma) ----------
function generateCaptcha(container){
  const a = Math.floor(Math.random()*8)+2, b = Math.floor(Math.random()*8)+1;
  container.dataset.answer = a+b;
  const sumEl = container.querySelector('.sum');
  if (sumEl) sumEl.textContent = `${a} + ${b} = ?`;
}
function checkCaptcha(container, input){
  return String(container.dataset.answer) === String(input.value).trim();
}

// ---------- Navbar / sesión ----------
// currentUser() es síncrono: lee la sesión ya resuelta por API.ready.
// Cualquier código que dependa de currentUser() en el primer render debe
// esperar `await API.ready;` antes de llamarlo.
function currentUser(){ return API.getSession(); }

function renderNavAuth(){
  const slot = document.getElementById('navAuthSlot');
  if (!slot) return;
  const user = currentUser();
  if (user){
    const initials = user.name.split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase();
    slot.innerHTML = `
      <button class="notif-btn" id="notifBtn" title="Notificaciones">🔔<span class="notif-badge" id="notifCount" style="display:none">0</span></button>
      <div class="user-chip" id="userChip"><div class="avatar">${initials}</div><span class="chip-name">${user.name.split(' ')[0]}</span> ▾</div>
    `;
    document.getElementById('userChip').addEventListener('click', toggleUserMenu);
    document.getElementById('notifBtn').addEventListener('click', toggleNotifPanel);
    updateNotifBadge();
  } else {
    slot.innerHTML = `
      <button class="btn btn-ghost btn-sm" id="navLoginBtn">Iniciar sesión</button>
      <button class="btn btn-primary btn-sm" id="navRegisterBtn">Crear cuenta</button>
    `;
    document.getElementById('navLoginBtn').addEventListener('click', ()=>openAuthModal('login'));
    document.getElementById('navRegisterBtn').addEventListener('click', ()=>openAuthModal('register'));
  }
}

function toggleUserMenu(){
  let menu = document.getElementById('userMenuDropdown');
  if (menu){ menu.remove(); return; }
  const chip = document.getElementById('userChip');
  menu = document.createElement('div');
  menu.id = 'userMenuDropdown';
  menu.style.cssText = 'position:absolute;right:20px;top:64px;background:#fff;border:1px solid var(--color-border);border-radius:12px;box-shadow:var(--shadow-md);min-width:200px;z-index:600;overflow:hidden;';
  const user = currentUser();
  menu.innerHTML = `
    <div style="padding:12px 16px;border-bottom:1px solid var(--color-border);">
      <strong style="display:block;font-size:.9rem;">${user.name}</strong>
      <span style="font-size:.78rem;color:var(--color-text-soft);">${user.email}</span>
    </div>
    <a href="mascotas.html?mine=1" style="display:block;padding:10px 16px;font-size:.88rem;color:var(--color-text);">Mis reportes</a>
    <a href="mascotas.html?fav=1" style="display:block;padding:10px 16px;font-size:.88rem;color:var(--color-text);">❤️ Mis favoritos</a>
    ${('Notification' in window) && Notification.permission==='default' ? '<a href="#" id="enableNotifLink" style="display:block;padding:10px 16px;font-size:.88rem;color:var(--color-text);">🔔 Activar notificaciones</a>' : ''}
    ${user.role==='admin' ? '<a href="admin.html" style="display:block;padding:10px 16px;font-size:.88rem;color:var(--color-text);">⚙️ Panel admin</a>' : ''}
    <a href="#" id="logoutLink" style="display:block;padding:10px 16px;font-size:.88rem;color:var(--color-danger);font-weight:700;">Cerrar sesión</a>
  `;
  document.body.appendChild(menu);
  document.getElementById('logoutLink').addEventListener('click', async (e)=>{
    e.preventDefault();
    await API.clearSession();
    toast('Sesión cerrada', 'Vuelve pronto 🐾', 'info');
    setTimeout(()=>location.reload(),600);
  });
  const enableNotifLink = document.getElementById('enableNotifLink');
  if (enableNotifLink){
    enableNotifLink.addEventListener('click', (e)=>{
      e.preventDefault();
      Notification.requestPermission().then(perm=>{
        if (perm==='granted') toast('Notificaciones activadas', 'Te avisaremos sobre coincidencias y mensajes nuevos.', 'success');
        else toast('Notificaciones bloqueadas', 'Puedes activarlas luego desde los ajustes del navegador.', 'info');
        menu.remove();
      });
    });
  }
  setTimeout(()=>{
    document.addEventListener('click', function closeMenu(e){
      if (!menu.contains(e.target) && e.target.id!=='userChip'){ menu.remove(); document.removeEventListener('click', closeMenu); }
    });
  },0);
}

async function updateNotifBadge(){
  const user = currentUser();
  if (!user) return;
  const notifs = await API.getNotifs();
  const count = notifs.filter(n=>!n.read).length;
  const badge = document.getElementById('notifCount');
  if (badge){ badge.style.display = count? 'flex':'none'; badge.textContent = count; }
}

async function toggleNotifPanel(){
  let panel = document.getElementById('notifPanel');
  if (panel){ panel.remove(); return; }
  const user = currentUser();
  const notifs = (await API.getNotifs()).slice(0,10);
  panel = document.createElement('div');
  panel.id = 'notifPanel';
  panel.style.cssText = 'position:absolute;right:80px;top:64px;background:#fff;border:1px solid var(--color-border);border-radius:12px;box-shadow:var(--shadow-md);min-width:300px;max-width:340px;z-index:600;max-height:380px;overflow:auto;';
  panel.innerHTML = `<div style="padding:12px 16px;border-bottom:1px solid var(--color-border);font-weight:800;">Notificaciones</div>` +
    (notifs.length ? notifs.map(n=>`
      <div style="padding:12px 16px;border-bottom:1px solid var(--color-border);font-size:.85rem;">
        <strong style="display:block;">${n.title}</strong>
        <span style="color:var(--color-text-soft);">${n.body}</span>
      </div>`).join('') : `<div style="padding:18px;color:var(--color-text-soft);font-size:.85rem;">No tienes notificaciones por ahora.</div>`);
  document.body.appendChild(panel);
  await API.markNotifsRead();
  updateNotifBadge();
  setTimeout(()=>{
    document.addEventListener('click', function closeP(e){
      if (!panel.contains(e.target) && e.target.id!=='notifBtn'){ panel.remove(); document.removeEventListener('click', closeP); }
    });
  },0);
}

// ---------- Modal de autenticación ----------
function buildAuthModal(){
  if (document.getElementById('authModal')) return;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'authModal';
  overlay.innerHTML = `
    <div class="modal-box">
      <button class="modal-close" data-close>✕</button>
      <div class="tab-row">
        <button class="tab-btn active" data-tab="login">Iniciar sesión</button>
        <button class="tab-btn" data-tab="register">Crear cuenta</button>
      </div>
      <form id="loginForm">
        <div class="field"><label>Correo electrónico</label><input type="email" required id="loginEmail"></div>
        <div class="field"><label>Contraseña</label><input type="password" required id="loginPassword"></div>
        <button class="btn btn-primary btn-block" type="submit">Entrar</button>
      </form>
      <form id="registerForm" style="display:none;">
        <div class="field"><label>Nombre completo</label><input type="text" required id="regName"></div>
        <div class="field"><label>Correo electrónico</label><input type="email" required id="regEmail"></div>
        <div class="field"><label>Teléfono</label><input type="tel" required id="regPhone" placeholder="9XXXXXXXX"></div>
        <div class="field"><label>Contraseña</label><input type="password" required minlength="6" id="regPassword"></div>
        <div class="field">
          <label>Verificación (anti-fraude)</label>
          <div class="captcha-box" id="regCaptcha"><span>Resuelve:</span><span class="sum"></span>
            <input type="number" placeholder="Resultado" id="regCaptchaInput" style="max-width:110px;"></div>
        </div>
        <button class="btn btn-primary btn-block" type="submit">Crear cuenta</button>
      </form>
    </div>`;
  document.body.appendChild(overlay);

  overlay.querySelectorAll('[data-tab]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      overlay.querySelectorAll('[data-tab]').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.dataset.tab;
      overlay.querySelector('#loginForm').style.display = tab==='login' ? 'block':'none';
      overlay.querySelector('#registerForm').style.display = tab==='register' ? 'block':'none';
      if (tab==='register') generateCaptcha(overlay.querySelector('#regCaptcha'));
    });
  });
  overlay.querySelector('[data-close]').addEventListener('click', closeAuthModal);
  overlay.addEventListener('click', (e)=>{ if (e.target===overlay) closeAuthModal(); });

  overlay.querySelector('#loginForm').addEventListener('submit', async (e)=>{
    e.preventDefault();
    const submitBtn = overlay.querySelector('#loginForm button[type="submit"]');
    const email = overlay.querySelector('#loginEmail').value;
    const password = overlay.querySelector('#loginPassword').value;
    submitBtn.disabled = true;
    const res = await API.login(email, password);
    submitBtn.disabled = false;
    if (res.error){ toast('No se pudo iniciar sesión', res.error, 'error'); return; }
    toast('¡Bienvenido de vuelta!', `Hola, ${res.user.name.split(' ')[0]} 🐾`, 'success');
    closeAuthModal();
    setTimeout(()=>location.reload(), 500);
  });
  overlay.querySelector('#registerForm').addEventListener('submit', async (e)=>{
    e.preventDefault();
    const captchaBox = overlay.querySelector('#regCaptcha');
    const captchaInput = overlay.querySelector('#regCaptchaInput');
    if (!checkCaptcha(captchaBox, captchaInput)){
      toast('Verificación incorrecta', 'Resuelve correctamente la operación para continuar.', 'error');
      generateCaptcha(captchaBox); captchaInput.value='';
      return;
    }
    const name = overlay.querySelector('#regName').value;
    const email = overlay.querySelector('#regEmail').value;
    const phone = overlay.querySelector('#regPhone').value;
    const password = overlay.querySelector('#regPassword').value;
    const submitBtn = overlay.querySelector('#registerForm button[type="submit"]');
    submitBtn.disabled = true;
    const res = await API.registerUser({name,email,phone,password});
    submitBtn.disabled = false;
    if (res.error){ toast('No se pudo registrar', res.error, 'error'); return; }
    toast('Cuenta creada', 'Te recomendamos verificar tu correo y teléfono desde tu perfil.', 'success');
    closeAuthModal();
    setTimeout(()=>location.reload(), 500);
  });
}
function openAuthModal(tab='login'){
  buildAuthModal();
  const overlay = document.getElementById('authModal');
  overlay.classList.add('open');
  overlay.querySelector(`[data-tab="${tab}"]`).click();
}
function closeAuthModal(){ const m = document.getElementById('authModal'); if (m) m.classList.remove('open'); }

// Guard: requiere sesión antes de una acción (publicar, chatear, etc.)
function requireAuth(actionLabel){
  if (currentUser()) return true;
  toast('Inicia sesión', `Necesitas una cuenta para ${actionLabel || 'continuar'}.`, 'info');
  openAuthModal('login');
  return false;
}

// ---------- Notificaciones reales del navegador ----------
// Solo crea notificaciones para el propio usuario (el servidor ya se encarga
// de notificar al destinatario en mensajes, flags y confirmaciones).
async function pushNotif(notifData){
  const n = await API.addNotif(notifData);
  if (n && ('Notification' in window) && Notification.permission==='granted'){
    try{ new Notification(n.title, { body:n.body, icon:'icons/icon.svg' }); }catch(e){}
  }
  return n;
}

// ---------- PWA: manifest + service worker ----------
function setupPWA(){
  if (!document.querySelector('link[rel="manifest"]')){
    const link = document.createElement('link');
    link.rel = 'manifest'; link.href = 'manifest.json';
    document.head.appendChild(link);
  }
  if (!document.querySelector('meta[name="theme-color"]')){
    const meta = document.createElement('meta');
    meta.name = 'theme-color'; meta.content = '#FF7A45';
    document.head.appendChild(meta);
  }
  if ('serviceWorker' in navigator){
    navigator.serviceWorker.register('sw.js').catch(()=>{});
  }
}

// ---------- Construcción de navbar/footer compartidos ----------
function injectChrome(){
  const navHost = document.getElementById('siteNavbar');
  if (navHost){
    // Se reemplaza el div contenedor por el <nav> mismo (en vez de rellenarlo con
    // innerHTML) porque `position:sticky` solo puede "pegarse" mientras el elemento
    // padre siga visible; si el padre mide lo mismo que el navbar, pierde su
    // margen de sticky apenas se hace scroll un píxel.
    navHost.outerHTML = `
      <nav class="navbar">
        <div class="container">
          <a href="index.html" class="brand"><img src="img/logo_huellas-unidas.png" alt="Huellas Unidas" class="brand-logo"><span class="brand-word">Huellas <span class="hl">Unidas</span></span></a>
          <button class="nav-toggle" id="navToggle">☰</button>
          <div class="nav-links" id="navLinks">
            <a href="index.html" data-nav="index">Inicio</a>
            <a href="mascotas.html" data-nav="mascotas">Mascotas</a>
            <a href="mapa.html" data-nav="mapa">Mapa</a>
            <a href="adopcion.html" data-nav="adopcion">Adopción</a>
            <a href="estadisticas.html" data-nav="estadisticas">Estadísticas</a>
            <a href="mensajes.html" data-nav="mensajes" id="navMensajesLink">💬 Mensajes</a>
          </div>
          <div class="nav-actions" id="navAuthSlot"></div>
        </div>
      </nav>`;
    const navEl = document.querySelector('.navbar');
    renderNavAuth();
    const page = document.body.dataset.page;
    const link = navEl.querySelector(`[data-nav="${page}"]`);
    if (link) link.classList.add('active');
    document.getElementById('navToggle').addEventListener('click', ()=>{
      const links = document.getElementById('navLinks');
      links.style.display = links.style.display==='flex' ? 'none' : 'flex';
      links.style.cssText += 'flex-direction:column;position:absolute;top:72px;left:0;right:0;background:#fff;padding:14px 20px;border-bottom:1px solid var(--color-border);';
    });
  }
  const footHost = document.getElementById('siteFooter');
  if (footHost){
    footHost.innerHTML = `
      <footer>
        <div class="container">
          <div class="footer-grid">
            <div>
              <div class="brand"><img src="img/logo_huellas-unidas.png" alt="Huellas Unidas" class="brand-logo">Huellas Unidas</div>
              <p class="muted" style="margin-top:10px;">Plataforma comunitaria para el reencuentro de mascotas perdidas y la promoción de la adopción responsable en todo el país.</p>
              <div class="social-row">
                <a href="#">📘</a><a href="#">📸</a><a href="#">🐦</a><a href="#">▶️</a>
              </div>
            </div>
            <div>
              <h4>Plataforma</h4>
              <a href="reportar-perdida.html">Reportar perdida</a>
              <a href="reportar-encontrada.html">Reportar encontrada</a>
              <a href="mapa.html">Mapa interactivo</a>
              <a href="adopcion.html">Adopción</a>
            </div>
            <div>
              <h4>Recursos</h4>
              <a href="estadisticas.html">Estadísticas</a>
              <a href="mascotas.html">Buscar mascotas</a>
              <a href="#">Consejos de búsqueda</a>
              <a href="#">Seguridad y fraude</a>
            </div>
            <div>
              <h4>Contacto</h4>
              <a href="mailto:qubira@gmail.com">qubira@gmail.com</a>
              <a href="tel:+51924687363">+51 924 687 363</a>
              <a href="#">Lima, Perú</a>
            </div>
          </div>
          <div class="footer-bottom">
            <span>© ${new Date().getFullYear()} Huellas Unidas. Todos los derechos reservados.</span>
            <span>Hecho con 🐾 para reunir familias.</span>
          </div>
        </div>
      </footer>`;
  }
}

// Navbar scroll shadow
function setupNavbarScroll(){
  const navbar = document.querySelector('.navbar');
  if (!navbar) return;
  const onScroll = ()=> navbar.classList.toggle('scrolled', window.scrollY > 10);
  window.addEventListener('scroll', onScroll, {passive:true});
  onScroll();
}

// Scroll-triggered fade-up animations (only for elements below the initial viewport)
function setupScrollAnimations(){
  const targets = document.querySelectorAll('.step-card,.module-card,.stat-card,.pet-card,.zone-chip,.chart-card');
  if (!('IntersectionObserver' in window)) return;
  const vhInitial = window.innerHeight;
  let groupIndex = 0;
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{
      if (e.isIntersecting){
        e.target.style.animationDelay = (groupIndex++ % 4 * 0.07) + 's';
        e.target.classList.add('animate-up');
        io.unobserve(e.target);
      }
    });
  },{threshold:0.1, rootMargin:'0px 0px -40px 0px'});
  targets.forEach(el=>{
    if (el.getBoundingClientRect().top > vhInitial * 0.85) io.observe(el);
  });
}

// ---------- Carrusel de mascotas perdidas ----------
async function initLostCarousel(){
  const track = document.getElementById('carouselTrack');
  const dotsEl = document.getElementById('carouselDots');
  if (!track) return;

  const allPets = await API.getPets();
  const lost = allPets.filter(p => p.status === 'perdida').slice(0, 9);
  if (!lost.length) {
    track.closest('.carousel-section').style.display = 'none';
    return;
  }

  track.innerHTML = lost.map(p => {
    const emoji = p.species === 'Gato' ? '🐱' : p.species === 'Perro' ? '🐶' : '🐾';
    const daysAgo = Math.floor((Date.now() - p.createdAt) / (1000*60*60*24));
    const daysText = daysAgo === 0 ? 'Hoy' : daysAgo === 1 ? 'Ayer' : `Hace ${daysAgo} días`;
    return `<div class="pet-card">
      <div class="pet-photo">
        ${p.photos && p.photos[0] ? `<img src="${p.photos[0]}" alt="${p.name}">` : emoji}
        <span class="status-badge status-perdida">Perdida</span>
        <span style="position:absolute;bottom:10px;left:10px;background:rgba(0,0,0,.55);color:#fff;font-size:.72rem;padding:3px 8px;border-radius:99px;">${daysText}</span>
      </div>
      <div class="pet-body">
        <h3>${p.name}</h3>
        <div class="pet-meta">
          <span>${p.species}</span>
          ${p.breed ? `<span>${p.breed}</span>` : ''}
          ${p.size ? `<span>${p.size}</span>` : ''}
        </div>
        <div class="pet-loc">📍 ${p.district}, ${p.province || 'Lima'}</div>
        ${p.reward ? `<div style="font-size:.82rem;color:var(--color-success);font-weight:700;">🏆 Recompensa: ${p.reward}</div>` : ''}
      </div>
      <div class="pet-footer">
        <a href="detalle.html?id=${p.id}" class="btn btn-primary btn-sm" style="flex:1;margin-right:6px;">Ver ficha</a>
        <a href="https://wa.me/?text=${encodeURIComponent('Ayuda a difundir: '+p.name+' — '+location.origin+'/detalle.html?id='+p.id)}" target="_blank" class="btn btn-ghost btn-sm">📲</a>
      </div>
    </div>`;
  }).join('');

  const cards = track.children;
  const getVisible = () => window.innerWidth >= 980 ? 3 : window.innerWidth >= 600 ? 2 : 1;
  let current = 0;
  const total = () => Math.max(0, cards.length - getVisible());

  function buildDots(){
    if (!dotsEl) return;
    const n = total() + 1;
    dotsEl.innerHTML = Array.from({length: n}, (_,i) =>
      `<button class="carousel-dot ${i===current?'active':''}" data-i="${i}" aria-label="Ir a ${i+1}"></button>`
    ).join('');
    dotsEl.querySelectorAll('.carousel-dot').forEach(d => {
      d.addEventListener('click', () => goTo(Number(d.dataset.i)));
    });
  }

  function goTo(i){
    current = Math.max(0, Math.min(i, total()));
    const cardW = cards[0] ? cards[0].offsetWidth + 20 : 0;
    track.style.transform = `translateX(-${current * cardW}px)`;
    dotsEl && dotsEl.querySelectorAll('.carousel-dot').forEach((d,idx) => d.classList.toggle('active', idx===current));
  }

  document.getElementById('carouselPrev') && document.getElementById('carouselPrev').addEventListener('click', () => goTo(current - 1));
  document.getElementById('carouselNext') && document.getElementById('carouselNext').addEventListener('click', () => goTo(current + 1));
  window.addEventListener('resize', () => { buildDots(); goTo(0); });

  buildDots();

  // Auto-play
  let timer = setInterval(() => goTo(current >= total() ? 0 : current + 1), 4500);
  track.addEventListener('mouseenter', () => clearInterval(timer));
  track.addEventListener('mouseleave', () => { timer = setInterval(() => goTo(current >= total() ? 0 : current + 1), 4500); });
}

document.addEventListener('DOMContentLoaded', async ()=>{
  await API.ready;
  injectChrome();
  setupPWA();
  setupNavbarScroll();
  setupScrollAnimations();
  await initLostCarousel();
});
