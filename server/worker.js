/* Ivy Shelf — tiny helper server (Cloudflare Worker)
 *
 * Keeps the secret keys away from the app and talks to the services
 * that don't allow direct calls from a web page:
 *   GET /health                 -> which keys are set up
 *   GET /games/search?q=...     -> game search with real cover art (IGDB)
 *   GET /games/ttb?id=...       -> "time to beat" estimate for one IGDB game
 *   GET /steam/library?user=... -> owned Steam games + playtime
 *                                  (user = SteamID64, or a profile link)
 *
 * Secrets to add in Cloudflare (Settings -> Variables and Secrets):
 *   TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET, STEAM_API_KEY
 */
const ALLOWED_ORIGINS = ['https://caro1ferreira.github.io'];

export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin') || '';
    const cors = {
      'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Vary': 'Origin'
    };
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (req.method !== 'GET') return json({ error: 'GET only' }, 405, cors);

    const url = new URL(req.url);
    try {
      switch (url.pathname) {
        case '/':
        case '/health':
          return json({ ok: true, igdb: !!(env.TWITCH_CLIENT_ID && env.TWITCH_CLIENT_SECRET), steam: !!env.STEAM_API_KEY }, 200, cors);
        case '/games/search':
          return json(await igdbSearch((url.searchParams.get('q') || '').slice(0, 80), env), 200, cors, 3600);
        case '/games/ttb':
          return json(await igdbTimeToBeat(url.searchParams.get('id'), env), 200, cors, 86400);
        case '/steam/library':
          return json(await steamLibrary(url.searchParams.get('user') || '', env), 200, cors);
        default:
          return json({ error: 'not found' }, 404, cors);
      }
    } catch (e) {
      return json({ error: String(e && e.message || e) }, 500, cors);
    }
  }
};

function json(data, status, cors, maxAge = 0) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': maxAge ? `public, max-age=${maxAge}` : 'no-store' }
  });
}

/* ---------- IGDB (via Twitch) ---------- */
let twitchToken = null; // { value, expires }
async function igdbToken(env) {
  if (!env.TWITCH_CLIENT_ID || !env.TWITCH_CLIENT_SECRET) throw new Error('Twitch keys are not set up yet');
  if (twitchToken && twitchToken.expires > Date.now() + 60000) return twitchToken.value;
  const r = await fetch(`https://id.twitch.tv/oauth2/token?client_id=${encodeURIComponent(env.TWITCH_CLIENT_ID)}&client_secret=${encodeURIComponent(env.TWITCH_CLIENT_SECRET)}&grant_type=client_credentials`, { method: 'POST' });
  if (!r.ok) throw new Error('Twitch login failed (' + r.status + ') — check the Client ID and Secret');
  const j = await r.json();
  twitchToken = { value: j.access_token, expires: Date.now() + j.expires_in * 1000 };
  return twitchToken.value;
}
async function igdb(endpoint, body, env) {
  const token = await igdbToken(env);
  const r = await fetch('https://api.igdb.com/v4/' + endpoint, {
    method: 'POST',
    headers: { 'Client-ID': env.TWITCH_CLIENT_ID, 'Authorization': 'Bearer ' + token, 'Accept': 'application/json' },
    body
  });
  if (!r.ok) throw new Error('IGDB error ' + r.status);
  return r.json();
}
async function igdbSearch(q, env) {
  q = q.replace(/["\\]/g, ' ').trim();
  if (!q) return [];
  const rows = await igdb('games', `search "${q}"; fields name,cover.image_id,first_release_date,platforms.abbreviation,genres.name,summary,involved_companies.company.name,involved_companies.developer; limit 15;`, env);
  return rows.map(g => ({
    igdb_id: g.id,
    title: g.name,
    year: g.first_release_date ? new Date(g.first_release_date * 1000).getUTCFullYear() : '',
    cover_url: g.cover && g.cover.image_id ? `https://images.igdb.com/igdb/image/upload/t_cover_big_2x/${g.cover.image_id}.jpg` : '',
    platforms: (g.platforms || []).map(p => p.abbreviation).filter(Boolean),
    genre: ((g.genres || [])[0] || {}).name || '',
    developer: ((g.involved_companies || []).find(c => c.developer) || {}).company?.name || '',
    synopsis: g.summary || ''
  }));
}
async function igdbTimeToBeat(id, env) {
  if (!/^\d+$/.test(id || '')) return {};
  try {
    const rows = await igdb('game_time_to_beats', `fields hastily,normally,completely; where game_id = ${id};`, env);
    const t = rows[0] || {};
    const h = s => s ? Math.round(s / 360) / 10 : null; // seconds -> hours, 1 decimal
    return { hastily: h(t.hastily), normally: h(t.normally), completely: h(t.completely) };
  } catch (e) {
    return {}; // not every game has this data
  }
}

/* ---------- Steam ---------- */
async function steamId(user, env) {
  user = user.trim();
  let m = user.match(/(\d{17})/);
  if (m) return m[1];
  m = user.match(/steamcommunity\.com\/id\/([^\/?#]+)/i);
  const vanity = m ? m[1] : user.replace(/[^\w-]/g, '');
  if (!vanity) throw new Error('Paste your Steam profile link');
  const r = await fetch(`https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/?key=${env.STEAM_API_KEY}&vanityurl=${encodeURIComponent(vanity)}`);
  const j = await r.json();
  if (!j.response || j.response.success !== 1) throw new Error('Couldn\u2019t find that Steam profile');
  return j.response.steamid;
}
async function steamLibrary(user, env) {
  if (!env.STEAM_API_KEY) throw new Error('Steam key is not set up yet');
  const id = await steamId(user, env);
  const r = await fetch(`https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${env.STEAM_API_KEY}&steamid=${id}&include_appinfo=1&include_played_free_games=1`);
  if (r.status === 403) throw new Error('Steam refused the key — check STEAM_API_KEY');
  if (!r.ok) throw new Error('Steam error ' + r.status);
  const j = await r.json();
  const games = (j.response && j.response.games) || [];
  if (!games.length) throw new Error('No games visible — set Steam Privacy > Game details to Public');
  return {
    steamid: id,
    games: games.map(g => ({
      appid: g.appid,
      title: g.name,
      hours: Math.round((g.playtime_forever || 0) / 6) / 10,
      last_played: g.rtime_last_played ? new Date(g.rtime_last_played * 1000).toISOString().slice(0, 10) : ''
    })).sort((a, b) => b.hours - a.hours)
  };
}
