const { sql } = require('../../_lib/db');
const { requireAdmin } = require('../../_lib/auth');
const { rowToUser } = require('../../_lib/serialize');
const { withHandler } = require('../../_lib/handler');

module.exports = withHandler(async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido.' });
  const session = requireAdmin(req, res);
  if (!session) return;

  const db = sql();
  const rows = await db`SELECT * FROM users ORDER BY created_at DESC`;
  res.status(200).json({ users: rows.map(rowToUser) });
});
