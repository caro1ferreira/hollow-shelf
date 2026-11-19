'use strict';
/* Ivy Shelf — original pixel sprites, drawn as SVG rectangles. */
const INK = '#5a3e2b';
function pix(rows, pal, cls = '', attrs = '') {
  const w = Math.max(...rows.map(r => r.length)), h = rows.length; let r = '';
  rows.forEach((row, y) => { for (let x = 0; x < row.length; x++) { const c = pal[row[x]]; if (c) r += `<rect x="${x}" y="${y}" width="1" height="1" fill="${c}"/>`; } });
  return `<svg class="pix ${cls}" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges" aria-hidden="true" ${attrs}>${r}</svg>`;
}

/* ---------- mascots ----------
 * Every mascot is drawn on a 16-wide grid (15 rows), placed on a 20x20 canvas
 * so hats, wings and held items have room. Anchor points tell accessories where
 * the head, eyes, neck and paw are, so every outfit fits every friend.        */
const CW = 20, CH = 20, OX = 2, OY = 4;
const K = '#2b1d14';
const MASCOTS = {
  toad: { name: 'Toad', the: 'the toad', sound: 'Ribbit',
    pal: { o: INK, w: '#ffffff', k: K, g: '#8fcfa8', l: '#b9e4c9', p: '#f29bb2', c: '#fdf0d8' },
    rows: ['................', '................', '................',
      '...oo......oo...', '..owwo.pp.owwo..', '..owko.pp.okwo..', '.ogllgoooogllgo.', 'oggggggggggggggo', 'ogpggggggggggpgo',
      'oggggggooggggggo', '.oggccccccccggo.', '.ogccccccccccgo.', 'ogggccccccccgggo', 'oglgoccccccoglgo', '.oo.oooooooo.oo.'],
    sleepRows: { 4: '..oggo.pp.oggo..', 5: '..oooo.pp.oooo..' },
    head: { c: 7.5, top: 3 }, eyes: [[4, 5], [11, 5]], neck: { y: 10, l: 2, r: 13 }, hand: [1, 11] },
  bunny: { name: 'Bunny', the: 'the bunny', sound: '*twitch twitch*',
    pal: { o: INK, w: '#f7efe6', p: '#f6c9d3', k: K, n: '#e58ba2', c: '#fde8ed' },
    rows: ['....oo....oo....', '...owpo..owpo...', '...owpo..owpo...', '...owpo..owpo...', '...owwoooowwo...', '..owwwwwwwwwwo..',
      '..owkwwwwwwkwo..', '..owpwwnnwwpwo..', '...owwwwwwwwo...', '..owwccccccwwo..', '.owwccccccccwwo.', '.owwccccccccwwo.',
      '..owwwwwwwwwwo..', '..owwo....owwo..', '...oo......oo...'],
    head: { c: 7.5, top: 4 }, eyes: [[4, 6], [11, 6]], neck: { y: 9, l: 2, r: 13 }, hand: [1, 10] },
  cat: { name: 'Cat', the: 'the cat', sound: 'Mrrp',
    pal: { o: INK, y: '#f4b88a', Y: '#d98a5f', k: K, p: '#f29bb2', c: '#fdf0d8' },
    rows: ['................', '..o..........o..', '..oo........oo..', '..opo......opo..', '..oppooooooppo..', '..oyYyYyyYyYyo..',
      '..oyykyyyykyyo..', '..oyyyyppyyyyo..', '...oyyyyyyyyo...', '..oyyccccccyyo..', '.oyyccccccccyyo.', '.oyyccccccccyyo.',
      '.oyyyyyyyyyyyyo.', '..oyyo....oyyo..', '...oo......oo...'],
    head: { c: 7.5, top: 4 }, eyes: [[5, 6], [10, 6]], neck: { y: 9, l: 3, r: 12 }, hand: [1, 10] },
  hedgehog: { name: 'Hedgehog', the: 'the hedgehog', sound: '*snuffle*',
    pal: { o: INK, b: '#8a5a3b', s: '#b07a4f', f: '#f6e3c8', k: K, n: K, p: '#f29bb2', c: '#f6e3c8' },
    rows: ['................', '.....o.oo.o.....', '...oobbobbboo...', '..obbsbbsbbsbo..', '.obsbbsbbsbbsbo.', '.obbffffffffbbo.',
      'obbfkffffffkfbbo', 'obbffffnnffffbbo', 'obbfpffffffpfbbo', '.obbffffffffbbo.', '.obbbccccccbbbo.', '..obbccccccbbo..',
      '..obbbbbbbbbbo..', '..obfo....ofbo..', '...oo......oo...'],
    head: { c: 7.5, top: 2 }, eyes: [[4, 6], [11, 6]], neck: { y: 10, l: 3, r: 12 }, hand: [0, 11] },
  fox: { name: 'Fox', the: 'the fox', sound: 'Yip',
    pal: { o: INK, r: '#e58b5a', w: '#fff7ee', k: K },
    rows: ['................', '..o..........o..', '..oo........oo..', '..oro......oro..', '..orroooooorro..', '..orrrrrrrrrro..',
      '..orrkrrrrkrro..', '..owwrrrrrrwwo..', '...owwwkkwwwo...', '....owwwwwwo....', '...orrwwwwrro...', '..orrrwwwwrrro..',
      '..orrrrrrrrrro..', '..orro....orro..', '...oo......oo...'],
    head: { c: 7.5, top: 4 }, eyes: [[5, 6], [10, 6]], neck: { y: 9, l: 4, r: 11 }, hand: [1, 10] },
  raccoon: { name: 'Raccoon', the: 'the raccoon', sound: '*chitter*',
    pal: { o: INK, g: '#a9a4a8', d: '#4a4048', w: '#f4f0ee', k: K, n: K, c: '#e8e2df' },
    rows: ['................', '..o..........o..', '..oo........oo..', '..ogo......ogo..', '..oggooooooggo..', '..oggggggggggo..',
      '..odwkddddkwdo..', '..owwggnnggwwo..', '...owwwwwwwwo...', '..oggccccccggo..', '.oggccccccccggo.', '.oggccccccccggo.',
      '.oggggggggggggo.', '..oggo....oggo..', '...oo......oo...'],
    head: { c: 7.5, top: 4 }, eyes: [[5, 6], [10, 6]], neck: { y: 9, l: 3, r: 12 }, hand: [1, 10] },
  squirrel: { name: 'Squirrel', the: 'the squirrel', sound: '*chk chk*',
    pal: { o: INK, r: '#c8743f', w: '#fff3e6', n: K, k: K, c: '#f6dcc0' },
    rows: ['...........ooo..', '..o..o....orrro.', '..oooo...orrrrro', '.orrrro..orrrrro', 'orrrrrro.orrrro.', 'orkrrkro..orrro.',
      'owwnnwwo..orrro.', '.owwwwo...orrro.', '.orccro..orrro..', 'orccccro.orrro..', 'orccccroorrro...', 'orccccrrrrro....',
      '.orrrrrrro......', '.oro.oro........', '................'],
    head: { c: 3.5, top: 3 }, eyes: [[2, 5], [5, 5]], neck: { y: 8, l: 1, r: 6 }, hand: [0, 10] }
};

/* ---------- accessories ---------- */
const HATS = {
  mushroom: { pal: { o: INK, r: '#e0605e', w: '#ffffff' }, rows: ['..oooooooo...', '.orrwrrrrwro.', 'orrrrrwrrrrro', '.ooooooooooo.'] },
  bow: { pal: { p: '#e8728f', o: INK }, rows: ['pp...pp', 'ppp.ppp', 'pppoppp', 'pp...pp'] },
  crown: { pal: { p: '#f29bb2', y: '#ecc66f', w: '#ffffff', g: '#7cc4a0' }, rows: ['.g....g....g.', 'pyp..ywy..pyp'] },
  beanie: { pal: { m: '#9fd8b8', M: '#7cc4a0', w: '#ffffff', o: INK }, rows: ['...ww...', '.mmmmmm.', 'mMmMmMmM', 'oooooooo'] },
  wizard: { pal: { o: INK, l: '#b9a3e3', y: '#ecc66f' }, rows: ['....o....', '...olo...', '..olylo..', 'ooooooooo'] },
  beret: { pal: { o: INK, r: '#b5485a' }, rows: ['....oo....', '..oooooo..', '.orrrrrro.', 'orrrrrrrro', '.oooooooo.'] },
  cap: { pal: { o: INK, m: '#8fcfa8', w: '#ffffff' }, rows: ['..oooooo.....', '.ommmmmmo....', 'ommmwwmmmo...', 'ooooooooooooo'] },
  goldcrown: { pal: { y: '#ecc66f', r: '#e0605e', b: '#6fa8dc', o: INK }, rows: ['y.y.y.y', 'yyyyyyy', 'yryyyby', 'ooooooo'] },
  straw: { pal: { o: INK, s: '#e8c77a', b: '#f29bb2' }, rows: ['...oooooo...', '..osssssso..', '..obbbbbbo..', 'oossssssssoo', '.oooooooooo.'] },
  daisy: { pal: { w: '#ffffff', y: '#ecc66f', g: '#7cc4a0' }, rows: ['.w...w...w.', 'wyw.wyw.wyw', '.g...g...g.'] },
  witch: { pal: { o: INK, p: '#7e52b8', y: '#ecc66f' }, rows: ['........oo...', '.......opo...', '......oppo...', '.....opppo...', '....oppppo...', '...oyyyyyyo..', 'ooooooooooooo'] },
  halo: { pal: { y: '#f5d76e' }, lift: 1, rows: ['.yyyyyy.', 'y......y', '.yyyyyy.'] }
};
const HAND_ITEMS = {
  book: { pal: { o: INK, p: '#e8728f', w: '#fdf0d8' }, rows: ['oooooo', 'opwwpo', 'opwwpo', 'opwwpo', 'oooooo'] },
  controller: { pal: { o: INK, m: '#8fcfa8', k: K, r: '#e8728f' }, rows: ['.oooooo.', 'ommmmmmo', 'omkmmrmo', 'ommmmmmo', '.oo..oo.'] },
  basket: { pal: { o: INK, b: '#c8955a', y: '#ecc66f', r: '#e0605e' }, rows: ['..oooo..', '.o....o.', 'oooooooo', 'obybbrbo', 'obbbbbbo', '.oooooo.'] },
  lantern: { pal: { o: INK, y: '#ffe8a3' }, rows: ['..o..', '.ooo.', 'oyyyo', 'oyyyo', 'oyyyo', '.ooo.'] }
};
const WING = { pal: { o: '#b9a3e3', w: '#efe7fb' }, rows: ['..ooo', '.owwo', 'owwwo', 'owwo.', '.oo..'] };
const OUTFITS = {
  mushroom: { slot: 'hat', set: 'classic' }, bow: { slot: 'hat', set: 'classic' }, crown: { slot: 'hat', set: 'classic' },
  beanie: { slot: 'hat', set: 'classic' }, wizard: { slot: 'hat', set: 'classic' }, scarf: { slot: 'neck', set: 'classic' },
  glasses: { slot: 'face', set: 'reading' }, book: { slot: 'hand', set: 'reading' }, beret: { slot: 'hat', set: 'reading' }, lantern: { slot: 'hand', set: 'reading' },
  headphones: { slot: 'ears', set: 'gaming' }, controller: { slot: 'hand', set: 'gaming' }, cap: { slot: 'hat', set: 'gaming' }, goldcrown: { slot: 'hat', set: 'gaming' },
  straw: { slot: 'hat', set: 'cottage' }, daisy: { slot: 'hat', set: 'cottage' }, basket: { slot: 'hand', set: 'cottage' }, apron: { slot: 'body', set: 'cottage' },
  witch: { slot: 'hat', set: 'fantasy' }, wings: { slot: 'back', set: 'fantasy' }, cape: { slot: 'back', set: 'fantasy' }, halo: { slot: 'halo', set: 'fantasy' }
};
const SLOTS = ['back', 'body', 'neck', 'face', 'ears', 'hat', 'halo', 'hand'];

function bboxRows(rows) {
  let x0 = 99, x1 = -1, y0 = 99, y1 = -1;
  rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) if (r[x] !== '.') { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } });
  return { x0, x1, y0, y1, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}
function stamp(g, rows, pal, x0, y0, under = false, flip = false) {
  rows.forEach((row, dy) => {
    for (let dx = 0; dx < row.length; dx++) {
      const ch = row[flip ? row.length - 1 - dx : dx]; if (ch === '.') continue;
      const c = pal[ch]; if (!c) continue;
      const x = x0 + dx, y = y0 + dy;
      if (x < 0 || y < 0 || x >= CW || y >= CH || (under && g[y][x])) continue;
      g[y][x] = c;
    }
  });
}
const put = (g, x, y, c) => { if (x >= 0 && y >= 0 && x < CW && y < CH) g[y][x] = c; };
function mascotSVG(o = {}, cls = 'toad') {
  const M = MASCOTS[o.mascot] || MASCOTS.toad;
  const g = Array.from({ length: CH }, () => Array(CW).fill(null));
  const rows = M.rows.slice();
  if (o.mood === 'sleep' && M.sleepRows) Object.entries(M.sleepRows).forEach(([i, r]) => rows[+i] = r);
  stamp(g, rows, M.pal, OX, OY);
  if (o.mood === 'sleep' && !M.sleepRows) M.eyes.forEach(([x, y]) => { put(g, OX + x - 1, OY + y, INK); put(g, OX + x, OY + y, INK); });
  const hc = OX + M.head.c, top = OY + M.head.top, nk = M.neck, ny = OY + nk.y, nl = OX + nk.l, nr = OX + nk.r, nc = (nl + nr) / 2;
  const [ex1, ey] = [OX + M.eyes[0][0], OY + M.eyes[0][1]], ex2 = OX + M.eyes[1][0];
  // back layer (drawn behind the body)
  if (o.back === 'wings') { stamp(g, WING.rows, WING.pal, nl - 5, ny - 3, true); stamp(g, WING.rows, WING.pal, nr + 1, ny - 3, true, true); }
  if (o.back === 'cape') {
    for (let y = ny; y <= OY + 14; y++) for (let x = nl - 2; x <= nr + 2; x++) { const edge = x === nl - 2 || x === nr + 2 || y === OY + 14; if (!g[y][x]) g[y][x] = edge ? INK : '#6b4fa0'; }
  }
  if (o.body === 'apron') {
    for (let y = ny + 1; y <= ny + 3; y++) for (let x = Math.round(nc) - 3; x <= Math.round(nc) + 2; x++) put(g, x, y, (y === ny + 1 || x === Math.round(nc) - 3 || x === Math.round(nc) + 2) ? '#f29bb2' : '#ffffff');
    put(g, Math.round(nc) - 3, ny, '#f29bb2'); put(g, Math.round(nc) + 2, ny, '#f29bb2');
  }
  if (o.neck === 'scarf') {
    for (let x = nl; x <= nr; x++) put(g, x, ny, Math.floor((x - nl) / 2) % 2 ? '#e58ba2' : '#f29bb2');
    put(g, Math.round(nc) + 1, ny + 1, '#e58ba2'); put(g, Math.round(nc) + 2, ny + 1, '#f29bb2'); put(g, Math.round(nc) + 1, ny + 2, '#f29bb2'); put(g, Math.round(nc) + 2, ny + 2, '#e58ba2');
  }
  if (o.back === 'cape') { put(g, Math.round(nc), ny, '#ecc66f'); }
  if (o.face === 'glasses') {
    M.eyes.forEach(([x, y]) => { const cx = OX + x, cy = OY + y;
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) if (dx || dy) { if (Math.abs(dx) + Math.abs(dy) === 2) continue; put(g, cx + dx, cy + dy, INK); } });
    for (let x = ex1 + 2; x <= ex2 - 2; x++) put(g, x, ey - 1, INK);
  }
  if (o.ears === 'headphones') {
    const l = ex1 - 3, r = ex2 + 2, bandY = top - 1;
    for (let x = l + 1; x <= r; x++) put(g, x, bandY, INK);
    for (let y = bandY; y <= ey - 2; y++) { put(g, l, y, INK); put(g, r + 1, y, INK); }
    for (let y = ey - 1; y <= ey + 1; y++) { put(g, l, y, '#e58ba2'); put(g, l + 1, y, '#e58ba2'); put(g, r, y, '#e58ba2'); put(g, r + 1, y, '#e58ba2'); }
  }
  [o.hat, o.halo].filter(Boolean).forEach(id => {
    const H = HATS[id]; if (!H) return; const b = bboxRows(H.rows);
    const rows2 = H.rows.slice(b.y0, b.y1 + 1).map(r => r.slice(b.x0, b.x1 + 1));
    const x0 = Math.round(hc - (b.w - 1) / 2), y0 = (top - 1) - (b.h - 1) - (H.lift || 0) - (id === 'halo' && o.hat ? 3 : 0);
    stamp(g, rows2, H.pal, x0, y0);
  });
  if (o.hand && HAND_ITEMS[o.hand]) { const I = HAND_ITEMS[o.hand]; const b = bboxRows(I.rows); stamp(g, I.rows, I.pal, OX + M.hand[0] - b.w + 3, OY + M.hand[1] - 1); }
  let r = '';
  g.forEach((row, y) => row.forEach((c, x) => { if (c) r += `<rect x="${x}" y="${y}" width="1" height="1" fill="${c}"/>`; }));
  return `<svg class="pix ${cls}" viewBox="0 0 ${CW} ${CH}" shape-rendering="crispEdges" aria-hidden="true">${r}</svg>`;
}
// kept for older calls: draws the chosen mascot with the given outfit pieces
const toadSVG = (o = {}, cls = 'toad') => mascotSVG(o, cls);

/* ---------- small icons ---------- */
const heart = on => pix(['.hh.hh.', 'hhhhhhh', 'hhhhhhh', '.hhhhh.', '..hhh..', '...h...'], { h: on ? '#e8728f' : '#e6d3bd' });
const acorn = () => pix(['...o...', '.bbbbb.', 'bbbbbbb', '.ccccc.', '.ccccc.', '..ccc..', '...c...'], { o: INK, b: '#8a5a3b', c: '#d9a066' });
const bookIco = (p = '#f29bb2') => pix(['oooooooo', 'opppppwo', 'opppppwo', 'opyyppwo', 'opppppwo', 'opppppwo', 'oooooooo'], { o: INK, p, w: '#fdf0d8', y: '#ecc66f' });
const padIco = () => pix(['...rr...', '...rr...', '....o...', '....o...', 'oooooooo', 'oggggrgo', 'oooooooo'], { o: INK, r: '#e58ba2', g: '#8fcfa8' });
const lockIco = () => pix(['..ooo..', '.o...o.', '.o...o.', 'ooooooo', 'oyyyyyo', 'oyyoyyo', 'oyyyyyo', 'ooooooo'], { o: INK, y: '#ecc66f' });
const starIco = (c = '#ecc66f') => pix(['...y...', '...y...', 'yyyyyyy', '.yyyyy.', '..yyy..', '.yy.yy.', 'y.....y'], { y: c }, 'star');
const homeIco = () => pix(['...oo...', '..oppo..', '.oppppo.', 'oppppppo', '.owwwwo.', '.owdwwo.', '.owdwwo.', '.oooooo.'], { o: INK, p: '#f29bb2', w: '#fdf0d8', d: '#8a5a3b' });
const quillIco = () => pix(['......oo', '.....opo', '....oppo', '...oppo.', '..oppo..', '.oppo...', '.oo.....', 'o.......'], { o: INK, p: '#c3e8d3' });
const moreIco = () => pix(['.........', '.........', '.oo.oo.oo', '.oo.oo.oo', '.........'], { o: INK });
const chartIco = () => pix(['o.......', 'o....pp.', 'o....pp.', 'o.gg.pp.', 'o.gg.pp.', 'o.gg.pp.', 'oooooooo'], { o: INK, p: '#e58ba2', g: '#7cc4a0' });
const shelfIco = () => pix(['oooooooo', 'opmyplmo', 'opmyplmo', 'opmyplmo', 'oooooooo', 'o......o'], { o: INK, p: '#f29bb2', m: '#8fcfa8', y: '#ecc66f', l: '#ddd0f0' });
const wishIco = () => pix(['...y...', '..yyy..', 'yyyyyyy', '.yyyyy.', '.yy.yy.'], { y: '#ecc66f' });
const gearIco = () => pix(['..o.o..', '.ooooo.', 'oow.woo', '.ow.wo.', 'oowwwoo', '.ooooo.', '..o.o..'], { o: INK, w: '#fdf0d8' });
const bagIco = () => pix(['..oooo..', '.o....o.', 'oooooooo', 'oyyyyyyo', 'oyyaayyo', 'oyyyyyyo', 'oooooooo'], { o: INK, y: '#ecc66f', a: '#8a5a3b' });
const timerIco = () => pix(['ooooooo', '.oyyyo.', '..oyo..', '...o...', '..o.o..', '.o.y.o.', '.oyyyo.', 'ooooooo'], { o: INK, y: '#ecc66f' });
const scanIco = () => pix(['oo.....oo', 'o.......o', '..o.oo.o.', '..o.oo.o.', '..o.oo.o.', 'o.......o', 'oo.....oo'], { o: INK });
const quoteIco = () => pix(['oo.oo', 'oo.oo', '.o..o', 'o..o.'], { o: INK });
const cloudSVG = () => pix(['......wwww..........', '....wwwwwwww..ww....', '..wwwwwwwwwwwwwwww..', '.wwwwwwwwwwwwwwwwwww', 'wwwwwwwwwwwwwwwwwwww', '.ssssssssssssssssss.'], { w: '#ffffff', s: '#cfe2ec' });

/* ---------- shelf decorations ---------- */
const DECOR_SPRITES = {
  plant: pix(['..g....g..', '.ggg..ggg.', '..gggggg..', '...gggg...', '....gg....', '.oooooooo.', '.otttttto.', '..otttto..', '..otttto..', '...oooo...'], { g: '#7cc4a0', o: INK, t: '#d98a5f' }),
  candle: pix(['...y....', '..yyy...', '..yry...', '...o....', '.oooooo.', '.occcco.', '.occcco.', '.occcco.', '.occcco.', 'oooooooo', 'oyyyyyyo', 'oooooooo'], { y: '#ecc66f', r: '#e58b5a', o: INK, c: '#fdf0d8' }, 'flicker'),
  teacup: pix(['..s...s....', '...s...s...', '...........', 'ooooooooo..', 'occcccccooo', 'opppppppo.o', '.opppppooo.', '..ooooo....', 'ooooooooo..'], { s: '#cfe2ec', o: INK, c: '#b07a4f', p: '#f6c9d3' }),
  books: pix(['...oooooo..', '...ommmmo..', '.ooooooooo.', '.opppppppo.', 'ooooooooooo', 'olllllllllo', 'ooooooooooo'], { o: INK, m: '#8fcfa8', p: '#f29bb2', l: '#ddd0f0' }),
  lamp: pix(['..oooooo..', '.oppwpppo.', 'oppppppwpo', 'oooooooooo', '...oyyo...', '...oyyo...', '...oyyo...', '..oooooo..', '.ommmmmmo.', '.oooooooo.'], { o: INK, p: '#f29bb2', w: '#ffffff', y: '#fff3c4', m: '#8fcfa8' }),
  cat: pix(['...o.o........', '..ogggo.oooo..', '.ogkgkgoggggo.', '.ogggggggggggo', '..oggggggggggo', '..ogggggggwwgo', '...oooooooooo.'], { o: INK, g: '#c9bfb6', k: INK, w: '#ffffff' }, 'breathe')
};

/* ---------- companions ---------- */
const COMPANION_SPRITES = {
  ladybug: pix(['..o...o..', '...ooo...', '..okkko..', '.orrkrro.', 'orkrkrkro', 'orrrkrrro', '.ooooooo.'], { o: INK, r: '#e0605e', k: '#2b1d14' }),
  snail: pix(['..........o.', '..oooo...o..', '.oppppo..oo.', 'opwwppo.ogo.', 'opwppppoggo.', 'oppppppogo..', '.oooooogggo.', 'ogggggggggo.'], { o: INK, p: '#f29bb2', w: '#fde8ed', g: '#9fd8b8' }),
  bird: pix(['...ooo....', '..obbbo...', '.obkbbbo..', 'yobbbbbbo.', '.obwwwbbbo', '.obwwwbbo.', '..ooooooo.', '....y.y...'], { o: INK, b: '#a9cfe8', k: '#2b1d14', w: '#ffffff', y: '#ecc66f' })
};

/* ---------- weather particles ---------- */
const LEAF = c => pix(['..oo.', '.oooo', 'ooooo', 'oooo.', '.o...'], { o: c });
const SNOW = () => pix(['..w..', '.w.w.', 'w.w.w', '.w.w.', '..w..'], { w: '#ffffff' });
const PETAL = () => pix(['.pp.', 'pppp', '.pp.'], { p: '#f6c9d3' });
const BERRY = () => pix(['.gg.', 'rrrr', 'ryrr', 'rrrr', '.rr.'], { g: '#5fa84f', r: '#df3e57', y: '#ffd6dc' });
const SHARD = (c) => pix(['...y...', '...y...', 'yyyyyyy', '.yyyyy.', '..yyy..', '.yy.yy.', 'y.....y'], { y: c });
