/* PROJECT BLACKWING – Data lives in Supabase, access only with the access code. */
const SUPABASE_URL = 'https://mwzmezrubzlxcaaqmojf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_vg6IQ24fI7rQrGgSQt_T9Q_J2-2WphA';
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => crypto.randomUUID().slice(0, 8).toUpperCase();

let contacts = [];
let admin = {};
let sys = {};
let selected = null;

/* ---------- Persistenz (nur über Code-geschützte Datenbankfunktionen) ---------- */
let code = sessionStorage.getItem('bw_code') || '';
function status(msg, err) { const el = $('#gate-msg'); el.textContent = msg; el.style.color = err ? 'var(--red)' : ''; }
async function rpc(fn, args = {}) {
  const { data, error } = await db.rpc(fn, { p_code: code, ...args });
  if (error || data === false) { alert('SAVE ERROR: ' + (error?.message || 'Invalid code')); throw error || new Error('denied'); }
  return data;
}
const saveContact = c => rpc('bw_save_contact', { p_id: c.id, p_data: c });
const deleteContact = id => rpc('bw_delete_contact', { p_id: id });
const saveProfile = () => rpc('bw_save_profile', { p_admin: admin, p_settings: sys });
async function loadAll() {
  const { data, error } = await db.rpc('bw_load', { p_code: code });
  if (error) throw error;
  if (data.error) throw new Error(data.error);
  contacts = data.contacts; admin = data.admin || {}; sys = data.settings || {};
  return data.status;
}

/* ---------- Zugang ---------- */
const GATE_ERR = { denied: '✖ ACCESS DENIED', locked: '✖ LOCKED – WAIT 15 MIN', short: '✖ AT LEAST 4 CHARACTERS' };
async function login() {
  code = $('#gate-pass').value;
  if (!code) return;
  status('VERIFYING…');
  try {
    const st = await loadAll();
    sessionStorage.setItem('bw_code', code);
    if (st === 'created') alert('Code set. It is now permanent – remember it!');
    sfx.granted();
    await bootSequence();
    enter();
  } catch (e) {
    sfx.denied();
    status(GATE_ERR[e.message] || '✖ ' + e.message, true);
    $('#gate-pass').value = ''; code = '';
  }
}
function enter() { $('#gate').hidden = true; $('#app').hidden = false; renderList(); fillAdmin(); }
$('#gate-btn').onclick = login;
$('#gate-pass').onkeydown = e => { if (e.key === 'Enter') login(); };
$('#lock').onclick = () => lockNow();
function lockNow() { sessionStorage.removeItem('bw_code'); location.reload(); }
if (code) loadAll().then(enter, () => { sessionStorage.removeItem('bw_code'); code = ''; });
setInterval(() => { $('#utc').textContent = new Date().toISOString().slice(0, 19).replace('T', ' ') + 'Z'; }, 1000);

/* ---------- Tabs ---------- */
document.querySelectorAll('nav button').forEach(b => b.onclick = () => {
  document.querySelectorAll('nav button').forEach(x => x.classList.toggle('active', x === b));
  document.querySelectorAll('.tab').forEach(t => { t.hidden = t.id !== 'tab-' + b.dataset.tab; });
  if (b.dataset.tab === 'lage') initMap();
  if (b.dataset.tab === 'admin') sysInfo();
});

/* ---------- Kontakte ---------- */
function daysToBirthday(iso) {
  if (!iso) return null;
  const now = new Date(), d = new Date(iso);
  const next = new Date(now.getFullYear(), d.getMonth(), d.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (next < today) next.setFullYear(next.getFullYear() + 1);
  return Math.round((next - today) / 864e5);
}
function renderList() {
  const q = $('#search').value.toLowerCase().trim();
  const list = contacts.filter(c => !q || JSON.stringify(c).toLowerCase().includes(q))
    .sort((a, b) => (a.last || '').localeCompare(b.last || ''));
  $('#contact-list').innerHTML = list.map(c => `
    <li data-id="${c.id}" class="${c.id === selected ? 'sel' : ''}">
      <b>${esc(c.last).toUpperCase()}${c.last && c.first ? ', ' : ''}${esc(c.first)}</b><br>
      ${c.relation ? `<span class="tag">${esc(c.relation)}</span>` : ''}
      ${(c.vehicles || []).filter(v => v.plate).map(v => `<span class="tag redact">${esc(v.plate)}</span>`).join('')}
    </li>`).join('') || '<li class="dim">NO ENTRIES</li>';
  $('#contact-list').querySelectorAll('li[data-id]').forEach(li => li.onclick = () => openContact(li.dataset.id));
  const soon = contacts.map(c => [c, daysToBirthday(c.birthday)]).filter(([, d]) => d !== null && d <= 14).sort((a, b) => a[1] - b[1]);
  $('#bdays').innerHTML = soon.map(([c, d]) => `🎂 ${esc(c.first)} ${esc(c.last)} – ${d === 0 ? 'TODAY' : 'in ' + d + ' d'}`).join('<br>');
}
$('#search').oninput = renderList;
$('#new-contact').onclick = () => {
  const c = { id: uid(), created: new Date().toISOString(), phones: [], vehicles: [] };
  contacts.push(c); openContact(c.id);
};

const SUB = {
  phones: { title: 'PHONE NUMBERS', fields: [['type', 'Type (mobile/landline)'], ['number', 'Number']] },
  vehicles: { title: 'VEHICLES', fields: [['make', 'Make/model'], ['color', 'Color'], ['plate', 'License plate']] },
};
function subHTML(key, items) {
  const s = SUB[key];
  const row = it => `<div class="sub-item">${s.fields.map(([f, l]) => `<input data-f="${f}" placeholder="${l}" value="${esc(it[f])}"${['number', 'plate'].includes(f) ? ' class="redact"' : ''}>`).join('')}<button type="button" class="danger rm">✕</button></div>`;
  return `<div class="sub" data-sub="${key}"><h3>${s.title}</h3><div class="items">${items.map(row).join('')}</div><button type="button" class="add">+ ADD</button></div>`;
}
function openContact(id) {
  selected = id;
  const c = contacts.find(x => x.id === id);
  const f = (name, label, type = 'text') => `<label>${label}<input name="${name}" type="${type}" value="${esc(c[name])}"></label>`;
  $('#detail').innerHTML = `
    <h3>CONTACT #${c.id}</h3>
    <form class="form" id="contact-form">
      ${f('first', 'First name')}${f('last', 'Last name')}${f('relation', 'Relation (family, friend…)')}
      ${f('birthday', 'Birthday', 'date')}${f('email', 'Email', 'email')}
      <label class="ac full">Search address<input id="addr-search" placeholder="Type street, city…" autocomplete="off"></label>
      ${f('street', 'Street & no.')}${f('zip', 'ZIP / postcode')}${f('city', 'City')}${f('country', 'Country')}
      ${subHTML('phones', c.phones || [])}
      ${subHTML('vehicles', c.vehicles || [])}
      <label class="full">Notes<textarea name="notes" rows="5">${esc(c.notes)}</textarea></label>
      <div class="actions"><button>SAVE</button><button type="button" id="showmap">⌖ SHOW ON MAP</button><button type="button" class="danger" id="del">DELETE</button></div>
    </form>`;
  const form = $('#contact-form');
  autocomplete($('#addr-search'), r => {
    ['street', 'zip', 'city', 'country'].forEach(k => { form.elements[k].value = r[k]; });
    c.geo = { q: [r.street, r.zip, r.city, r.country].filter(Boolean).join(', '), lat: r.lat, lon: r.lon };
    $('#addr-search').value = '';
  });
  form.querySelectorAll('.sub').forEach(sub => {
    const key = sub.dataset.sub;
    sub.querySelector('.add').onclick = () => {
      sub.querySelector('.items').insertAdjacentHTML('beforeend', subHTML(key, [{}]).match(/<div class="sub-item">.*?<\/button><\/div>/s)[0]);
      bindRm(sub);
    };
    bindRm(sub);
  });
  form.onsubmit = async e => {
    e.preventDefault();
    new FormData(form).forEach((v, k) => { c[k] = v.trim(); });
    form.querySelectorAll('.sub').forEach(sub => {
      c[sub.dataset.sub] = [...sub.querySelectorAll('.sub-item')].map(r => Object.fromEntries([...r.querySelectorAll('input')].map(i => [i.dataset.f, i.value.trim()])))
        .filter(o => Object.values(o).some(Boolean));
    });
    c.updated = new Date().toISOString();
    await saveContact(c); renderList(); flash('SAVED');
  };
  $('#showmap').onclick = () => showOnMap(c);
  $('#del').onclick = async () => {
    if (!confirm('Really delete this contact?')) return;
    await deleteContact(id); contacts = contacts.filter(x => x.id !== id);
    selected = null; $('#detail').innerHTML = '<p class="dim center">CONTACT DELETED</p>'; renderList();
  };
  renderList();
}
function bindRm(sub) { sub.querySelectorAll('.rm').forEach(b => b.onclick = () => b.parentElement.remove()); }
function flash(msg) { const b = $('#contact-form button'); const t = b.textContent; b.textContent = '✔ ' + msg; setTimeout(() => { b.textContent = t; }, 1200); }

$('#export').onclick = () => {
  const blob = new Blob([JSON.stringify({ contacts, admin, exported: new Date().toISOString() }, null, 2)], { type: 'application/json' });
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `blackwing-backup-${Date.now()}.json` });
  a.click(); URL.revokeObjectURL(a.href);
};
$('#import').onchange = async e => {
  try {
    const d = JSON.parse(await e.target.files[0].text());
    if (!Array.isArray(d.contacts)) throw 0;
    if (!confirm(`Import ${d.contacts.length} contacts? Matching IDs will be overwritten.`)) return;
    for (const c of d.contacts) await saveContact(c);
    if (d.admin) { admin = d.admin; await saveProfile(); fillAdmin(); }
    await loadAll();
    renderList();
  } catch { alert('Invalid file.'); }
  e.target.value = '';
};

/* ---------- Admin ---------- */
function fillAdmin() {
  const f = $('#admin-form');
  [...f.elements].forEach(el => { if (el.name) el.value = admin[el.name] ?? ''; });
}
autocomplete($('#admin-form').homeAddr, r => {
  $('#admin-form').homeAddr.value = r.label;
  admin.homeGeo = { lat: r.lat, lon: r.lon };
});
$('#admin-form').onsubmit = async e => {
  e.preventDefault();
  new FormData(e.target).forEach((v, k) => { admin[k] = v.trim(); });
  await saveProfile(); sysInfo();
};
$('#wipe').onclick = async () => {
  if (prompt('Type DELETE to confirm:') !== 'DELETE') return;
  await rpc('bw_wipe');
  location.reload();
};
function sysInfo() {
  const bytes = JSON.stringify(contacts).length + JSON.stringify(admin).length;
  $('#sysinfo').textContent =
`OPERATOR   ${admin.codename || '—'}
CONTACTS   ${contacts.length}
VEHICLES   ${contacts.reduce((n, c) => n + (c.vehicles || []).length, 0)}
STORAGE    ${(bytes / 1024).toFixed(1)} KB (Supabase)`;
}

/* ---------- Lagekarte ---------- */
let map, layers = {}, timers = {};
function feed(msg) {
  const el = $('#feed');
  el.insertAdjacentHTML('afterbegin', `<div>[${new Date().toISOString().slice(11, 19)}] ${esc(msg)}</div>`);
  while (el.children.length > 60) el.lastChild.remove();
}
// Schlichte Karte ohne Key: OpenFreeMap-Vektorkacheln, reduziert auf Hintergrund, Wasser, Straßen und Gebäude.
async function addBaseMap() {
  try {
    const style = await (await fetch('https://tiles.openfreemap.org/styles/dark')).json();
    const isPlace = l => l.type === 'symbol' && /country|state|city|town/i.test(l.id) && !/village|suburb|poi/i.test(l.id);
    style.layers = style.layers.filter(l => isPlace(l) || (l.type !== 'symbol'
      && /background|water|road|highway|street|path|bridge|tunnel|building|transportation|boundary/i.test(l.id)
      && !/rail|aeroway|ferry|landuse|park/i.test(l.id)));
    // Länder- und Städtenamen immer auf Englisch, in Großbuchstaben.
    style.layers.filter(isPlace).forEach(l => {
      l.layout = { ...l.layout, 'text-field': ['upcase', ['coalesce', ['get', 'name:en'], ['get', 'name_en'], ['get', 'name:latin'], ['get', 'name']]] };
    });
    L.maplibreGL({ style, attribution: '© OpenStreetMap © OpenFreeMap' }).addTo(map);
  } catch {
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, className: 'osm-dark', attribution: '© OpenStreetMap' }).addTo(map);
  }
}
function initMap() {
  if (map) { map.invalidateSize(); return; }
  map = L.map('map', { worldCopyJump: true, minZoom: 4, maxBounds: [[-85, -540], [85, 540]], maxBoundsViscosity: 1 }).setView(admin.homeGeo ? [admin.homeGeo.lat, admin.homeGeo.lon] : [51, 10], admin.homeGeo ? 9 : 6);
  addBaseMap();
  document.querySelectorAll('.layers input[data-layer]').forEach(cb => cb.onchange = () => toggle(cb.dataset.layer, cb.checked));
  let mv;
  map.on('moveend', () => { clearTimeout(mv); mv = setTimeout(() => { if (layers.flights) loadFlights(); }, 800); });
  feed('OPS MAP ONLINE');
}
function toggle(name, on) {
  if (!on) {
    clearInterval(timers[name]);
    if (layers[name]) { map.removeLayer(layers[name]); delete layers[name]; }
    if (name === 'radar') radarOverlay(false);
    const c = $('#c-' + name); if (c) c.textContent = '';
    feed(name.toUpperCase() + ' OFF');
    return;
  }
  layers[name] = name === 'night' ? L.terminator({ fillOpacity: .35, color: '#000' }) : L.layerGroup();
  layers[name].addTo(map);
  feed(name.toUpperCase() + ' ON');
  ({
    flights: () => { loadFlights(); timers.flights = setInterval(loadFlights, 15000); },
    quakes: () => { loadQuakes(); timers.quakes = setInterval(loadQuakes, 300000); },
    radar: () => radarOverlay(true),
    night: () => { timers.night = setInterval(() => layers.night && layers.night.setTime(), 60000); },
  })[name]();
}
const icon = (cls, ch, rot = 0) => L.divIcon({ className: '', html: `<div class="${cls}" style="transform:rotate(${rot}deg)">${ch}</div>`, iconSize: [16, 16], iconAnchor: [8, 8] });

async function loadFlights() {
  const b = map.getBounds(), c = map.getCenter();
  const dist = Math.min(250, Math.ceil(c.distanceTo(b.getNorthEast()) / 1852));
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/flights?lat=${c.lat.toFixed(3)}&lon=${c.lng.toFixed(3)}&dist=${dist}`);
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'HTTP ' + r.status);
    if (!layers.flights) return;
    layers.flights.clearLayers();
    d.ac.slice(0, 1500).forEach(a => {
      L.marker([a.lat, a.lon], { icon: icon('plane', '✈', (a.track || 0) - 90) })
        .bindPopup(`<b>${esc(a.call || a.hex)}</b><br>Reg: ${esc(a.reg || '—')}<br>Type: ${esc(a.type || '—')}<br>Altitude: ${a.alt === 'ground' ? 'ON GROUND' : a.alt ? Math.round(a.alt * 0.3048) + ' m' : '—'}<br>Speed: ${a.speed ? Math.round(a.speed * 1.852) + ' km/h' : '—'}<br>Heading: ${a.track != null ? Math.round(a.track) + '°' : '—'}<br>Squawk: ${esc(a.squawk || '—')}`)
        .addTo(layers.flights);
    });
    $('#c-flights').textContent = `(${d.ac.length})`;
    if (dist >= 250) feed('FLIGHTS: ONLY 460 KM AROUND MAP CENTER – PAN/ZOOM FOR MORE');
  } catch (e) { feed('FLIGHTS: ' + e.message); }
}
async function loadQuakes() {
  try {
    const d = await (await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson')).json();
    if (!layers.quakes) return;
    layers.quakes.clearLayers();
    d.features.forEach(q => {
      const [lon, lat, depth] = q.geometry.coordinates, m = q.properties.mag || 0;
      L.circleMarker([lat, lon], { radius: 3 + m * 2, color: m >= 5 ? '#ff3b3b' : '#ffb000', weight: 1, fillOpacity: .3 })
        .bindPopup(`<b>M ${m.toFixed(1)}</b><br>${esc(q.properties.place)}<br>Depth: ${depth} km<br>${new Date(q.properties.time).toLocaleString('en-GB')}`)
        .addTo(layers.quakes);
    });
    $('#c-quakes').textContent = `(${d.features.length})`;
  } catch (e) { feed('QUAKES: ' + e.message); }
}
async function geocode(q) {
  const r = await fetch(`https://photon.komoot.io/api/?limit=6&lang=en&q=${encodeURIComponent(q)}`);
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return (await r.json()).features.map(f => {
    const p = f.properties, city = p.city || p.town || p.village || '';
    const street = [p.street || (p.type === 'street' ? p.name : ''), p.housenumber].filter(Boolean).join(' ');
    return {
      street: street || p.name || '', zip: p.postcode || '', city: city || p.name || '', country: p.country || '',
      lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0],
      label: [p.name && p.name !== p.street ? p.name : '', street, [p.postcode, city].filter(Boolean).join(' '), p.country].filter(Boolean).join(', '),
    };
  });
}

/* ---------- Adressvorschläge ---------- */
function autocomplete(input, onPick) {
  const list = document.createElement('div');
  list.className = 'ac-list'; list.hidden = true;
  input.after(list);
  let timer, results = [], idx = -1;
  const close = () => { list.hidden = true; idx = -1; };
  const pick = i => { if (results[i]) { onPick(results[i]); close(); } };
  input.addEventListener('input', () => {
    clearTimeout(timer);
    const q = input.value.trim();
    if (q.length < 3) return close();
    timer = setTimeout(async () => {
      try {
        results = await geocode(q);
        list.innerHTML = results.map((r, i) => `<div data-i="${i}">${esc(r.label)}</div>`).join('') || '<div class="dim">NO RESULTS</div>';
        list.hidden = false; idx = -1;
      } catch { close(); }
    }, 300);
  });
  list.addEventListener('mousedown', e => { const el = e.target.closest('[data-i]'); if (el) { e.preventDefault(); pick(+el.dataset.i); } });
  input.addEventListener('keydown', e => {
    if (list.hidden) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      idx = (idx + (e.key === 'ArrowDown' ? 1 : -1) + results.length) % results.length;
      list.querySelectorAll('[data-i]').forEach((el, i) => el.classList.toggle('on', i === idx));
    } else if (e.key === 'Enter') { e.preventDefault(); pick(Math.max(idx, 0)); }
    else if (e.key === 'Escape') close();
  });
  input.addEventListener('blur', () => setTimeout(close, 150));
}

/* ---------- Adresse auf Karte ---------- */
let target = null;
async function showOnMap(c) {
  const q = [c.street, c.zip, c.city, c.country].filter(Boolean).join(', ');
  if (!q) { alert('No address saved.'); return; }
  document.querySelector('nav button[data-tab="lage"]').click();
  try {
    if (!c.geo || c.geo.q !== q) {
      const r = await geocode(q);
      if (!r.length) throw new Error('ADDRESS NOT FOUND');
      c.geo = { q, lat: r[0].lat, lon: r[0].lon }; saveContact(c);
    }
    if (target) map.removeLayer(target);
    target = L.layerGroup([
      L.circle([c.geo.lat, c.geo.lon], { radius: 120, color: '#39ff6a', weight: 1, fillOpacity: .08, className: 'pulse' }),
      L.marker([c.geo.lat, c.geo.lon], { icon: L.divIcon({ className: '', html: '<div class="target">⌖</div>', iconSize: [30, 30], iconAnchor: [15, 15] }) })
        .bindPopup(`<b>${esc(c.first)} ${esc(c.last).toUpperCase()}</b><br>${esc(q)}<br><span class="dim">${c.geo.lat.toFixed(5)}, ${c.geo.lon.toFixed(5)}</span>`),
    ]).addTo(map);
    feed('TARGET ACQUIRED: ' + [c.first, c.last].filter(Boolean).join(' '));
    map.flyTo([c.geo.lat, c.geo.lon], 17, { duration: 2.5 });
    map.once('moveend', () => target.eachLayer(l => l.openPopup && l.openPopup()));
  } catch (e) { feed('GEOCODING: ' + e.message); }
}
