const { sql } = require('../_lib/db');
const { requireUser } = require('../_lib/auth');
const { withHandler } = require('../_lib/handler');

module.exports = withHandler(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido.' });
  const session = requireUser(req, res);
  if (!session) return;

  const db = sql();
  await db`UPDATE notifications SET read = true WHERE user_id = ${session.id} AND read = false`;
  res.status(200).json({ ok: true });
});
