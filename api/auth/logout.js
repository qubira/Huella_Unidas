const { clearSessionCookie } = require('../_lib/auth');
const { withHandler } = require('../_lib/handler');

module.exports = withHandler(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido.' });
  clearSessionCookie(req, res);
  res.status(200).json({ ok: true });
});
