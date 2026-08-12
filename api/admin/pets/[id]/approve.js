const { sql } = require('../../../_lib/db');
const { requireAdmin } = require('../../../_lib/auth');
const { rowToPet } = require('../../../_lib/serialize');
const { withHandler } = require('../../../_lib/handler');

module.exports = withHandler(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido.' });
  const session = requireAdmin(req, res);
  if (!session) return;

  const db = sql();
  const { id } = req.query;
  await db`DELETE FROM pet_flags WHERE pet_id = ${id}`;
  const rows = await db`UPDATE pets SET flagged = false WHERE id = ${id} RETURNING *`;
  if (!rows[0]) return res.status(404).json({ error: 'Mascota no encontrada.' });
  res.status(200).json({ pet: rowToPet(rows[0]) });
});
