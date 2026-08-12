const { sql } = require('../_lib/db');
const { requireUser } = require('../_lib/auth');
const { rowToNotif } = require('../_lib/serialize');
const { withHandler } = require('../_lib/handler');

module.exports = withHandler(async (req, res) => {
  const session = requireUser(req, res);
  if (!session) return;
  const db = sql();

  if (req.method === 'GET'){
    const rows = await db`
      SELECT * FROM notifications WHERE user_id = ${session.id}
      ORDER BY created_at DESC LIMIT 30`;
    return res.status(200).json({ notifs: rows.map(rowToNotif) });
  }

  if (req.method === 'POST'){
    if (req.body && req.body.markRead){
      await db`UPDATE notifications SET read = true WHERE user_id = ${session.id} AND read = false`;
      return res.status(200).json({ ok: true });
    }
    // Autonotificación del propio usuario (ej. "encontramos posibles coincidencias").
    // No permite crear notificaciones para otros usuarios.
    const { type, title, body, petId } = req.body || {};
    if (!title) return res.status(400).json({ error: 'Falta title.' });
    const rows = await db`
      INSERT INTO notifications (user_id, type, title, body, pet_id)
      VALUES (${session.id}, ${type || null}, ${title}, ${body || null}, ${petId || null})
      RETURNING *`;
    return res.status(201).json({ notif: rowToNotif(rows[0]) });
  }

  res.status(405).json({ error: 'Método no permitido.' });
});
