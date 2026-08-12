const { sql } = require('../../../_lib/db');
const { requireAdmin } = require('../../../_lib/auth');
const { rowToUser } = require('../../../_lib/serialize');
const { withHandler } = require('../../../_lib/handler');

module.exports = withHandler(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido.' });
  const session = requireAdmin(req, res);
  if (!session) return;

  const db = sql();
  const { id } = req.query;
  const rows = await db`UPDATE users SET blocked = true WHERE id = ${id} RETURNING *`;
  if (!rows[0]) return res.status(404).json({ error: 'Usuario no encontrado.' });
  res.status(200).json({ user: rowToUser(rows[0]) });
});
