const { sql } = require('../../_lib/db');
const { requireUser } = require('../../_lib/auth');
const { rowToPet } = require('../../_lib/serialize');
const { withHandler } = require('../../_lib/handler');

module.exports = withHandler(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido.' });
  const session = requireUser(req, res);
  if (!session) return;

  const db = sql();
  const { id } = req.query;
  const { reason } = req.body || {};
  if (!reason) return res.status(400).json({ error: 'Indica un motivo.' });

  const petRows = await db`SELECT * FROM pets WHERE id = ${id}`;
  if (!petRows[0]) return res.status(404).json({ error: 'Mascota no encontrada.' });

  await db`INSERT INTO pet_flags (pet_id, reason, by_user_id) VALUES (${id}, ${reason}, ${session.id})`;
  const rows = await db`UPDATE pets SET flagged = true WHERE id = ${id} RETURNING *`;

  const admins = await db`SELECT id FROM users WHERE role = 'admin'`;
  for (const a of admins){
    await db`
      INSERT INTO notifications (user_id, type, title, body, pet_id)
      VALUES (${a.id}, 'flag', 'Reporte marcado para revisión',
              ${`Un usuario reportó "${rows[0].name || 'una publicación'}" como sospechosa: ${reason}`}, ${id})`;
  }

  res.status(200).json({ pet: rowToPet(rows[0]) });
});
