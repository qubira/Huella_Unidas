// Agrupa conversations/thread/send en una sola función
// (el plan Hobby de Vercel limita a 12 funciones por deployment).
const { sql } = require('../_lib/db');
const { requireUser } = require('../_lib/auth');
const { rowToMessage } = require('../_lib/serialize');
const { withHandler } = require('../_lib/handler');

// Lista de conversaciones del usuario (o solo las de una mascota si se pasa ?petId=),
// con la mascota y el otro usuario ya incluidos (evita N+1 en el cliente).
async function conversations(req, res, db, session){
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

  const result = rows.map(r => ({
    petId: r.pet_id,
    otherUserId: r.other_id,
    otherUserName: r.other_name,
    pet: { id: r.pet_id, name: r.pet_name, photo: (r.pet_photos||[])[0] || null, status: r.pet_status, kind: r.pet_kind },
    lastMessage: { text: r.last_text, createdAt: new Date(r.last_created_at).getTime(), fromId: r.last_from_id },
  }));
  res.status(200).json({ conversations: result });
}

async function thread(req, res, db, session){
  const { petId, with: otherId } = req.query;
  if (!petId || !otherId) return res.status(400).json({ error: 'Faltan petId o with.' });

  const rows = await db`
    SELECT m.*, u.name AS from_name
    FROM messages m
    JOIN users u ON u.id = m.from_id
    WHERE m.pet_id = ${petId}
      AND ((m.from_id = ${session.id} AND m.to_id = ${otherId})
        OR (m.from_id = ${otherId} AND m.to_id = ${session.id}))
    ORDER BY m.created_at ASC`;

  const messages = rows.map(r => ({ ...rowToMessage(r), fromName: r.from_name }));
  res.status(200).json({ messages });
}

async function send(req, res, db, session){
  const { petId, toId, text, shared } = req.body || {};
  if (!petId || !toId || !text) return res.status(400).json({ error: 'Faltan petId, toId o text.' });

  const rows = await db`
    INSERT INTO messages (pet_id, from_id, to_id, text, shared)
    VALUES (${petId}, ${session.id}, ${toId}, ${text}, ${!!shared})
    RETURNING *`;

  const petRows = await db`SELECT name FROM pets WHERE id = ${petId}`;
  const petName = petRows[0]?.name || 'una mascota';
  await db`
    INSERT INTO notifications (user_id, type, title, body, pet_id)
    VALUES (${toId}, 'message', 'Nuevo mensaje', ${`Tienes un nuevo mensaje sobre ${petName}.`}, ${petId})`;

  res.status(201).json({ message: rowToMessage(rows[0]) });
}

module.exports = withHandler(async (req, res) => {
  const session = requireUser(req, res);
  if (!session) return;
  const db = sql();
  const { action } = req.query;

  if (action === 'conversations' && req.method === 'GET') return conversations(req, res, db, session);
  if (action === 'thread' && req.method === 'GET') return thread(req, res, db, session);
  if (action === 'send' && req.method === 'POST') return send(req, res, db, session);

  res.status(404).json({ error: 'No encontrado.' });
});
