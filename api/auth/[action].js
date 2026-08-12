// Agrupa register/login/logout/me en una sola función serverless
// (el plan Hobby de Vercel limita a 12 funciones por deployment).
const { sql } = require('../_lib/db');
const { hashPassword, comparePassword, signSession, getSession, setSessionCookie, clearSessionCookie } = require('../_lib/auth');
const { rowToUser } = require('../_lib/serialize');
const { withHandler } = require('../_lib/handler');
const { encrypt } = require('../_lib/crypto');
const { lookupGeo } = require('../_lib/geo');
const { getClientIp, getUserAgent } = require('../_lib/request');

// Registra IP/geolocalización cifradas para un evento de cuenta (registro o login).
// Es "mejor esfuerzo": si algo falla acá nunca debe tumbar el login/registro del usuario.
async function recordLoginEvent(db, req, userId, eventType){
  try{
    const ip = getClientIp(req);
    const geo = await lookupGeo(ip);
    await db`
      INSERT INTO login_events (user_id, event_type, ip_encrypted, geo_encrypted, user_agent)
      VALUES (${userId}, ${eventType}, ${encrypt(ip)}, ${geo ? encrypt(JSON.stringify(geo)) : null}, ${getUserAgent(req)})`;
  }catch(e){
    console.error('No se pudo registrar login_event:', e);
  }
}

async function register(req, res, db){
  const { name, email, phone, password } = req.body || {};
  if (!name || !email || !password){
    return res.status(400).json({ error: 'Nombre, correo y contraseña son obligatorios.' });
  }
  if (String(password).length < 6){
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
  }
  const normalizedEmail = String(email).toLowerCase().trim();
  const existing = await db`SELECT id FROM users WHERE lower(email) = ${normalizedEmail}`;
  if (existing.length){
    return res.status(409).json({ error: 'Este correo ya está registrado.' });
  }
  const hash = await hashPassword(password);
  const rows = await db`
    INSERT INTO users (name, email, phone, password_hash, role, verified, blocked)
    VALUES (${name}, ${normalizedEmail}, ${phone || null}, ${hash}, 'user', false, false)
    RETURNING *`;
  const user = rowToUser(rows[0]);
  const token = signSession({ id: user.id, role: user.role });
  setSessionCookie(req, res, token);
  await recordLoginEvent(db, req, user.id, 'register');
  res.status(201).json({ user });
}

async function login(req, res, db){
  const { email, password } = req.body || {};
  if (!email || !password){
    return res.status(400).json({ error: 'Correo y contraseña son obligatorios.' });
  }
  const normalizedEmail = String(email).toLowerCase().trim();
  const rows = await db`SELECT * FROM users WHERE lower(email) = ${normalizedEmail}`;
  const userRow = rows[0];
  if (!userRow || !(await comparePassword(password, userRow.password_hash))){
    return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
  }
  if (userRow.blocked){
    return res.status(403).json({ error: 'Tu cuenta ha sido bloqueada por un administrador. Contacta a soporte.' });
  }
  const user = rowToUser(userRow);
  const token = signSession({ id: user.id, role: user.role });
  setSessionCookie(req, res, token);
  await recordLoginEvent(db, req, user.id, 'login');
  res.status(200).json({ user });
}

async function logout(req, res){
  clearSessionCookie(req, res);
  res.status(200).json({ ok: true });
}

async function me(req, res, db){
  const session = getSession(req);
  if (!session) return res.status(200).json({ user: null });
  const rows = await db`SELECT * FROM users WHERE id = ${session.id}`;
  const userRow = rows[0];
  if (!userRow || userRow.blocked){
    clearSessionCookie(req, res);
    return res.status(200).json({ user: null });
  }
  res.status(200).json({ user: rowToUser(userRow) });
}

module.exports = withHandler(async (req, res) => {
  const { action } = req.query;
  const db = sql();

  if (action === 'register' && req.method === 'POST') return register(req, res, db);
  if (action === 'login' && req.method === 'POST') return login(req, res, db);
  if (action === 'logout' && req.method === 'POST') return logout(req, res);
  if (action === 'me' && req.method === 'GET') return me(req, res, db);

  res.status(404).json({ error: 'No encontrado.' });
});
