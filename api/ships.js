// Schiffe im Kartenausschnitt: verbindet sich ein paar Sekunden mit AISStream.io und sammelt Positionen.
// Key: Vercel-Umgebungsvariable AISSTREAM_KEY oder Header x-ais-key (aus dem Admin-Bereich).
export const config = { maxDuration: 15 };
export default async function handler(req, res) {
  const key = process.env.AISSTREAM_KEY || req.headers['x-ais-key'];
  if (!key) return res.status(400).json({ error: 'NO AIS KEY' });
  const [s, w, n, e] = String(req.query.bbox || '').split(',').map(Number);
  if (![s, w, n, e].every(isFinite)) return res.status(400).json({ error: 'bbox missing' });
  const ships = {};
  await new Promise(resolve => {
    const ws = new WebSocket('wss://stream.aisstream.io/v0/stream');
    const done = () => { try { ws.close(); } catch {} resolve(); };
    const t = setTimeout(done, 8000);
    ws.onopen = () => ws.send(JSON.stringify({ APIKey: key, BoundingBoxes: [[[s, w], [n, e]]], FilterMessageTypes: ['PositionReport'] }));
    ws.onerror = () => { clearTimeout(t); done(); };
    ws.onmessage = async ev => {
      try {
        const m = JSON.parse(typeof ev.data === 'string' ? ev.data : await ev.data.text());
        const meta = m.MetaData, p = m.Message?.PositionReport;
        if (meta && p) ships[meta.MMSI] = { mmsi: meta.MMSI, name: (meta.ShipName || '').trim(), lat: meta.latitude, lon: meta.longitude, sog: p.Sog, cog: p.Cog, hdg: p.TrueHeading };
        if (m.error) { clearTimeout(t); done(); }
      } catch {}
    };
  });
  res.json({ ships: Object.values(ships) });
}
