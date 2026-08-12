const crypto = require('crypto');

const UPLOAD_FOLDER = 'huellas-unidas/pets';

// Firma subidas directas del navegador a Cloudinary sin exponer el api_secret.
// https://cloudinary.com/documentation/upload_images#generating_authentication_signatures
function signUpload(extraParams = {}){
  if (!process.env.CLOUDINARY_API_SECRET) throw new Error('Falta CLOUDINARY_API_SECRET');
  if (!process.env.CLOUDINARY_API_KEY) throw new Error('Falta CLOUDINARY_API_KEY');
  if (!process.env.CLOUDINARY_CLOUD_NAME) throw new Error('Falta CLOUDINARY_CLOUD_NAME');

  const timestamp = Math.floor(Date.now() / 1000);
  const params = { folder: UPLOAD_FOLDER, timestamp, ...extraParams };

  const toSign = Object.keys(params).sort()
    .map(k => `${k}=${params[k]}`)
    .join('&');
  const signature = crypto
    .createHash('sha1')
    .update(toSign + process.env.CLOUDINARY_API_SECRET)
    .digest('hex');

  return {
    signature,
    timestamp,
    folder: UPLOAD_FOLDER,
    apiKey: process.env.CLOUDINARY_API_KEY,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
  };
}

module.exports = { signUpload, UPLOAD_FOLDER };
