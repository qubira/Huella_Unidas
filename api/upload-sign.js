const { requireUser } = require('./_lib/auth');
const { signUpload } = require('./_lib/cloudinary');
const { withHandler } = require('./_lib/handler');

module.exports = withHandler(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido.' });
  const session = requireUser(req, res);
  if (!session) return;

  try{
    const data = signUpload();
    res.status(200).json(data);
  } catch(e){
    console.error(e);
    res.status(500).json({ error: 'No se pudo generar la firma de subida.' });
  }
});
