'use strict';
/* =====================================================================
   Ivy Shelf — v4 features: reading room, pace, pick-for-me jar, import,
   formats / series / moods / lending, Steam achievements, sticker book,
   share cards, the friend's room, events, monthly quests, reading
   calendar and reminders. Loaded after app.js and shares its globals.
   ===================================================================== */

const FORMATS = { physical: 'Physical', ebook: 'E-book', audiobook: 'Audiobook', comic: 'Comic / manga' };
const MOOD_TAGS = ['cozy', 'spooky', 'romantic', 'adventurous', 'funny', 'sad', 'mysterious', 'thoughtful'];
const EXTRA_VIEWS = {};

/* ---------- pace forecasts ---------- */
function paceInfo(it) {
  const unit = it.type === 'book' ? 'pages' : 'hours';
  const total = it.type === 'book' ? +it.total_pages : +it.total_hours, done = it.type === 'book' ? +it.current_page || 0 : +it.hours_played || 0;
  if (!total || done >= total || it.status !== 'active') return null;
  const since = isoDay(new Date(Date.now() - 21 * 864e5));
  let logs = S.logs.filter(l => l.itemId === it.id && l.unit === unit && l.date >= since && !l.imported);
  if (logs.reduce((a, l) => a + l.amount, 0) <= 0) logs = S.logs.filter(l => l.unit === unit && l.date >= since && !l.imported); // fall back to your overall pace
  const amount = logs.reduce((a, l) => a + l.amount, 0); if (amount <= 0) return null;
  const first = logs.map(l => l.date).sort()[0], days = Math.max(7, daysBetween(first, today()) + 1);
  const perDay = amount / days, left = total - done, d = Math.ceil(left / perDay);
  if (!isFinite(d) || d > 999) return null;
  return { perDay, left, days: d, unit };
}
function paceText(it) {
  const p = paceInfo(it); if (!p) return '';
  const when = p.days <= 1 ? 'about a day' : p.days < 14 ? `about ${p.days} days` : p.days < 60 ? `about ${Math.round(p.days / 7)} weeks` : `about ${Math.round(p.days / 30)} months`;
  return it.type === 'book'
    ? `At your pace (${Math.round(p.perDay)} pages a day) you’ll finish in ${when}.`
    : `At your pace (${fmtHours(p.perDay * 7)} h a week) you’ll finish in ${when} — ${fmtHours(p.left)} h to go.`;
}

/* ---------- ambient sound (synthesised) ---------- */
const Ambient = {
  nodes: [], timers: [], master: null, kind: '',
  noise(a, color = 'white') {
    const len = a.sampleRate * 3, buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0); let last = 0;
    for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; if (color === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w; }
    const s = a.createBufferSource(); s.buffer = buf; s.loop = true; return s;
  },
  start(kind) {
    this.stop(); if (!kind) return; const a = audio(); if (!a) return; this.kind = kind;
    const m = a.createGain(); m.gain.value = S.settings.ambientVol ?? .5; m.connect(a.destination); this.master = m;
    const chain = (src, ...ns) => { let n = src; ns.forEach(x => { n.connect(x); n = x; }); n.connect(m); src.start(); this.nodes.push(src, ...ns); };
    const every = (fn, min, max) => { const t = () => { fn(); this.timers.push(setTimeout(t, min + Math.random() * (max - min))); }; this.timers.push(setTimeout(t, min)); };
    const blip = (f, dur, vol, type = 'sine', sweep = 0) => { const o = a.createOscillator(), g = a.createGain(), t = a.currentTime; o.type = type;
      o.frequency.setValueAtTime(f, t); if (sweep) o.frequency.exponentialRampToValueAtTime(f * sweep, t + dur);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + dur); o.connect(g).connect(m); o.start(t); o.stop(t + dur + .05); };
    if (kind === 'rain') {
      const f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1400; f.Q.value = .6; const g = a.createGain(); g.gain.value = .35; chain(this.noise(a), f, g);
      const lf = a.createBiquadFilter(); lf.type = 'lowpass'; lf.frequency.value = 400; const g2 = a.createGain(); g2.gain.value = .5; chain(this.noise(a, 'brown'), lf, g2);
      every(() => blip(2400 + Math.random() * 2400, .03, .05, 'sine', .5), 60, 260);
    } else if (kind === 'fire') {
      const lf = a.createBiquadFilter(); lf.type = 'lowpass'; lf.frequency.value = 600; const g = a.createGain(); g.gain.value = .7; chain(this.noise(a, 'brown'), lf, g);
      every(() => { for (let i = 0; i < 1 + Math.random() * 3; i++) setTimeout(() => blip(900 + Math.random() * 2500, .015, .12, 'square', .3), i * 30); }, 120, 700);
    } else if (kind === 'forest') {
      const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900; const g = a.createGain(); g.gain.value = .25; chain(this.noise(a, 'brown'), f, g);
      every(() => { const base = 2200 + Math.random() * 1600, n = 2 + Math.floor(Math.random() * 4); for (let i = 0; i < n; i++) setTimeout(() => blip(base, .09, .05, 'sine', 1.35), i * 120); }, 1800, 6000);
    } else if (kind === 'hum') {
      const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500; const g = a.createGain(); g.gain.value = .55; chain(this.noise(a, 'brown'), f, g);
      const lfo = a.createOscillator(), lg = a.createGain(); lfo.frequency.value = .15; lg.gain.value = .15; lfo.connect(lg).connect(g.gain); lfo.start(); this.nodes.push(lfo, lg);
      every(() => blip(1568 + Math.random() * 400, .25, .015, 'triangle'), 3000, 9000);
    }
  },
  volume(v) { S.settings.ambientVol = v; if (this.master) this.master.gain.value = v; },
  stop() { this.timers.forEach(clearTimeout); this.timers = []; this.nodes.forEach(n => { try { n.stop && n.stop(); } catch (e) {} try { n.disconnect(); } catch (e) {} }); this.nodes = []; if (this.master) { try { this.master.disconnect(); } catch (e) {} } this.master = null; this.kind = ''; }
};

/* ---------- reading room ---------- */
let roomTimer = null;
function openRoom() {
  const ss = S.session; const it = ss && byId(ss.itemId); if (!it) return;
  const B = it.type === 'book', kind = S.settings.ambient ?? 'rain';
  const root = $('#room-root');
  root.innerHTML = `<div class="reading-room ${S.settings.ambient === 'fire' ? 'is-fire' : ''}" role="dialog" aria-label="Reading room">
    <div class="rr-window"><div class="rr-rain"></div>${S.settings.ambient === 'fire' ? '' : ''}</div>
    <div class="rr-scene">${ROOM_SPRITES.lamp.replace('class="pix', 'class="pix rr-lamp')}${S.settings.ambient === 'fire' ? ROOM_SPRITES.fireplace.replace('class="pix', 'class="pix rr-fire') : ''}
      <div class="rr-friend">${mascotSVG({ ...outfit(), hand: B ? 'book' : 'controller' }, 'rr-toad')}${ROOM_SPRITES.armchair.replace('class="pix', 'class="pix rr-chair')}</div></div>
    <div class="rr-panel">
      <div class="rr-what">${B ? 'Reading' : 'Playing'} · <i>${esc(it.title)}</i></div>
      <div class="rr-clock" id="rr-clock">${clock(elapsedMin())}</div>
      <div class="rr-sounds">${[['', 'Silence'], ['rain', 'Rain'], ['fire', 'Fireplace'], ['forest', 'Forest'], ['hum', 'Café hum']].map(([k, n]) => `<button class="chip ${kind === k ? 'on' : ''}" data-act="ambient" data-k="${k}">${n}</button>`).join('')}</div>
      <label class="rr-vol">Volume <input type="range" min="0" max="1" step="0.05" value="${S.settings.ambientVol ?? .5}" data-input2="ambvol"></label>
      <div class="row" style="justify-content:center"><button class="btn sm" data-act="closeroom">Minimise</button><button class="btn sm mint" data-act="stopsession">Stop &amp; save</button></div>
    </div></div>`;
  document.body.style.overflow = 'hidden';
  clearInterval(roomTimer); roomTimer = setInterval(() => { const c = $('#rr-clock'); if (c) c.textContent = clock(elapsedMin()); }, 1000);
  if (kind && Ambient.kind !== kind) Ambient.start(kind);
}
function closeRoom(stopSound) { clearInterval(roomTimer); $('#room-root').innerHTML = ''; if (!$('#modal-root').innerHTML) document.body.style.overflow = ''; if (stopSound) Ambient.stop(); }

/* ---------- pick-for-me jar ---------- */
function openJar() {
  const f = ui.jar || (ui.jar = { type: 'any', mood: '', len: 'any' });
  openModal('Pick for me', `
    <div class="jar-wrap"><div class="jar" id="jar">${Array.from({ length: 9 }, (_, i) => `<span style="left:${10 + (i * 37) % 70}%;bottom:${6 + Math.floor(i / 3) * 18}%;transform:rotate(${i * 40}deg)">${acorn()}</span>`).join('')}</div><div id="jar-result"></div></div>
    <div class="field"><span>WHAT KIND?</span><div class="toggle2">${[['any', 'Anything'], ['book', 'A book'], ['game', 'A game']].map(([v, n]) => `<button class="${f.type === v ? 'on' : ''}" data-act="jarf" data-k="type" data-v="${v}">${n}</button>`).join('')}</div></div>
    <div class="field"><span>MOOD</span><div class="moods"><button class="chip ${!f.mood ? 'on' : ''}" data-act="jarf" data-k="mood" data-v="">any</button>${MOOD_TAGS.map(m => `<button class="chip ${f.mood === m ? 'on' : ''}" data-act="jarf" data-k="mood" data-v="${m}">${m}</button>`).join('')}</div></div>
    <div class="field"><span>LENGTH</span><div class="toggle2">${[['any', 'Any'], ['short', 'Short'], ['long', 'Long']].map(([v, n]) => `<button class="${f.len === v ? 'on' : ''}" data-act="jarf" data-k="len" data-v="${v}">${n}</button>`).join('')}</div></div>
    <p class="note" style="margin-top:0">Picks from your wishlist. Short = under 250 pages or 15 hours.</p>
    <div class="row" style="justify-content:center"><button class="btn primary" data-act="shakejar">${jarIco()} Shake the jar</button></div>`);
}
function jarPool() {
  const f = ui.jar;
  return S.items.filter(i => i.status === 'want' && (f.type === 'any' || i.type === f.type)
    && (!f.mood || (i.tags || []).includes(f.mood) || (i.genre || '').toLowerCase().includes(f.mood))
    && (f.len === 'any' || (() => { const n = i.type === 'book' ? +i.total_pages : +i.total_hours; if (!n) return true; const short = i.type === 'book' ? n < 250 : n < 15; return f.len === 'short' ? short : !short; })()));
}
function shakeJar() {
  const pool = jarPool(), jar = $('#jar'), out = $('#jar-result');
  if (!pool.length) { out.innerHTML = `<p class="note">Nothing on your wishlist matches — try another mood or length.</p>`; return; }
  jar.classList.remove('shake'); void jar.offsetWidth; jar.classList.add('shake'); sfx('pop');
  setTimeout(() => {
    const it = pool[Math.floor(Math.random() * pool.length)]; sfx('coin');
    out.innerHTML = `<div class="jar-pick">${coverHTML(it, true)}<div><div class="label">${mascot().the} picked</div><b>${esc(it.title)}</b><div class="small muted">${esc(it.type === 'book' ? it.author : it.platform)}</div>
      <div class="row" style="margin-top:8px"><button class="btn sm primary" data-act="jarstart" data-id="${it.id}">${it.type === 'book' ? 'Start reading' : 'Start playing'}</button><button class="btn sm" data-act="shakejar">Again</button></div></div></div>`;
  }, 900);
}

/* ---------- CSV import (Goodreads / StoryGraph) ---------- */
function parseCSV(text) {
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const head = (rows.shift() || []).map(h => h.trim().replace(/^﻿/, ''));
  return rows.filter(r => r.some(x => x.trim())).map(r => Object.fromEntries(head.map((h, i) => [h, (r[i] || '').trim()])));
}
const cleanIsbn = s => String(s || '').replace(/[="\s-]/g, '');
const csvDate = s => { s = String(s || '').trim(); if (!s) return ''; const m = s.match(/(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})/); return m ? `${m[1]}-${pad(+m[2])}-${pad(+m[3])}` : ''; };
function mapImportRows(rows) {
  if (!rows.length) return { source: '', books: [] };
  const k = Object.keys(rows[0]);
  const gr = k.includes('Exclusive Shelf'), sg = k.includes('Read Status');
  const source = gr ? 'Goodreads' : sg ? 'StoryGraph' : '';
  if (!source) return { source: '', books: [] };
  const books = rows.map(r => {
    const shelf = (gr ? r['Exclusive Shelf'] : r['Read Status']).toLowerCase();
    const status = /currently/.test(shelf) ? 'active' : /^read$/.test(shelf) ? 'finished' : /did-not-finish|dnf/.test(shelf) ? 'dnf' : 'want';
    const isbn = cleanIsbn(gr ? (r['ISBN13'] || r['ISBN']) : r['ISBN/UID']);
    const rating = Math.round(+(gr ? r['My Rating'] : r['Star Rating']) || 0);
    const fmt = (r['Format'] || r['Binding'] || '').toLowerCase();
    const moods = (r['Moods'] || '').toLowerCase().split(/[,;]/).map(s => s.trim()).filter(m => MOOD_TAGS.includes(m));
    return {
      title: (r['Title'] || '').replace(/\s*\(([^)]*#\d+[^)]*)\)\s*$/, ''), seriesHint: ((r['Title'] || '').match(/\(([^)]*?),?\s*#(\d+)\)\s*$/) || []),
      author: gr ? r['Author'] : (r['Authors'] || ''), isbn: /^\d{10,13}$/.test(isbn) ? isbn : '',
      total_pages: +(r['Number of Pages'] || 0) || '', status, rating: Math.min(5, rating),
      date_finished: status === 'finished' ? csvDate(gr ? r['Date Read'] : r['Last Date Read']) : '',
      date_added: csvDate(r['Date Added']) || today(), review: (gr ? r['My Review'] : r['Review']) || '',
      format: /audio/.test(fmt) ? 'audiobook' : /kindle|ebook|e-book|digital/.test(fmt) ? 'ebook' : /comic|manga|graphic/.test(fmt) ? 'comic' : fmt ? 'physical' : '',
      tags: moods
    };
  }).filter(b => b.title);
  return { source, books };
}
let pendingImport = null;
function openImport() {
  openModal('Import your books', `
    <p style="margin-top:0">Bring your history from <b>Goodreads</b> or <b>StoryGraph</b>:</p>
    <ul class="small" style="margin-top:0;padding-left:20px">
      <li><b>Goodreads:</b> My Books → Import and export → <i>Export library</i>, then download the CSV.</li>
      <li><b>StoryGraph:</b> Manage account → <i>Export StoryGraph library</i>.</li>
    </ul>
    <div class="row"><button class="btn primary" data-act="pickcsv">Choose CSV file</button></div>
    <div id="import-preview" style="margin-top:14px"></div>`);
}
function previewImport(text) {
  let res; try { res = mapImportRows(parseCSV(text)); } catch (e) { res = { source: '', books: [] }; }
  const box = $('#import-preview'); if (!box) return;
  if (!res.source) { box.innerHTML = `<p class="err">That doesn’t look like a Goodreads or StoryGraph export.</p>`; return; }
  const have = new Set(books().map(b => (b.isbn || '') + '|' + b.title.toLowerCase()));
  const titles = new Set(books().map(b => b.title.toLowerCase()));
  res.books = res.books.filter(b => !titles.has(b.title.toLowerCase()) && !have.has(b.isbn + '|' + b.title.toLowerCase()));
  pendingImport = res;
  const c = s => res.books.filter(b => b.status === s).length;
  box.innerHTML = res.books.length ? `<div class="px card parch"><b>${res.books.length} new books from ${res.source}</b>
      <div class="small muted" style="margin-top:6px">${c('finished')} read · ${c('active')} reading · ${c('want')} want to read${c('dnf') ? ' · ' + c('dnf') + ' DNF' : ''}</div>
      <p class="note">Covers come from Open Library by ISBN. Imported history fills your stats and calendar but doesn’t earn XP or acorns — those are for what you read from now on.</p>
      <button class="btn primary" data-act="doimportcsv">Import ${res.books.length} books</button></div>`
    : `<p class="note">Everything in that file is already on your shelf.</p>`;
}
function doImportCSV() {
  const res = pendingImport; if (!res) return;
  res.books.forEach(b => {
    const it = newItem('book', b.status);
    Object.assign(it, { title: b.title, author: b.author, isbn: b.isbn, total_pages: b.total_pages, rating: b.rating, review: b.status === 'finished' ? b.review : '',
      date_added: b.date_added, date_finished: b.date_finished, format: b.format, tags: b.tags, imported: res.source, updated_at: new Date().toISOString() });
    if (b.seriesHint && b.seriesHint[1]) { it.series = b.seriesHint[1].trim(); it.series_no = b.seriesHint[2]; }
    if (b.isbn) { it.cover_url = `https://covers.openlibrary.org/b/isbn/${b.isbn}-L.jpg?default=false`; }
    if (b.status === 'finished' && b.total_pages) { it.current_page = b.total_pages; if (b.date_finished) S.logs.push({ id: uid(), user_id: USER_ID, itemId: it.id, date: b.date_finished, unit: 'pages', amount: b.total_pages, imported: true }); }
    S.items.push(it);
  });
  const n = res.books.length; pendingImport = null; closeModal(); commit(); sfx('jingle');
  toast(`Imported ${n} books`, `from ${res.source}`, bookIco()); go('books');
}

/* ---------- Steam achievements ---------- */
async function syncAchievements(manual) {
  if (!S.settings.server || !S.settings.steamUser) return;
  const list = games().filter(g => g.steam_appid && g.status !== 'want').sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || '')).slice(0, 25);
  let changed = 0, failed = 0;
  for (const it of list) {
    try {
      const r = await api(`/steam/achievements?user=${encodeURIComponent(S.settings.steamUser)}&appid=${it.steam_appid}`);
      if (r && r.total) { const was = it.steam_ach || {}; it.steam_ach = { got: r.got, total: r.total, date: today() }; if (was.got !== r.got) changed++;
        if (r.got === r.total && !was.mastered) { it.steam_ach.mastered = true; toast('Mastered!', `${it.title} · every achievement`, starIco(), 'ach'); } }
    } catch (e) { failed++; if (/not found/i.test(e.message)) { if (manual) toast('Update your helper server', 'Achievements need the new server code'); return; } }
  }
  if (changed) save();
  if (manual) toast('Achievements synced', `${list.length - failed} games checked`, padIco());
}

/* ---------- sticker book ---------- */
EXTRA_VIEWS.stickers = function viewStickers() {
  const fin = S.items.filter(i => i.status === 'finished' && i.date_finished).sort((a, b) => b.date_finished.localeCompare(a.date_finished));
  const groups = {}; fin.forEach(i => (groups[i.date_finished.slice(0, 7)] = groups[i.date_finished.slice(0, 7)] || []).push(i));
  return `<div class="page-head"><div><div class="label">Every finish, a sticker</div><h1>Sticker book</h1></div><span class="chip-stat">${stickerIco()} ${fin.length}</span></div>
  ${fin.length ? Object.keys(groups).map(k => { const [y, m] = k.split('-'); return `<div class="section"><h2>${MONTHS_LONG[+m - 1]} ${y}</h2></div>
    <div class="px sticker-page">${groups[k].map(i => `<button class="sticker" data-act="open" data-id="${i.id}" style="transform:rotate(${(hash(i.id) % 15) - 7}deg)">${coverHTML(i, true)}${i.rating ? `<span class="st-hearts">${'♥'.repeat(i.rating)}</span>` : ''}</button>`).join('')}</div>`; }).join('')
    : emptyBox('Finish a book or a game and its sticker lands here.')}`;
};

/* ---------- share cards ---------- */
function svgToImage(svg, w, h) { return new Promise(res => { const img = new Image(); img.onload = () => res(img); img.onerror = () => res(null);
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.replace('<svg ', `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" `)); }); }
function loadCover(it) {
  return new Promise(res => { if (!it.cover_url) return res(null); const urls = [it.cover_url, ...(it.cover_fallbacks || [])]; let i = 0;
    const next = () => { if (i >= urls.length) return res(null); const img = new Image(); if (!urls[i].startsWith('data:')) img.crossOrigin = 'anonymous';
      img.onload = () => res(img.naturalWidth > 2 ? img : null); img.onerror = () => { i++; next(); }; img.src = urls[i]; }; next(); });
}
function wrapText(ctx, text, maxW) { const words = String(text).split(/\s+/), lines = []; let line = '';
  words.forEach(w => { const t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; }); if (line) lines.push(line); return lines; }
async function makeShareCard(it) {
  const W = 1080, H = 1350, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  const cs = getComputedStyle(document.documentElement), v = n => cs.getPropertyValue(n).trim();
  const cream = v('--cream') || '#fdf6e9', ink = v('--ink') || '#5a3e2b', pink = v('--pink') || '#f6c9d3', soft = v('--ink-soft') || '#8a6a52';
  try { await document.fonts.ready; } catch (e) {}
  x.fillStyle = pink; x.fillRect(0, 0, W, H);
  x.fillStyle = 'rgba(255,255,255,.18)'; for (let i = 0; i < 26; i++) x.fillRect((i * 173) % W, (i * 311) % H, 18, 18);
  x.fillStyle = cream; x.fillRect(60, 60, W - 120, H - 120); x.strokeStyle = ink; x.lineWidth = 10; x.strokeRect(60, 60, W - 120, H - 120);
  // cover
  const cw = 420, ch = 560, cx = (W - cw) / 2, cy = 130;
  x.fillStyle = 'rgba(90,62,43,.18)'; x.fillRect(cx + 16, cy + 20, cw, ch);
  const img = await loadCover(it); let drew = false;
  if (img) { try { const r = Math.max(cw / img.width, ch / img.height); x.save(); x.beginPath(); x.rect(cx, cy, cw, ch); x.clip(); x.drawImage(img, cx + (cw - img.width * r) / 2, cy + (ch - img.height * r) / 2, img.width * r, img.height * r); x.restore(); c.toDataURL(); drew = true; } catch (e) { drew = false; } }
  if (!drew) { x.fillStyle = PH_COLORS[hash(it.title) % PH_COLORS.length]; x.fillRect(cx, cy, cw, ch); x.fillStyle = '#5a3e2b'; x.font = 'italic 600 46px "EB Garamond", Georgia, serif'; x.textAlign = 'center';
    wrapText(x, it.title, cw - 70).slice(0, 5).forEach((l, i) => x.fillText(l, W / 2, cy + 200 + i * 54)); }
  x.strokeStyle = ink; x.lineWidth = 8; x.strokeRect(cx, cy, cw, ch);
  // text
  x.textAlign = 'center'; x.fillStyle = ink;
  x.font = 'italic 600 60px "EB Garamond", Georgia, serif'; const tl = wrapText(x, it.title, W - 260).slice(0, 2); tl.forEach((l, i) => x.fillText(l, W / 2, cy + ch + 90 + i * 64));
  let y = cy + ch + 90 + tl.length * 64;
  x.fillStyle = soft; x.font = '36px "EB Garamond", Georgia, serif'; x.fillText(it.type === 'book' ? (it.author || '') : (it.platform || ''), W / 2, y); y += 56;
  if (it.rating) { x.fillStyle = '#e8728f'; x.font = '50px Georgia, serif'; x.fillText('♥'.repeat(it.rating) + '♡'.repeat(5 - it.rating), W / 2, y + 10); y += 62; }
  const q = S.quotes.find(q => q.itemId === it.id);
  if (q) { x.fillStyle = ink; x.font = 'italic 32px "EB Garamond", Georgia, serif'; wrapText(x, '“' + q.text + '”', W - 300).slice(0, 2).forEach((l, i) => x.fillText(l, W / 2, y + 20 + i * 40)); }
  // footer
  x.fillStyle = soft; x.font = '20px "Press Start 2P", monospace';
  x.fillText((it.status === 'finished' ? (it.type === 'book' ? 'READ ' : 'COMPLETED ') + (it.date_finished ? fmtDate(it.date_finished).toUpperCase() : '') : (LABEL[it.type][it.status] || '').toUpperCase()), W / 2, H - 120);
  x.fillStyle = ink; x.font = 'italic 600 34px "EB Garamond", Georgia, serif'; x.textAlign = 'left'; x.fillText('Ivy Shelf', 100, H - 120);
  const toadImg = await svgToImage(toad('', 'awake'), 200, 200); if (toadImg) { x.imageSmoothingEnabled = false; x.drawImage(toadImg, W - 300, H - 330, 200, 200); }
  return new Promise(res => c.toBlob(res, 'image/png'));
}
async function shareCard(it) {
  toast('Painting your card…', '', stickerIco());
  const blob = await makeShareCard(it); if (!blob) { toast('Couldn’t make the card'); return; }
  const file = new File([blob], `${it.title.replace(/[^\w]+/g, '-').toLowerCase()}-ivy-shelf.png`, { type: 'image/png' });
  const url = URL.createObjectURL(blob);
  openModal('Share card', `<img src="${url}" alt="Share card for ${esc(it.title)}" style="width:100%;border:3px solid var(--ink)">
    <div class="row" style="justify-content:center;margin-top:14px"><button class="btn primary" id="share-go">Share or save</button></div>`, () => {
    $('#share-go').onclick = async () => {
      try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: it.title }); return; } } catch (e) { if (e.name === 'AbortError') return; }
      const a = document.createElement('a'); a.href = url; a.download = file.name; document.body.appendChild(a); a.click(); a.remove();
    };
  });
}

/* ---------- the friend's room ---------- */
const ROOM_UNLOCKS = [[2, 'rug', 'a cozy rug'], [3, 'window', 'a window'], [4, 'frame', 'a little painting'], [5, 'bookcase', 'a bookcase'], [7, 'lamp', 'a reading lamp'],
  [9, 'armchair', 'an armchair'], [12, 'fireplace', 'a fireplace'], [15, 'lights', 'fairy lights'], [20, 'bigplant', 'a big plant']];
nookHTML = function roomHTML() {
  const lv = progressNumbers().level, has = k => ROOM_UNLOCKS.some(([l, id]) => id === k && lv >= l);
  const decor = S.shop.decor.filter(d => DECOR_SPRITES[d]);
  const next = ROOM_UNLOCKS.find(([l]) => lv < l);
  return `<div class="px room">
    ${has('lights') ? `<div class="r-lights">${ROOM_SPRITES.lights}</div>` : ''}
    ${has('window') ? `<div class="r-window">${ROOM_SPRITES.window}</div>` : ''}
    ${has('frame') ? `<div class="r-frame">${ROOM_SPRITES.frame}</div>` : ''}
    <div class="r-shelf"><div class="items">${decor.map(d => DECOR_SPRITES[d]).join('')}</div><div class="plank"></div></div>
    ${has('bookcase') ? `<div class="r-bookcase">${ROOM_SPRITES.bookcase}</div>` : ''}
    ${has('lamp') ? `<div class="r-lamp">${ROOM_SPRITES.lamp}</div>` : ''}
    ${has('fireplace') ? `<div class="r-fire">${ROOM_SPRITES.fireplace}</div>` : ''}
    ${has('bigplant') ? `<div class="r-plant">${ROOM_SPRITES.bigplant}</div>` : ''}
    ${has('rug') ? '<div class="rug"></div>' : ''}
    ${has('armchair') ? `<div class="r-chair">${ROOM_SPRITES.armchair}</div>` : ''}
    <div class="r-friend ${has('armchair') ? 'seated' : ''}">${toad('toad', toadMood())}</div>
  </div>
  <p class="note" style="margin:10px 0 0">${next ? `Level ${next[0]} brings ${next[2]} to ${mascot().the}’s room.` : 'The room is complete — what a home!'}</p>`;
};

/* ---------- seasonal events ---------- */
const EVENTS = [
  { id: 'spooky', name: 'Spooky season', from: '10-01', to: '11-07', icon: '\u{1F383}',
    quests: [{ id: 'spooky-finish', text: 'Finish something spooky (mood tag “spooky” or a horror genre)', reward: 'pumpkin', test: (y) => S.items.some(i => i.status === 'finished' && inWindow(i.date_finished, 'spooky', y) && isMood(i, 'spooky', /horror|ghost|gothic|spooky/i)) }] },
  { id: 'winter', name: 'Winter fair', from: '12-01', to: '01-06', icon: '❄',
    quests: [{ id: 'winter-days', text: 'Read or play on 10 different days', reward: 'santahat', test: (y) => [...activityDays()].filter(d => inWindow(d, 'winter', y)).length >= 10 },
      { id: 'winter-cozy', text: 'Finish something cozy', reward: 'cocoa', test: (y) => S.items.some(i => i.status === 'finished' && inWindow(i.date_finished, 'winter', y) && isMood(i, 'cozy', /cozy|romance|fantasy/i)) }] },
  { id: 'spring', name: 'Spring bloom', from: '03-15', to: '04-30', icon: '\u{1F338}',
    quests: [{ id: 'spring-journal', text: 'Write 5 journal entries', reward: 'blossom', test: (y) => S.journal.filter(j => inWindow(j.date, 'spring', y)).length >= 5 }] },
  { id: 'summer', name: 'Summer days', from: '07-01', to: '08-31', icon: '☀',
    quests: [{ id: 'summer-finish', text: 'Finish 2 things', reward: 'sunhat', test: (y) => S.items.filter(i => i.status === 'finished' && inWindow(i.date_finished, 'summer', y)).length >= 2 },
      { id: 'summer-pages', text: 'Read 1,000 pages', reward: 'icecream', test: (y) => S.logs.filter(l => l.unit === 'pages' && !l.imported && inWindow(l.date, 'summer', y)).reduce((a, l) => a + l.amount, 0) >= 1000 }] }
];
const isMood = (i, m, re) => (i.tags || []).includes(m) || re.test(i.genre || '');
function eventWindow(ev, y) { const wraps = ev.to < ev.from; const start = `${y}-${ev.from}`, end = `${wraps ? y + 1 : y}-${ev.to}`; return [start, end]; }
function inWindow(d, id, y) { if (!d) return false; const [a, b] = eventWindow(EVENTS.find(e => e.id === id), y); return d >= a && d <= b; }
function activeEvent(dt = today()) {
  const y = +dt.slice(0, 4);
  for (const ev of EVENTS) for (const yy of [y, y - 1]) { const [a, b] = eventWindow(ev, yy); if (dt >= a && dt <= b) return { ev, y: yy }; }
  return null;
}
function nextEvent(dt = today()) {
  const y = +dt.slice(0, 4); let best = null;
  EVENTS.forEach(ev => [y, y + 1].forEach(yy => { const [a] = eventWindow(ev, yy); if (a > dt && (!best || a < best.start)) best = { ev, start: a }; }));
  return best;
}
function checkEvents() {
  const ae = activeEvent(); if (!ae) return;
  ae.ev.quests.forEach(q => { if (!S.shop.owned.includes(q.reward) && q.test(ae.y)) { S.shop.owned.push(q.reward); toast(`${ae.ev.name}: you earned a prize!`, `${SHOP.find(s => s.id === q.reward).name} — find it in Outfits`, starIco(), 'ach'); } });
}
function eventCard() {
  const ae = activeEvent();
  if (ae) return `<div class="section"><h2>${ae.ev.icon} ${ae.ev.name}</h2><span class="label">until ${fmtDate(eventWindow(ae.ev, ae.y)[1])}</span></div>
    <div class="px card pink stack">${ae.ev.quests.map(q => { const done = S.shop.owned.includes(q.reward), s = SHOP.find(x => x.id === q.reward);
      return `<div class="quest"><div class="q-art">${mascotSVG({ mascot: S.shop.mascot, [OUTFITS[q.reward].slot]: q.reward }, '')}</div><div><b>${esc(q.text)}</b><div class="small muted">Prize: ${esc(s.name)}${done ? ' — earned ✓' : ''}</div></div></div>`; }).join('')}</div>`;
  const ne = nextEvent(); return ne ? `<p class="note" style="margin-top:18px">${ne.ev.icon} Next event: <b>${ne.ev.name}</b> starts ${fmtDate(ne.start)}.</p>` : '';
}

/* ---------- monthly quests ---------- */
const QUEST_POOL = [
  { id: 'short', text: 'Finish something under 200 pages or 10 hours', reward: 15, t: (m) => S.items.some(i => i.status === 'finished' && (i.date_finished || '').startsWith(m) && (i.type === 'book' ? +i.total_pages && +i.total_pages < 200 : +i.hours_played && +i.hours_played < 10)) },
  { id: 'days7', text: 'Read or play on 7 different days', reward: 15, t: (m) => [...activityDays()].filter(d => d.startsWith(m)).length >= 7 },
  { id: 'journal3', text: 'Write 3 journal entries', reward: 10, t: (m) => S.journal.filter(j => j.date.startsWith(m)).length >= 3 },
  { id: 'lines2', text: 'Save 2 favourite lines', reward: 10, t: (m) => S.quotes.filter(q => (q.date || '').startsWith(m)).length >= 2 },
  { id: 'pages500', text: 'Read 500 pages', reward: 20, t: (m) => S.logs.filter(l => l.unit === 'pages' && !l.imported && l.date.startsWith(m)).reduce((a, l) => a + l.amount, 0) >= 500 },
  { id: 'hours10', text: 'Play for 10 hours', reward: 15, t: (m) => S.logs.filter(l => l.unit === 'hours' && !l.imported && l.date.startsWith(m)).reduce((a, l) => a + l.amount, 0) >= 10 },
  { id: 'finishgame', text: 'Complete a game', reward: 20, t: (m) => S.items.some(i => i.type === 'game' && i.status === 'finished' && (i.date_finished || '').startsWith(m)) },
  { id: 'rate3', text: 'Give hearts to 3 things you finished', reward: 10, t: (m) => S.items.filter(i => i.rating && (i.date_finished || '').startsWith(m)).length >= 3 },
  { id: 'backlog', text: 'Start something that’s been on your wishlist for 3+ months', reward: 15, t: (m) => S.items.some(i => (i.date_started || '').startsWith(m) && i.date_added && daysBetween(i.date_added, i.date_started) >= 90) },
  { id: 'session3', text: 'Do 3 timed sessions', reward: 10, t: (m) => S.sessions.filter(s => s.date.startsWith(m)).length >= 3 },
  { id: 'newgenre', text: 'Finish a book in a genre you haven’t finished before', reward: 15, t: (m) => { const before = new Set(books().filter(b => b.status === 'finished' && b.date_finished && b.date_finished < m && b.genre).map(b => b.genre)); return books().some(b => b.status === 'finished' && (b.date_finished || '').startsWith(m) && b.genre && !before.has(b.genre)); } }
];
function monthQuests(m = today().slice(0, 7)) {
  const h = hash(m), picks = []; let i = 0;
  while (picks.length < 3) { const q = QUEST_POOL[(h + i * 7) % QUEST_POOL.length]; if (!picks.includes(q)) picks.push(q); i++; }
  return picks;
}
function questsCard() {
  const m = today().slice(0, 7), claimed = (S.quests[m] || []);
  return `<div class="section"><h2>This month’s quests</h2><span class="label">${MONTHS_LONG[+m.slice(5) - 1]}</span></div>
  <div class="px card stack">${monthQuests(m).map(q => { const done = q.t(m), got = claimed.includes(q.id);
    return `<div class="quest ${got ? 'claimed' : ''}"><div class="q-check">${got ? '✓' : done ? '!' : ''}</div><div style="flex:1"><b>${esc(q.text)}</b><div class="small muted">${acorn().replace('class="pix', 'class="pix q-acorn')} ${q.reward} acorns</div></div>
      ${got ? '<span class="label">claimed</span>' : done ? `<button class="btn sm mint" data-act="claimquest" data-q="${q.id}">Claim</button>` : ''}</div>`; }).join('')}</div>`;
}
function claimQuest(id) {
  const m = today().slice(0, 7), q = monthQuests(m).find(x => x.id === id); if (!q || !q.t(m)) return;
  S.quests[m] = S.quests[m] || []; if (S.quests[m].includes(id)) return;
  S.quests[m].push(id); S.bonus = (S.bonus || 0) + q.reward; sfx('coin'); toast('Quest complete!', `+${q.reward} acorns`, acorn()); commit();
}

/* ---------- reading calendar ---------- */
function calendarCard(y) {
  const per = {}; S.logs.forEach(l => { if (!l.date.startsWith(String(y))) return; per[l.date] = (per[l.date] || 0) + (l.unit === 'pages' ? l.amount : l.amount * 30); });
  S.sessions.forEach(s => { if (s.date.startsWith(String(y))) per[s.date] = (per[s.date] || 0) + 5; });
  S.journal.forEach(j => { if (j.date.startsWith(String(y))) per[j.date] = (per[j.date] || 0) + 1; });
  const start = new Date(y, 0, 1), off = (start.getDay() + 6) % 7, cells = [];
  for (let i = 0; i < off; i++) cells.push('<i class="cal-x"></i>');
  for (let d = new Date(start); d.getFullYear() === y; d.setDate(d.getDate() + 1)) {
    const k = isoDay(d), v = Math.max(0, per[k] || 0), lvl = v <= 0 ? 0 : v < 20 ? 1 : v < 60 ? 2 : v < 120 ? 3 : 4;
    cells.push(`<i class="cal l${lvl}" title="${fmtDate(k)}${v ? ' · active' : ''}"></i>`);
  }
  const days = Object.keys(per).filter(k => per[k] > 0).length;
  return `<div class="section"><h2>Reading calendar</h2><span class="label">${days} active days</span></div>
  <div class="px card"><div class="calendar">${cells.join('')}</div>
  <div class="row small muted" style="margin-top:10px;gap:6px">less <i class="cal l0"></i><i class="cal l1"></i><i class="cal l2"></i><i class="cal l3"></i><i class="cal l4"></i> more · each square is a day; flowers bloom on your biggest days</div></div>`;
}

/* ---------- reminders ---------- */
function reminderBanner() {
  if (!S.items.length) return '';
  const last = S.settings.lastBackup || '', snooze = S.settings.backupSnooze || '';
  if (snooze && snooze > today()) return '';
  if (last && daysBetween(last, today()) < 14) return '';
  return `<div class="banner cta" style="margin-top:18px">${gearIco()}<div style="flex:1"><b>${last ? `No backup for ${daysBetween(last, today())} days` : 'Time for a first backup'}</b><div class="small muted">Your shelf lives only on this device.</div></div>
    <div class="row" style="gap:4px"><button class="btn sm primary" data-act="export">Save</button><button class="btn sm" data-act="snoozebackup">Later</button></div></div>`;
}

/* ---------- lending ---------- */
function lendForm(it) {
  openModal(`Lend “${esc(it.title)}”`, `
    <label class="field"><span>WHO HAS IT?</span><input class="inp" id="lend-who" value="${esc(it.lent_to || '')}" placeholder="e.g. Marta"></label>
    <label class="field"><span>SINCE</span><input class="inp" type="date" id="lend-date" value="${it.lent_date || today()}"></label>
    <div class="row" style="justify-content:space-between">${it.lent_to ? '<button class="btn sm" id="lend-back">It came back!</button>' : '<span></span>'}<div class="row"><button class="btn" data-act="close">Cancel</button><button class="btn primary" id="lend-save">Save</button></div></div>`, () => {
    $('#lend-save').onclick = () => { const w = $('#lend-who').value.trim(); it.lent_to = w; it.lent_date = w ? ($('#lend-date').value || today()) : ''; touch(it); closeModal(); commit(); };
    if (it.lent_to) $('#lend-back').onclick = () => { it.lent_to = ''; it.lent_date = ''; touch(it); closeModal(); commit(); toast('Welcome home, little book'); };
  });
}

/* ---------- detail-page extras ---------- */
function itemExtrasTop(it) {
  const bits = [];
  if (it.format && FORMATS[it.format]) bits.push(`<span class="badge">${FORMATS[it.format]}</span>`);
  if (it.series) bits.push(`<span class="badge">${esc(it.series)}${it.series_no ? ' #' + esc(it.series_no) : ''}</span>`);
  (it.tags || []).forEach(t => bits.push(`<span class="badge b-tag">${esc(t)}</span>`));
  if (it.steam_ach && it.steam_ach.total) bits.push(`<span class="badge ${it.steam_ach.got === it.steam_ach.total ? 'b-finished' : ''}">${starIco()} ${it.steam_ach.got === it.steam_ach.total ? 'Mastered' : it.steam_ach.got + '/' + it.steam_ach.total}</span>`);
  if (it.lent_to) bits.push(`<span class="badge b-want">Lent to ${esc(it.lent_to)}</span>`);
  return bits.length ? `<div class="row" style="gap:6px">${bits.join('')}</div>` : '';
}
function itemExtrasProgress(it) {
  const pt = paceText(it);
  let out = pt ? `<p class="note" style="margin:0 0 10px">${pt}</p>` : '';
  if (it.steam_ach && it.steam_ach.total) out += `<div class="label" style="margin:6px 0">Steam achievements ${it.steam_ach.got}/${it.steam_ach.total}</div><div class="bar" style="margin-bottom:12px"><i style="width:${Math.round(it.steam_ach.got / it.steam_ach.total * 100)}%"></i></div>`;
  return out;
}
function itemExtrasBottom(it) {
  let s = '';
  if (it.series) {
    const sib = S.items.filter(x => x.id !== it.id && x.series && x.series.toLowerCase() === it.series.toLowerCase()).sort((a, b) => (+a.series_no || 0) - (+b.series_no || 0));
    const nextUp = sib.find(x => (+x.series_no || 0) > (+it.series_no || 0) && x.status !== 'finished');
    if (sib.length) s += `<div class="section"><h2>${esc(it.series)}</h2>${nextUp ? `<span class="label">next up: #${esc(nextUp.series_no || '?')}</span>` : ''}</div><div class="shelf-row">${sib.map(tile).join('')}</div>`;
  }
  s += `<div class="row" style="margin-top:22px;gap:6px">
    <button class="btn sm" data-act="sharecard" data-id="${it.id}">${stickerIco()} Share card</button>
    ${it.type === 'book' ? `<button class="btn sm" data-act="lend" data-id="${it.id}">${it.lent_to ? 'Lent out…' : 'Lend it'}</button>` : ''}
    ${S.session && S.session.itemId === it.id ? `<button class="btn sm mint" data-act="openroom">${roomIco()} Reading room</button>` : ''}
  </div>`;
  return s;
}
function formExtras(d) {
  return `
  <div class="grid2">
    <label class="field"><span>FORMAT</span><select class="inp" data-change="fformat"><option value="">—</option>${Object.entries(FORMATS).filter(([k]) => d.type === 'book' || k === 'physical').map(([k, n]) => `<option value="${k}" ${d.format === k ? 'selected' : ''}>${d.type === 'game' && k === 'physical' ? 'Physical copy' : n}</option>`).join('')}${d.type === 'game' ? `<option value="digital" ${d.format === 'digital' ? 'selected' : ''}>Digital</option>` : ''}</select></label>
    <label class="field"><span>SERIES &amp; #</span><span class="row" style="gap:6px;flex-wrap:nowrap"><input class="inp" value="${esc(d.series || '')}" data-input="f" data-k="series" placeholder="series"><input class="inp" style="width:64px" inputmode="numeric" value="${esc(d.series_no || '')}" data-input="f" data-k="series_no" placeholder="#"></span></label>
  </div>
  <div class="field"><span>MOOD TAGS</span><div class="moods">${MOOD_TAGS.map(m => `<button class="chip ${(d.tags || []).includes(m) ? 'on' : ''}" data-act="ftag" data-v="${m}" type="button">${m}</button>`).join('')}</div></div>`;
}

/* ---------- actions ---------- */
Object.assign(A, {
  openroom: () => openRoom(), closeroom: () => closeRoom(false),
  stopsession: () => { closeRoom(false); stopSession(); },
  ambient: d => { S.settings.ambient = d.k; save(); Ambient.start(d.k); $$('.rr-sounds .chip').forEach(c => c.classList.toggle('on', c.dataset.k === d.k)); },
  jar: () => openJar(),
  jarf: d => { ui.jar[d.k] = d.v; const keep = $('#jar-result') && $('#jar-result').innerHTML; openJar(); },
  shakejar: () => shakeJar(),
  jarstart: d => { closeModal(); const it = byId(d.id); setStatus(it, 'active'); commit(); go('item-' + it.id); toast(it.type === 'book' ? 'Happy reading!' : 'Have fun!', it.title, null, 'start'); },
  importcsv: () => openImport(), pickcsv: () => $('#file-csv').click(), doimportcsv: () => doImportCSV(),
  achsync: () => syncAchievements(true),
  sharecard: d => shareCard(byId(d.id)),
  lend: d => lendForm(byId(d.id)),
  claimquest: d => claimQuest(d.q),
  snoozebackup: () => { S.settings.backupSnooze = isoDay(new Date(Date.now() + 7 * 864e5)); commit(); },
  ftag: (d, el) => { draft.tags = draft.tags || []; draft.tags = draft.tags.includes(d.v) ? draft.tags.filter(t => t !== d.v) : [...draft.tags, d.v]; el.classList.toggle('on'); }
});
document.addEventListener('change', ev => { if (ev.target.dataset.change === 'fformat' && draft) draft.format = ev.target.value; });
document.addEventListener('input', ev => { if (ev.target.dataset.input2 === 'ambvol') { Ambient.volume(+ev.target.value); save(); } });
document.addEventListener('DOMContentLoaded', () => {});
(function mountExtras() {
  const csv = document.createElement('input'); csv.type = 'file'; csv.accept = '.csv,text/csv'; csv.hidden = true; csv.id = 'file-csv'; document.body.appendChild(csv);
  csv.addEventListener('change', () => { const f = csv.files[0]; csv.value = ''; if (!f) return; const r = new FileReader(); r.onload = () => previewImport(String(r.result)); r.readAsText(f); });
  const room = document.createElement('div'); room.id = 'room-root'; document.body.appendChild(room);
})();
