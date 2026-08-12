require('./_env').loadEnv();
const fs = require('fs');
const path = require('path');
const { Pool } = require('@neondatabase/serverless');

async function main(){
  if (!process.env.DATABASE_URL) throw new Error('Falta DATABASE_URL en .env');
  const sql = fs.readFileSync(path.join(__dirname, '..', 'db', 'schema.sql'), 'utf8');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try{
    await pool.query(sql);
    console.log('Migración aplicada correctamente.');
  } finally {
    await pool.end();
  }
}

main().catch(err => { console.error('Error en la migración:', err); process.exit(1); });
