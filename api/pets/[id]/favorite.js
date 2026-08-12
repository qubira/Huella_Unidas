const { sql } = require('../../_lib/db');
const { requireUser } = require('../../_lib/auth');
const { withHandler } = require('../../_lib/handler');

module.exports = withHandler(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido.' });
  const session = requireUser(req, res);
  if (!session) return;

  const db = sql();
  const { id } = req.query;

  const existing = await db`SELECT 1 FROM favorites WHERE user_id = ${session.id} AND pet_id = ${id}`;
  let isFavorited;
  if (existing.length){
    await db`DELETE FROM favorites WHERE user_id = ${session.id} AND pet_id = ${id}`;
    isFavorited = false;
  } else {
    await db`INSERT INTO favorites (user_id, pet_id) VALUES (${session.id}, ${id}) ON CONFLICT DO NOTHING`;
    isFavorited = true;
  }
  res.status(200).json({ isFavorited });
});
