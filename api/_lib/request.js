function getClientIp(req){
  const fwd = req.headers['x-forwarded-for'];
  if (fwd) return String(fwd).split(',')[0].trim();
  return req.socket?.remoteAddress || null;
}

function getUserAgent(req){
  return req.headers['user-agent'] || null;
}

module.exports = { getClientIp, getUserAgent };
