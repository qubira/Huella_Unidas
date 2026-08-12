const { neon } = require('@neondatabase/serverless');

let _sql = null;
function sql(){
  if (!_sql) {
    if (!process.env.DATABASE_URL) throw new Error('Falta DATABASE_URL');
    _sql = neon(process.env.DATABASE_URL);
  }
  return _sql;
}

module.exports = { sql };
