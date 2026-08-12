const { sql } = require('../../_lib/db');
const { requireUser } = require('../../_lib/auth');
const { rowToPet } = require('../../_lib/serialize');
const { withHandler } = require('../../_lib/handler');

// Confirmación mutua de reencuentro/adopción: transacción atómica de una sola
// sentencia UPDATE para evitar condiciones de carrera si dos usuarios confirman casi a la vez.
module.exports = withHandler(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido.' });
  const session = requireUser(req, res);
  if (!session) return;

  const db = sql();
  const { id } = req.query;

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
});
