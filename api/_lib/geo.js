// Geolocalización por IP (mejor esfuerzo: si falla o la IP es privada, no bloquea el flujo).
function isPrivateIp(ip){
  if (!ip) return true;
  if (ip === '::1' || ip === '127.0.0.1') return true;
  if (/^10\./.test(ip)) return true;
  if (/^192\.168\./.test(ip)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)) return true;
  return false;
}

async function lookupGeo(ip){
  if (isPrivateIp(ip)) return null;
  try{
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(`http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,regionName,city,lat,lon`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== 'success') return null;
    return { country: data.country, region: data.regionName, city: data.city, lat: data.lat, lon: data.lon };
  }catch(e){
    return null;
  }
}

module.exports = { lookupGeo, isPrivateIp };
