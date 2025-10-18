(() => {
  const MODULE_KEY = 'apichk';
  const TARGET_HOST = 'funnyjunk.com';
  const CACHE_KEY = '__fj_apichk_cache__';
  const CACHE_TTL_MS = 10 * 60 * 1000; 
  const AUTO_REFRESH_KEY = '__fj_apichk_last_auto_refresh__';
  const AUTO_INTERVAL_MS = 24 * 60 * 60 * 1000; 
  const AUTO_RETRY_MS = 60 * 60 * 1000; 

  let cached = { username: null, rankText: null, level: null, fetchedAt: 0, fetched: false };
  let autoRefreshTimer = null;

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
    } catch (_) {
      return null;
    }

  };

  const saveCache = (obj) => {
    try {
      const toSave = { ...obj, fetchedAt: Date.now() };
      localStorage.setItem(CACHE_KEY, JSON.stringify(toSave));
    } catch (_) {}
  };

  const ensureRankFetched = async (force = false) => {
    if (!force) {
      const fromStore = loadCache();
      if (fromStore) {
        cached = { ...fromStore, fetched: true };
        return cached;
      }
      if (cached.fetched && (cached.username || cached.rankText)) return cached;
    }
    try {
      const username = await getUsername();
      if (!username) {
        cached = { username: null, rankText: null, level: null, fetchedAt: Date.now(), fetched: true };
        saveCache(cached);
        return cached;
      }
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

  const ensureFooterUI = () => {
    try {
      const label = findVersionLabel();
      if (!label) return null;
      
      try {
        document.querySelectorAll('[data-fjFooterRow="1"]').forEach(n => n.remove());
      }
 catch (_) {}

      
      try {
        label.querySelectorAll('[data-fj-rank-extra="1"]').forEach(n => n.remove());
      }
 catch (_) {}

      
      const parent = label.parentElement;
      if (!parent) return null;
      const row = document.createElement('div');
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

      const right = document.createElement('div');
      right.style.flex = '0 0 auto';

      
      parent.insertBefore(row, label);
      left.appendChild(label);
      row.appendChild(left);
      row.appendChild(right);

      
      let btn = document.getElementById('fj-apichk-refresh');
      if (btn) {
        try {
          btn.remove();
        }
 catch (_) {}
      } else {
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
      }
      right.appendChild(btn);

      
      const btnClone = btn.cloneNode(true);
      btn.replaceWith(btnClone);
      btnClone.addEventListener('click', async () => {
        const prevText = btnClone.textContent;
        btnClone.disabled = true;
        btnClone.textContent = 'Updating…';
        try {
          const res = await ensureRankFetched(true);
          console.log('[FJFE:apichk] Credentials refreshed', {
            username: res.username || null,
            rank: res.rankText || null,
            level: res.level || null
          });
        } catch (e) {
          console.warn('[FJFE:apichk] Refresh failed', e);
        }
        btnClone.textContent = prevText;
        btnClone.disabled = false;
      });

      return { label, refreshBtn: btnClone };
    } catch (_) {
      return null;
    }
  };

  const applyRankToVersionLabel = () => {
    
    return Boolean(ensureFooterUI());
  };

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
      observeMenuAndApply();
      scheduleDailyAutoRefresh();
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

  const runDailyAutoRefresh = async () => {
    try {
      await ensureRankFetched(true);
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
    isAuthorized: () => Boolean(cached && cached.rankText && (cached.level !== null && typeof cached.level !== 'undefined')),
    getCached: () => ({ ...cached }),
    requestManualRefresh: async () => {
      const prevAuth = window.fjApichk.isAuthorized();
      const res = await ensureRankFetched(true);
      try {
        console.log('[FJFE:apichk] Credentials refreshed', {
          username: res.username || null,
          rank: res.rankText || null,
          level: res.level || null
        });
      } catch (_) {}
      const nowAuth = window.fjApichk.isAuthorized();
      if (prevAuth !== nowAuth) {
        setTimeout(() => { try { location.reload(); } catch (_) {} }, 200);
      }
      return { ok: true, authorized: nowAuth };
    }
  };
})();
