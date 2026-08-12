const { sql } = require('../_lib/db');
const { hashPassword, signSession, setSessionCookie } = require('../_lib/auth');
const { rowToUser } = require('../_lib/serialize');
const { withHandler } = require('../_lib/handler');

module.exports = withHandler(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido.' });

  const { name, email, phone, password } = req.body || {};
  if (!name || !email || !password){
    return res.status(400).json({ error: 'Nombre, correo y contraseña son obligatorios.' });
  }
  if (String(password).length < 6){
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
  }

  const db = sql();
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
  res.status(201).json({ user });
});
