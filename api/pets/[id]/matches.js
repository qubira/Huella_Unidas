const { sql } = require('../../_lib/db');
const { rowToPet } = require('../../_lib/serialize');
const { findMatches } = require('../../_lib/matching');
const { withHandler } = require('../../_lib/handler');

module.exports = withHandler(async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido.' });
  const db = sql();
  const { id } = req.query;
  const minPercent = req.query.min ? Number(req.query.min) : 30;

  const petRows = await db`SELECT * FROM pets WHERE id = ${id}`;
  if (!petRows[0]) return res.status(404).json({ error: 'Mascota no encontrada.' });
  const pet = rowToPet(petRows[0]);

  const targetKind = pet.kind === 'perdida' ? 'encontrada' : pet.kind === 'encontrada' ? 'perdida' : null;
  if (!targetKind) return res.status(200).json({ matches: [] });

  const candidateRows = await db`
    SELECT * FROM pets WHERE kind = ${targetKind} AND lower(species) = lower(${pet.species})`;
  const candidates = candidateRows.map(rowToPet);

  const matches = findMatches(pet, candidates, minPercent)
    .map(m => ({ pet: m.pet, percent: m.percent }));

  res.status(200).json({ matches });
});
