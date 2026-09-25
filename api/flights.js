// Live-Flüge von adsb.lol (frei, ohne Key). Serverseitig, damit der Browser kein CORS-Problem hat.
export default async function handler(req, res) {
  const { lat, lon, dist } = req.query;
  const d = Math.min(Math.max(Math.round(+dist || 100), 1), 250);
  if (!isFinite(+lat) || !isFinite(+lon)) return res.status(400).json({ error: 'lat/lon missing' });
  try {
    const r = await fetch(`https://api.adsb.lol/v2/lat/${+lat}/lon/${+lon}/dist/${d}`, { headers: { 'User-Agent': 'blackwing-cc' } });
    if (!r.ok) return res.status(502).json({ error: 'adsb.lol HTTP ' + r.status });
    const j = await r.json();
    const ac = (j.ac || []).filter(a => a.lat != null && a.lon != null).map(a => ({
      hex: a.hex, call: (a.flight || '').trim(), reg: a.r, type: a.t, lat: a.lat, lon: a.lon,
      alt: a.alt_baro, speed: a.gs, track: a.track, squawk: a.squawk,
    }));
    res.setHeader('Cache-Control', 's-maxage=10');
    res.json({ ac });
  } catch (e) { res.status(502).json({ error: e.message }); }
}
