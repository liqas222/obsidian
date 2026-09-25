// Aktuelle ISS-Position.
export default async function handler(req, res) {
  try {
    const r = await fetch('https://api.wheretheiss.at/v1/satellites/25544');
    if (!r.ok) return res.status(502).json({ error: 'HTTP ' + r.status });
    res.setHeader('Cache-Control', 's-maxage=3');
    res.json(await r.json());
  } catch (e) { res.status(502).json({ error: e.message }); }
}
