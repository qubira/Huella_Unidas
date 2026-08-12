const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const COOKIE_NAME = 'hu_session';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 días

function hashPassword(plain){
  return bcrypt.hash(plain, 10);
}
function comparePassword(plain, hash){
  return bcrypt.compare(plain, hash);
}

function secretOrThrow(){
  if (!process.env.JWT_SECRET) throw new Error('Falta JWT_SECRET');
  return process.env.JWT_SECRET;
}

function signSession(payload){
  return jwt.sign(payload, secretOrThrow(), { expiresIn: MAX_AGE });
}

function verifySession(token){
  try{ return jwt.verify(token, secretOrThrow()); }
  catch(e){ return null; }
}

function parseCookieHeader(header){
  const out = {};
  if (!header) return out;
  header.split(';').forEach(part => {
    const idx = part.indexOf('=');
    if (idx === -1) return;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    try{ out[k] = decodeURIComponent(v); } catch(e){ out[k] = v; }
  });
  return out;
}

function isHttps(req){
  const proto = req.headers['x-forwarded-proto'];
  if (proto) return proto.split(',')[0].trim() === 'https';
  return false;
}

function getSession(req){
  const cookies = req.cookies || parseCookieHeader(req.headers.cookie);
  const token = cookies[COOKIE_NAME];
  if (!token) return null;
  return verifySession(token);
}

function setSessionCookie(req, res, token){
  const secure = isHttps(req) ? '; Secure' : '';
  res.setHeader('Set-Cookie',
    `${COOKIE_NAME}=${encodeURIComponent(token)}; Max-Age=${MAX_AGE}; Path=/; HttpOnly; SameSite=Lax${secure}`);
}

function clearSessionCookie(req, res){
  const secure = isHttps(req) ? '; Secure' : '';
  res.setHeader('Set-Cookie',
    `${COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax${secure}`);
}

// ---- Helpers para endpoints: devuelven la sesión o ya responden 401/403 ----
function requireUser(req, res){
  const session = getSession(req);
  if (!session){
    res.status(401).json({ error: 'No has iniciado sesión.' });
    return null;
  }
  return session;
}

function requireAdmin(req, res){
  const session = requireUser(req, res);
  if (!session) return null;
  if (session.role !== 'admin'){
    res.status(403).json({ error: 'Requiere permisos de administrador.' });
    return null;
  }
  return session;
}

module.exports = {
  hashPassword, comparePassword,
  signSession, verifySession,
  getSession, setSessionCookie, clearSessionCookie,
  requireUser, requireAdmin,
};
