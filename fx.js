/* BLACKWING – Effekte: Bootsequenz, Sound, Radar, Auto-Lock, verstecktes Terminal. */
const q = s => document.querySelector(s);
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ---------- Sound (Web Audio, keine Dateien) ---------- */
const sfx = (() => {
  let ctx, on = localStorage.getItem('bw_sound') !== 'off';
  // Ton durch Tiefpassfilter: dumpf und schwer wie in einem Kommandobunker.
  const tone = (freq, dur = 0.08, type = 'square', vol = 0.04, delay = 0, cutoff = 900, slide = 0) => {
    if (!on) return;
    try {
      ctx = ctx || new AudioContext();
      const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain(), t = ctx.currentTime + delay;
      o.type = type; o.frequency.setValueAtTime(freq, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
      f.type = 'lowpass'; f.frequency.value = cutoff; f.Q.value = 4;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(f).connect(g).connect(ctx.destination); o.start(t); o.stop(t + dur + 0.02);
    } catch {}
  };
  const api = {
    get on() { return on; },
    set(v) { on = v; try { localStorage.setItem('bw_sound', v ? 'on' : 'off'); } catch {} updateBtn(); },
    // Schweres Relais-Klacken
    key: () => { tone(140 + Math.random() * 40, 0.03, 'square', 0.05, 0, 600); },
    // Tiefes Sonar-Ping
    blip: () => tone(330, 0.35, 'sine', 0.07, 0, 700, 0.92),
    // Aufsteigender Bass-Akkord: Zugang gewährt
    granted: () => {
      tone(110, 0.9, 'sawtooth', 0.05, 0, 400);
      tone(165, 0.9, 'sawtooth', 0.04, 0.15, 500);
      tone(220, 1.1, 'sawtooth', 0.04, 0.3, 700);
    },
    // Tiefes Brummen: Zugang verweigert
    denied: () => { tone(70, 0.5, 'sawtooth', 0.09, 0, 300); tone(55, 0.7, 'sawtooth', 0.09, 0.45, 250); },
    // Klaxon-Alarm
    alarm: () => { for (let i = 0; i < 6; i++) tone(260, 0.55, 'sawtooth', 0.07, i * 0.7, 800, 0.75); },
    // Tiefes Rumpeln (Bootsequenz)
    rumble: (dur = 3) => { tone(45, dur, 'sine', 0.12, 0, 200); tone(47, dur, 'triangle', 0.06, 0, 200); },
  };
  function updateBtn() { const b = q('#sound'); if (b) b.textContent = on ? '🔊' : '🔇'; }
  document.addEventListener('DOMContentLoaded', () => {
    updateBtn();
    q('#sound').onclick = () => { api.set(!on); api.blip(); };
  });
  document.addEventListener('keydown', e => { if (e.target.matches('input, textarea') && e.key.length === 1) api.key(); });
  document.addEventListener('click', e => { if (e.target.closest('button')) api.blip(); });
  return api;
})();

/* ---------- Bootsequenz ---------- */
async function bootSequence() {
  const box = q('#boot'), out = q('#boot-text');
  box.hidden = false; out.textContent = '';
  sfx.rumble(4);
  let op = '';
  try { op = (typeof admin !== 'undefined' && admin.codename) || ''; } catch {}
  const lines = [
    'BLACKWING SECURE TERMINAL v4.7.1',
    '(C) BLACKWING COMMAND // ALL RIGHTS CLASSIFIED',
    '',
    'ESTABLISHING SECURE UPLINK ........ OK',
    'HANDSHAKE AES-256-GCM ............. OK',
    'VERIFYING OPERATOR CLEARANCE ...... OK',
    'DECRYPTING DATABASE ............... OK',
    'LOADING OPS MAP ................... OK',
    '',
    `ACCESS GRANTED${op ? ' // OPERATOR ' + op.toUpperCase() : ''}`,
  ];
  for (const line of lines) {
    for (const ch of line) { out.textContent += ch; if (ch !== ' ' && ch !== '.') sfx.key(); await sleep(ch === '.' ? 4 : 14); }
    out.textContent += '\n';
    await sleep(line.endsWith('OK') ? 90 : 40);
  }
  sfx.granted();
  await sleep(700);
  box.classList.add('fade');
  await sleep(400);
  box.hidden = true; box.classList.remove('fade');
}

/* ---------- Radar-Sweep über der Karte ---------- */
function radarOverlay(on) {
  let el = q('#radar');
  if (on && !el) {
    el = document.createElement('div');
    el.id = 'radar';
    el.innerHTML = '<div class="sweep"></div><div class="rings"></div>';
    q('#tab-lage').appendChild(el);
  } else if (!on && el) el.remove();
}

/* ---------- Auto-Lock nach Inaktivität ---------- */
const IDLE_MIN = 10;
let idleAt = Date.now();
['mousemove', 'keydown', 'click', 'touchstart', 'wheel'].forEach(ev => document.addEventListener(ev, () => { idleAt = Date.now(); }, { passive: true }));
setInterval(() => {
  if (q('#app')?.hidden) return;
  const left = IDLE_MIN * 60 - Math.floor((Date.now() - idleAt) / 1000);
  const el = q('#idle');
  if (el) el.textContent = left <= 60 ? `AUTO-LOCK ${left}s` : '';
  if (left <= 0) {
    sessionStorage.removeItem('bw_code');
    document.body.innerHTML = '<div id="boot"><pre>SESSION TERMINATED\n\nINACTIVITY TIMEOUT // RELOAD TO AUTHENTICATE</pre></div>';
    sfx.denied();
    setTimeout(() => location.reload(), 4000);
  }
}, 1000);

/* ---------- Verstecktes Terminal: Taste ` oder "blackwing" tippen ---------- */
(() => {
  let buf = '';
  const open = () => {
    if (q('#app')?.hidden) return;
    q('#term').hidden = false; q('#term-cmd').focus();
    if (!q('#term-out').textContent) print('BLACKWING TERMINAL READY. TYPE HELP.');
  };
  const close = () => { q('#term').hidden = true; };
  const print = t => { const o = q('#term-out'); o.textContent += t + '\n'; o.scrollTop = o.scrollHeight; };
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') return close();
    if (e.target.matches('input, textarea')) return;
    if (e.key === '`' || e.key === '^') { e.preventDefault(); return open(); }
    buf = (buf + e.key.toLowerCase()).slice(-9);
    if (buf === 'blackwing') { buf = ''; open(); }
  });
  const CMDS = {
    help: () => 'COMMANDS: HELP, STATUS, WHOAMI, TIME, CONTACTS, MAP, RADAR ON|OFF, SOUND ON|OFF, SCAN, LOCK, CLEAR, SELFDESTRUCT, EXIT',
    status: () => `SYSTEM NOMINAL\nCONTACTS ${contacts.length}\nSOUND ${sfx.on ? 'ON' : 'OFF'}\nAUTO-LOCK ${IDLE_MIN} MIN\nUPLINK SUPABASE // SECURE`,
    whoami: () => `OPERATOR ${(admin.codename || 'UNKNOWN').toUpperCase()}${admin.rank ? ' // ' + admin.rank.toUpperCase() : ''}`,
    time: () => new Date().toISOString().replace('T', ' ').slice(0, 19) + 'Z',
    contacts: () => contacts.map(c => `- ${(c.last || '').toUpperCase()} ${(c.first || '').toUpperCase()}`).join('\n') || 'NO ENTRIES',
    map: () => { document.querySelector('nav button[data-tab="lage"]').click(); return 'OPS MAP OPENED'; },
    radar: a => { const cb = document.querySelector('[data-layer="radar"]'); cb.checked = a !== 'off'; cb.dispatchEvent(new Event('change')); return 'RADAR ' + (cb.checked ? 'ON' : 'OFF'); },
    sound: a => { sfx.set(a !== 'off'); return 'SOUND ' + (sfx.on ? 'ON' : 'OFF'); },
    scan: async () => {
      for (const s of ['SCANNING FREQUENCIES', 'SWEEPING SECTOR 7G', 'CHECKING PERIMETER']) { print(s + ' ...'); sfx.blip(); await sleep(500); }
      return 'NO THREATS DETECTED';
    },
    lock: () => { setTimeout(lockNow, 500); return 'LOCKING…'; },
    clear: () => { q('#term-out').textContent = ''; return ''; },
    exit: () => { close(); return ''; },
    selfdestruct: async () => {
      sfx.alarm();
      document.body.classList.add('alert');
      for (let i = 5; i > 0; i--) { print(`SELF-DESTRUCT IN ${i}`); await sleep(800); }
      document.body.classList.remove('alert');
      return 'JUST KIDDING. SELF-DESTRUCT ABORTED BY COMMAND.';
    },
  };
  document.addEventListener('DOMContentLoaded', () => {
    q('#term-x').onclick = close;
    q('#term-cmd').addEventListener('keydown', async e => {
      if (e.key !== 'Enter') return;
      const [cmd, arg] = e.target.value.trim().toLowerCase().split(/\s+/);
      e.target.value = '';
      if (!cmd) return;
      print('> ' + cmd.toUpperCase() + (arg ? ' ' + arg.toUpperCase() : ''));
      const out = CMDS[cmd] ? await CMDS[cmd](arg) : `UNKNOWN COMMAND: ${cmd.toUpperCase()}`;
      if (out) print(out);
    });
  });
})();
