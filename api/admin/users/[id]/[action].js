// Agrupa block/unblock de un usuario en una sola función.
const { sql } = require('../../../_lib/db');
const { requireAdmin } = require('../../../_lib/auth');
const { rowToUser } = require('../../../_lib/serialize');
const { withHandler } = require('../../../_lib/handler');

module.exports = withHandler(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido.' });
  const session = requireAdmin(req, res);
  if (!session) return;

  const { id, action } = req.query;
  if (action !== 'block' && action !== 'unblock'){
    return res.status(404).json({ error: 'No encontrado.' });
  }

  const db = sql();
  const rows = await db`UPDATE users SET blocked = ${action === 'block'} WHERE id = ${id} RETURNING *`;
  if (!rows[0]) return res.status(404).json({ error: 'Usuario no encontrado.' });
  res.status(200).json({ user: rowToUser(rows[0]) });
});
