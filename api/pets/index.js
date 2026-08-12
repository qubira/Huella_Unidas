const { sql } = require('../_lib/db');
const { getSession, requireUser } = require('../_lib/auth');
const { rowToPet } = require('../_lib/serialize');
const { withHandler } = require('../_lib/handler');

module.exports = withHandler(async (req, res) => {
  const db = sql();

  if (req.method === 'GET'){
    const session = getSession(req);
    const rows = session
      ? await db`
          SELECT p.*, (f.user_id IS NOT NULL) AS is_favorited, COALESCE(fl.flags, '[]'::json) AS flags
          FROM pets p
          LEFT JOIN favorites f ON f.pet_id = p.id AND f.user_id = ${session.id}
          LEFT JOIN LATERAL (
            SELECT json_agg(json_build_object('reason', pf.reason, 'byUserId', pf.by_user_id, 'createdAt', pf.created_at) ORDER BY pf.created_at) AS flags
            FROM pet_flags pf WHERE pf.pet_id = p.id
          ) fl ON true
          ORDER BY p.created_at DESC`
      : await db`
          SELECT p.*, false AS is_favorited, COALESCE(fl.flags, '[]'::json) AS flags
          FROM pets p
          LEFT JOIN LATERAL (
            SELECT json_agg(json_build_object('reason', pf.reason, 'byUserId', pf.by_user_id, 'createdAt', pf.created_at) ORDER BY pf.created_at) AS flags
            FROM pet_flags pf WHERE pf.pet_id = p.id
          ) fl ON true
          ORDER BY p.created_at DESC`;
    return res.status(200).json({ pets: rows.map(rowToPet) });
  }

  if (req.method === 'POST'){
    const session = requireUser(req, res);
    if (!session) return;
    const b = req.body || {};
    if (!b.kind || !b.status || !b.species){
      return res.status(400).json({ error: 'Faltan campos obligatorios (kind, status, species).' });
    }
    // Fase de prueba: solo se aceptan reportes de Lima (provincia y departamento).
    const isLima = (v) => !v || String(v).trim().toLowerCase() === 'lima';
    if (!isLima(b.province) || !isLima(b.department)){
      return res.status(400).json({ error: 'Por ahora esta plataforma solo acepta reportes de Lima (provincia y departamento).' });
    }
    const rows = await db`
      INSERT INTO pets (
        kind, status, name, species, breed, sex, age, size, color, features,
        microchip, collar, health, reward, photos, date, time, address, district,
        province, department, lat, lng, description, owner_id, vaccines, sterilized,
        story, requirements
      ) VALUES (
        ${b.kind}, ${b.status}, ${b.name || null}, ${b.species}, ${b.breed || null},
        ${b.sex || null}, ${b.age || null}, ${b.size || null}, ${b.color || null},
        ${b.features || null}, ${!!b.microchip}, ${!!b.collar}, ${b.health || null},
        ${b.reward || null}, ${Array.isArray(b.photos) ? b.photos : []}, ${b.date || null},
        ${b.time || null}, ${b.address || null}, ${b.district || null}, ${b.province || null},
        ${b.department || null}, ${b.lat != null ? b.lat : null}, ${b.lng != null ? b.lng : null},
        ${b.description || null}, ${session.id}, ${!!b.vaccines}, ${!!b.sterilized},
        ${b.story || null}, ${b.requirements || null}
      ) RETURNING *`;
    await db`
      INSERT INTO pet_status_history (pet_id, old_status, new_status, changed_by)
      VALUES (${rows[0].id}, NULL, ${rows[0].status}, ${session.id})`;
    return res.status(201).json({ pet: rowToPet(rows[0]) });
  }

  res.status(405).json({ error: 'Método no permitido.' });
});
