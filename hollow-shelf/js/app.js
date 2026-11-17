'use strict';
/* =====================================================================
   Ivy Shelf — personal book & game tracker (v2)
   Data lives in this device's IndexedDB. Sprites come from sprites.js.
   ===================================================================== */

/* ---------- tiny helpers ---------- */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id' + Date.now().toString(36) + Math.random().toString(36).slice(2));
const pad = n => String(n).padStart(2, '0');
const isoDay = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const today = () => isoDay(new Date());
const num = (v, d = 0) => { const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : d; };
const fmtDate = s => { if (!s) return ''; const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); };
const fmtHours = h => (Math.round(h * 10) / 10).toLocaleString('en-GB');
const fmtMins = m => m >= 60 ? `${Math.floor(m / 60)}h ${pad(Math.round(m % 60))}m` : `${Math.round(m)} min`;
const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 864e5);
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTHS_LONG = ['January','February','March','April','May','June','July','August','September','October','November','December'];

/* ---------- constants ---------- */
const STATUS = ['active', 'want', 'finished', 'dnf'];
const LABEL = {
  book: { want: 'Want to Read', active: 'Reading', finished: 'Read', dnf: 'DNF' },
  game: { want: 'Want to Play', active: 'Playing', finished: 'Completed', dnf: 'DNF' }
};
const PLATFORMS = ['Steam', 'Switch', 'PS5', 'PS4', 'Xbox', 'PC (other)', 'Mobile', 'Other'];
const MOODS = ['cozy', 'happy', 'dreamy', 'thoughtful', 'sad', 'excited'];
const QUOTES = [
  ['We must cultivate our garden.', 'Voltaire, Candide'],
  ['If you have a garden and a library, you have everything you need.', 'Cicero'],
  ['I declare after all there is no enjoyment like reading!', 'Jane Austen, Pride and Prejudice'],
  ['Books are the quietest and most constant of friends.', 'Charles W. Eliot'],
  ['Reading is to the mind what exercise is to the body.', 'Richard Steele'],
  ['Let us read, and let us dance; these two amusements will never do any harm to the world.', 'Voltaire'],
  ["I'm not afraid of storms, for I'm learning how to sail my ship.", 'Louisa May Alcott, Little Women'],
  ['Adopt the pace of nature: her secret is patience.', 'Ralph Waldo Emerson'],
  ['Live in the sunshine, swim the sea, drink the wild air.', 'Ralph Waldo Emerson'],
  ['There is no frigate like a book to take us lands away.', 'Emily Dickinson'],
  ['In every real man a child is hidden that wants to play.', 'Friedrich Nietzsche'],
  ['Have a heart that never hardens, and a temper that never tires, and a touch that never hurts.', 'Charles Dickens'],
  ['A room without books is like a body without a soul.', 'attributed to Cicero'],
  ['Kind hearts are the gardens, kind thoughts are the roots.', 'Henry Wadsworth Longfellow']
];
const SHOP = [
  { id: 'mushroom', cat: 'outfit', name: 'Mushroom cap', price: 30 },
  { id: 'bow', cat: 'outfit', name: 'Pink bow', price: 20 },
  { id: 'crown', cat: 'outfit', name: 'Flower crown', price: 40 },
  { id: 'beanie', cat: 'outfit', name: 'Mint beanie', price: 35 },
  { id: 'wizard', cat: 'outfit', name: 'Wizard hat', price: 60 },
  { id: 'scarf', cat: 'outfit', name: 'Cozy scarf', price: 25 },
  { id: 'plant', cat: 'decor', name: 'Potted fern', price: 15 },
  { id: 'candle', cat: 'decor', name: 'Little candle', price: 15 },
  { id: 'teacup', cat: 'decor', name: 'Cup of tea', price: 20 },
  { id: 'books', cat: 'decor', name: 'Book stack', price: 20 },
  { id: 'lamp', cat: 'decor', name: 'Mushroom lamp', price: 30 },
  { id: 'cat', cat: 'decor', name: 'Sleepy cat', price: 45 },
  { id: 'default', cat: 'theme', name: 'Strawberry mint', price: 0, sw: ['#f6c9d3', '#c3e8d3'] },
  { id: 'lavender', cat: 'theme', name: 'Lavender', price: 50, sw: ['#ddd0f0', '#f6c9d3'] },
  { id: 'peach', cat: 'theme', name: 'Peach & sage', price: 50, sw: ['#f8d3b5', '#d5e4c3'] },
  { id: 'forest', cat: 'theme', name: 'Forest floor', price: 50, sw: ['#cfe3c0', '#ecd9ae'] },
  { id: 'seaside', cat: 'theme', name: 'Seaside', price: 50, sw: ['#cfe6f2', '#f3e1b8'] },
  { id: 'ladybug', cat: 'companion', name: 'Ladybug', price: 60 },
  { id: 'snail', cat: 'companion', name: 'Snail', price: 70 },
  { id: 'bird', cat: 'companion', name: 'Bluebird', price: 90 }
];
const SHOP_CATS = [['outfit', 'Toad outfits'], ['decor', 'Shelf decorations'], ['theme', 'Colour themes'], ['companion', 'Companions']];
const MAX_DECOR = 4;

/* ---------- sound (synthesised, no files) ---------- */
let AC = null;
function audio() {
  if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
  if (AC.state === 'suspended') AC.resume();
  return AC;
}
function tone(f, t0, dur, type = 'square', vol = .04) {
  const a = audio(); if (!a) return;
  const o = a.createOscillator(), g = a.createGain(), t = a.currentTime + t0;
  o.type = type; o.frequency.setValueAtTime(f, t);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + .02);
}
const SFX = {
  click: () => tone(720, 0, .045, 'square', .018),
  pop: () => { tone(660, 0, .06, 'sine', .07); tone(990, .05, .08, 'sine', .05); },
  coin: () => { tone(988, 0, .07, 'square', .035); tone(1319, .07, .16, 'square', .035); },
  page: () => { tone(300, 0, .05, 'triangle', .03); tone(420, .04, .05, 'triangle', .025); },
  jingle: () => [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, i * .11, .2, 'triangle', .07)),
  ach: () => [784, 988, 1175, 1568].forEach((f, i) => tone(f, i * .08, .14, 'square', .03)),
  start: () => { tone(523, 0, .09, 'triangle', .06); tone(784, .09, .14, 'triangle', .06); },
  stop: () => { tone(784, 0, .09, 'triangle', .06); tone(523, .09, .16, 'triangle', .06); }
};
function sfx(n) { if (S.settings.sound) try { SFX[n](); } catch (e) {} }

/* ---------- state & storage ---------- */
const USER_ID = 'local-user';
const blank = () => ({
  version: 2, user_id: USER_ID, profile: { name: '', yearGoal: 24 },
  items: [], collections: [], journal: [], logs: [], achievements: {},
  quotes: [], sessions: [], session: null, spent: 0,
  shop: { owned: ['default'], hat: '', neck: '', decor: [], theme: 'default', companion: '' },
  settings: { sound: true, sky: 'auto', seasons: true, shelfView: { book: 'grid', game: 'grid' },
    server: 'https://ivy-shelf.anacarolina-ferr.workers.dev', steamUser: '', lastSteamSync: '' }
});
let S = blank();
let storageOK = true;
const IDB = { name: 'ivy-hollow-shelf', store: 'kv' };
function idb() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(IDB.name, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(IDB.store);
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
}
async function loadState() {
  try {
    const db = await idb();
    const v = await new Promise((res, rej) => { const q = db.transaction(IDB.store).objectStore(IDB.store).get('state'); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); });
    if (v) return v;
  } catch (e) { console.warn('IndexedDB unavailable', e); }
  try { const j = localStorage.getItem(IDB.name); if (j) return JSON.parse(j); } catch (e) {}
  return null;
}
let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try {
      const db = await idb();
      await new Promise((res, rej) => { const t = db.transaction(IDB.store, 'readwrite'); t.objectStore(IDB.store).put(S, 'state'); t.oncomplete = res; t.onerror = () => rej(t.error); });
      storageOK = true;
    } catch (e) {
      try { localStorage.setItem(IDB.name, JSON.stringify(S)); storageOK = true; } catch (e2) { storageOK = false; render(); }
    }
  }, 250);
}
function normalize(s) {
  const b = blank(), out = Object.assign(b, s || {});
  out.profile = Object.assign(blank().profile, out.profile || {});
  ['items', 'collections', 'journal', 'logs', 'quotes', 'sessions'].forEach(k => { if (!Array.isArray(out[k])) out[k] = []; });
  if (!out.achievements || typeof out.achievements !== 'object') out.achievements = {};
  out.shop = Object.assign(blank().shop, out.shop || {});
  if (!out.shop.owned.includes('default')) out.shop.owned.push('default');
  out.settings = Object.assign(blank().settings, out.settings || {});
  out.settings.shelfView = Object.assign({ book: 'grid', game: 'grid' }, out.settings.shelfView || {});
  if (!out.settings.server) out.settings.server = 'https://ivy-shelf.anacarolina-ferr.workers.dev';
  out.spent = +out.spent || 0;
  out.version = 2;
  return out;
}

/* ---------- derived numbers ---------- */
const books = () => S.items.filter(i => i.type === 'book');
const games = () => S.items.filter(i => i.type === 'game');
const byId = id => S.items.find(i => i.id === id);
const sumLogs = (unit, filter = () => true) => S.logs.filter(l => l.unit === unit && filter(l)).reduce((a, l) => a + l.amount, 0);
function finishedIn(type, year) { return S.items.filter(i => i.type === type && i.status === 'finished' && i.date_finished && (!year || i.date_finished.startsWith(String(year)))); }
function activityDays() { return new Set([...S.logs.map(l => l.date), ...S.journal.map(j => j.date), ...S.sessions.map(s => s.date)]); }
function streak() {
  const days = activityDays(); let n = 0; const d = new Date();
  if (!days.has(isoDay(d))) d.setDate(d.getDate() - 1);
  while (days.has(isoDay(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
function lastActivity() { const d = [...activityDays()].sort(); return d.length ? d[d.length - 1] : (S.items.map(i => i.date_added).sort().pop() || ''); }
const ACH = [
  { id: 'first-page', name: 'First Page', desc: 'Add your first book', xp: 10, ac: 2, t: () => books().length >= 1 },
  { id: 'player-one', name: 'Player One', desc: 'Add your first game', xp: 10, ac: 2, t: () => games().length >= 1 },
  { id: 'bookworm', name: 'Bookworm', desc: 'Finish 5 books', xp: 50, ac: 10, t: () => finishedIn('book').length >= 5 },
  { id: 'keeper', name: 'Library Keeper', desc: 'Finish 25 books', xp: 150, ac: 25, t: () => finishedIn('book').length >= 25 },
  { id: 'first-clear', name: 'First Clear', desc: 'Complete a game', xp: 30, ac: 5, t: () => finishedIn('game').length >= 1 },
  { id: 'both-worlds', name: 'Both Worlds', desc: 'Finish a book and a game', xp: 40, ac: 8, t: () => finishedIn('book').length && finishedIn('game').length },
  { id: 'k-pages', name: 'A Thousand Pages', desc: 'Log 1,000 pages', xp: 60, ac: 10, t: () => sumLogs('pages') >= 1000 },
  { id: 'tenk-pages', name: 'Ten Thousand Pages', desc: 'Log 10,000 pages', xp: 200, ac: 30, t: () => sumLogs('pages') >= 10000 },
  { id: 'ten-hours', name: 'Settling In', desc: 'Log 10 hours of play', xp: 20, ac: 4, t: () => sumLogs('hours') >= 10 },
  { id: 'marathon', name: 'Marathon', desc: 'Log 100 hours of play', xp: 100, ac: 20, t: () => sumLogs('hours') >= 100 },
  { id: 'dear-diary', name: 'Dear Diary', desc: 'Write your first journal entry', xp: 15, ac: 3, t: () => S.journal.length >= 1 },
  { id: 'chronicler', name: 'Chronicler', desc: 'Write 20 journal entries', xp: 80, ac: 15, t: () => S.journal.length >= 20 },
  { id: 'curator', name: 'Curator', desc: 'Create a collection', xp: 15, ac: 3, t: () => S.collections.length >= 1 },
  { id: 'critic', name: 'Little Critic', desc: 'Write 3 reviews', xp: 40, ac: 8, t: () => S.items.filter(i => (i.review || '').trim()).length >= 3 },
  { id: 'full-hearts', name: 'Full of Hearts', desc: 'Give something 5 hearts', xp: 10, ac: 2, t: () => S.items.some(i => i.rating === 5) },
  { id: 'let-go', name: 'Know When to Fold', desc: 'Mark something as DNF', xp: 10, ac: 2, t: () => S.items.some(i => i.status === 'dnf') },
  { id: 'daydreamer', name: 'Daydreamer', desc: 'Have 10 things on your wishlist', xp: 20, ac: 4, t: () => S.items.filter(i => i.status === 'want').length >= 10 },
  { id: 'routine', name: 'Toad Routine', desc: 'Keep a 7-day streak', xp: 70, ac: 14, t: () => streak() >= 7 },
  { id: 'timekeeper', name: 'Timekeeper', desc: 'Finish your first timed session', xp: 15, ac: 3, t: () => S.sessions.length >= 1 },
  { id: 'quotable', name: 'Quotable', desc: 'Save 5 favourite lines', xp: 30, ac: 6, t: () => S.quotes.length >= 5 },
  { id: 'shopper', name: 'Treat Yourself', desc: 'Buy something in the shop', xp: 10, ac: 0, t: () => S.shop.owned.length > 1 }
];
function progressNumbers() {
  const pages = Math.max(0, sumLogs('pages')), hours = Math.max(0, sumLogs('hours'));
  const fin = S.items.filter(i => i.status === 'finished').length;
  const reviews = S.items.filter(i => i.status === 'finished' && (i.review || '').trim()).length;
  const unlocked = ACH.filter(a => S.achievements[a.id]);
  const xp = Math.floor(pages / 5) + Math.floor(hours * 10) + fin * 100 + reviews * 25 + S.journal.length * 15 + S.quotes.length * 5 + unlocked.reduce((a, x) => a + x.xp, 0);
  const earned = fin * 10 + S.journal.length * 2 + Math.floor(pages / 50) + Math.floor(hours) + unlocked.reduce((a, x) => a + x.ac, 0);
  let level = 1, need = 100, into = xp;
  while (into >= need) { into -= need; level++; need = Math.round(need * 1.2); }
  return { xp, level, into, need, earned, acorns: Math.max(0, earned - S.spent) };
}
function checkAchievements() {
  ACH.forEach(a => {
    if (!S.achievements[a.id] && a.t()) { S.achievements[a.id] = today(); toast(`Achievement: ${a.name}`, `+${a.xp} XP${a.ac ? ` · +${a.ac} acorns` : ''}`, starIco(), 'ach'); }
  });
}
function commit() { checkAchievements(); save(); render(); }

/* ---------- toad ---------- */
let partyNow = false;
function toadMood() {
  if (partyNow) return 'party';
  const last = lastActivity();
  return last && daysBetween(last, today()) >= 3 ? 'sleep' : 'awake';
}
const toad = (cls = 'toad', mood = '') => toadSVG({ hat: S.shop.hat, neck: S.shop.neck, mood }, cls + (mood === 'sleep' ? ' sleep' : ''));
function toadLine() {
  const mood = toadMood(), d = dayOfYear();
  if (mood === 'sleep') return 'Zzz… oh! You’re back! I kept your spot warm.';
  const rb = books().filter(i => i.status === 'active'), pg = games().filter(i => i.status === 'active');
  const st = streak(), lines = [];
  if (S.session) { const it = byId(S.session.itemId); if (it) return `Shh… we’re in the middle of ${esc(it.title)}.`; }
  if (st >= 3) lines.push(`${st} days in a row — look at you go!`);
  rb.forEach(b => lines.push(b.total_pages ? `How’s <i>${esc(b.title)}</i>? You’re ${pct(b)}% of the way.` : `How’s <i>${esc(b.title)}</i> going?`));
  pg.forEach(g => lines.push(`Off on an adventure in <i>${esc(g.title)}</i> today?`));
  const fin = S.items.filter(i => i.status === 'finished' && i.date_finished && daysBetween(i.date_finished, today()) <= 2);
  if (fin.length) return `Still thinking about <i>${esc(fin[0].title)}</i>. What a finish!`;
  ['The kettle is on. What are we reading today?', 'A page a day keeps the gloom away.', 'Ribbit. I saved you a cozy spot on the shelf.', 'One more chapter? I won’t tell anyone.', 'Rainy days are for long books and longer games.', 'Remember to stretch between levels!'].forEach(l => lines.push(l));
  return lines[d % lines.length];
}

/* ---------- covers ---------- */
const PH_COLORS = ['#f6c9d3', '#c3e8d3', '#ddd0f0', '#d6ecf6', '#f8d3b5', '#f3e1a6', '#e9cfc0', '#cfe0d8'];
const hash = s => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); };
function pct(it) {
  if (it.type === 'book') return it.total_pages ? Math.min(100, Math.round((it.current_page || 0) / it.total_pages * 100)) : 0;
  return it.total_hours ? Math.min(100, Math.round((it.hours_played || 0) / it.total_hours * 100)) : 0;
}
function phHTML(it) {
  const bg = PH_COLORS[hash(it.title) % PH_COLORS.length];
  if (it.type === 'game') return `<div class="cover-ph game" style="background-color:${bg}"><div class="tag">${esc((it.platform || 'GAME').toUpperCase())}</div><div class="t">${esc(it.title || 'Untitled')}</div><div class="orn">${padIco()}</div></div>`;
  return `<div class="cover-ph" style="background-color:${bg}"><div class="t">${esc(it.title || 'Untitled')}</div>${it.author ? `<div class="a">${esc(it.author)}</div>` : ''}<div class="orn">${starIco('rgba(90,62,43,.45)')}</div></div>`;
}
function coverHTML(it, small = false) {
  let src = it.cover_url || '';
  if (small && src.includes('covers.openlibrary.org') && src.includes('-L.jpg')) src = src.replace('-L.jpg', '-M.jpg');
  const fb = (it.cover_fallbacks || []).join('|');
  const prog = it.status === 'active' ? pct(it) : null;
  return `<div class="cover">${phHTML(it)}
    ${src ? `<img src="${esc(src)}" alt="" loading="lazy" data-fb="${esc(fb)}" onerror="imgFail(this)" onload="imgLoad(this)">` : ''}
    ${prog !== null ? `<div class="ribbon"><i style="width:${prog}%"></i></div>` : ''}</div>`;
}
window.imgFail = img => {
  const fb = (img.dataset.fb || '').split('|').filter(Boolean);
  if (fb.length) { img.src = fb.shift(); img.dataset.fb = fb.join('|'); } else img.remove();
};
window.imgLoad = img => { if (img.naturalWidth <= 2) imgFail(img); }; // Open Library sends a 1x1 gif when there's no cover
const steamCovers = id => [
  `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${id}/library_600x900_2x.jpg`,
  `https://cdn.akamai.steamstatic.com/steam/apps/${id}/library_600x900.jpg`,
  `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${id}/header.jpg`,
  `https://cdn.akamai.steamstatic.com/steam/apps/${id}/header.jpg`];
const parseAppId = v => { const s = String(v || '').trim(); const m = s.match(/app\/(\d+)/) || s.match(/^(\d{2,9})$/); return m ? m[1] : ''; };
function resizeImage(file, w = 360, h = 480) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file); const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
      const r = Math.max(w / img.width, h / img.height), dw = img.width * r, dh = img.height * r;
      x.imageSmoothingEnabled = !(img.width <= 200); // keep tiny pixel art crisp
      x.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh); URL.revokeObjectURL(url);
      res(c.toDataURL('image/jpeg', 0.86));
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Could not read that image')); };
    img.src = url;
  });
}

/* ---------- book lookup (Open Library -> Google Books) ---------- */
async function getJSON(url) { const r = await fetch(url); if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }
const shortGenre = arr => (arr || []).map(s => String(s)).find(s => s.length < 26 && !/fiction in english|accessible book|protected daisy|large type|nyt:|reading level|^\d/i.test(s)) || '';
const OL_FIELDS = 'key,title,author_name,cover_i,number_of_pages_median,first_publish_year,isbn,subject';
const olDoc = d => ({
  source: 'Open Library', title: d.title, author: (d.author_name || []).slice(0, 2).join(', '),
  total_pages: d.number_of_pages_median || '', year: d.first_publish_year || '', isbn: (d.isbn || [])[0] || '',
  open_library_id: d.key || '', genre: shortGenre(d.subject),
  cover_url: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg` : ''
});
async function searchOpenLibrary(q) {
  const j = await getJSON(`https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=15&fields=${OL_FIELDS}`);
  return (j.docs || []).map(olDoc);
}
async function searchGoogle(q) {
  const j = await getJSON(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=15&printType=books`);
  return (j.items || []).map(v => { const i = v.volumeInfo || {}; const img = (i.imageLinks || {}); const isbn = (i.industryIdentifiers || []).find(x => /ISBN_13/.test(x.type)) || (i.industryIdentifiers || [])[0];
    return { source: 'Google Books', title: i.title + (i.subtitle ? ': ' + i.subtitle : ''), author: (i.authors || []).slice(0, 2).join(', '), total_pages: i.pageCount || '',
      year: (i.publishedDate || '').slice(0, 4), isbn: isbn ? isbn.identifier : '', open_library_id: '', genre: shortGenre(i.categories), synopsis: i.description || '',
      cover_url: (img.thumbnail || img.smallThumbnail || '').replace('http://', 'https://').replace('&edge=curl', '') }; });
}
async function lookupISBN(isbn) {
  let r = null;
  try { const j = await getJSON(`https://openlibrary.org/search.json?isbn=${isbn}&limit=1&fields=${OL_FIELDS}`); if (j.docs && j.docs[0]) r = olDoc(j.docs[0]); } catch (e) {}
  if (!r) { try { const g = await searchGoogle('isbn:' + isbn); if (g[0]) r = g[0]; } catch (e) {} }
  if (!r) return null;
  // prefer the exact edition's cover, fall back to the work's cover
  const exact = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`;
  r.cover_fallbacks = r.cover_url && r.cover_url !== exact ? [r.cover_url] : [];
  r.cover_url = exact; r.isbn = isbn;
  return r;
}
async function olDescription(key) {
  try { const j = await getJSON(`https://openlibrary.org${key}.json`); const d = j.description; return typeof d === 'string' ? d : (d && d.value) || ''; } catch (e) { return ''; }
}
async function olEditions(key) {
  const j = await getJSON(`https://openlibrary.org${key}/editions.json?limit=60`);
  return (j.entries || []).filter(e => (e.covers || []).some(c => c > 0)).map(e => ({
    cover_url: `https://covers.openlibrary.org/b/id/${e.covers.find(c => c > 0)}-L.jpg`,
    total_pages: e.number_of_pages || '', isbn: (e.isbn_13 || e.isbn_10 || [])[0] || '',
    label: [(e.publishers || [])[0], e.publish_date, (e.languages || []).map(l => l.key.split('/').pop()).join('/')].filter(Boolean).join(' · ')
  }));
}

/* ---------- sky, seasons, companion ---------- */
function skyPhase() {
  if (S.settings.sky === 'day') return 'day';
  const h = new Date().getHours();
  return h >= 5 && h < 10 ? 'morning' : h < 17 ? 'day' : h < 20 ? 'sunset' : 'night';
}
function season() { const m = new Date().getMonth(); return m >= 8 && m <= 10 ? 'autumn' : (m === 11 || m <= 1) ? 'winter' : m <= 4 ? 'spring' : 'summer'; }
let skyKey = '';
function applySky() {
  const phase = skyPhase(), key = phase + '|' + season() + '|' + S.settings.seasons + '|' + window.innerWidth;
  document.body.dataset.sky = phase;
  document.documentElement.dataset.theme = S.shop.theme || 'default';
  const tc = { morning: '#f9d4d0', day: '#d9eef8', sunset: '#f2a98f', night: '#1f2244' }[phase];
  const meta = $('meta[name=theme-color]'); if (meta) meta.content = tc;
  if (key === skyKey) return; skyKey = key;
  const sky = $('#sky'); sky.innerHTML = '';
  const n = window.innerWidth < 700 ? 4 : 7;
  for (let i = 0; i < n; i++) {
    const c = document.createElement('div'); c.className = 'cloud'; c.innerHTML = cloudSVG();
    const w = 70 + Math.random() * 90, dur = 60 + Math.random() * 70;
    c.style.cssText = `top:${4 + Math.random() * 38}%;width:${w}px;animation-duration:${dur}s;animation-delay:${-Math.random() * dur}s;opacity:${.55 + Math.random() * .4}`;
    sky.appendChild(c);
  }
  if (phase === 'night') {
    const f = document.createElement('div'); f.className = 'starfield';
    for (let i = 0; i < 46; i++) { const s = document.createElement('i'); s.style.cssText = `left:${Math.random() * 100}%;top:${Math.random() * 70}%;animation-delay:${-Math.random() * 3}s;opacity:${.4 + Math.random() * .6}`; f.appendChild(s); }
    sky.appendChild(f);
  }
  const w = $('#weather'); w.innerHTML = '';
  if (!S.settings.seasons) return;
  const se = season(), count = window.innerWidth < 700 ? 10 : 18;
  const leafColors = ['#d98a5f', '#e0a24a', '#c86a4a', '#b9823c'];
  if (se === 'autumn' || se === 'winter' || se === 'spring') {
    for (let i = 0; i < count; i++) {
      const p = document.createElement('div'); p.className = 'p';
      p.innerHTML = se === 'autumn' ? LEAF(leafColors[i % 4]) : se === 'winter' ? SNOW() : PETAL();
      const dur = 12 + Math.random() * 14;
      p.style.cssText = `left:${Math.random() * 100}%;width:${se === 'winter' ? 8 + Math.random() * 6 : 10 + Math.random() * 6}px;animation-duration:${dur}s;animation-delay:${-Math.random() * dur}s;opacity:${.55 + Math.random() * .4}`;
      w.appendChild(p);
    }
  }
  if (phase === 'night' && (se === 'summer' || se === 'spring')) {
    for (let i = 0; i < 12; i++) { const f = document.createElement('div'); f.className = 'fly'; f.style.cssText = `left:${Math.random() * 90}%;top:${40 + Math.random() * 50}%;animation-delay:${-Math.random() * 9}s;animation-duration:${6 + Math.random() * 6}s`; w.appendChild(f); }
  }
}
function renderCompanion() {
  const r = $('#companion-root'), c = S.shop.companion;
  if (!c) { r.innerHTML = ''; return; }
  if (r.dataset.c === c) return;
  r.dataset.c = c;
  r.innerHTML = `<div class="companion ${c}" data-act="pet" aria-label="${c}">${COMPANION_SPRITES[c]}</div>`;
}

/* ---------- UI shell ---------- */
const NAV = [
  ['home', 'Home', homeIco], ['books', 'Library', bookIco], ['games', 'Games', padIco], ['wishlist', 'Wishlist', wishIco],
  ['collections', 'Collections', shelfIco], ['journal', 'Journal', quillIco], ['stats', 'Stats', chartIco], ['shop', 'Acorn shop', bagIco], ['settings', 'Settings', gearIco]];
let route = 'home';
const ui = { books: { status: 'all', q: '', sort: 'updated', genre: '' }, games: { status: 'all', q: '', sort: 'updated', platform: '' }, journalItem: '', journalTab: 'entries', statsYear: new Date().getFullYear(), shopCat: 'outfit' };
function go(r) { if (location.hash !== '#' + r) location.hash = r; else { route = r; render(true); } }
function readRoute() { route = (location.hash || '#home').slice(1) || 'home'; render(true); }
function navKey() {
  if (route.startsWith('item-')) { const it = byId(route.slice(5)); return it ? (it.status === 'want' ? 'wishlist' : it.type === 'book' ? 'books' : 'games') : 'home'; }
  if (route.startsWith('collection-')) return 'collections';
  if (route.startsWith('review-')) return 'stats';
  return route;
}
function renderShell() {
  const p = progressNumbers(), k = navKey();
  $('#sidebar').innerHTML = `
    <div class="side-brand">${toad('toad', toadMood())}<div class="brand-title">Ivy Shelf</div><div class="brand-sub" style="margin-top:6px">BOOKS · GAMES · COZY</div></div>
    <div class="px card side-level parch">${levelBox(p)}</div>
    <nav>${NAV.map(([id, n, ico]) => `<button class="nav-cloud ${k === id ? 'on' : ''}" data-act="go" data-r="${id}">${ico()}${n}</button>`).join('')}</nav>`;
  $('#topbar').innerHTML = `
    <div class="brand"><div class="brand-title">Ivy Shelf</div><div class="brand-sub">LV ${p.level} · ${p.into}/${p.need} XP</div></div>
    <button class="chip-stat" data-act="go" data-r="shop" aria-label="Acorn shop">${acorn()}${p.acorns}</button>`;
  const tabs = [['home', 'Home', homeIco], ['books', 'Books', bookIco], ['games', 'Games', padIco], ['journal', 'Journal', quillIco], ['more', 'More', moreIco]];
  const onMore = ['wishlist', 'collections', 'stats', 'settings', 'shop', 'steam'].includes(k);
  $('#tabbar').innerHTML = tabs.map(([id, n, ico]) => `<button class="${(k === id || (id === 'more' && onMore)) ? 'on' : ''}" data-act="${id === 'more' ? 'more' : 'go'}" data-r="${id}"><div class="tab-ico">${ico()}</div><span>${n}</span></button>`).join('');
  $('#fab').classList.toggle('hide', route.startsWith('item-') || route.startsWith('review-') || route === 'shop' || route === 'steam' || fabHidden);
  renderSessionPill(); renderCompanion(); applySky();
}
function levelBox(p) {
  const st = streak();
  return `<div class="levelbox"><div class="lv">LV ${p.level}</div><div class="grow"><div class="label" style="margin-bottom:6px">${p.into} / ${p.need} XP</div><div class="bar"><i style="width:${Math.round(p.into / p.need * 100)}%"></i></div></div></div>
  <div class="row" style="margin-top:12px;justify-content:space-between"><button class="chip-stat" data-act="go" data-r="shop">${acorn()} ${p.acorns} acorns</button><span class="chip-stat">☀ ${st} day${st === 1 ? '' : 's'}</span></div>`;
}
function render(scrollTop) {
  renderShell();
  let html = '';
  if (route.startsWith('item-')) html = viewItem(route.slice(5));
  else if (route.startsWith('collection-')) html = viewCollection(route.slice(11));
  else if (route.startsWith('review-')) html = viewReview(+route.slice(7));
  else html = ({ steam: viewSteam, home: viewHome, books: () => viewShelf('book'), games: () => viewShelf('game'), wishlist: viewWishlist, collections: viewCollections, journal: viewJournal, stats: viewStats, shop: viewShop, settings: viewSettings }[route] || viewHome)();
  $('#main').innerHTML = (storageOK ? '' : `<div class="banner">Your device isn’t letting the app save right now. Save a backup in Settings so nothing gets lost.</div>`) + html;
  if (scrollTop) window.scrollTo(0, 0);
}

/* ---------- views ---------- */
function tile(it) {
  const sub = it.type === 'book' ? (it.author || '') : (it.platform || '');
  return `<button class="tile" data-act="open" data-id="${it.id}">${coverHTML(it, true)}<div class="meta"><div class="tt">${esc(it.title)}</div><div class="sub">${esc(sub) || '&nbsp;'}</div>${it.rating ? `<div class="hearts">${[1, 2, 3, 4, 5].map(n => heart(n <= it.rating)).join('')}</div>` : ''}</div></button>`;
}
function emptyBox(text, btn = '') { return `<div class="px card empty">${toad()}<p class="muted" style="margin:0 0 12px">${text}</p>${btn}</div>`; }
function greeting() { const h = new Date().getHours(); return h < 5 ? 'Still up' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; }
function dayOfYear() { const n = new Date(); return Math.floor((n - new Date(n.getFullYear(), 0, 0)) / 864e5); }
function quoteOfDay() {
  const mine = S.quotes.map(q => { const it = byId(q.itemId); return [q.text, it ? (it.title + (it.author ? ', ' + it.author : '')) : 'from your shelf', true]; });
  const pool = [...mine, ...QUOTES];
  // your own saved lines show up every other day when you have some
  if (mine.length && dayOfYear() % 2 === 0) return mine[Math.floor(dayOfYear() / 2) % mine.length];
  return pool[dayOfYear() % pool.length];
}
function nookHTML() {
  const decor = S.shop.decor.filter(d => DECOR_SPRITES[d]);
  return `<div class="px nook">
    <div class="items">${decor.length ? decor.map(d => d === 'cat' ? DECOR_SPRITES[d].replace('class="pix ', 'class="pix cat-s ') : DECOR_SPRITES[d]).join('') : ''}</div>
    <div class="plank"></div><div class="win"></div><div class="rug"></div>${toad('toad', toadMood())}
  </div>`;
}
function viewHome() {
  const now = new Date(), y = now.getFullYear(), mo = today().slice(0, 7), p = progressNumbers(), mood = toadMood();
  const reading = books().filter(i => i.status === 'active'), playing = games().filter(i => i.status === 'active');
  const q = quoteOfDay();
  const recent = ACH.filter(a => S.achievements[a.id]).sort((a, b) => S.achievements[b.id].localeCompare(S.achievements[a.id])).slice(0, 3);
  const goal = S.profile.yearGoal || 0, done = finishedIn('book', y).length;
  const reviewYear = now.getMonth() === 11 ? y : (now.getMonth() === 0 && now.getDate() <= 15 ? y - 1 : 0);
  return `
  <div class="hero"><div class="tw">${toad('toad', mood)}${mood === 'sleep' ? '<div class="zzz">z</div>' : ''}</div><div><div class="label">${now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</div><h1>${greeting()}, ${esc(S.profile.name || 'friend')}</h1>
    <div class="bubble small" style="margin-top:10px">${toadLine()}</div></div></div>
  ${reviewYear && S.items.length ? `<div class="banner cta" data-act="go" data-r="review-${reviewYear}" style="margin-top:20px">${starIco()}<div><b>Your ${reviewYear} in review is ready</b><div class="small muted">Every page, every hour, every heart.</div></div></div>` : ''}
  <div class="px card parch" style="margin-top:22px">${levelBox(p)}</div>
  <div class="stats4" style="margin-top:22px">
    <div class="px stat pink"><div class="label">Books ${y}</div><div class="v">${done}${goal ? `<span class="small muted">/${goal}</span>` : ''}</div><div class="small muted">finished</div></div>
    <div class="px stat mint"><div class="label">Pages</div><div class="v">${Math.max(0, sumLogs('pages', l => l.date.startsWith(mo))).toLocaleString('en-GB')}</div><div class="small muted">this month</div></div>
    <div class="px stat"><div class="label">Hours</div><div class="v">${fmtHours(Math.max(0, sumLogs('hours', l => l.date.startsWith(mo))))}</div><div class="small muted">played this month</div></div>
    <div class="px stat parch"><div class="label">Games ${y}</div><div class="v">${finishedIn('game', y).length}</div><div class="small muted">completed</div></div>
  </div>
  ${goal ? `<div class="px card" style="margin-top:20px"><div class="row" style="justify-content:space-between"><span class="label">${y} reading goal</span><span class="small">${done} of ${goal} books</span></div><div class="bar mintbar" style="margin-top:10px"><i style="width:${Math.min(100, Math.round(done / goal * 100))}%"></i></div></div>` : ''}
  <div class="section"><h2>Currently reading</h2>${reading.length ? `<button class="link" data-act="go" data-r="books">See all</button>` : ''}</div>
  ${reading.length ? `<div class="shelf-row">${reading.map(tile).join('')}</div>` : emptyBox('Nothing on the nightstand yet.', `<button class="btn primary" data-act="add" data-type="book">Add a book</button>`)}
  <div class="section"><h2>Currently playing</h2>${playing.length ? `<button class="link" data-act="go" data-r="games">See all</button>` : ''}</div>
  ${playing.length ? `<div class="shelf-row">${playing.map(tile).join('')}</div>` : emptyBox('No adventures in progress.', `<button class="btn mint" data-act="add" data-type="game">Add a game</button>`)}
  <div class="section"><h2>Quote of the day</h2></div>
  <div class="px card pink"><div class="quote">“${esc(q[0])}”</div><div class="label" style="margin-top:12px">— ${esc(q[1])}</div></div>
  <div class="section"><h2>The nook</h2><button class="link" data-act="go" data-r="shop">Decorate</button></div>
  ${nookHTML()}
  ${recent.length ? `<div class="section"><h2>Recent achievements</h2><button class="link" data-act="go" data-r="stats">All</button></div><div class="ach-grid">${recent.map(achCard).join('')}</div>` : ''}`;
}

function shelfCase(list, type) {
  const slots = list.map(it => {
    const h = type === 'game' ? 150 : 118 + (hash(it.id) % 48);
    const w = type === 'game' ? 36 : Math.max(24, Math.min(46, Math.round((it.total_pages || 280) / 11)));
    const bg = PH_COLORS[hash(it.title) % PH_COLORS.length];
    const prog = it.status === 'active' ? pct(it) : 0;
    return `<div class="slot"><button class="spine ${type}" data-act="pull" data-id="${it.id}" style="height:${h}px;width:${w}px;background:${bg}" aria-label="${esc(it.title)}">
      ${type === 'game' ? '<div class="cap"></div>' : '<div class="bands"></div>'}<div class="st">${esc(it.title)}</div>${type === 'game' ? '' : '<div class="bands"></div>'}${it.status === 'finished' ? '<div class="dot"></div>' : ''}
      ${prog ? `<div class="prog" style="height:${prog}%"></div>` : ''}</button></div>`;
  });
  // tuck the toad's shop decorations between the books
  const decor = S.shop.decor.filter(d => DECOR_SPRITES[d]);
  decor.forEach((d, i) => { const at = Math.min(slots.length, Math.round((i + 1) * slots.length / (decor.length + 1))); slots.splice(at + i, 0, `<div class="decor-slot">${DECOR_SPRITES[d]}</div>`); });
  return `<div class="bookcase"><div class="bookcase-inner">${slots.join('')}</div></div>
  <p class="note" style="margin-top:14px">Tap a ${type === 'book' ? 'spine' : 'case'} to pull it off the shelf. A dot means finished; the green fill is progress.</p>`;
}
function viewShelf(type) {
  const f = ui[type === 'book' ? 'books' : 'games'], all = S.items.filter(i => i.type === type), view = S.settings.shelfView[type];
  let list = all.filter(i => f.status === 'all' || i.status === f.status);
  if (f.q) { const q = f.q.toLowerCase(); list = list.filter(i => [i.title, i.author, i.genre, i.platform].join(' ').toLowerCase().includes(q)); }
  if (type === 'book' && f.genre) list = list.filter(i => i.genre === f.genre);
  if (type === 'game' && f.platform) list = list.filter(i => i.platform === f.platform);
  const sorters = { updated: (a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''), title: (a, b) => a.title.localeCompare(b.title), author: (a, b) => (a.author || a.platform || '').localeCompare(b.author || b.platform || ''), rating: (a, b) => (b.rating || 0) - (a.rating || 0), progress: (a, b) => pct(b) - pct(a) };
  list.sort(sorters[f.sort] || sorters.updated);
  const extra = type === 'book' ? [...new Set(all.map(i => i.genre).filter(Boolean))].sort() : [...new Set(all.map(i => i.platform).filter(Boolean))].sort();
  const key = type === 'book' ? 'genre' : 'platform';
  return `
  <div class="page-head"><div><div class="label">${type === 'book' ? 'The shelf' : 'The arcade'}</div><h1>${type === 'book' ? 'Library' : 'Games'}</h1>${type === 'game' && S.settings.server ? `<button class="link" data-act="go" data-r="steam" style="margin-top:6px">Import from Steam</button>` : ''}</div>
    <div class="row"><div class="toggle2"><button class="${view === 'grid' ? 'on' : ''}" data-act="view" data-type="${type}" data-v="grid">Covers</button><button class="${view === 'shelf' ? 'on' : ''}" data-act="view" data-type="${type}" data-v="shelf">Shelf</button></div>
    <button class="btn sm ${type === 'book' ? 'primary' : 'mint'}" data-act="add" data-type="${type}">+ Add</button></div></div>
  <div class="chips">${['all', ...STATUS].map(s => `<button class="chip ${f.status === s ? 'on' : ''}" data-act="filter" data-type="${type}" data-k="status" data-v="${s}">${s === 'all' ? 'All' : LABEL[type][s]}<span class="n">${s === 'all' ? all.length : all.filter(i => i.status === s).length}</span></button>`).join('')}</div>
  <div class="grid2" style="margin:6px 0 22px">
    <input class="inp" type="search" placeholder="Search…" value="${esc(f.q)}" data-input="shelfq" data-type="${type}">
    <div class="grid2" style="gap:8px">
      <select class="inp" data-change="shelfsort" data-type="${type}" aria-label="Sort">${[['updated', 'Recent'], ['title', 'Title'], ['author', type === 'book' ? 'Author' : 'Platform'], ['rating', 'Hearts'], ['progress', 'Progress']].map(([v, n]) => `<option value="${v}" ${f.sort === v ? 'selected' : ''}>${n}</option>`).join('')}</select>
      <select class="inp" data-change="shelfextra" data-type="${type}" aria-label="${key}"><option value="">${type === 'book' ? 'All genres' : 'All platforms'}</option>${extra.map(g => `<option ${f[key] === g ? 'selected' : ''}>${esc(g)}</option>`).join('')}</select>
    </div>
  </div>
  ${!list.length ? (all.length ? emptyBox('Nothing matches that filter.') : emptyBox(type === 'book' ? 'Your shelf is waiting for its first book.' : 'No games yet — let’s add one!', `<button class="btn primary" data-act="add" data-type="${type}">Add ${type}</button>`))
    : view === 'shelf' ? shelfCase(list, type) : `<div class="grid">${list.map(tile).join('')}</div>`}`;
}

function viewWishlist() {
  const wb = books().filter(i => i.status === 'want'), wg = games().filter(i => i.status === 'want');
  const block = (arr, type) => arr.length ? `<div class="grid">${arr.map(it => `<div>${tile(it)}<button class="btn sm ${type === 'book' ? 'primary' : 'mint'}" style="width:calc(100% - 6px);margin-top:10px" data-act="start" data-id="${it.id}">${type === 'book' ? 'Start reading' : 'Start playing'}</button></div>`).join('')}</div>` : emptyBox(type === 'book' ? 'No books on the wishlist.' : 'No games on the wishlist.', `<button class="btn" data-act="add" data-type="${type}" data-status="want">Add to wishlist</button>`);
  return `<div class="page-head"><div><div class="label">Someday soon</div><h1>Wishlist</h1></div></div>
  <div class="section"><h2>Books to read</h2></div>${block(wb, 'book')}
  <div class="section"><h2>Games to play</h2></div>${block(wg, 'game')}`;
}

function quoteCard(q, showItem) {
  const it = byId(q.itemId);
  return `<div class="px qcard"><div class="qt">“${esc(q.text)}”</div>
    <div class="row" style="justify-content:space-between;margin-top:8px"><span class="label">${q.page ? 'p. ' + esc(q.page) + ' · ' : ''}${fmtDate(q.date)}</span><button class="link" data-act="editquote" data-q="${q.id}">Edit</button></div>
    ${showItem && it ? `<button class="link" data-act="open" data-id="${it.id}" style="margin-top:8px">${esc(it.title)}</button>` : ''}</div>`;
}
function viewItem(id) {
  const it = byId(id);
  if (!it) return emptyBox('That item has wandered off.', `<button class="btn" data-act="go" data-r="home">Go home</button>`);
  const B = it.type === 'book', L = LABEL[it.type], fin = it.status === 'finished';
  const entries = S.journal.filter(j => j.itemId === id).sort((a, b) => b.date.localeCompare(a.date));
  const quotes = S.quotes.filter(q => q.itemId === id).sort((a, b) => (+a.page || 0) - (+b.page || 0));
  const mins = S.sessions.filter(s => s.itemId === id).reduce((a, s) => a + s.minutes, 0);
  const p = pct(it), sess = S.session;
  return `
  <button class="link" data-act="back" style="margin-bottom:16px">← Back</button>
  <div class="detail-top">
    <div>${coverHTML(it)}</div>
    <div class="stack">
      <div><span class="badge b-${it.status}">${B ? bookIco() : padIco()} ${L[it.status]}</span></div>
      <h1>${esc(it.title)}</h1>
      <div class="muted">${esc(B ? it.author : it.platform)}${it.genre ? ' · ' + esc(it.genre) : ''}</div>
      <div class="hearts big">${[1, 2, 3, 4, 5].map(n => `<button data-act="rate" data-id="${id}" data-n="${n}" aria-label="${n} hearts">${heart(n <= (it.rating || 0))}</button>`).join('')}</div>
      <div class="row"><button class="btn sm" data-act="edit" data-id="${id}">Edit</button>${it.steam_appid ? `<a class="btn sm" href="https://store.steampowered.com/app/${esc(it.steam_appid)}" target="_blank" rel="noopener">Steam ↗</a>` : ''}</div>
    </div>
  </div>

  <div class="section"><h2>Status</h2></div>
  <div class="seg">${STATUS.map(s => `<button class="${it.status === s ? 'on' : ''}" data-act="status" data-id="${id}" data-s="${s}">${L[s]}</button>`).join('')}</div>

  <div class="section"><h2>Progress</h2><span class="label">${(B ? it.total_pages : it.total_hours) ? p + '%' : ''}</span></div>
  <div class="px card">
    ${it.status !== 'finished' ? `<div style="margin-bottom:16px">${sess && sess.itemId === id
      ? `<button class="btn mint" data-act="stopsession" style="width:calc(100% - 6px)">${timerIco()} Stop session</button>`
      : sess ? `<p class="note" style="margin:0">A session for another title is running — stop it first.</p>`
      : `<button class="btn mint" data-act="startsession" data-id="${id}" style="width:calc(100% - 6px)">${timerIco()} Start ${B ? 'reading' : 'playing'} session</button>`}</div>` : ''}
    ${B ? `
      <div class="bar"><i style="width:${p}%"></i></div>
      <div class="grid2" style="margin-top:16px">
        <label class="field"><span>CURRENT PAGE</span><input class="inp" type="number" inputmode="numeric" min="0" value="${it.current_page || 0}" data-change="page" data-id="${id}"></label>
        <label class="field"><span>TOTAL PAGES</span><input class="inp" type="number" inputmode="numeric" min="0" value="${it.total_pages || ''}" data-change="total" data-id="${id}"></label>
      </div>
      <div class="quick">${[5, 10, 25, 50].map(n => `<button class="btn sm" data-act="bump" data-id="${id}" data-n="${n}">+${n} pages</button>`).join('')}</div>`
    : `
      ${it.total_hours ? `<div class="bar mintbar"><i style="width:${p}%"></i></div>` : ''}
      <div class="grid2" style="margin-top:${it.total_hours ? 16 : 0}px">
        <label class="field"><span>HOURS PLAYED</span><input class="inp" type="number" inputmode="decimal" step="0.5" min="0" value="${it.hours_played || 0}" data-change="hours" data-id="${id}"></label>
        <label class="field"><span>HOURS TO BEAT (EST.)</span><input class="inp" type="number" inputmode="decimal" step="1" min="0" value="${it.total_hours || ''}" placeholder="optional" data-change="total" data-id="${id}"></label>
      </div>
      <div class="quick">${[0.5, 1, 2, 3].map(n => `<button class="btn sm mint" data-act="bump" data-id="${id}" data-n="${n}">+${n}h</button>`).join('')}</div>`}
    <div class="grid2" style="margin-top:16px">
      <label class="field"><span>STARTED</span><input class="inp" type="date" value="${it.date_started || ''}" data-change="date" data-k="date_started" data-id="${id}"></label>
      <label class="field"><span>FINISHED</span><input class="inp" type="date" value="${it.date_finished || ''}" data-change="date" data-k="date_finished" data-id="${id}"></label>
    </div>
    ${mins ? `<p class="note" style="margin:0">Timed sessions: ${fmtMins(mins)} in ${S.sessions.filter(s => s.itemId === id).length} sitting${S.sessions.filter(s => s.itemId === id).length === 1 ? '' : 's'}.</p>` : ''}
  </div>

  <div class="section"><h2>Review</h2></div>
  ${fin ? `<textarea class="inp" placeholder="What did you think?" data-change="review" data-id="${id}">${esc(it.review || '')}</textarea>`
    : `<div class="lockbox">${lockIco()}<div><b>Locked until ${B ? 'read' : 'completed'}</b><div class="small muted">Finish it first, then come back and tell the toad everything.</div></div></div>`}

  <div class="section"><h2>Favourite lines</h2><button class="link" data-act="newquote" data-id="${id}">+ Add</button></div>
  ${quotes.length ? `<div class="stack">${quotes.map(q => quoteCard(q)).join('')}</div>` : `<p class="note">Save a line you loved — it may turn up as the quote of the day.</p>`}

  <div class="section"><h2>Notes</h2></div>
  <textarea class="inp" placeholder="Thoughts, theories, where you left off…" data-change="notes" data-id="${id}">${esc(it.notes || '')}</textarea>

  ${it.synopsis ? `<div class="section"><h2>Synopsis</h2></div><div class="px card parch small" style="white-space:pre-wrap">${esc(it.synopsis)}</div>` : ''}

  <div class="section"><h2>Collections</h2><button class="link" data-act="newcoll" data-id="${id}">+ New</button></div>
  ${S.collections.length ? `<div class="coll-chips">${S.collections.map(c => `<button class="chip ${c.itemIds.includes(id) ? 'on' : ''}" data-act="togglecoll" data-c="${c.id}" data-id="${id}">${c.itemIds.includes(id) ? '✓ ' : ''}${esc(c.name)}</button>`).join('')}</div>` : `<p class="note">No collections yet.</p>`}

  <div class="section"><h2>Journal</h2><button class="link" data-act="journalfor" data-id="${id}">+ Write</button></div>
  ${entries.length ? `<div class="stack">${entries.map(entryCard).join('')}</div>` : `<p class="note">No entries about this one yet.</p>`}

  <div style="margin-top:34px;justify-content:space-between" class="row">
    <span class="small muted">Added ${fmtDate(it.date_added)}</span>
    <button class="btn sm danger" data-act="del" data-id="${id}">Delete</button>
  </div>`;
}

function viewCollections() {
  return `<div class="page-head"><div><div class="label">Little shelves</div><h1>Collections</h1></div><button class="btn primary" data-act="newcoll">+ New collection</button></div>
  ${S.collections.length ? `<div class="coll-grid">${S.collections.map(c => {
    const its = c.itemIds.map(byId).filter(Boolean);
    return `<button class="coll-card" data-act="go" data-r="collection-${c.id}"><div class="px" style="margin:3px"><div class="mosaic">${[0, 1, 2, 3].map(i => its[i] ? coverHTML(its[i], true) : `<div class="cover" style="background:var(--cream)"></div>`).join('')}</div>
      <div class="card" style="padding:12px 14px"><h3>${esc(c.name)}</h3><div class="small muted">${its.length} item${its.length === 1 ? '' : 's'}${c.description ? ' · ' + esc(c.description) : ''}</div></div></div></button>`;
  }).join('')}</div>` : emptyBox('Group things into little shelves — “Autumn reads”, “Cozy games”, “Books Mum lent me”.', `<button class="btn primary" data-act="newcoll">Create one</button>`)}`;
}
function viewCollection(cid) {
  const c = S.collections.find(x => x.id === cid);
  if (!c) return emptyBox('That collection is gone.', `<button class="btn" data-act="go" data-r="collections">Back</button>`);
  const its = c.itemIds.map(byId).filter(Boolean);
  return `<button class="link" data-act="go" data-r="collections" style="margin-bottom:16px">← Collections</button>
  <div class="page-head"><div><div class="label">Collection</div><h1>${esc(c.name)}</h1>${c.description ? `<p class="muted" style="margin:6px 0 0">${esc(c.description)}</p>` : ''}</div>
    <div class="row"><button class="btn sm primary" data-act="collitems" data-c="${c.id}">Add / remove</button><button class="btn sm" data-act="editcoll" data-c="${c.id}">Rename</button><button class="btn sm danger" data-act="delcoll" data-c="${c.id}">Delete</button></div></div>
  ${its.length ? `<div class="grid">${its.map(tile).join('')}</div>` : emptyBox('This shelf is empty.', `<button class="btn primary" data-act="collitems" data-c="${c.id}">Add items</button>`)}`;
}

function entryCard(e) {
  const it = e.itemId ? byId(e.itemId) : null;
  return `<div class="px card entry"><div class="when"><span class="label">${fmtDate(e.date)}${e.mood ? ' · ' + esc(e.mood) : ''}</span><button class="link" data-act="editentry" data-e="${e.id}">Edit</button></div>
    ${it ? `<button class="link" data-act="open" data-id="${it.id}">${esc(it.title)}</button>` : ''}<p>${esc(e.text)}</p></div>`;
}
function viewJournal() {
  const tab = ui.journalTab;
  const head = `<div class="page-head"><div><div class="label">Dear diary</div><h1>Journal</h1></div><button class="btn primary" data-act="${tab === 'quotes' ? 'newquote' : 'newentry'}">+ New ${tab === 'quotes' ? 'line' : 'entry'}</button></div>
  <div class="chips"><button class="chip ${tab === 'entries' ? 'on' : ''}" data-act="jtab" data-v="entries">Entries<span class="n">${S.journal.length}</span></button><button class="chip ${tab === 'quotes' ? 'on' : ''}" data-act="jtab" data-v="quotes">Favourite lines<span class="n">${S.quotes.length}</span></button></div>`;
  if (tab === 'quotes') {
    const list = [...S.quotes].sort((a, b) => b.date.localeCompare(a.date));
    return head + (list.length ? `<div class="stack" style="margin-top:8px">${list.map(q => quoteCard(q, true)).join('')}</div>` : emptyBox('Lines you loved will live here. Add them from any book or game page, or right here.', `<button class="btn primary" data-act="newquote">Save a line</button>`));
  }
  let list = [...S.journal].sort((a, b) => b.date.localeCompare(a.date) || (b.created || '').localeCompare(a.created || ''));
  if (ui.journalItem) list = list.filter(e => e.itemId === ui.journalItem);
  const groups = {}; list.forEach(e => { const k = e.date.slice(0, 7); (groups[k] = groups[k] || []).push(e); });
  const linked = [...new Set(S.journal.map(j => j.itemId).filter(Boolean))].map(byId).filter(Boolean);
  return head + `
  ${linked.length ? `<select class="inp" data-change="journalfilter" style="margin:6px 0 4px"><option value="">All entries</option>${linked.map(i => `<option value="${i.id}" ${ui.journalItem === i.id ? 'selected' : ''}>${esc(i.title)}</option>`).join('')}</select>` : ''}
  ${list.length ? Object.keys(groups).map(k => { const [y, m] = k.split('-'); return `<div class="section"><h2>${MONTHS_LONG[+m - 1]} ${y}</h2></div><div class="stack">${groups[k].map(entryCard).join('')}</div>`; }).join('')
    : emptyBox('Write a few lines about what you’re reading or playing — a favourite moment, how it made you feel.', `<button class="btn primary" data-act="newentry">Write the first entry</button>`)}`;
}

function barChart(vals, color, unit) {
  const W = 360, H = 150, max = Math.max(1, ...vals), bw = W / 12;
  return `<svg class="chart" viewBox="0 0 ${W} ${H + 22}" shape-rendering="crispEdges">
    <line x1="0" y1="${H}" x2="${W}" y2="${H}" stroke="${INK}" stroke-width="2"/>
    ${vals.map((v, i) => { const h = Math.round(v / max * (H - 18)); return `<g><title>${MONTHS[i]}: ${unit === 'h' ? fmtHours(v) + ' h' : Math.round(v) + ' pages'}</title><rect x="${i * bw + 5}" y="${H - h}" width="${bw - 10}" height="${h}" fill="${color}" stroke="${INK}" stroke-width="2"/>${v ? `<text x="${i * bw + bw / 2}" y="${H - h - 5}" font-size="9" text-anchor="middle" fill="${INK}" font-family="EB Garamond">${unit === 'h' ? fmtHours(v) : Math.round(v)}</text>` : ''}<text x="${i * bw + bw / 2}" y="${H + 16}" font-size="10" text-anchor="middle" fill="#8a6a52" font-family="EB Garamond">${MONTHS[i][0]}</text></g>`; }).join('')}
  </svg>`;
}
function achCard(a) {
  const got = S.achievements[a.id];
  return `<div class="px ach ${got ? '' : 'locked'}">${starIco()}<b>${esc(a.name)}</b><div class="small muted">${esc(a.desc)}</div><div class="label" style="margin-top:8px">${got ? fmtDate(got) : `+${a.xp} XP${a.ac ? ' · +' + a.ac : ''}`}</div></div>`;
}
function yearData(y) {
  const inY = l => l.date.startsWith(String(y));
  const pagesM = Array(12).fill(0), hoursM = Array(12).fill(0);
  S.logs.filter(inY).forEach(l => { const m = +l.date.slice(5, 7) - 1; (l.unit === 'pages' ? pagesM : hoursM)[m] += l.amount; });
  for (let i = 0; i < 12; i++) { pagesM[i] = Math.max(0, pagesM[i]); hoursM[i] = Math.max(0, hoursM[i]); }
  const hoursByItem = {}; S.logs.filter(l => inY(l) && l.unit === 'hours').forEach(l => hoursByItem[l.itemId] = (hoursByItem[l.itemId] || 0) + l.amount);
  const fb = finishedIn('book', y), fg = finishedIn('game', y);
  const genres = {}; fb.forEach(b => { if (b.genre) genres[b.genre] = (genres[b.genre] || 0) + 1; });
  return { pagesM, hoursM, fb, fg, hoursByItem, genres,
    pages: pagesM.reduce((a, b) => a + b, 0), hours: hoursM.reduce((a, b) => a + b, 0),
    mins: S.sessions.filter(s => s.date.startsWith(String(y))).reduce((a, s) => a + s.minutes, 0),
    journal: S.journal.filter(j => j.date.startsWith(String(y))).length };
}
function viewStats() {
  const y = ui.statsYear, d = yearData(y);
  const years = [...new Set([new Date().getFullYear(), ...S.logs.map(l => +l.date.slice(0, 4)), ...S.items.map(i => +(i.date_finished || '').slice(0, 4)).filter(Boolean)])].sort((a, b) => b - a);
  const rated = S.items.filter(i => i.rating);
  const avg = rated.length ? (rated.reduce((a, i) => a + i.rating, 0) / rated.length).toFixed(1) : '—';
  const genres = {}; books().forEach(b => { if (b.genre) genres[b.genre] = (genres[b.genre] || 0) + 1; });
  const topG = Object.entries(genres).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const plats = {}; games().forEach(g => { if (g.platform) plats[g.platform] = (plats[g.platform] || 0) + (g.hours_played || 0); });
  const topP = Object.entries(plats).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const longest = d.fb.filter(b => b.total_pages).sort((a, b) => b.total_pages - a.total_pages)[0];
  const p = progressNumbers();
  return `<div class="page-head"><div><div class="label">The almanac</div><h1>Stats</h1></div>
    <select class="inp" style="width:auto" data-change="statsyear">${years.map(v => `<option ${v === y ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
  <div class="banner cta" data-act="go" data-r="review-${y}">${starIco()}<div><b>Your ${y} in review</b><div class="small muted">A little storybook of your year.</div></div></div>
  <div class="stats4">
    <div class="px stat pink"><div class="label">Books read</div><div class="v">${d.fb.length}</div></div>
    <div class="px stat mint"><div class="label">Pages</div><div class="v">${Math.round(d.pages).toLocaleString('en-GB')}</div></div>
    <div class="px stat parch"><div class="label">Games done</div><div class="v">${d.fg.length}</div></div>
    <div class="px stat"><div class="label">Hours</div><div class="v">${fmtHours(d.hours)}</div></div>
  </div>
  <div class="section"><h2>Pages per month</h2></div><div class="px card">${barChart(d.pagesM, '#f29bb2', 'p')}</div>
  <div class="section"><h2>Hours per month</h2></div><div class="px card">${barChart(d.hoursM, '#8fcfa8', 'h')}</div>
  <div class="section"><h2>Little facts</h2></div>
  <div class="px card">
    <div class="kv"><span>Average hearts given</span><b>${avg}</b></div>
    <div class="kv"><span>Longest book read in ${y}</span><b>${longest ? esc(longest.title) + ' (' + longest.total_pages + ' p)' : '—'}</b></div>
    <div class="kv"><span>Time in timed sessions (${y})</span><b>${d.mins ? fmtMins(d.mins) : '—'}</b></div>
    <div class="kv"><span>Did not finish (all time)</span><b>${S.items.filter(i => i.status === 'dnf').length}</b></div>
    <div class="kv"><span>Journal entries · saved lines</span><b>${S.journal.length} · ${S.quotes.length}</b></div>
    <div class="kv"><span>Total XP</span><b>${p.xp.toLocaleString('en-GB')}</b></div>
    <div class="kv" style="border:0"><span>Current streak</span><b>${streak()} days</b></div>
  </div>
  ${topG.length ? `<div class="section"><h2>Favourite genres</h2></div><div class="px card">${topG.map(([g, n]) => `<div class="kv"><span>${esc(g)}</span><b>${n}</b></div>`).join('')}</div>` : ''}
  ${topP.length ? `<div class="section"><h2>Hours by platform</h2></div><div class="px card">${topP.map(([g, n]) => `<div class="kv"><span>${esc(g)}</span><b>${fmtHours(n)} h</b></div>`).join('')}</div>` : ''}
  <div class="section"><h2>Achievements</h2><span class="label">${Object.keys(S.achievements).length}/${ACH.length}</span></div>
  <div class="ach-grid">${ACH.map(achCard).join('')}</div>`;
}

function viewReview(y) {
  if (!y) y = new Date().getFullYear();
  const d = yearData(y);
  const allFin = [...d.fb, ...d.fg].sort((a, b) => a.date_finished.localeCompare(b.date_finished));
  const best = arr => [...arr].filter(i => i.rating).sort((a, b) => b.rating - a.rating || b.date_finished.localeCompare(a.date_finished))[0];
  const topBook = best(d.fb), topGame = best(d.fg);
  const mostPlayedId = Object.entries(d.hoursByItem).sort((a, b) => b[1] - a[1])[0];
  const mostPlayed = mostPlayedId ? byId(mostPlayedId[0]) : null;
  const longest = d.fb.filter(b => b.total_pages).sort((a, b) => b.total_pages - a.total_pages)[0];
  const busy = d.pagesM.indexOf(Math.max(...d.pagesM));
  const topGenre = Object.entries(d.genres).sort((a, b) => b[1] - a[1])[0];
  const yq = S.quotes.filter(q => q.date.startsWith(String(y)));
  const fq = yq.length ? yq[hash(String(y)) % yq.length] : null;
  const achs = ACH.filter(a => (S.achievements[a.id] || '').startsWith(String(y)));
  const hl = (label, it, extra) => it ? `<div class="px hl">${coverHTML(it, true)}<div><div class="label">${label}</div><b>${esc(it.title)}</b><div class="small muted">${extra || ''}</div></div></div>` : '';
  return `<button class="link" data-act="go" data-r="stats" style="margin-bottom:16px">← Stats</button>
  <div class="px review-hero pink">${toad('toad', 'party')}<div class="label">Ivy Shelf presents</div><h1 style="margin-top:8px">${esc(S.profile.name || 'Your')}’s ${y}</h1><p class="muted" style="margin:8px 0 0">A year of pages, quests and quiet evenings.</p></div>
  <div class="stats4" style="margin-top:22px">
    <div class="px stat"><div class="label">Books finished</div><div class="big-num">${d.fb.length}</div></div>
    <div class="px stat"><div class="label">Pages turned</div><div class="big-num">${Math.round(d.pages).toLocaleString('en-GB')}</div></div>
    <div class="px stat"><div class="label">Games completed</div><div class="big-num">${d.fg.length}</div></div>
    <div class="px stat"><div class="label">Hours played</div><div class="big-num">${fmtHours(d.hours)}</div></div>
  </div>
  ${allFin.length ? `<div class="section"><h2>Everything you finished</h2></div><div class="px card"><div class="mosaic-wall">${allFin.map(i => `<button class="tile" data-act="open" data-id="${i.id}" style="padding:0">${coverHTML(i, true)}</button>`).join('')}</div></div>` : ''}
  <div class="section"><h2>Highlights</h2></div>
  <div class="stack">
    ${hl('Favourite book', topBook, topBook ? '♥'.repeat(topBook.rating) : '')}
    ${hl('Favourite game', topGame, topGame ? '♥'.repeat(topGame.rating) : '')}
    ${hl('Most played', mostPlayed, mostPlayed ? fmtHours(mostPlayedId[1]) + ' hours this year' : '')}
    ${hl('The big one', longest, longest ? longest.total_pages + ' pages' : '')}
    ${allFin.length ? hl('First finish of the year', allFin[0], fmtDate(allFin[0].date_finished)) : ''}
    ${allFin.length > 1 ? hl('Most recent finish', allFin[allFin.length - 1], fmtDate(allFin[allFin.length - 1].date_finished)) : ''}
  </div>
  <div class="section"><h2>Little facts</h2></div>
  <div class="px card">
    ${d.pages ? `<div class="kv"><span>Busiest reading month</span><b>${MONTHS_LONG[busy]}</b></div>` : ''}
    ${topGenre ? `<div class="kv"><span>Favourite genre</span><b>${esc(topGenre[0])}</b></div>` : ''}
    <div class="kv"><span>Journal entries written</span><b>${d.journal}</b></div>
    <div class="kv"><span>Time in timed sessions</span><b>${d.mins ? fmtMins(d.mins) : '—'}</b></div>
    <div class="kv" style="border:0"><span>Achievements unlocked</span><b>${achs.length}</b></div>
  </div>
  ${fq ? `<div class="section"><h2>A line you loved</h2></div><div class="px card pink"><div class="quote">“${esc(fq.text)}”</div><div class="label" style="margin-top:12px">— ${esc((byId(fq.itemId) || {}).title || '')}</div></div>` : ''}
  <p class="note" style="text-align:center;margin-top:26px">Take a screenshot to keep it ♥</p>`;
}

function viewShop() {
  const p = progressNumbers(), cat = ui.shopCat, sh = S.shop;
  const items = SHOP.filter(s => s.cat === cat);
  const art = s => s.cat === 'outfit' ? toadSVG(OUTFITS[s.id].slot === 'hat' ? { hat: s.id } : { neck: s.id }, '')
    : s.cat === 'decor' ? DECOR_SPRITES[s.id] : s.cat === 'companion' ? COMPANION_SPRITES[s.id]
    : `<div class="swatch"><i style="background:${s.sw[0]}"></i><i style="background:${s.sw[1]}"></i></div>`;
  const isOn = s => s.cat === 'outfit' ? (sh.hat === s.id || sh.neck === s.id) : s.cat === 'decor' ? sh.decor.includes(s.id) : s.cat === 'theme' ? sh.theme === s.id : sh.companion === s.id;
  return `<div class="page-head"><div><div class="label">Spend your acorns</div><h1>Acorn shop</h1></div><span class="chip-stat">${acorn()} ${p.acorns}</span></div>
  <div class="px card parch row" style="flex-wrap:nowrap;gap:14px;margin-bottom:18px">${toad('toad', toadMood()).replace('class="pix toad', 'style="width:64px;flex:none" class="pix toad')}<div class="small">Acorns come from finishing things (+10), reading (+1 per 50 pages), playing (+1 per hour), journaling (+2) and achievements.</div></div>
  <div class="chips">${SHOP_CATS.map(([id, n]) => `<button class="chip ${cat === id ? 'on' : ''}" data-act="shopcat" data-v="${id}">${n}</button>`).join('')}</div>
  ${cat === 'decor' ? `<p class="note" style="margin-top:0">Up to ${MAX_DECOR} decorations show in the nook and on your bookshelf.</p>` : ''}
  <div class="shop-grid" style="margin-top:8px">${items.map(s => {
    const owned = sh.owned.includes(s.id), on = isOn(s);
    return `<div class="px ware ${on ? 'on' : owned ? 'owned' : ''}"><div class="art">${art(s)}</div><b>${esc(s.name)}</b>
      ${owned ? `<button class="btn sm ${on ? 'primary' : ''}" data-act="equip" data-id="${s.id}">${on ? (s.cat === 'theme' ? 'In use' : 'Take off') : (s.cat === 'theme' ? 'Use' : s.cat === 'decor' ? 'Display' : 'Wear')}</button>`.replace('Take off', s.cat === 'decor' ? 'Put away' : s.cat === 'companion' ? 'Send home' : 'Take off')
        : `<div class="price">${acorn()} ${s.price}</div><button class="btn sm mint" data-act="buy" data-id="${s.id}" ${p.acorns < s.price ? 'disabled' : ''}>Buy</button>`}
    </div>`;
  }).join('')}</div>`;
}

function viewSettings() {
  const st = S.settings;
  return `<div class="page-head"><div><div class="label">The cupboard</div><h1>Settings</h1></div></div>
  <div class="px card stack">
    <label class="field"><span>YOUR NAME</span><input class="inp" value="${esc(S.profile.name)}" data-change="pname"></label>
    <label class="field"><span>BOOKS TO READ THIS YEAR (0 = NO GOAL)</span><input class="inp" type="number" inputmode="numeric" min="0" value="${S.profile.yearGoal || 0}" data-change="pgoal"></label>
  </div>
  <div class="section"><h2>Atmosphere</h2></div>
  <div class="px card">
    <label class="switch"><span>Sounds<br><span class="small muted">Turn your ringer on to hear them on iPhone.</span></span><input type="checkbox" data-change="set" data-k="sound" ${st.sound ? 'checked' : ''}></label>
    <label class="switch"><span>Sky follows the time of day<br><span class="small muted">Morning, afternoon, sunset and a starry night mode.</span></span><input type="checkbox" data-change="setsky" ${st.sky === 'auto' ? 'checked' : ''}></label>
    <label class="switch"><span>Seasonal weather<br><span class="small muted">Leaves, snow, petals and fireflies.</span></span><input type="checkbox" data-change="set" data-k="seasons" ${st.seasons ? 'checked' : ''}></label>
  </div>
  <div class="section"><h2>Backup</h2></div>
  <div class="px card stack">
    <p style="margin:0">Everything lives on this device only. Save a backup now and then (to Files or iCloud Drive) so nothing is lost if you change phones.</p>
    <div class="row"><button class="btn primary" data-act="export">Save backup</button><button class="btn" data-act="import">Restore backup</button></div>
    <p class="note" style="margin:0">${S.items.length} items · ${S.journal.length} journal entries · ${S.quotes.length} lines · ${S.collections.length} collections</p>
  </div>
  <div class="section"><h2>Games &amp; Steam</h2></div>
  <div class="px card stack">
    <label class="field"><span>HELPER SERVER ADDRESS</span><input class="inp" inputmode="url" placeholder="https://ivy-shelf.….workers.dev" value="${esc(st.server)}" data-change="server"></label>
    <label class="field"><span>YOUR STEAM PROFILE</span><input class="inp" inputmode="url" value="${esc(st.steamUser)}" data-change="steamuser"></label>
    <div class="row"><button class="btn sm" data-act="testserver" ${st.server ? '' : 'disabled'}>Test connection</button><button class="btn sm mint" data-act="steamsync" ${st.server ? '' : 'disabled'}>Sync hours now</button><button class="btn sm primary" data-act="go" data-r="steam" ${st.server ? '' : 'disabled'}>Import from Steam</button></div>
    <p class="note" style="margin:0" id="server-msg">${st.server ? (st.lastSteamSync ? 'Hours last synced ' + fmtDate(st.lastSteamSync) + '. They sync by themselves once a day when you open the app.' : 'Hours sync by themselves once a day when you open the app.') : 'Add the helper server address to search games by name (with real covers) and sync your Steam playtime.'}</p>
  </div>
  <div class="section"><h2>Danger zone</h2></div>
  <div class="px card"><button class="btn danger" data-act="wipe">Erase everything</button></div>
  <p class="note" style="margin-top:22px;text-align:center">Ivy Shelf · v2.1 · book data from Open Library &amp; Google Books</p>`;
}

/* ---------- modal, toasts, celebration ---------- */
function openModal(title, body, onMount) {
  $('#modal-root').innerHTML = `<div class="modal-bg" data-act="closebg"><div class="sheet" role="dialog" aria-modal="true"><div class="sheet-head"><h2>${title}</h2><button class="x" data-act="close" aria-label="Close">✕</button></div><div id="sheet-body">${body}</div></div></div>`;
  document.body.style.overflow = 'hidden';
  onMount && onMount();
}
function closeModal() { $('#modal-root').innerHTML = ''; document.body.style.overflow = ''; draft = null; }
const toastQ = []; let toastBusy = false;
function toast(title, sub = '', ico = null, sound = '') { toastQ.push({ title, sub, ico, sound }); if (toastQ.length > 3) toastQ.shift(); if (!toastBusy) nextToast(); }
function nextToast() {
  const t = toastQ.shift(); if (!t) { toastBusy = false; return; }
  toastBusy = true;
  const el = document.createElement('div'); el.className = 'px toast';
  el.innerHTML = (t.ico || toad('', 'awake')) + `<div><b>${esc(t.title)}</b>${t.sub ? `<span>${esc(t.sub)}</span>` : ''}</div>`;
  $('#toasts').appendChild(el); if (t.sound) sfx(t.sound);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => { el.remove(); nextToast(); }, 250); }, 2400);
}
function celebrate(it) {
  partyNow = true; sfx('jingle');
  const el = document.createElement('div'); el.className = 'party';
  el.innerHTML = `${toad('toad', 'party')}<h1>${it.type === 'book' ? 'Book finished!' : 'Game completed!'}</h1><div class="muted">${esc(it.title)}</div><div class="label" style="margin-top:14px">+100 XP · +10 acorns · review unlocked</div>`;
  document.body.appendChild(el);
  const colors = ['#f29bb2', '#8fcfa8', '#ecc66f', '#ddd0f0', '#a9cfe8'];
  for (let i = 0; i < 46; i++) {
    const c = document.createElement('div'); c.className = 'confetti';
    c.style.cssText = `left:${Math.random() * 100}vw;background:${colors[i % 5]};--dx:${(Math.random() - .5) * 140}px;animation-duration:${1.6 + Math.random() * 1.6}s;animation-delay:${Math.random() * .4}s`;
    document.body.appendChild(c); setTimeout(() => c.remove(), 3800);
  }
  const done = () => { el.remove(); partyNow = false; render(); };
  el.onclick = done; setTimeout(() => { if (el.isConnected) done(); }, 2800);
}
function askConfirm(text, yes, okLabel = 'Yes', danger = true) {
  openModal('Are you sure?', `<p>${text}</p><div class="row" style="justify-content:flex-end"><button class="btn" data-act="close">Cancel</button><button class="btn ${danger ? 'danger' : 'primary'}" id="confirm-yes">${okLabel}</button></div>`,
    () => { $('#confirm-yes').onclick = () => { closeModal(); yes(); }; });
}

/* ---------- add / edit item form ---------- */
let draft = null;
let lastResults = [];
function newItem(type, status = 'want') {
  return { id: uid(), user_id: USER_ID, type, title: '', author: '', cover_url: '', cover_fallbacks: [], synopsis: '', genre: '', isbn: '', open_library_id: '',
    total_pages: '', current_page: 0, platform: type === 'game' ? 'Steam' : '', steam_appid: '', total_hours: '', hours_played: 0,
    status, rating: 0, review: '', notes: '', date_added: today(), date_started: '', date_finished: '', updated_at: '' };
}
function openItemForm(type, existing, status) {
  draft = existing ? JSON.parse(JSON.stringify(existing)) : newItem(type, status || 'want');
  draft._new = !existing; lastResults = [];
  openModal(existing ? 'Edit ' + type : 'Add to the shelf', formHTML());
}
function rerenderForm() { const b = $('#sheet-body'); if (b) b.innerHTML = formHTML(); }
function formHTML() {
  const d = draft, B = d.type === 'book', L = LABEL[d.type];
  return `
  ${d._new ? `<div class="typeswitch"><button class="${B ? 'on' : ''}" data-act="ftype" data-type="book">${bookIco()} Book</button><button class="${!B ? 'on' : ''}" data-act="ftype" data-type="game">${padIco()} Game</button></div>` : ''}
  ${B ? `
    <div class="field"><span>FIND A BOOK (TITLE, AUTHOR OR ISBN)</span>
      <form class="search-row" data-submit="search"><input class="inp" id="q" type="search" enterkeyhint="search" placeholder="e.g. Anne of Green Gables" autocomplete="off"><button class="btn primary" type="submit">Search</button></form></div>
    <button class="btn sm" data-act="scan" style="margin-bottom:6px">${scanIco()} Scan barcode</button>
    <div id="results"></div>` : `
    ${S.settings.server ? `<div class="field"><span>FIND A GAME</span>
      <form class="search-row" data-submit="gsearch"><input class="inp" id="gq" type="search" enterkeyhint="search" placeholder="e.g. Stardew Valley" autocomplete="off"><button class="btn mint" type="submit">Search</button></form></div>
    <div id="results"></div>` : `<p class="note" style="margin-top:0">Tip: paste the game’s Steam store link and the cover fills in by itself.</p>`}`}
  <div class="form-cover" style="margin-top:14px">
    <div id="form-cover">${coverHTML(d)}</div>
    <div class="stack" style="margin-top:0">
      <div class="label">Cover</div>
      <div class="row" style="gap:6px">
        <button class="btn sm" data-act="upload">Photo / upload</button>
        ${B && d.open_library_id ? `<button class="btn sm" data-act="editions">Other editions</button>` : ''}
        ${d.cover_url ? `<button class="btn sm" data-act="nocover">Remove</button>` : ''}
      </div>
      <input class="inp" placeholder="…or paste an image link" value="${d.cover_url && !d.cover_url.startsWith('data:') ? esc(d.cover_url) : ''}" data-input="coverurl">
    </div>
  </div>
  <div id="editions"></div>
  <label class="field"><span>TITLE *</span><input class="inp" value="${esc(d.title)}" data-input="f" data-k="title"></label>
  ${B ? `
    <label class="field"><span>AUTHOR</span><input class="inp" value="${esc(d.author)}" data-input="f" data-k="author"></label>
    <div class="grid2"><label class="field"><span>TOTAL PAGES</span><input class="inp" type="number" inputmode="numeric" value="${esc(d.total_pages)}" data-input="f" data-k="total_pages"></label>
    <label class="field"><span>GENRE</span><input class="inp" value="${esc(d.genre)}" data-input="f" data-k="genre" list="genre-list"></label></div>
    <datalist id="genre-list">${[...new Set(books().map(b => b.genre).filter(Boolean))].map(g => `<option value="${esc(g)}">`).join('')}</datalist>`
  : `
    <label class="field"><span>STEAM LINK OR APP ID</span><input class="inp" inputmode="url" placeholder="https://store.steampowered.com/app/…" value="${esc(d.steam_appid)}" data-input="steam"></label>
    <div class="grid2"><label class="field"><span>PLATFORM</span><select class="inp" data-change="fplat">${PLATFORMS.map(p => `<option ${d.platform === p ? 'selected' : ''}>${p}</option>`).join('')}</select></label>
    <label class="field"><span>GENRE</span><input class="inp" value="${esc(d.genre)}" data-input="f" data-k="genre"></label></div>
    <div class="grid2"><label class="field"><span>HOURS PLAYED</span><input class="inp" type="number" inputmode="decimal" step="0.5" value="${esc(d.hours_played)}" data-input="f" data-k="hours_played"></label>
    <label class="field"><span>HOURS TO BEAT</span><input class="inp" type="number" inputmode="decimal" placeholder="optional" value="${esc(d.total_hours)}" data-input="f" data-k="total_hours"></label></div>
    <p class="note" style="margin-top:-6px"><a href="https://store.steampowered.com/search/?term=${encodeURIComponent(d.title || '')}" target="_blank" rel="noopener">Find it on Steam ↗</a> · <a href="https://howlongtobeat.com/?q=${encodeURIComponent(d.title || '')}" target="_blank" rel="noopener">How long to beat ↗</a></p>`}
  ${d._new ? `<div class="field"><span>STATUS</span><div class="seg">${STATUS.map(s => `<button class="${d.status === s ? 'on' : ''}" data-act="fstatus" data-s="${s}">${L[s]}</button>`).join('')}</div></div>
    ${B && d.status === 'active' ? `<label class="field"><span>CURRENT PAGE</span><input class="inp" type="number" inputmode="numeric" value="${esc(d.current_page)}" data-input="f" data-k="current_page"></label>` : ''}` : ''}
  <label class="field"><span>SYNOPSIS</span><textarea class="inp" style="min-height:80px" data-input="f" data-k="synopsis">${esc(d.synopsis)}</textarea></label>
  <p class="err" id="form-err"></p>
  <div class="row" style="justify-content:flex-end"><button class="btn" data-act="close">Cancel</button><button class="btn primary" data-act="saveitem">${d._new ? 'Add to shelf' : 'Save'}</button></div>`;
}
function refreshFormCover() { const c = $('#form-cover'); if (c) c.innerHTML = coverHTML(draft); }
function resultsHTML(res) {
  return `<div class="results">${res.map((r, i) => `<button class="result" data-act="pick" data-i="${i}">${coverHTML({ ...r, type: 'book' }, true)}<div><b>${esc(r.title)}</b><span class="small muted">${esc(r.author)}${r.year ? ' · ' + r.year : ''}${r.total_pages ? ' · ' + r.total_pages + ' p' : ''}</span></div></button>`).join('')}</div>`;
}
async function doSearch(q) {
  const box = $('#results'); if (!q.trim() || !box) return;
  const isbn = q.replace(/[-\s]/g, '');
  if (/^(97[89])?\d{9}[\dXx]$/.test(isbn)) return useISBN(isbn);
  box.innerHTML = `<p class="note">Looking through the stacks…</p>`;
  let res = [], err = '';
  try { res = await searchOpenLibrary(q); } catch (e) { err = e; }
  if (!res.length) { try { res = await searchGoogle(q); } catch (e) { err = e; } }
  lastResults = res;
  if (!res.length) { box.innerHTML = `<p class="${err ? 'err' : 'note'}">${err ? 'Couldn’t reach the book catalogues — are you online? You can still fill it in by hand below.' : 'Nothing found. Try fewer words, or fill it in by hand below.'}</p>`; return; }
  box.innerHTML = resultsHTML(res) + (res[0].source === 'Open Library' ? `<button class="link" data-act="google" data-q="${esc(q)}">Not here? Search Google Books</button>` : '');
}
async function pickResult(r) {
  Object.assign(draft, { title: r.title, author: r.author, total_pages: r.total_pages || draft.total_pages, isbn: r.isbn, open_library_id: r.open_library_id, genre: r.genre || draft.genre, cover_url: r.cover_url || draft.cover_url, synopsis: r.synopsis || draft.synopsis, cover_fallbacks: r.cover_fallbacks || [] });
  rerenderForm(); sfx('pop');
  if (r.open_library_id && !r.synopsis) { const s = await olDescription(r.open_library_id); if (s && draft && !draft.synopsis) { draft.synopsis = s; const t = $('textarea[data-k="synopsis"]'); if (t) t.value = s; } }
}
async function useISBN(isbn) {
  const box = $('#results'); if (box) box.innerHTML = `<p class="note">Looking up ISBN ${esc(isbn)}…</p>`;
  const r = await lookupISBN(isbn);
  if (!draft) return;
  if (r) { await pickResult(r); toast('Found it!', r.title, bookIco(), 'coin'); }
  else { draft.isbn = isbn; const b = $('#results'); if (b) b.innerHTML = `<p class="note">No catalogue knows ISBN ${esc(isbn)} yet — fill in the rest by hand.</p>`; }
}
async function showEditions() {
  const box = $('#editions'); box.innerHTML = `<p class="note">Gathering editions…</p>`;
  try {
    const eds = await olEditions(draft.open_library_id);
    if (!eds.length) { box.innerHTML = `<p class="note">No other covers found for this book.</p>`; return; }
    box.innerHTML = `<div class="label">Tap the edition you own</div><div class="cover-pick">${eds.map((e, i) => `<button data-act="pickedition" data-i="${i}" class="${e.cover_url === draft.cover_url ? 'on' : ''}" title="${esc(e.label)}">${coverHTML({ title: e.label || draft.title, type: 'book', cover_url: e.cover_url }, true)}</button>`).join('')}</div>`;
    box._eds = eds;
  } catch (e) { box.innerHTML = `<p class="err">Couldn’t load editions right now.</p>`; }
}
function saveItem() {
  const d = draft;
  d.title = (d.title || '').trim();
  if (!d.title) { $('#form-err').textContent = 'Give it a title first.'; return; }
  ['total_pages', 'current_page'].forEach(k => d[k] = d[k] === '' ? '' : Math.max(0, Math.round(num(d[k]))));
  ['total_hours', 'hours_played'].forEach(k => d[k] = d[k] === '' ? '' : Math.max(0, num(d[k])));
  d.updated_at = new Date().toISOString();
  const isNew = d._new; delete d._new;
  if (isNew) {
    if (d.status === 'active') d.date_started = today();
    if (d.status === 'finished') { d.date_finished = today(); if (d.type === 'book' && d.total_pages) d.current_page = d.total_pages; }
    S.items.push(d);
  } else { const i = S.items.findIndex(x => x.id === d.id); S.items[i] = d; }
  const id = d.id; closeModal();
  commit();
  if (isNew) { toast('Added to your shelf', d.title, null, 'pop'); go('item-' + id); }
}

/* ---------- barcode scanner ---------- */
let scanner = null;
function loadScript(src) { return new Promise((res, rej) => { if ($(`script[src="${src}"]`)) return res(); const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); }
async function openScanner() {
  $('#scan-root').innerHTML = `<div class="modal-bg"><div class="sheet"><div class="sheet-head"><h2>Scan the barcode</h2><button class="x" data-act="closescan" aria-label="Close">✕</button></div>
    <div id="reader"></div><p class="note" id="scan-msg">Point the camera at the barcode on the back of the book.</p>
    <div class="row"><button class="btn sm" data-act="scanphoto">Use a photo instead</button><button class="btn sm" data-act="closescan">Cancel</button></div></div></div>`;
  try {
    await loadScript('lib/html5-qrcode.min.js');
    const F = Html5QrcodeSupportedFormats;
    scanner = new Html5Qrcode('reader', { formatsToSupport: [F.EAN_13, F.EAN_8, F.UPC_A, F.UPC_E], verbose: false });
    await scanner.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 260, height: 120 }, aspectRatio: 1.5 }, code => gotCode(code), () => {});
  } catch (e) {
    const m = $('#scan-msg'); if (m) m.textContent = 'The camera isn’t available here — take a photo of the barcode instead.';
  }
}
async function closeScanner() {
  if (scanner) { try { if (scanner.isScanning) await scanner.stop(); scanner.clear(); } catch (e) {} scanner = null; }
  $('#scan-root').innerHTML = '';
}
async function gotCode(code) {
  const isbn = String(code).replace(/\D/g, '');
  await closeScanner(); sfx('coin');
  if (!draft) openItemForm('book', null, 'want');
  if (draft.type !== 'book') { draft = newItem('book', draft.status); draft._new = true; rerenderForm(); }
  useISBN(isbn);
}

/* ---------- reading / playing sessions ---------- */
let pillTimer = null;
function elapsedMin() { return S.session ? (Date.now() - S.session.start) / 60000 : 0; }
function clock(m) { const s = Math.floor(m * 60); return `${Math.floor(s / 3600) ? Math.floor(s / 3600) + ':' : ''}${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`; }
function renderSessionPill() {
  const r = $('#session-root'); const ss = S.session; const it = ss ? byId(ss.itemId) : null;
  clearInterval(pillTimer);
  if (!ss || !it) { r.innerHTML = ''; if (ss && !it) S.session = null; return; }
  r.innerHTML = `<div class="px session-pill">${timerIco()}<div class="tx">${it.type === 'book' ? 'Reading' : 'Playing'} · <i>${esc(it.title)}</i></div><span class="clock" id="pill-clock">${clock(elapsedMin())}</span><button class="btn sm mint" data-act="stopsession">Stop</button></div>`;
  pillTimer = setInterval(() => { const c = $('#pill-clock'); if (c) c.textContent = clock(elapsedMin()); }, 1000);
}
function startSession(id) {
  const it = byId(id); S.session = { itemId: id, start: Date.now() };
  if (it.status !== 'active') setStatus(it, 'active', true);
  sfx('start'); commit();
}
function stopSession() {
  const ss = S.session; if (!ss) return; const it = byId(ss.itemId); const mins = elapsedMin();
  const B = it.type === 'book';
  openModal('Session finished', `
    <div class="px card parch" style="text-align:center;margin-bottom:16px"><div class="label">You spent</div><div class="big-num">${fmtMins(Math.max(1, mins))}</div><div class="muted"><i>${esc(it.title)}</i></div></div>
    ${B ? `<label class="field"><span>WHAT PAGE ARE YOU ON NOW?</span><input class="inp" id="ss-val" type="number" inputmode="numeric" value="${it.current_page || 0}"></label>`
        : `<label class="field"><span>HOURS TO ADD</span><input class="inp" id="ss-val" type="number" inputmode="decimal" step="0.1" value="${Math.max(0.1, Math.round(mins / 6) / 10)}"></label>`}
    <div class="row" style="justify-content:space-between"><button class="btn sm danger" id="ss-discard">Discard</button><div class="row"><button class="btn" data-act="close">Keep going</button><button class="btn primary" id="ss-save">Save</button></div></div>`, () => {
    $('#ss-save').onclick = () => {
      const v = $('#ss-val').value, wasFinished = it.status === 'finished';
      S.sessions.push({ id: uid(), user_id: USER_ID, itemId: it.id, date: today(), start: ss.start, end: Date.now(), minutes: Math.max(1, Math.round(mins)) });
      S.session = null; closeModal(); sfx('stop');
      if (B) setPage(it, v); else setHours(it, (it.hours_played || 0) + num(v));
      commit(); if (!wasFinished && it.status === 'finished') celebrate(it); else toast('Session saved', fmtMins(Math.max(1, mins)), timerIco());
    };
    $('#ss-discard').onclick = () => { S.session = null; closeModal(); commit(); };
  });
}

/* ---------- helper server: game search + Steam ---------- */
async function api(path) {
  if (!S.settings.server) throw new Error('Add the helper server address in Settings');
  let r, j;
  try { r = await fetch(S.settings.server + path); } catch (e) { throw new Error('Couldn’t reach the helper server — are you online?'); }
  try { j = await r.json(); } catch (e) { throw new Error('The helper server didn’t answer properly'); }
  if (!r.ok || (j && j.error)) throw new Error((j && j.error) || ('Server error ' + r.status));
  return j;
}
let gameResults = [];
const IGDB_PLATFORM = { PC: 'Steam', Switch: 'Switch', 'Switch 2': 'Switch', PS5: 'PS5', PS4: 'PS4', XONE: 'Xbox', 'Series X|S': 'Xbox', iOS: 'Mobile', Android: 'Mobile' };
async function doGameSearch(q) {
  const box = $('#results'); if (!q.trim() || !box) return;
  box.innerHTML = `<p class="note">Searching the arcade…</p>`;
  try { gameResults = await api('/games/search?q=' + encodeURIComponent(q)); }
  catch (e) { box.innerHTML = `<p class="err">${esc(e.message)}. You can still paste a Steam link or fill it in by hand.</p>`; return; }
  if (!gameResults.length) { box.innerHTML = `<p class="note">Nothing found. Try another spelling, or fill it in by hand below.</p>`; return; }
  box.innerHTML = `<div class="results">${gameResults.map((r, i) => `<button class="result" data-act="gpick" data-i="${i}">${coverHTML({ type: 'game', title: r.title, cover_url: r.cover_url }, true)}<div><b>${esc(r.title)}</b><span class="small muted">${[r.year, r.platforms.slice(0, 4).join(', ')].filter(Boolean).join(' · ')}</span></div></button>`).join('')}</div>`;
}
async function pickGame(r) {
  Object.assign(draft, { title: r.title, cover_url: r.cover_url || draft.cover_url, cover_fallbacks: [], genre: r.genre || draft.genre, synopsis: r.synopsis || draft.synopsis, igdb_id: r.igdb_id });
  if (!r.platforms.includes('PC')) { const p = r.platforms.map(x => IGDB_PLATFORM[x]).find(Boolean); if (p) draft.platform = p; }
  rerenderForm(); sfx('pop');
  try {
    const t = await api('/games/ttb?id=' + r.igdb_id);
    if (t.normally && draft && !draft.total_hours) { draft.total_hours = t.normally; const el = $('input[data-k="total_hours"]'); if (el) el.value = t.normally; }
  } catch (e) {}
}

let steamData = null; // { loading, error, games }
async function loadSteam() {
  steamData = { loading: true }; render();
  try { const d = await api('/steam/library?user=' + encodeURIComponent(S.settings.steamUser || '')); steamData = { games: d.games }; }
  catch (e) { steamData = { error: e.message }; }
  if (route === 'steam') render();
}
function viewSteam() {
  const head = `<button class="link" data-act="go" data-r="settings" style="margin-bottom:16px">← Settings</button>
    <div class="page-head"><div><div class="label">From your Steam library</div><h1>Import games</h1></div></div>`;
  if (!S.settings.server) return head + emptyBox('Add the helper server address in Settings first.', `<button class="btn" data-act="go" data-r="settings">Open Settings</button>`);
  if (!steamData) { setTimeout(loadSteam); return head + `<p class="note">Opening your Steam library…</p>`; }
  if (steamData.loading) return head + `<div class="px card empty">${toad()}<p class="muted" style="margin:0">Opening your Steam library…</p></div>`;
  if (steamData.error) return head + emptyBox(esc(steamData.error), `<button class="btn" data-act="loadsteam">Try again</button>`);
  const onShelf = new Set(games().map(g => String(g.steam_appid)).filter(Boolean));
  const list = steamData.games, total = list.reduce((a, g) => a + g.hours, 0);
  const recent = d => d && daysBetween(d, today()) <= 60;
  return head + `
  <p style="margin-top:0">${list.length} games · ${fmtHours(total)} hours on Steam. ${onShelf.size ? onShelf.size + ' already on your shelf.' : ''}</p>
  <div class="px card" style="margin-bottom:18px">
    <div class="label" style="margin-bottom:10px">Games you haven’t played in 2 months go to</div>
    <div class="seg" id="old-status">${['active', 'finished', 'dnf', 'want'].map((s, i) => `<button class="${i === 0 ? 'on' : ''}" data-act="oldstatus" data-s="${s}">${LABEL.game[s]}</button>`).join('')}</div>
    <p class="note" style="margin:10px 0 0">Recently played games become <b>Playing</b>; never-played ones go to <b>Want to Play</b>. You can change any of them later.</p>
  </div>
  <input class="inp" type="search" placeholder="Filter…" id="steam-filter" style="margin-bottom:10px">
  <label class="switch" style="border:0"><span class="small">Select all shown</span><input type="checkbox" data-change="impall"></label>
  <div class="check-list" id="steam-list" style="max-height:none;margin-bottom:90px">${list.map(g => {
    const has = onShelf.has(String(g.appid)), c = steamCovers(g.appid);
    return `<label class="check-item" data-title="${esc(g.title.toLowerCase())}"><input type="checkbox" value="${g.appid}" ${has ? 'checked disabled' : g.hours > 0 ? 'checked' : ''}>${coverHTML({ type: 'game', title: g.title, cover_url: c[1], cover_fallbacks: c.slice(2) }, true)}
      <span><b class="small">${esc(g.title)}</b><br><span class="small muted">${has ? 'On your shelf' : g.hours ? fmtHours(g.hours) + ' h' + (g.last_played ? ' · last played ' + fmtDate(g.last_played) : '') : 'Never played'}${!has && recent(g.last_played) ? ' · recent' : ''}</span></span></label>`;
  }).join('')}</div>
  <div style="position:fixed;left:0;right:0;bottom:calc(76px + var(--safe-b));padding:10px 16px;z-index:28;display:flex;justify-content:center"><button class="btn primary" data-act="doimport" style="min-width:240px">Import selected</button></div>`;
}
function doImport() {
  const ids = $$('#steam-list input:checked:not(:disabled)').map(c => c.value);
  if (!ids.length) { toast('Nothing selected'); return; }
  const oldStatus = ($('#old-status .on') || {}).dataset?.s || 'active';
  const byApp = new Map(steamData.games.map(g => [String(g.appid), g]));
  ids.forEach(id => {
    const g = byApp.get(id); if (!g) return;
    const it = newItem('game'); const c = steamCovers(g.appid);
    const status = !g.hours ? 'want' : (g.last_played && daysBetween(g.last_played, today()) <= 60) ? 'active' : oldStatus;
    Object.assign(it, { title: g.title, platform: 'Steam', steam_appid: String(g.appid), cover_url: c[0], cover_fallbacks: c.slice(1), hours_played: g.hours, status, updated_at: new Date().toISOString() });
    if (status === 'active') it.date_started = g.last_played || today();
    if (status === 'finished') it.date_finished = g.last_played || today();
    S.items.push(it); // past playtime isn't logged, so it doesn't count as "played this month"
  });
  S.settings.lastSteamSync = today();
  commit(); sfx('jingle');
  toast(`Imported ${ids.length} game${ids.length === 1 ? '' : 's'}`, 'Hours will keep syncing once a day', padIco());
  go('games');
}
async function steamSync(manual) {
  if (!S.settings.server || !S.settings.steamUser) return;
  const linked = games().filter(g => g.steam_appid);
  if (!linked.length) { S.settings.lastSteamSync = today(); save(); if (manual) toast('No Steam games on your shelf yet', 'Use Import from Steam first'); return; }
  try {
    const d = await api('/steam/library?user=' + encodeURIComponent(S.settings.steamUser));
    const map = new Map(d.games.map(g => [String(g.appid), g]));
    let added = 0, n = 0;
    linked.forEach(it => { const g = map.get(String(it.steam_appid)); if (g && g.hours > (it.hours_played || 0) + 0.05) { added += g.hours - (it.hours_played || 0); setHours(it, g.hours); n++; } });
    S.settings.lastSteamSync = today(); commit();
    if (n) toast('Steam synced', `+${fmtHours(added)} h across ${n} game${n > 1 ? 's' : ''}`, padIco(), 'coin');
    else if (manual) toast('Steam synced', 'Everything was already up to date', padIco());
  } catch (e) { if (manual) toast('Steam sync failed', e.message); }
}

/* ---------- item mutations ---------- */
function touch(it) { it.updated_at = new Date().toISOString(); }
function logProgress(it, unit, amount) { if (amount) S.logs.push({ id: uid(), user_id: USER_ID, itemId: it.id, date: today(), unit, amount }); }
function setPage(it, v) {
  v = Math.max(0, Math.round(num(v))); if (it.total_pages) v = Math.min(v, it.total_pages);
  logProgress(it, 'pages', v - (it.current_page || 0)); it.current_page = v;
  if (it.status === 'want') { it.status = 'active'; it.date_started = it.date_started || today(); }
  if (it.total_pages && v >= it.total_pages && it.status !== 'finished') setStatus(it, 'finished', true);
  touch(it);
}
function setHours(it, v) {
  v = Math.max(0, Math.round(num(v) * 10) / 10);
  logProgress(it, 'hours', v - (it.hours_played || 0)); it.hours_played = v;
  if (it.status === 'want') { it.status = 'active'; it.date_started = it.date_started || today(); }
  touch(it);
}
function setStatus(it, s, silent) {
  const prev = it.status; if (prev === s) return; it.status = s;
  if (s === 'active' && !it.date_started) it.date_started = today();
  if (s === 'finished') { it.date_finished = today(); if (!it.date_started) it.date_started = today();
    if (it.type === 'book' && it.total_pages && (it.current_page || 0) < it.total_pages) { logProgress(it, 'pages', it.total_pages - (it.current_page || 0)); it.current_page = it.total_pages; } }
  if (prev === 'finished' && s !== 'finished') it.date_finished = '';
  if (S.session && S.session.itemId === it.id && (s === 'finished' || s === 'dnf' || s === 'want')) S.session = null;
  touch(it);
}

/* ---------- collections, journal, quotes ---------- */
function collForm(c, attachId) {
  openModal(c ? 'Rename collection' : 'New collection', `
    <label class="field"><span>NAME</span><input class="inp" id="cname" value="${esc(c ? c.name : '')}" placeholder="e.g. Autumn reads"></label>
    <label class="field"><span>DESCRIPTION</span><input class="inp" id="cdesc" value="${esc(c ? c.description : '')}" placeholder="optional"></label>
    <p class="err" id="cerr"></p>
    <div class="row" style="justify-content:flex-end"><button class="btn" data-act="close">Cancel</button><button class="btn primary" id="csave">Save</button></div>`, () => {
    $('#csave').onclick = () => {
      const name = $('#cname').value.trim(); if (!name) { $('#cerr').textContent = 'It needs a name.'; return; }
      if (c) { c.name = name; c.description = $('#cdesc').value.trim(); }
      else S.collections.push({ id: uid(), user_id: USER_ID, name, description: $('#cdesc').value.trim(), itemIds: attachId ? [attachId] : [], created: today() });
      closeModal(); commit();
    };
  });
}
function collItemsForm(c) {
  const all = [...S.items].sort((a, b) => a.title.localeCompare(b.title));
  if (!all.length) { toast('Your shelf is empty', 'Add a book or game first.'); return; }
  openModal('Add to “' + esc(c.name) + '”', `<input class="inp" type="search" placeholder="Filter…" id="cfilter" style="margin-bottom:12px"><div class="check-list" id="clist">${all.map(it => `
    <label class="check-item" data-title="${esc(it.title.toLowerCase())}"><input type="checkbox" value="${it.id}" ${c.itemIds.includes(it.id) ? 'checked' : ''}>${coverHTML(it, true)}<span><b class="small">${esc(it.title)}</b><br><span class="small muted">${it.type === 'book' ? esc(it.author || 'Book') : esc(it.platform || 'Game')}</span></span></label>`).join('')}</div>
    <div class="row" style="justify-content:flex-end;margin-top:14px"><button class="btn" data-act="close">Cancel</button><button class="btn primary" id="cisave">Save</button></div>`, () => {
    $('#cfilter').oninput = e => { const q = e.target.value.toLowerCase(); $$('#clist .check-item').forEach(el => el.style.display = el.dataset.title.includes(q) ? '' : 'none'); };
    $('#cisave').onclick = () => { c.itemIds = $$('#clist input:checked').map(i => i.value); closeModal(); commit(); };
  });
}
function itemOptions(sel) {
  const opts = [...S.items].sort((a, b) => (a.status === 'active' ? 0 : 1) - (b.status === 'active' ? 0 : 1) || a.title.localeCompare(b.title));
  return opts.map(i => `<option value="${i.id}" ${sel === i.id ? 'selected' : ''}>${esc(i.title)}</option>`).join('');
}
function entryForm(e, itemId) {
  const ed = e ? { ...e } : { id: uid(), user_id: USER_ID, date: today(), mood: '', itemId: itemId || '', text: '', created: new Date().toISOString() };
  openModal(e ? 'Edit entry' : 'New journal entry', `
    <div class="grid2"><label class="field"><span>DATE</span><input class="inp" type="date" id="jdate" value="${ed.date}"></label>
    <label class="field"><span>ABOUT</span><select class="inp" id="jitem"><option value="">Nothing in particular</option>${itemOptions(ed.itemId)}</select></label></div>
    <div class="field"><span>MOOD</span><div class="moods">${MOODS.map(m => `<button class="chip ${ed.mood === m ? 'on' : ''}" data-mood="${m}" type="button">${m}</button>`).join('')}</div></div>
    <label class="field"><span>ENTRY</span><textarea class="inp" id="jtext" style="min-height:160px" placeholder="Today I…">${esc(ed.text)}</textarea></label>
    <p class="err" id="jerr"></p>
    <div class="row" style="justify-content:space-between">${e ? `<button class="btn sm danger" id="jdel">Delete</button>` : '<span></span>'}<div class="row"><button class="btn" data-act="close">Cancel</button><button class="btn primary" id="jsave">Save</button></div></div>`, () => {
    $$('[data-mood]').forEach(b => b.onclick = () => { ed.mood = ed.mood === b.dataset.mood ? '' : b.dataset.mood; $$('[data-mood]').forEach(x => x.classList.toggle('on', x.dataset.mood === ed.mood)); sfx('click'); });
    $('#jsave').onclick = () => {
      ed.text = $('#jtext').value.trim(); ed.date = $('#jdate').value || today(); ed.itemId = $('#jitem').value;
      if (!ed.text) { $('#jerr').textContent = 'Write a few words first.'; return; }
      const i = S.journal.findIndex(x => x.id === ed.id); if (i >= 0) S.journal[i] = ed; else S.journal.push(ed);
      closeModal(); sfx('pop'); commit();
    };
    if (e) $('#jdel').onclick = () => askConfirm('Delete this journal entry?', () => { S.journal = S.journal.filter(x => x.id !== e.id); commit(); }, 'Delete');
  });
}
function quoteForm(q, itemId) {
  if (!q && !itemId && !S.items.length) { toast('Your shelf is empty', 'Add a book or game first.'); return; }
  const ed = q ? { ...q } : { id: uid(), user_id: USER_ID, itemId: itemId || (S.items.find(i => i.status === 'active') || S.items[0]).id, text: '', page: '', date: today() };
  openModal(q ? 'Edit line' : 'Save a favourite line', `
    <label class="field"><span>THE LINE</span><textarea class="inp" id="qtext" style="min-height:120px" placeholder="Type it out…">${esc(ed.text)}</textarea></label>
    <div class="grid2"><label class="field"><span>FROM</span><select class="inp" id="qitem">${itemOptions(ed.itemId)}</select></label>
    <label class="field"><span>PAGE (OPTIONAL)</span><input class="inp" id="qpage" inputmode="numeric" value="${esc(ed.page)}"></label></div>
    <p class="err" id="qerr"></p>
    <div class="row" style="justify-content:space-between">${q ? `<button class="btn sm danger" id="qdel">Delete</button>` : '<span></span>'}<div class="row"><button class="btn" data-act="close">Cancel</button><button class="btn primary" id="qsave">Save</button></div></div>`, () => {
    $('#qsave').onclick = () => {
      ed.text = $('#qtext').value.trim().replace(/^["“]|["”]$/g, ''); ed.itemId = $('#qitem').value; ed.page = $('#qpage').value.trim();
      if (!ed.text) { $('#qerr').textContent = 'Type the line first.'; return; }
      const i = S.quotes.findIndex(x => x.id === ed.id); if (i >= 0) S.quotes[i] = ed; else S.quotes.push(ed);
      closeModal(); sfx('pop'); commit();
    };
    if (q) $('#qdel').onclick = () => askConfirm('Delete this line?', () => { S.quotes = S.quotes.filter(x => x.id !== q.id); commit(); }, 'Delete');
  });
}

/* ---------- shop ---------- */
function buy(id) {
  const s = SHOP.find(x => x.id === id), p = progressNumbers();
  if (!s || S.shop.owned.includes(id) || p.acorns < s.price) return;
  S.spent += s.price; S.shop.owned.push(id); sfx('coin');
  equip(id, true);
  toast(`You bought the ${s.name.toLowerCase()}!`, `-${s.price} acorns`, acorn());
  commit();
}
function equip(id, quiet) {
  const s = SHOP.find(x => x.id === id), sh = S.shop; if (!s || !sh.owned.includes(id)) return;
  if (s.cat === 'outfit') { const slot = OUTFITS[id].slot; sh[slot] = sh[slot] === id ? '' : id; }
  else if (s.cat === 'decor') { if (sh.decor.includes(id)) sh.decor = sh.decor.filter(x => x !== id); else { sh.decor.push(id); if (sh.decor.length > MAX_DECOR) sh.decor.shift(); } }
  else if (s.cat === 'theme') sh.theme = id;
  else if (s.cat === 'companion') { sh.companion = sh.companion === id ? '' : id; $('#companion-root').dataset.c = ''; }
  if (!quiet) { sfx('pop'); commit(); }
}

/* ---------- backup ---------- */
async function exportBackup() {
  const json = JSON.stringify(S, null, 1), name = `ivy-shelf-backup-${today()}.json`;
  const file = new File([json], name, { type: 'application/json' });
  try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'Ivy Shelf backup' }); return; } } catch (e) { if (e.name === 'AbortError') return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
}
function importBackup(file) {
  const r = new FileReader();
  r.onload = () => {
    try {
      const data = JSON.parse(r.result); if (!data || !Array.isArray(data.items)) throw new Error('bad');
      askConfirm(`Replace everything on this device with the backup (${data.items.length} items)?`, () => { S = normalize(data); $('#companion-root').dataset.c = ''; skyKey = ''; commit(); toast('Backup restored'); }, 'Restore', false);
    } catch (e) { toast('That file isn’t an Ivy Shelf backup'); }
  };
  r.readAsText(file);
}

/* ---------- events ---------- */
const A = {
  go: d => go(d.r), open: d => { sfx('page'); go('item-' + d.id); }, back: () => history.length > 1 ? history.back() : go('home'),
  close: () => closeModal(),
  more: () => openModal('More', `<div class="menu-list">${NAV.slice(3).map(([id, n, ico]) => `<button class="nav-cloud" data-act="gomenu" data-r="${id}">${ico()}${n}</button>`).join('')}</div>`),
  gomenu: d => { closeModal(); go(d.r); },
  add: d => openItemForm(d.type, null, d.status || 'want'),
  fab: () => openModal('Add something', `<div class="menu-list">
      <button class="nav-cloud" data-act="fabadd" data-type="book">${bookIco()}A book</button>
      <button class="nav-cloud" data-act="fabscan">${scanIco()}A book by barcode</button>
      <button class="nav-cloud" data-act="fabadd" data-type="game">${padIco()}A game</button>
      <button class="nav-cloud" data-act="fabjournal">${quillIco()}A journal entry</button>
      <button class="nav-cloud" data-act="fabquote">${quoteIco()}A favourite line</button></div>`),
  fabadd: d => { closeModal(); openItemForm(d.type, null, 'want'); },
  fabscan: () => { closeModal(); openItemForm('book', null, 'want'); openScanner(); },
  fabjournal: () => { closeModal(); entryForm(); },
  fabquote: () => { closeModal(); quoteForm(); },
  filter: d => { ui[d.type === 'book' ? 'books' : 'games'][d.k] = d.v; render(); },
  view: d => { S.settings.shelfView[d.type] = d.v; save(); render(); },
  pull: (d, el) => { el.classList.add('pull'); sfx('page'); setTimeout(() => go('item-' + d.id), 200); },
  edit: d => { const it = byId(d.id); openItemForm(it.type, it); },
  ftype: d => { const t = draft.title; draft = newItem(d.type, draft.status); draft._new = true; draft.title = t; rerenderForm(); },
  fstatus: d => { draft.status = d.s; rerenderForm(); },
  pick: d => pickResult(lastResults[+d.i]),
  gpick: d => pickGame(gameResults[+d.i]),
  loadsteam: () => loadSteam(),
  oldstatus: (d, el) => $$('#old-status button').forEach(b => b.classList.toggle('on', b === el)),
  doimport: () => doImport(),
  steamsync: () => steamSync(true),
  testserver: async () => { const m = $('#server-msg'); m.textContent = 'Knocking on the door…';
    try { const h = await api('/health'); m.textContent = h.igdb && h.steam ? 'All good! Game search and Steam are both ready.' : `Connected, but missing: ${[!h.igdb && 'Twitch keys (game search)', !h.steam && 'Steam key'].filter(Boolean).join(' and ')}.`; if (h.igdb && h.steam) sfx('coin'); }
    catch (e) { m.textContent = e.message; } },
  google: async d => { const box = $('#results'); box.innerHTML = '<p class="note">Asking Google Books…</p>'; try { lastResults = await searchGoogle(d.q); } catch (e) { lastResults = []; }
    box.innerHTML = lastResults.length ? resultsHTML(lastResults) : '<p class="note">Nothing there either — fill it in by hand.</p>'; },
  scan: () => openScanner(), closescan: () => closeScanner(), scanphoto: () => $('#file-scan').click(),
  editions: () => showEditions(),
  pickedition: (d, el) => { const e = $('#editions')._eds[+d.i]; draft.cover_url = e.cover_url; draft.cover_fallbacks = []; if (e.total_pages) draft.total_pages = e.total_pages; if (e.isbn) draft.isbn = e.isbn;
    $$('.cover-pick button').forEach(b => b.classList.toggle('on', b === el)); refreshFormCover(); const tp = $('input[data-k="total_pages"]'); if (tp) tp.value = draft.total_pages; },
  upload: () => $('#file-cover').click(),
  nocover: () => { draft.cover_url = ''; draft.cover_fallbacks = []; rerenderForm(); },
  saveitem: () => saveItem(),
  rate: d => { const it = byId(d.id); it.rating = it.rating === +d.n ? 0 : +d.n; touch(it); sfx('pop'); commit();
    const b = $(`[data-act=rate][data-n="${d.n}"]`); if (b && it.rating) b.classList.add('pop'); },
  status: d => { const it = byId(d.id), was = it.status; setStatus(it, d.s); commit(); if (d.s === 'finished' && was !== 'finished') celebrate(it); },
  start: d => { const it = byId(d.id); setStatus(it, 'active'); commit(); toast(it.type === 'book' ? 'Happy reading!' : 'Have fun!', `${it.title} moved to ${LABEL[it.type].active}`, null, 'start'); },
  bump: d => { const it = byId(d.id), was = it.status; if (it.type === 'book') setPage(it, (it.current_page || 0) + +d.n); else setHours(it, (it.hours_played || 0) + +d.n); commit(); if (was !== 'finished' && it.status === 'finished') celebrate(it); },
  startsession: d => startSession(d.id), stopsession: () => stopSession(),
  del: d => { const it = byId(d.id); askConfirm(`Delete “${esc(it.title)}”? Its progress history goes too.`, () => {
      S.items = S.items.filter(x => x.id !== d.id); S.logs = S.logs.filter(l => l.itemId !== d.id); S.quotes = S.quotes.filter(q => q.itemId !== d.id);
      S.sessions = S.sessions.filter(s => s.itemId !== d.id); if (S.session && S.session.itemId === d.id) S.session = null;
      S.collections.forEach(c => c.itemIds = c.itemIds.filter(x => x !== d.id)); S.journal.forEach(j => { if (j.itemId === d.id) j.itemId = ''; });
      save(); go(it.type === 'book' ? 'books' : 'games'); }, 'Delete'); },
  newcoll: d => collForm(null, d.id),
  editcoll: d => collForm(S.collections.find(c => c.id === d.c)),
  delcoll: d => askConfirm('Delete this collection? The books and games stay on your shelf.', () => { S.collections = S.collections.filter(c => c.id !== d.c); save(); go('collections'); }, 'Delete'),
  collitems: d => collItemsForm(S.collections.find(c => c.id === d.c)),
  togglecoll: d => { const c = S.collections.find(x => x.id === d.c); c.itemIds = c.itemIds.includes(d.id) ? c.itemIds.filter(x => x !== d.id) : [...c.itemIds, d.id]; commit(); },
  newentry: () => entryForm(), journalfor: d => entryForm(null, d.id),
  editentry: d => entryForm(S.journal.find(j => j.id === d.e)),
  newquote: d => quoteForm(null, d.id), editquote: d => quoteForm(S.quotes.find(q => q.id === d.q)),
  jtab: d => { ui.journalTab = d.v; render(); },
  shopcat: d => { ui.shopCat = d.v; render(); },
  buy: d => buy(d.id), equip: d => equip(d.id),
  pet: (d, el) => { sfx('pop'); const h = document.createElement('div'); h.className = 'love'; h.innerHTML = heart(true); el.appendChild(h); setTimeout(() => h.remove(), 900); },
  export: () => exportBackup(), import: () => $('#file-import').click(),
  wipe: () => askConfirm('Erase every book, game, journal entry and collection on this device? Save a backup first if you might want them back.', () => { S = blank(); $('#companion-root').dataset.c = ''; skyKey = ''; commit(); go('home'); }, 'Erase all')
};
document.addEventListener('click', ev => {
  if (ev.target.closest('#fab')) { sfx('click'); return A.fab(); }
  const el = ev.target.closest('[data-act]'); if (!el) return;
  if (el.dataset.act === 'closebg') { if (ev.target === el) closeModal(); return; }
  const f = A[el.dataset.act]; if (!f || el.tagName === 'A') return;
  ev.preventDefault();
  if (!['rate', 'buy', 'pet', 'open', 'pull', 'startsession', 'stopsession'].includes(el.dataset.act)) sfx('click');
  f(el.dataset, el, ev);
});
document.addEventListener('submit', ev => {
  if (ev.target.closest('[data-submit="gsearch"]')) { ev.preventDefault(); const q = $('#gq').value; $('#gq').blur(); return doGameSearch(q); }
  const f = ev.target.closest('[data-submit="search"]'); if (!f) return; ev.preventDefault(); const q = $('#q').value; $('#q').blur(); doSearch(q);
});
document.addEventListener('input', ev => { if (ev.target.id === 'steam-filter') { const q = ev.target.value.toLowerCase(); $$('#steam-list .check-item').forEach(el => el.style.display = el.dataset.title.includes(q) ? '' : 'none'); } });
document.addEventListener('input', ev => {
  const el = ev.target, k = el.dataset.input; if (!k) return;
  if (k === 'f' && draft) { draft[el.dataset.k] = el.value; if (el.dataset.k === 'title') refreshFormCover(); }
  else if (k === 'coverurl' && draft) { draft.cover_url = el.value.trim(); draft.cover_fallbacks = []; refreshFormCover(); }
  else if (k === 'steam' && draft) { draft.steam_appid = el.value.trim(); const id = parseAppId(el.value);
    if (id) { draft.steam_appid = id; const c = steamCovers(id); draft.cover_url = c[0]; draft.cover_fallbacks = c.slice(1); draft.platform = 'Steam'; refreshFormCover(); const sel = $('select[data-change="fplat"]'); if (sel) sel.value = 'Steam'; } }
  else if (k === 'shelfq') { const f = ui[el.dataset.type === 'book' ? 'books' : 'games']; f.q = el.value; clearTimeout(el._t); el._t = setTimeout(() => { const pos = el.selectionStart; render(); const n = $('input[data-input="shelfq"]'); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) {} } }, 220); }
});
document.addEventListener('change', ev => {
  const el = ev.target, k = el.dataset.change; if (!k) return;
  const it = el.dataset.id ? byId(el.dataset.id) : null;
  switch (k) {
    case 'page': { const was = it.status; setPage(it, el.value); commit(); if (was !== 'finished' && it.status === 'finished') celebrate(it); return; }
    case 'hours': setHours(it, el.value); return commit();
    case 'total': if (it.type === 'book') it.total_pages = el.value === '' ? '' : Math.max(0, Math.round(num(el.value))); else it.total_hours = el.value === '' ? '' : Math.max(0, num(el.value)); touch(it); return commit();
    case 'date': it[el.dataset.k] = el.value; touch(it); return commit();
    case 'review': it.review = el.value; touch(it); checkAchievements(); save(); renderShell(); return;
    case 'notes': it.notes = el.value; touch(it); save(); return;
    case 'fplat': draft.platform = el.value; return;
    case 'shelfsort': ui[el.dataset.type === 'book' ? 'books' : 'games'].sort = el.value; return render();
    case 'shelfextra': ui[el.dataset.type === 'book' ? 'books' : 'games'][el.dataset.type === 'book' ? 'genre' : 'platform'] = el.value; return render();
    case 'journalfilter': ui.journalItem = el.value; return render();
    case 'statsyear': ui.statsYear = +el.value; return render();
    case 'pname': S.profile.name = el.value.trim(); return commit();
    case 'pgoal': S.profile.yearGoal = Math.max(0, Math.round(num(el.value))); return commit();
    case 'set': S.settings[el.dataset.k] = el.checked; skyKey = ''; if (el.checked) sfx('pop'); return commit();
    case 'setsky': S.settings.sky = el.checked ? 'auto' : 'day'; skyKey = ''; return commit();
    case 'server': S.settings.server = el.value.trim().replace(/\/+$/, ''); if (S.settings.server && !/^https?:\/\//.test(S.settings.server)) S.settings.server = 'https://' + S.settings.server; return commit();
    case 'steamuser': S.settings.steamUser = el.value.trim(); return commit();
    case 'impall': $$('#steam-list input[type=checkbox]').forEach(c => { if (c.closest('.check-item').style.display !== 'none' && !c.disabled) c.checked = el.checked; }); return;
  }
});
$('#file-cover').addEventListener('change', async ev => {
  const f = ev.target.files[0]; ev.target.value = ''; if (!f || !draft) return;
  try { draft.cover_url = await resizeImage(f); draft.cover_fallbacks = []; rerenderForm(); } catch (e) { toast('Couldn’t use that image'); }
});
$('#file-scan').addEventListener('change', async ev => {
  const f = ev.target.files[0]; ev.target.value = ''; if (!f) return;
  const m = $('#scan-msg'); if (m) m.textContent = 'Reading the photo…';
  try {
    await loadScript('lib/html5-qrcode.min.js');
    if (scanner && scanner.isScanning) await scanner.stop();
    const F = Html5QrcodeSupportedFormats;
    const s = scanner || new Html5Qrcode('reader', { formatsToSupport: [F.EAN_13, F.EAN_8, F.UPC_A, F.UPC_E], verbose: false });
    const code = await s.scanFile(f, false); scanner = s; gotCode(code);
  } catch (e) { const m2 = $('#scan-msg'); if (m2) m2.textContent = 'Couldn’t find a barcode in that photo — try again closer, in good light.'; }
});
$('#file-import').addEventListener('change', ev => { const f = ev.target.files[0]; ev.target.value = ''; if (f) importBackup(f); });
document.addEventListener('keydown', ev => { if (ev.key === 'Escape') { if ($('#scan-root').innerHTML) closeScanner(); else if ($('#modal-root').innerHTML) closeModal(); } });
window.addEventListener('hashchange', () => { if ($('#modal-root').innerHTML) closeModal(); fabHidden = false; readRoute(); });
let fabHidden = false, lastY = 0;
window.addEventListener('scroll', () => {
  const y = window.scrollY, h = y > lastY + 6 && y > 120 ? true : y < lastY - 6 ? false : fabHidden;
  if (h !== fabHidden) { fabHidden = h; $('#fab').classList.toggle('hide', h || route.startsWith('item-') || route.startsWith('review-') || route === 'shop'); }
  lastY = y;
}, { passive: true });
window.addEventListener('resize', () => { clearTimeout(window._rs); window._rs = setTimeout(applySky, 300); });
setInterval(() => { applySky(); }, 5 * 60 * 1000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) { applySky(); renderSessionPill(); } });

/* ---------- boot ---------- */
(async function boot() {
  S = normalize(await loadState());
  readRoute();
  if (S.settings.server && S.settings.lastSteamSync !== today()) setTimeout(() => steamSync(false), 1500);
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
