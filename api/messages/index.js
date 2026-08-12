const { sql } = require('../_lib/db');
const { requireUser } = require('../_lib/auth');
const { rowToMessage } = require('../_lib/serialize');
const { withHandler } = require('../_lib/handler');

module.exports = withHandler(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido.' });
  const session = requireUser(req, res);
  if (!session) return;

  const db = sql();
  const { petId, toId, text, shared } = req.body || {};
  if (!petId || !toId || !text) return res.status(400).json({ error: 'Faltan petId, toId o text.' });

  const rows = await db`
    INSERT INTO messages (pet_id, from_id, to_id, text, shared)
    VALUES (${petId}, ${session.id}, ${toId}, ${text}, ${!!shared})
    RETURNING *`;

  const petRows = await db`SELECT name FROM pets WHERE id = ${petId}`;
  const petName = petRows[0]?.name || 'una mascota';
  await db`
    INSERT INTO notifications (user_id, type, title, body, pet_id)
    VALUES (${toId}, 'message', 'Nuevo mensaje', ${`Tienes un nuevo mensaje sobre ${petName}.`}, ${petId})`;

  res.status(201).json({ message: rowToMessage(rows[0]) });
});
