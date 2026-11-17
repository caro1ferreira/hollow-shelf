'use strict';
/* Ivy Shelf — original pixel sprites, drawn as SVG rectangles. */
const INK = '#5a3e2b';
function pix(rows, pal, cls = '', attrs = '') {
  const w = Math.max(...rows.map(r => r.length)), h = rows.length; let r = '';
  rows.forEach((row, y) => { for (let x = 0; x < row.length; x++) { const c = pal[row[x]]; if (c) r += `<rect x="${x}" y="${y}" width="1" height="1" fill="${c}"/>`; } });
  return `<svg class="pix ${cls}" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges" aria-hidden="true" ${attrs}>${r}</svg>`;
}

/* ---------- the toad (16x16 canvas: 4 rows of headroom for hats) ---------- */
const TOAD_BODY = [
  '...oo......oo...',
  '..owwo.pp.owwo..',
  '..owko.pp.okwo..',
  '.ogllgoooogllgo.',
  'oggggggggggggggo',
  'ogpggggggggggpgo',
  'oggggggooggggggo',
  '.oggccccccccggo.',
  '.ogccccccccccgo.',
  'ogggccccccccgggo',
  'oglgoccccccoglgo',
  '.oo.oooooooo.oo.'];
const TOAD_SLEEP_EYES = { 1: '..oggo.pp.oggo..', 2: '..oooo.pp.oooo..' };
const TOAD_HAPPY_EYES = { 1: '..oooo.pp.oooo..', 2: '..owwo.pp.owwo..' };
const TOAD_PAL = { o: INK, w: '#ffffff', k: '#2b1d14', g: '#8fcfa8', l: '#b9e4c9', p: '#f29bb2', c: '#fdf0d8' };
const OUTFITS = {
  mushroom: { slot: 'hat', y: 0, pal: { o: INK, r: '#e0605e', w: '#ffffff' }, rows: [
    '....oooooooo....',
    '...orrwrrrrwro..',
    '..orrrrrwrrrrro.',
    '..oooooooooooo..'] },
  crown: { slot: 'hat', y: 2, pal: { p: '#f29bb2', y: '#ecc66f', w: '#ffffff', g: '#7cc4a0' }, rows: [
    '...g....g....g..',
    '..pyp..ywy..pyp.'] },
  bow: { slot: 'hat', y: 1, pal: { p: '#e8728f', o: INK }, rows: [
    '.....pp...pp....',
    '.....ppp.ppp....',
    '.....pppoppp....',
    '.....pp...pp....'] },
  beanie: { slot: 'hat', y: 1, pal: { m: '#9fd8b8', M: '#7cc4a0', w: '#ffffff', o: INK }, rows: [
    '.......ww.......',
    '.....mmmmmm.....',
    '....mMmMmMmM....',
    '....oooooooo....'] },
  wizard: { slot: 'hat', y: 0, pal: { o: INK, l: '#b9a3e3', y: '#ecc66f' }, rows: [
    '.......o........',
    '......olo.......',
    '.....olylo......',
    '...ooooooooo....'] },
  scarf: { slot: 'neck', y: 11, pal: { r: '#f29bb2', R: '#e58ba2' }, rows: [
    '.rrRRrrRRrrRRrr.',
    '.........rR.....',
    '.........Rr.....'] }
};
function toadRows(o = {}) {
  const rows = ['................', '................', '................', '................', ...TOAD_BODY];
  const eyes = o.mood === 'sleep' ? TOAD_SLEEP_EYES : o.mood === 'party' ? TOAD_HAPPY_EYES : null;
  if (eyes) Object.entries(eyes).forEach(([i, r]) => rows[4 + +i] = r);
  return rows;
}
function toadSVG(o = {}, cls = 'toad') {
  const rows = toadRows(o).map(r => r.split(''));
  const pal = { ...TOAD_PAL }; let extra = '';
  [o.hat, o.neck].filter(Boolean).forEach(id => {
    const f = OUTFITS[id]; if (!f) return;
    f.rows.forEach((row, dy) => { for (let x = 0; x < row.length; x++) { const ch = row[x]; if (ch === '.') continue; const key = id + ch; pal[key] = f.pal[ch]; rows[f.y + dy][x] = key; } });
  });
  // render with multi-char palette keys
  let r = '';
  rows.forEach((row, y) => row.forEach((k, x) => { const c = pal[k]; if (c) r += `<rect x="${x}" y="${y}" width="1" height="1" fill="${c}"/>`; }));
  return `<svg class="pix ${cls}" viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true">${r}${extra}</svg>`;
}

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
