// Agrupa matches/confirm/flag/favorite de una mascota en una sola función
// (el plan Hobby de Vercel limita a 12 funciones por deployment).
const { sql } = require('../../_lib/db');
const { requireUser } = require('../../_lib/auth');
const { rowToPet } = require('../../_lib/serialize');
const { findMatches } = require('../../_lib/matching');
const { withHandler } = require('../../_lib/handler');

async function matches(req, res, db, id){
  const minPercent = req.query.min ? Number(req.query.min) : 30;
  const petRows = await db`SELECT * FROM pets WHERE id = ${id}`;
  if (!petRows[0]) return res.status(404).json({ error: 'Mascota no encontrada.' });
  const pet = rowToPet(petRows[0]);

  const targetKind = pet.kind === 'perdida' ? 'encontrada' : pet.kind === 'encontrada' ? 'perdida' : null;
  if (!targetKind) return res.status(200).json({ matches: [] });

  const candidateRows = await db`
    SELECT * FROM pets WHERE kind = ${targetKind} AND lower(species) = lower(${pet.species})`;
  const candidates = candidateRows.map(rowToPet);

  const result = findMatches(pet, candidates, minPercent).map(m => ({ pet: m.pet, percent: m.percent }));
  res.status(200).json({ matches: result });
}

async function confirm(req, res, db, id){
  const session = requireUser(req, res);
  if (!session) return;

  const rows = await db`
    UPDATE pets SET
      confirmed_by = (SELECT array_agg(DISTINCT x) FROM unnest(confirmed_by || ARRAY[${session.id}::uuid]) AS x),
      status = CASE
        WHEN owner_id = ANY(confirmed_by || ARRAY[${session.id}::uuid])
         AND EXISTS (SELECT 1 FROM unnest(confirmed_by || ARRAY[${session.id}::uuid]) cb WHERE cb <> owner_id)
         AND status NOT IN ('reunida','adoptada')
        THEN (CASE WHEN kind = 'adopcion' THEN 'adoptada' ELSE 'reunida' END)
        ELSE status END,
      resolved_at = CASE
        WHEN owner_id = ANY(confirmed_by || ARRAY[${session.id}::uuid])
         AND EXISTS (SELECT 1 FROM unnest(confirmed_by || ARRAY[${session.id}::uuid]) cb WHERE cb <> owner_id)
         AND status NOT IN ('reunida','adoptada')
        THEN now() ELSE resolved_at END,
      reunited_at = CASE
        WHEN owner_id = ANY(confirmed_by || ARRAY[${session.id}::uuid])
         AND EXISTS (SELECT 1 FROM unnest(confirmed_by || ARRAY[${session.id}::uuid]) cb WHERE cb <> owner_id)
         AND status NOT IN ('reunida','adoptada') AND kind <> 'adopcion'
        THEN now() ELSE reunited_at END
    WHERE id = ${id}
    RETURNING *`;

  const petRow = rows[0];
  if (!petRow) return res.status(404).json({ error: 'Mascota no encontrada.' });

  const finalized = petRow.status === 'reunida' || petRow.status === 'adoptada';
  if (finalized && petRow.resolved_at && (Date.now() - new Date(petRow.resolved_at).getTime()) < 5000){
    const recipients = (petRow.confirmed_by || []).filter(Boolean);
    for (const uid of recipients){
      await db`
        INSERT INTO notifications (user_id, type, title, body, pet_id)
        VALUES (${uid}, 'resolved', ${petRow.kind === 'adopcion' ? '¡Adopción confirmada!' : '¡Reencuentro confirmado!'},
                ${`${petRow.name || 'La mascota'} fue marcada como ${petRow.status} por ambas partes.`}, ${petRow.id})`;
    }
  }

  res.status(200).json({ pet: rowToPet(petRow), finalized });
}

async function flag(req, res, db, id){
  const session = requireUser(req, res);
  if (!session) return;

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
}

async function favorite(req, res, db, id){
  const session = requireUser(req, res);
  if (!session) return;

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
}

module.exports = withHandler(async (req, res) => {
  const { id, action } = req.query;
  const db = sql();

  if (action === 'matches' && req.method === 'GET') return matches(req, res, db, id);
  if (action === 'confirm' && req.method === 'POST') return confirm(req, res, db, id);
  if (action === 'flag' && req.method === 'POST') return flag(req, res, db, id);
  if (action === 'favorite' && req.method === 'POST') return favorite(req, res, db, id);

  res.status(404).json({ error: 'No encontrado.' });
});
