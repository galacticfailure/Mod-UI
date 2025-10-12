(() => {
  const targetHost = 'funnyjunk.com';
  const MODULE_KEY = 'remtz';
  const REMOVE_KEY = 'removeTwilight';
  const CUSTOM_KEY = 'customMessages';
  const styleSnippets = [
    'color: red',
    'background: #232323',
    'font: 400 20px arial, sans-serif',
    'padding: 5px'
  ];

  
  
  const CUSTOM_MESSAGES = {
    'Shisui': "best mod dad",
    'gubbels': "The goose was right, C'est la vie",
    'phaseus': "This mod is a n/egg/er and a nikker.",
    'galacticfailure': "only a bullet can stop my sinful hand",
    'WMDxVeLoCiTy': "Eh, just leave it blank I guess. I dont really care for shit like that",
  };

  
  const ALPHA_TESTERS = [
    'Shisui',
    'gubbels',
    'WMDxVeLoCiTy',
    'phaseus'
  ];

  
  const CUSTOM_MESSAGES_STORAGE_KEY = 'fjTweakerCustomMessages';

  const normalizeUsername = (s) => String(s || '')
      .replace(/[\u200B-\u200D\uFEFF]/g, '') 
      .replace(/\u00A0/g, ' ') 
      .trim()
      .toLowerCase();

  const isAlphaTester = (username) => {
    const normalizedUsername = normalizeUsername(username);
    return ALPHA_TESTERS.some(tester => normalizeUsername(tester) === normalizedUsername);
  };

  const normalizeMap = (obj) => {
    const out = {};
    if (!obj || typeof obj !== 'object') return out;
    for (const [k, v] of Object.entries(obj)) {
      if (!k) continue;
        const key = normalizeUsername(k);
      if (!key) continue;
      if (typeof v !== 'string') continue;
      out[key] = v;
    }
    return out;
  };

  const loadCustomMessagesFromStorage = () => {
    try {
      const raw = localStorage.getItem(CUSTOM_MESSAGES_STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return normalizeMap(parsed);
    } catch (_) {
      return {};
    }
  };

  const saveCustomMessagesToStorage = (map) => {
    try {
      const normalized = normalizeMap(map);
      localStorage.setItem(CUSTOM_MESSAGES_STORAGE_KEY, JSON.stringify(normalized));
      return true;
    } catch (_) {
      return false;
    }
  };

  const getCustomMessageMap = () => {
    const userMap = loadCustomMessagesFromStorage();
    const defaults = normalizeMap(CUSTOM_MESSAGES);
    
    return { ...defaults, ...userMap };
  };

  let observer = null;
  let removeEnabled = true;
  let customEnabled = false;

  const getFlags = () => {
    const settings = window.fjTweakerSettings || {};
    
    const remove = typeof settings[REMOVE_KEY] === 'undefined' ? true : Boolean(settings[REMOVE_KEY]);
    const custom = Boolean(settings[CUSTOM_KEY]);
    return { remove, custom };
  };

  const matchesTarget = (element) => {
    if (!(element instanceof HTMLElement)) {
      return false;
    }

    const styleAttr = (element.getAttribute('style') || '').replace(/\s+/g, ' ').trim().toLowerCase();
    const hasRequiredStyles = styleSnippets.every((snippet) => styleAttr.includes(snippet));

    if (!hasRequiredStyles) {
      return false;
    }

    const text = (element.textContent || '').toLowerCase();
    return text.includes('dear mod:');
  };

  const getUsername = () => {
    try {
      const h2 = document.querySelector('h2.contentTitle');
      if (!h2) return '';
      const targetSpan = h2.querySelector('span[style*="margin-right:10px"]') || h2.querySelector('span');
      if (!targetSpan) return '';
      return (targetSpan.textContent || '').trim();
    } catch (_) {
      return '';
    }
  };

  const escapeHtml = (s) => String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const removeTargets = () => {
    const candidates = document.querySelectorAll('div[style*="color: red"][style*="background: #232323"]');
    candidates.forEach((candidate) => {
      if (matchesTarget(candidate)) {
        candidate.remove();
      }
    });
  };

  const replaceCandidateContent = (candidate, message, username) => {
    try {
      const safe = escapeHtml(message);
      
      if (isAlphaTester(username)) {
        
        candidate.innerHTML = (
          '<div style="margin: 10px; font-weight: 700"><span style="font-size: 1.2em">\n' +
          `  <div>${safe}</div>\n` +
          '</span></div>\n' +
          '<span style="font-size: 0.6em">FJFE Closed Alpha Tester</span>'
        );
      } else {
        
        candidate.innerHTML = (
          '<div style="margin: 10px; font-weight: 700"><span style="font-size: 1.2em">\n' +
          `  <div>${safe}</div>\n` +
          '\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n' +
          '</span></div>'
        );
      }
    } catch (_) {}
  };

  
  const processTargets = () => {
    if (!removeEnabled && !customEnabled) return; 

    const username = getUsername();
    const key = normalizeUsername(username);
    const map = getCustomMessageMap();
    const message = key ? map[key] : undefined;

    const candidates = document.querySelectorAll('div[style*="color: red"][style*="background: #232323"]');
    candidates.forEach((candidate) => {
      if (!matchesTarget(candidate)) return;
      if (removeEnabled && !customEnabled) {
        candidate.remove();
        return;
      }

      if (!removeEnabled && customEnabled) {
        if (message) replaceCandidateContent(candidate, message, username);
        return; 
      }

      if (removeEnabled && customEnabled) {
        if (message) {
          replaceCandidateContent(candidate, message, username);
        } else {
          candidate.remove();
        }
        return;
      }
    });
  };

  const startObserver = () => {
    if (observer || !document.body || (!removeEnabled && !customEnabled)) {
      return;
    }

    observer = new MutationObserver(() => {
      processTargets();
    });

    observer.observe(document.body, { childList: true, subtree: true });
  };

  const stopObserver = () => {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  };

  const applyFlags = (flags) => {
    removeEnabled = Boolean(flags.remove);
    customEnabled = Boolean(flags.custom);

    if (removeEnabled || customEnabled) {
      processTargets();
      startObserver();
      return;
    }
    
    stopObserver();
  };

  const handleSettingsChanged = (event) => {
    const detail = event.detail || {};
    if (typeof detail[REMOVE_KEY] === 'undefined' && typeof detail[CUSTOM_KEY] === 'undefined') {
      return;
    }

    applyFlags(getFlags());
  };

  const init = () => {
    if (window.location.hostname !== targetHost) {
      return;
    }

    applyFlags(getFlags());
    document.addEventListener('fjTweakerSettingsChanged', handleSettingsChanged);
  };

  if (!window.fjTweakerModules) {
    window.fjTweakerModules = {};
  }

  
  const setCustomMessage = (username, message) => {
      const u = normalizeUsername(username);
    if (!u) return false;
    const current = loadCustomMessagesFromStorage();
    current[u] = String(message == null ? '' : message);
    const ok = saveCustomMessagesToStorage(current);
    if (ok && customEnabled) {
      processTargets();
    }
    return ok;
  };

    const removeCustomMessage = (username) => {
      const u = normalizeUsername(username);
    if (!u) return false;
    const current = loadCustomMessagesFromStorage();
    if (Object.prototype.hasOwnProperty.call(current, u)) {
      delete current[u];
      const ok = saveCustomMessagesToStorage(current);
      if (ok && customEnabled) {
        
        processTargets();
      }
      return ok;
    }
    return true;
  };

  const listCustomMessages = () => ({ ...getCustomMessageMap() });

  window.fjTweakerModules[MODULE_KEY] = { init, setCustomMessage, removeCustomMessage, listCustomMessages };
})();
