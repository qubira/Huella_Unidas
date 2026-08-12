// Envuelve un handler de API para que los errores no controlados se conviertan
// en una respuesta 500 en JSON en vez de tumbar el proceso o filtrar el stack trace.
function withHandler(fn){
  return async (req, res) => {
    try{
      await fn(req, res);
    }catch(err){
      console.error(err);
      if (!res.headersSent) res.status(500).json({ error: 'Error interno del servidor.' });
    }
  };
}

module.exports = { withHandler };
