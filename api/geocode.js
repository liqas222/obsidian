// Adressvorschläge über Photon (OpenStreetMap-Daten).
export default async function handler(req, res) {
  const q = String(req.query.q || '').trim();
  if (q.length < 3) return res.json({ results: [] });
  try {
    const r = await fetch(`https://photon.komoot.io/api/?limit=6&lang=en&q=${encodeURIComponent(q)}`, { headers: { 'User-Agent': 'blackwing-cc' } });
    if (!r.ok) return res.status(502).json({ error: 'HTTP ' + r.status });
    const j = await r.json();
    const results = j.features.map(f => {
      const p = f.properties;
      return {
        street: [p.street || (p.type === 'street' ? p.name : ''), p.housenumber].filter(Boolean).join(' ') || p.name || '',
        zip: p.postcode || '', city: p.city || p.town || p.village || p.name || '', country: p.country || '',
        lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0],
        label: [p.name !== p.street ? p.name : '', [p.street, p.housenumber].filter(Boolean).join(' '), [p.postcode, p.city || p.town || p.village].filter(Boolean).join(' '), p.country].filter(Boolean).join(', '),
      };
    });
    res.setHeader('Cache-Control', 's-maxage=86400');
    res.json({ results });
  } catch (e) { res.status(502).json({ error: e.message }); }
}
