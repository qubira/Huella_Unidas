const { sql } = require('../_lib/db');
const { getSession, clearSessionCookie } = require('../_lib/auth');
const { rowToUser } = require('../_lib/serialize');
const { withHandler } = require('../_lib/handler');

module.exports = withHandler(async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido.' });

  const session = getSession(req);
  if (!session) return res.status(200).json({ user: null });

  const db = sql();
  const rows = await db`SELECT * FROM users WHERE id = ${session.id}`;
  const userRow = rows[0];

  if (!userRow || userRow.blocked){
    clearSessionCookie(req, res);
    return res.status(200).json({ user: null });
  }
  res.status(200).json({ user: rowToUser(userRow) });
});
