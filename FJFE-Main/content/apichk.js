(() => {
  /*
   * Credentials/authorization bootstrapper.
   * Pulls rank data from FunnyJunk endpoints, caches it, exposes helpers
   * over window.fjApichk, and wires the SEL footer button used to force
   * a refresh. Also drives the daily auto-refresh timer that reloads the
   * page if access level changes.
   */
  const MODULE_KEY = 'apichk';
  const TARGET_HOST = 'funnyjunk.com';
  const CACHE_KEY = '__fj_apichk_cache__';
  const CACHE_TTL_MS = 10 * 60 * 1000; 
  const AUTO_REFRESH_KEY = '__fj_apichk_last_auto_refresh__';
  const AUTO_INTERVAL_MS = 24 * 60 * 60 * 1000; 
  const AUTO_RETRY_MS = 60 * 60 * 1000; 
  const EXCLUDED_USERNAMES = ['galacticfailure', 'gubbels','Shisui'];
  const LEVEL_OVERRIDE_KEY = '__fj_apichk_override_level__';
  const LEVEL_OVERRIDE_MIN = 1;
  const LEVEL_OVERRIDE_MAX = 10;

  
  const REFRESH_WINDOW_MS = 5 * 60 * 1000; 
  const REFRESH_MAX_USES = 3;
  const REFRESH_WINDOW_START_KEY = '__fj_apichk_refresh_window_start__';
  const REFRESH_USES_LEFT_KEY = '__fj_apichk_refresh_uses_left__';

  let cached = { username: null, rankText: null, level: null, excluded: false, fetchedAt: 0, fetched: false };
  let autoRefreshTimer = null;
  let overrideLevel = null;

  // Allow power users to temporarily spoof a level for testing restricted UIs.
  // Sanitize user-entered override levels before persisting them.
  const normalizeOverrideLevel = (value) => {
    if (value === null || typeof value === 'undefined') return null;
    const num = Number(String(value).trim());
    if (!Number.isFinite(num)) return null;
    const int = Math.trunc(num);
    if (int < LEVEL_OVERRIDE_MIN || int > LEVEL_OVERRIDE_MAX) return null;
    return int;
  };

  const persistOverrideLevel = (value) => {
    if (value === null || typeof value === 'undefined') {
      try { localStorage.removeItem(LEVEL_OVERRIDE_KEY); } catch (_) {}
      return;
    }
    try { localStorage.setItem(LEVEL_OVERRIDE_KEY, String(value)); } catch (_) {}
  };

  const readStoredOverrideLevel = () => {
    try {
      const raw = localStorage.getItem(LEVEL_OVERRIDE_KEY);
      if (!raw) return null;
      const normalized = normalizeOverrideLevel(raw);
      if (normalized === null) {
        try { localStorage.removeItem(LEVEL_OVERRIDE_KEY); } catch (_) {}
        return null;
      }
      return normalized;
    } catch (_) {
      return null;
    }
  };

  overrideLevel = readStoredOverrideLevel();

  const getOverrideLevel = () => (Number.isFinite(overrideLevel) ? overrideLevel : null);

  const getRawCachedLevel = () => {
    if (!cached) return null;
    if (typeof cached.level === 'number') return cached.level;
    const parsed = parseInt(cached.level, 10);
    return Number.isFinite(parsed) ? parsed : null;
  };

  // True when the cache contains a rank entry from the mod ranks endpoint.
  const isAuthorized = () => {
    
    return Boolean(cached && cached.rankText && (cached.level !== null && typeof cached.level !== 'undefined'));
  };

  const getLevel = () => {
    const override = getOverrideLevel();
    if (override !== null) return override;
    return getRawCachedLevel();
  };

  const normalizeUsername = (username) => {
    if (!username || typeof username !== 'string') return '';
    return username.trim().toLowerCase();
  };

  const isUsernameExcluded = (username) => {
    const normalized = normalizeUsername(username);
    if (!normalized) return false;
    return EXCLUDED_USERNAMES.some((entry) => normalizeUsername(entry) === normalized);
  };

  const isExcluded = () => {
    return Boolean(isUsernameExcluded(cached && cached.username));
  };

  const isRestricted = () => {
    const level = getLevel();
    if (!isAuthorized()) return false;
    if (isExcluded()) return false;
    return level === 1;
  };

  // Broadcast current credential info so other modules can react instantly.
  const dispatchStatus = () => {
    try {
      const detail = {
        authorized: isAuthorized(),
        username: cached.username || null,
        rankText: cached.rankText || null,
        level: getLevel(),
        rawLevel: getRawCachedLevel(),
        overrideLevel: getOverrideLevel(),
        restricted: isRestricted(),
        excluded: isExcluded()
      };
      document.dispatchEvent(new CustomEvent('fjApichkStatus', { detail }));
    } catch (_) {}
  };

  const setLevelOverride = (value) => {
    if (value === null || typeof value === 'undefined') {
      return clearLevelOverride();
    }
    const normalized = normalizeOverrideLevel(value);
    if (normalized === null) return false;
    if (overrideLevel === normalized) return true;
    overrideLevel = normalized;
    persistOverrideLevel(normalized);
    dispatchStatus();
    return true;
  };

  const clearLevelOverride = () => {
    if (overrideLevel === null) {
      persistOverrideLevel(null);
      return false;
    }
    overrideLevel = null;
    persistOverrideLevel(null);
    dispatchStatus();
    return true;
  };

  // Manual refresh button is rate-limited so it cannot spam the API endpoints.
  // Manual refresh button has a rolling window; read/validate the window + remaining uses.
  const readRefreshState = () => {
    let windowStart = 0; let usesLeft = REFRESH_MAX_USES;
    try { windowStart = parseInt(localStorage.getItem(REFRESH_WINDOW_START_KEY), 10); if (!Number.isFinite(windowStart)) windowStart = 0; } catch(_) { windowStart = 0; }
    try { usesLeft = parseInt(localStorage.getItem(REFRESH_USES_LEFT_KEY), 10); if (!Number.isFinite(usesLeft)) usesLeft = REFRESH_MAX_USES; } catch(_) { usesLeft = REFRESH_MAX_USES; }
    const now = Date.now();
    if (!windowStart || (now - windowStart) >= REFRESH_WINDOW_MS) {
      
      windowStart = 0;
      usesLeft = REFRESH_MAX_USES;
    }
    return { windowStart, usesLeft };
  };

  const writeRefreshState = (windowStart, usesLeft) => {
    try { localStorage.setItem(REFRESH_WINDOW_START_KEY, String(windowStart || 0)); } catch(_) {}
    try { localStorage.setItem(REFRESH_USES_LEFT_KEY, String(Math.max(0, usesLeft))); } catch(_) {}
  };

  const canUseManualRefresh = () => {
    const { windowStart, usesLeft } = readRefreshState();
    const now = Date.now();
    if (!windowStart || (now - windowStart) >= REFRESH_WINDOW_MS) {
      return { allowed: true, remaining: REFRESH_MAX_USES, resetAt: null };
    }
    return { allowed: usesLeft > 0, remaining: Math.max(0, usesLeft), resetAt: windowStart + REFRESH_WINDOW_MS };
  };

  const consumeManualRefresh = () => {
    const now = Date.now();
    let { windowStart, usesLeft } = readRefreshState();
    if (!windowStart || (now - windowStart) >= REFRESH_WINDOW_MS) {
      windowStart = now;
      usesLeft = REFRESH_MAX_USES;
    }
    usesLeft = Math.max(0, usesLeft - 1);
    writeRefreshState(windowStart, usesLeft);
    return { windowStart, usesLeft };
  };

  // Fetch helper that inherits FunnyJunk cookies (needed for auth-only endpoints).
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

  // Keep network usage low by caching the last rank response for 10 minutes.
  const loadCache = () => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (!obj || typeof obj !== 'object') return null;
      const age = Date.now() - (obj.fetchedAt || 0);
      if (age >= CACHE_TTL_MS) return null;
      const excluded = isUsernameExcluded(obj.username);
      return { ...obj, excluded };
    } catch (_) {
      return null;
    }

  };

  const saveCache = (obj) => {
    try {
      const toSave = { ...obj, excluded: Boolean(obj && obj.excluded), fetchedAt: Date.now() };
      localStorage.setItem(CACHE_KEY, JSON.stringify(toSave));
    } catch (_) {}
  };

  // Main fetch pipeline: username -> rank list -> cache + status broadcast.
  const ensureRankFetched = async (force = false) => {
    if (!force) {
      const fromStore = loadCache();
      if (fromStore) {
        const excluded = isUsernameExcluded(fromStore.username);
        cached = { ...fromStore, excluded, fetched: true };
        dispatchStatus();
        return cached;
      }
      if (cached.fetched && (cached.username || cached.rankText)) return cached;
    }
    try {
      const username = await getUsername();
      if (!username) {
        cached = { username: null, rankText: null, level: null, excluded: false, fetchedAt: Date.now(), fetched: true };
        saveCache(cached);
        dispatchStatus();
        return cached;
      }
      const list = await getModRanksList();
      const entry = findRankForUser(list, username);
      const rankText = entry && entry.rank ? String(entry.rank) : null;
      const level = extractLevel(rankText);
      const excluded = isUsernameExcluded(username);
      cached = { username, rankText, level, excluded, fetchedAt: Date.now(), fetched: true };
      saveCache(cached);
      dispatchStatus();
      return cached;
    } catch (e) {
      cached = { username: null, rankText: null, level: null, excluded: false, fetchedAt: Date.now(), fetched: true };
      saveCache(cached);
      dispatchStatus();
      return cached;
    }
  };

  // The SEL module renders a footer line with the local version; piggyback on it for UI.
  const findVersionLabel = () => {
    try {
      const menu = document.getElementById('fj-sel-menu');
      if (!menu) return null;
      const divs = menu.querySelectorAll('div');
      for (const d of divs) {
        if (!d) continue;
        const txt = (d.textContent || '').trim();
        if (txt.startsWith('Local version: v')) return d;
      }
    } catch (_) {}
    return null;
  };

  // Inject/update the "Update Credentials" button under the SEL footer once authorized.
  const ensureFooterUI = () => {
    try {
      const menu = document.getElementById('fj-sel-menu');
      if (!menu) return null;
      const label = findVersionLabel();
      if (!label) return null;

      
      try {
        const unauthorized = window.fjApichk && typeof window.fjApichk.isAuthorized === 'function' ? !window.fjApichk.isAuthorized() : false;
        if (unauthorized) {
          const existing = label.closest('[data-fjFooterRow="1"]');
          if (existing) {
            const btn = existing.querySelector('#fj-apichk-refresh');
            if (btn) btn.remove();
          }
          return { label, refreshBtn: null };
        }
      } catch (_) {}

      
      let row = label.closest('[data-fjFooterRow="1"]');
      let right;
      if (!row) {
        
        row = document.createElement('div');
        row.style.display = 'flex';
        row.style.justifyContent = 'space-between';
        row.style.alignItems = 'center';
        row.style.gap = '8px';
        row.style.marginTop = '6px';
        row.dataset.fjFooterRow = '1';

        const left = document.createElement('div');
        left.style.display = 'flex';
        left.style.alignItems = 'center';
        left.style.flex = '1 1 auto';

        right = document.createElement('div');
        right.style.flex = '0 0 auto';

        const parent = label.parentElement;
        if (!parent) return null;
        parent.insertBefore(row, label);
        left.appendChild(label);
        row.appendChild(left);
        row.appendChild(right);
      } else {
        right = row.querySelector(':scope > div:last-child') || row;
      }

      
      let btn = row.querySelector('#fj-apichk-refresh');
      if (!btn) {
        btn = document.createElement('button');
        btn.id = 'fj-apichk-refresh';
        btn.type = 'button';
        btn.textContent = 'Update Credentials';
        Object.assign(btn.style, {
          padding: '4px 8px',
          font: "600 12px 'Segoe UI', sans-serif",
          color: '#111',
          background: '#ff8c00',
          border: '1px solid #b86900',
          borderRadius: '4px',
          cursor: 'pointer'
        });
        right.appendChild(btn);
      } else {
        
        const clone = btn.cloneNode(true);
        btn.replaceWith(clone);
        btn = clone;
      }

      btn.addEventListener('click', async () => {
        const st = canUseManualRefresh();
        if (!st.allowed) {
          // Cooldown message mirrors the restriction logic so users know when to retry.
          try {
            const now = Date.now();
            const minutesLeft = st.resetAt ? Math.ceil(Math.max(0, st.resetAt - now) / 60000) : 5;
            alert(`Please wait ${minutesLeft} minutes before trying again.`);
          } catch (_) {}
          return;
        }
        consumeManualRefresh();
        const prevAuthorized = (window.fjApichk && typeof window.fjApichk.isAuthorized === 'function') ? window.fjApichk.isAuthorized() : null;
        const prevText = btn.textContent;
        btn.disabled = true;
        btn.textContent = 'Updating…';
        try {
          const res = await ensureRankFetched(true);
          console.log('[FJFE:apichk] Credentials refreshed', {
            username: res.username || null,
            rank: res.rankText || null,
            level: res.level || null
          });
          const nowAuthorized = (res && res.rankText && (res.level !== null && typeof res.level !== 'undefined')) ? true : false;
          if (prevAuthorized !== null && nowAuthorized !== prevAuthorized) {
            try { writeLastAutoRefresh(Date.now()); } catch(_) {}
            setTimeout(() => { try { location.reload(); } catch(_) {} }, 200);
          }
        } catch (e) {
          console.warn('[FJFE:apichk] Refresh failed', e);
        }
        btn.textContent = prevText;
        btn.disabled = false;
      });

      return { label, refreshBtn: btn };
    } catch (_) {
      return null;
    }
  };

  const applyRankToVersionLabel = () => {
    
    return Boolean(ensureFooterUI());
  };

  // SEL footer renders asynchronously, so keep watching the DOM until the label exists.
  // Wait for SEL to finish rendering before trying to append the credential button.
  const observeMenuAndApply = async () => {
    await ensureRankFetched();
    
    if (applyRankToVersionLabel()) return;
    
    const obs = new MutationObserver(() => {
      if (applyRankToVersionLabel()) {
        try {
          obs.disconnect();
        }
 catch (_) {}
      }
    });
    try {
      obs.observe(document.documentElement || document.body, { childList: true, subtree: true });
    } catch (_) {}
  };

  const init = () => {
    try {
      if (location.hostname !== TARGET_HOST) return;
      if (window.__fjApichkInitDone) return;
      window.__fjApichkInitDone = true;
      observeMenuAndApply();
      scheduleDailyAutoRefresh();
      
      ensureRankFetched(false).catch(() => {});
    } catch (_) {}
  };

  const readLastAutoRefresh = () => {
    try {
      const v = parseInt(localStorage.getItem(AUTO_REFRESH_KEY), 10); return Number.isFinite(v) ? v : 0;
    }
 catch (_) {
      return 0;
    }

  };

  const writeLastAutoRefresh = (ts) => {
    try {
      localStorage.setItem(AUTO_REFRESH_KEY, String(ts));
    }
 catch (_) {}
  };

  // Keep credential state fresh by forcing a fetch every 24h (with 1h retry on failure).
  const scheduleDailyAutoRefresh = () => {
    try { if (autoRefreshTimer) { clearTimeout(autoRefreshTimer); autoRefreshTimer = null; } } catch (_) {}
    const now = Date.now();
    const last = readLastAutoRefresh();
    
    if (!last || last <= 0) {
      try {
        autoRefreshTimer = setTimeout(runDailyAutoRefresh, 5000);
      }
 catch (_) {}
      return;
    }
    const next = last + AUTO_INTERVAL_MS;
    if (now >= next) {
      
      try {
        autoRefreshTimer = setTimeout(runDailyAutoRefresh, 0);
      }
 catch (_) {}
      return;
    }
    const delay = Math.max(0, next - now);
    try {
      autoRefreshTimer = setTimeout(runDailyAutoRefresh, delay);
    }
 catch (_) {}
  };

  // Compare authorization before/after – if it changes, reload so SEL can re-tier modules.
  const runDailyAutoRefresh = async () => {
    try {
      const prevAuth = isAuthorized();
      await ensureRankFetched(true);
      const newAuth = isAuthorized();
      if (prevAuth !== newAuth) {
        try { writeLastAutoRefresh(Date.now()); } catch(_) {}
        setTimeout(() => { try { location.reload(); } catch(_) {} }, 200);
        return;
      }
      writeLastAutoRefresh(Date.now());
      
      try {
        if (autoRefreshTimer) clearTimeout(autoRefreshTimer);
      }
 catch (_) {}
      autoRefreshTimer = setTimeout(runDailyAutoRefresh, AUTO_INTERVAL_MS);
      try {
        console.log('[FJFE:apichk] Daily credentials refresh completed.');
      }
 catch (_) {}
    } catch (e) {
      
      try {
        if (autoRefreshTimer) clearTimeout(autoRefreshTimer);
      }
 catch (_) {}
      autoRefreshTimer = setTimeout(runDailyAutoRefresh, AUTO_RETRY_MS);
      try {
        console.warn('[FJFE:apichk] Daily credentials refresh failed; will retry in 1h.', e);
      }
 catch (_) {}
    }
  };

  if (!window.fjTweakerModules) window.fjTweakerModules = {};
  window.fjTweakerModules[MODULE_KEY] = { init };

  
  window.fjApichk = {
    ensureFetched: ensureRankFetched,
    isAuthorized,
    isRestricted,
    isExcluded,
    getLevel,
    getOverrideLevel,
    setLevelOverride,
    clearLevelOverride,
    getCached: () => ({
      ...cached,
      level: getLevel(),
      rawLevel: getRawCachedLevel(),
      overrideLevel: getOverrideLevel(),
      excluded: isExcluded()
    }),
    canUseManualRefresh,
    requestManualRefresh: async () => {
      const st = canUseManualRefresh();
      if (!st.allowed) return { ok: false, reason: 'cooldown', resetAt: st.resetAt };
      clearLevelOverride();
      consumeManualRefresh();
      const prevAuth = isAuthorized();
      const res = await ensureRankFetched(true);
      try {
        console.log('[FJFE:apichk] Credentials refreshed', {
          username: res.username || null,
          rank: res.rankText || null,
          level: res.level || null
        });
      } catch (_) {}
      const nowAuth = Boolean(res && res.rankText && (res.level !== null && typeof res.level !== 'undefined'));
      
      if (prevAuth !== nowAuth) {
        try { writeLastAutoRefresh(Date.now()); } catch (_) {}
        setTimeout(() => { try { location.reload(); } catch (_) {} }, 200);
      }
      return { ok: true, authorized: nowAuth };
    }
  };
})();
