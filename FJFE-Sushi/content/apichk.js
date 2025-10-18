(() => {
  const MODULE_KEY = 'apichk';
  const TARGET_HOST = 'funnyjunk.com';
  const CACHE_KEY = '__fj_apichk_cache__';
  const CACHE_TTL_MS = 10 * 60 * 1000;
  let cached = { username: null, rankText: null, level: null, fetchedAt: 0, fetched: false };

  const sameOriginFetch = async (path) => {
    const url = path.startsWith('http') ? path : (location.origin + (path.startsWith('/') ? '' : '/') + path);
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) throw new Error('HTTP ' + res.status + ' for ' + url);
    return res;
  };

  const getUsername = async () => {
    try {
      const res = await sameOriginFetch('/userbar/getnewdata?extGet=1');
      const data = await res.json();
      const u = (data && data.user && data.user.name) || (data && data.ss && data.ss.userName) || null;
      if (typeof u === 'string' && u.trim()) return u.trim();
    } catch (_) {}
    return null;
  };

  const getModRanksList = async () => {
    const res = await sameOriginFetch('/ajax/getModRanksList');
    try {
      return await res.json();
    } catch (e) {
      return [];
    }
  };

  const findRankForUser = (list, username) => {
    if (!Array.isArray(list) || !username) return null;
    const uname = String(username).toLowerCase();
    return list.find(x => (x && typeof x.username === 'string' && x.username.toLowerCase() === uname)) || null;
  };

  const extractLevel = (rankText) => {
    if (!rankText || typeof rankText !== 'string') return null;
    const m = rankText.match(/level\s*(\d+)/i);
    return m ? parseInt(m[1], 10) : null;
  };

  const loadCache = () => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (!obj || typeof obj !== 'object') return null;
      const age = Date.now() - (obj.fetchedAt || 0);
      if (age >= CACHE_TTL_MS) return null;
      return obj;
    } catch (_) { return null; }
  };

  const saveCache = (obj) => {
    try { const toSave = { ...obj, fetchedAt: Date.now() }; localStorage.setItem(CACHE_KEY, JSON.stringify(toSave)); } catch (_) {}
  };

  const ensureRankFetched = async (force = false) => {
    if (!force) {
      const fromStore = loadCache();
      if (fromStore) { cached = { ...fromStore, fetched: true }; return cached; }
      if (cached.fetched && (cached.username || cached.rankText)) return cached;
    }
    try {
      const username = await getUsername();
      if (!username) { cached = { username: null, rankText: null, level: null, fetchedAt: Date.now(), fetched: true }; saveCache(cached); return cached; }
      const list = await getModRanksList();
      const entry = findRankForUser(list, username);
      const rankText = entry && entry.rank ? String(entry.rank) : null;
      const level = extractLevel(rankText);
      cached = { username, rankText, level, fetchedAt: Date.now(), fetched: true };
      saveCache(cached);
      return cached;
    } catch (e) {
      cached = { username: null, rankText: null, level: null, fetchedAt: Date.now(), fetched: true };
      saveCache(cached);
      return cached;
    }
  };

  
  window.fjApichk = {
    ensureFetched: ensureRankFetched,
    isAuthorized: () => Boolean(cached && cached.rankText && (cached.level !== null && typeof cached.level !== 'undefined')),
    getCached: () => ({ ...cached }),
    requestManualRefresh: async () => {
      const prev = window.fjApichk.isAuthorized();
      const res = await ensureRankFetched(true);
      try {
        console.log('[FJFE:apichk] Credentials refreshed', {
          username: res.username || null,
          rank: res.rankText || null,
          level: res.level || null
        });
      } catch (_) {}
      const nowA = window.fjApichk.isAuthorized();
      if (prev !== nowA) setTimeout(() => { try { location.reload(); } catch (_) {} }, 200);
      return { ok: true, authorized: nowA };
    }
  };

  if (!window.fjTweakerModules) window.fjTweakerModules = {};
  window.fjTweakerModules[MODULE_KEY] = { init: () => { if (location.hostname !== TARGET_HOST) return; ensureRankFetched(false).catch(() => {}); } };
})();
