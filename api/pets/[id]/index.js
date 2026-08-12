const { sql } = require('../../_lib/db');
const { getSession, requireUser } = require('../../_lib/auth');
const { rowToPet } = require('../../_lib/serialize');
const { withHandler } = require('../../_lib/handler');

const ALLOWED_FIELDS = [
  'name','species','breed','sex','age','size','color','features','microchip','collar',
  'health','reward','photos','date','time','address','district','province','department',
  'lat','lng','description','vaccines','sterilized','story','requirements','status','flagged',
];

module.exports = withHandler(async (req, res) => {
  const db = sql();
  const { id } = req.query;

  if (req.method === 'GET'){
    const session = getSession(req);
    const rows = session
      ? await db`
          SELECT p.*, (f.user_id IS NOT NULL) AS is_favorited,
                 u.name AS owner_name, u.phone AS owner_phone
          FROM pets p
          LEFT JOIN favorites f ON f.pet_id = p.id AND f.user_id = ${session.id}
          LEFT JOIN users u ON u.id = p.owner_id
          WHERE p.id = ${id}`
      : await db`
          SELECT p.*, false AS is_favorited, u.name AS owner_name, u.phone AS owner_phone
          FROM pets p LEFT JOIN users u ON u.id = p.owner_id
          WHERE p.id = ${id}`;
    if (!rows[0]) return res.status(404).json({ error: 'Mascota no encontrada.' });
    const pet = rowToPet(rows[0]);
    pet.owner = rows[0].owner_id ? { id: rows[0].owner_id, name: rows[0].owner_name, phone: rows[0].owner_phone } : null;
    return res.status(200).json({ pet });
  }

  const session = requireUser(req, res);
  if (!session) return;

  const existingRows = await db`SELECT * FROM pets WHERE id = ${id}`;
  const existing = existingRows[0];
  if (!existing) return res.status(404).json({ error: 'Mascota no encontrada.' });

  const isOwner = existing.owner_id === session.id;
  const isAdmin = session.role === 'admin';
  if (!isOwner && !isAdmin){
    return res.status(403).json({ error: 'No tienes permiso sobre este reporte.' });
  }

  if (req.method === 'DELETE'){
    await db`DELETE FROM pets WHERE id = ${id}`;
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'PATCH'){
    const patch = req.body || {};
    const sets = [];
    const values = [];
    let i = 1;
    for (const key of Object.keys(patch)){
      if (!ALLOWED_FIELDS.includes(key)) continue;
      sets.push(`${key} = $${i++}`);
      values.push(patch[key]);
    }
    if (patch.status === 'reunida'){
      sets.push(`reunited_at = now()`);
    }
    if (patch.status === 'reunida' || patch.status === 'adoptada'){
      sets.push(`resolved_at = now()`);
    }
    if (!sets.length) return res.status(400).json({ error: 'Nada que actualizar.' });
    values.push(id);
    const rows = await db(`UPDATE pets SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`, values);
    return res.status(200).json({ pet: rowToPet(rows[0]) });
  }

  res.status(405).json({ error: 'Método no permitido.' });
});
