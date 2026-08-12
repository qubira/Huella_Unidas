// Cifrado simétrico (AES-256-GCM) para datos sensibles de seguridad (IP, geolocalización).
// El texto cifrado se guarda como un solo string base64: IV(12) + authTag(16) + ciphertext.
const crypto = require('crypto');

function getKey(){
  const raw = process.env.LOGSEC_KEY;
  if (!raw) throw new Error('Falta LOGSEC_KEY');
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) throw new Error('LOGSEC_KEY debe ser una clave de 32 bytes en base64');
  return key;
}

function encrypt(plainText){
  if (plainText == null) return null;
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(String(plainText), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]).toString('base64');
}

function decrypt(encoded){
  if (!encoded) return null;
  try{
    const key = getKey();
    const raw = Buffer.from(encoded, 'base64');
    const iv = raw.subarray(0, 12);
    const authTag = raw.subarray(12, 28);
    const ciphertext = raw.subarray(28);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  }catch(e){
    return null;
  }
}

module.exports = { encrypt, decrypt };
