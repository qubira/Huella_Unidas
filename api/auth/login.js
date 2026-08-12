const { sql } = require('../_lib/db');
const { comparePassword, signSession, setSessionCookie } = require('../_lib/auth');
const { rowToUser } = require('../_lib/serialize');
const { withHandler } = require('../_lib/handler');

module.exports = withHandler(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido.' });

  const { email, password } = req.body || {};
  if (!email || !password){
    return res.status(400).json({ error: 'Correo y contraseña son obligatorios.' });
  }

  const db = sql();
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
  res.status(200).json({ user });
});
