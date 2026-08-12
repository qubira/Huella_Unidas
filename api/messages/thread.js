const { sql } = require('../_lib/db');
const { requireUser } = require('../_lib/auth');
const { rowToMessage } = require('../_lib/serialize');
const { withHandler } = require('../_lib/handler');

module.exports = withHandler(async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido.' });
  const session = requireUser(req, res);
  if (!session) return;

  const db = sql();
  const { petId, with: otherId } = req.query;
  if (!petId || !otherId) return res.status(400).json({ error: 'Faltan petId o with.' });

  const rows = await db`
    SELECT m.*, u.name AS from_name
    FROM messages m
    JOIN users u ON u.id = m.from_id
    WHERE m.pet_id = ${petId}
      AND ((m.from_id = ${session.id} AND m.to_id = ${otherId})
        OR (m.from_id = ${otherId} AND m.to_id = ${session.id}))
    ORDER BY m.created_at ASC`;

  const messages = rows.map(r => ({ ...rowToMessage(r), fromName: r.from_name }));
  res.status(200).json({ messages });
});
