const { sql } = require('../_lib/db');
const { requireUser } = require('../_lib/auth');
const { withHandler } = require('../_lib/handler');

// Devuelve la lista de conversaciones del usuario (o solo las de una mascota si
// se pasa ?petId=), con la mascota y el otro usuario ya incluidos (evita N+1 en el cliente).
module.exports = withHandler(async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido.' });
  const session = requireUser(req, res);
  if (!session) return;

  const db = sql();
  const petId = req.query.petId || null;

  const rows = await db`
    WITH my_msgs AS (
      SELECT m.*, CASE WHEN m.from_id = ${session.id} THEN m.to_id ELSE m.from_id END AS other_id
      FROM messages m
      WHERE (m.from_id = ${session.id} OR m.to_id = ${session.id})
        AND (${petId}::uuid IS NULL OR m.pet_id = ${petId}::uuid)
    ),
    latest AS (
      SELECT DISTINCT ON (pet_id, other_id) *
      FROM my_msgs
      ORDER BY pet_id, other_id, created_at DESC
    )
    SELECT l.pet_id, l.other_id, l.text AS last_text, l.created_at AS last_created_at,
           l.from_id AS last_from_id,
           p.name AS pet_name, p.photos AS pet_photos, p.status AS pet_status, p.kind AS pet_kind,
           u.name AS other_name
    FROM latest l
    JOIN pets p ON p.id = l.pet_id
    JOIN users u ON u.id = l.other_id
    ORDER BY l.created_at DESC`;

  const conversations = rows.map(r => ({
    petId: r.pet_id,
    otherUserId: r.other_id,
    otherUserName: r.other_name,
    pet: { id: r.pet_id, name: r.pet_name, photo: (r.pet_photos||[])[0] || null, status: r.pet_status, kind: r.pet_kind },
    lastMessage: { text: r.last_text, createdAt: new Date(r.last_created_at).getTime(), fromId: r.last_from_id },
  }));

  res.status(200).json({ conversations });
});
