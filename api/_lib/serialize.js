// Convierte filas de Postgres (snake_case) al mismo formato camelCase
// que ya esperaba el frontend cuando los datos vivían en localStorage.

function rowToUser(row){
  if (!row) return null;
  return {
    id: row.id, name: row.name, email: row.email, phone: row.phone,
    role: row.role, verified: row.verified, blocked: row.blocked,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : null,
  };
}

function rowToPet(row){
  if (!row) return null;
  return {
    id: row.id, kind: row.kind, status: row.status, name: row.name,
    species: row.species, breed: row.breed, sex: row.sex, age: row.age,
    size: row.size, color: row.color, features: row.features,
    microchip: row.microchip, collar: row.collar, health: row.health,
    reward: row.reward, photos: row.photos || [],
    date: row.date ? (row.date instanceof Date ? row.date.toISOString().slice(0,10) : String(row.date).slice(0,10)) : null,
    time: row.time, address: row.address, district: row.district,
    province: row.province, department: row.department,
    lat: row.lat != null ? Number(row.lat) : null,
    lng: row.lng != null ? Number(row.lng) : null,
    description: row.description, ownerId: row.owner_id,
    vaccines: row.vaccines, sterilized: row.sterilized,
    story: row.story, requirements: row.requirements,
    flagged: row.flagged, flags: row.flags || [], confirmedBy: row.confirmed_by || [],
    reunitedAt: row.reunited_at ? new Date(row.reunited_at).getTime() : null,
    resolvedAt: row.resolved_at ? new Date(row.resolved_at).getTime() : null,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : null,
    isFavorited: row.is_favorited === true || row.is_favorited === 't',
  };
}

function rowToMessage(row){
  if (!row) return null;
  return {
    id: row.id, petId: row.pet_id, fromId: row.from_id, toId: row.to_id,
    text: row.text, shared: row.shared,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : null,
  };
}

function rowToNotif(row){
  if (!row) return null;
  return {
    id: row.id, userId: row.user_id, type: row.type, title: row.title,
    body: row.body, petId: row.pet_id, read: row.read,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : null,
  };
}

module.exports = { rowToUser, rowToPet, rowToMessage, rowToNotif };
