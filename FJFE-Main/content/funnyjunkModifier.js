
(function () {
  /*
   * Global bootstrap for every content script module.
   * It decides which modules to initialize based on credential level,
   * then exposes a hidden debug menu so admins can override access
   * while testing. Everything here should run as early as possible.
   */
  const targetHost = 'funnyjunk.com';
  if (window.location.hostname !== targetHost) {
    return;
  }
  
  

  let __fjfe_baselineInit = false;
  let __fjfe_limitedModulesInit = false;
  let __fjfe_proModulesInit = false;
  let __fjfe_addonsFetchStarted = false;
  let __fjfe_addonMeta = [];
  const __fjfe_addonInitKeys = new Set();
  const __fjfe_addonEnabledState = new Map();
  let __fjfe_addonInitRetryTimer = null;
  const __fjfe_loadedModules = window.__fjfeLoadedModules instanceof Set
    ? window.__fjfeLoadedModules
    : new Set();
  window.__fjfeLoadedModules = __fjfe_loadedModules;
  const LOADER_RETRY_DELAYS_MS = [0, 120, 280];
  const MODULE_LOAD_KEY_BY_MODULE = Object.freeze({
    sel: 'sel',
    apichk: 'apichk',
    workingPrev: 'workingPrev',
    modjs: 'modjs',
    ratetrack: 'ratetrack',
    userpop: 'userpop',
    warn: 'warn',
    greeble: 'greeble',
    hunt: 'hunt',
    sccustom: 'sccustom',
    nextMove: 'nextMove',
    walcorn: 'walcorn',
    batchassist: 'batchassist'
  });

  const parityLog = (eventName, detail = {}) => {
    try { window.fjfeParity?.log?.(eventName, detail); } catch (_) {}
  };

  const isLoaderBridgeEnabled = () => {
    try {
      return window.fjfeRuntimeFlags?.isEnabled
        ? window.fjfeRuntimeFlags.isEnabled('loaderBridge', true)
        : true;
    } catch (_) {
      return true;
    }
  };

  const sendRuntimeMessageWithRetry = async (payload) => {
    if (!chrome?.runtime?.sendMessage) {
      return null;
    }
    let lastError = null;
    for (let i = 0; i < LOADER_RETRY_DELAYS_MS.length; i += 1) {
      const delay = LOADER_RETRY_DELAYS_MS[i];
      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
      try {
        const response = await new Promise((resolve, reject) => {
          chrome.runtime.sendMessage(payload, (result) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message || 'Runtime message failed.'));
              return;
            }
            resolve(result);
          });
        });
        return response;
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || new Error('Runtime message failed.');
  };

  const safeInitModule = (moduleKey, mod, reason = 'bootstrap') => {
    if (!moduleKey || !mod || typeof mod.init !== 'function') {
      return false;
    }
    if (__fjfe_loadedModules.has(moduleKey)) {
      return false;
    }
    try {
      mod.init();
      __fjfe_loadedModules.add(moduleKey);
      parityLog('module-init', { moduleKey, reason });
      return true;
    } catch (error) {
      try { console.warn(`[FJFE] Module init failed for ${moduleKey}.`, error); } catch (_) {}
      parityLog('module-init-error', { moduleKey, reason, message: error?.message || 'init failed' });
      return false;
    }
  };

  const ensureModuleScripts = async (moduleKeys, reason = 'bootstrap') => {
    if (!isLoaderBridgeEnabled()) {
      return;
    }
    const existingModules = window.fjTweakerModules || {};
    const requested = Array.from(new Set(
      (Array.isArray(moduleKeys) ? moduleKeys : [])
        .filter((moduleKey) => !existingModules[moduleKey])
        .map((key) => MODULE_LOAD_KEY_BY_MODULE[key] || '')
        .filter(Boolean)
    ));
    if (!requested.length) {
      return;
    }
    try {
      const response = await sendRuntimeMessageWithRetry({
        type: 'fjfe-load-modules',
        moduleKeys: requested
      });
      parityLog('module-load-request', {
        reason,
        requested,
        ok: Boolean(response?.ok),
        injected: response?.injected || [],
        unknown: response?.unknown || []
      });
    } catch (error) {
      parityLog('module-load-request-error', {
        reason,
        requested,
        message: error?.message || 'load request failed'
      });
    }
  };

  const readLocalSettingsFallback = () => {
    try {
      const raw = localStorage.getItem('fjTweakerSettings');
      return raw ? (JSON.parse(raw) || {}) : {};
    } catch (_) {
      return {};
    }
  };

  const getCurrentSettingsSnapshot = () => {
    const live = window.fjTweakerSettings && typeof window.fjTweakerSettings === 'object'
      ? window.fjTweakerSettings
      : null;
    const fallback = readLocalSettingsFallback();
    return { ...(fallback || {}), ...(live || {}) };
  };

  const resolveAddonSettingName = (addon) => {
    const setting = addon && addon.setting && typeof addon.setting === 'object' ? addon.setting : null;
    const name = typeof setting?.settingName === 'string' ? setting.settingName.trim() : '';
    return name || null;
  };

  const resolveAddonEnabled = (addon, settingsSnapshot) => {
    const settingName = resolveAddonSettingName(addon);
    if (!settingName) {
      return true;
    }
    return Boolean(settingsSnapshot?.[settingName]);
  };

  // Generic helper addons can use when they only need simple open/close fade behavior.
  const animateAddonVisibility = (addon, enabled) => {
    try {
      const ui = addon && addon.ui && typeof addon.ui === 'object' ? addon.ui : null;
      const selector = typeof ui?.rootSelector === 'string' ? ui.rootSelector.trim() : '';
      if (!selector) return;
      const nodes = Array.from(document.querySelectorAll(selector));
      if (!nodes.length) return;
      const durationMs = Math.max(80, Number(ui?.durationMs) || 180);
      nodes.forEach((node) => {
        if (!node || !node.style) return;
        node.style.transition = `opacity ${durationMs}ms ease, transform ${durationMs}ms ease`;
        if (enabled) {
          node.style.display = '';
          requestAnimationFrame(() => {
            node.style.opacity = '1';
            node.style.transform = 'translateY(0)';
          });
        } else {
          node.style.opacity = '0';
          node.style.transform = 'translateY(-8px)';
          setTimeout(() => {
            try { node.style.display = 'none'; } catch (_) {}
          }, durationMs);
        }
      });
    } catch (_) {}
  };

  const applyAddonEnabledState = (addon, enabled, reason = 'settings-changed') => {
    const moduleKey = typeof addon?.moduleKey === 'string' ? addon.moduleKey.trim() : '';
    if (!moduleKey) return;

    const mod = window.fjTweakerModules?.[moduleKey];
    const prev = __fjfe_addonEnabledState.get(moduleKey);
    __fjfe_addonEnabledState.set(moduleKey, enabled);

    if (!mod) {
      return;
    }

    try {
      // Preferred unified hook for addon templates.
      if (typeof mod.setEnabled === 'function') {
        mod.setEnabled(enabled, { reason, addon });
      } else {
        // Backward-compatible hooks for existing modules.
        if (enabled && typeof mod.enable === 'function') {
          mod.enable({ reason, addon });
        }
        if (!enabled && typeof mod.disable === 'function') {
          mod.disable({ reason, addon });
        }
      }
    } catch (error) {
      try { console.warn('[FJFE Debug][bootstrap] addon toggle hook failed', { moduleKey, enabled, reason, error }); } catch (_) {}
    }

    // Optional no-code animation path declared in addon.json ui metadata.
    try {
      animateAddonVisibility(addon, enabled);
    } catch (_) {}

    // Fire a generic event for addons that prefer event-driven enable/disable.
    try {
      document.dispatchEvent(new CustomEvent('fjfeAddonToggle', {
        detail: {
          addonId: addon?.id || null,
          moduleKey,
          settingName: resolveAddonSettingName(addon),
          enabled,
          reason,
          prevEnabled: typeof prev === 'boolean' ? prev : null
        }
      }));
    } catch (_) {}
  };

  const syncAddonEnabledStates = (reason = 'settings-changed') => {
    const settings = getCurrentSettingsSnapshot();
    (__fjfe_addonMeta || []).forEach((addon) => {
      const moduleKey = typeof addon?.moduleKey === 'string' ? addon.moduleKey.trim() : '';
      if (!moduleKey) return;
      const enabled = resolveAddonEnabled(addon, settings);
      applyAddonEnabledState(addon, enabled, reason);
    });
  };

  const getAddonAccess = (addon) => {
    const raw = typeof addon?.access === 'string' ? addon.access.trim().toLowerCase() : 'independent';
    if (raw === 'pro' || raw === 'limited' || raw === 'independent') {
      return raw;
    }
    return 'independent';
  };

  const scheduleAddonInitRetry = (delayMs = 120) => {
    if (__fjfe_addonInitRetryTimer) {
      return;
    }
    __fjfe_addonInitRetryTimer = setTimeout(() => {
      __fjfe_addonInitRetryTimer = null;
      try { initModules().catch(() => {}); } catch (_) {}
    }, Math.max(0, Number(delayMs) || 0));
  };

  const initAddonModules = (restricted) => {
    if (!window.fjTweakerModules || !Array.isArray(__fjfe_addonMeta) || !__fjfe_addonMeta.length) {
      try {
        console.info('[FJFE Debug][bootstrap] initAddonModules skipped', {
          hasModules: Boolean(window.fjTweakerModules),
          addonMetaCount: Array.isArray(__fjfe_addonMeta) ? __fjfe_addonMeta.length : -1,
          restricted
        });
      } catch (_) {}
      return;
    }

    for (const addon of __fjfe_addonMeta) {
      const moduleKey = typeof addon?.moduleKey === 'string' ? addon.moduleKey.trim() : '';
      if (!moduleKey || __fjfe_addonInitKeys.has(moduleKey)) {
        try {
          console.info('[FJFE Debug][bootstrap] addon skipped before init', {
            addonId: addon?.id || addon?.name || 'unknown',
            moduleKey,
            alreadyInitialized: __fjfe_addonInitKeys.has(moduleKey)
          });
        } catch (_) {}
        continue;
      }

      const access = getAddonAccess(addon);
      if (restricted && access === 'pro') {
        try {
          console.info('[FJFE Debug][bootstrap] addon skipped by access', {
            addonId: addon?.id || addon?.name || 'unknown',
            moduleKey,
            access,
            restricted
          });
        } catch (_) {}
        continue;
      }

      const mod = window.fjTweakerModules[moduleKey];
      if (!mod || typeof mod.init !== 'function') {
        try {
          console.warn('[FJFE Debug][bootstrap] addon module missing or invalid', {
            addonId: addon?.id || addon?.name || 'unknown',
            moduleKey,
            hasModule: Boolean(mod),
            hasInit: Boolean(mod && typeof mod.init === 'function')
          });
        } catch (_) {}
        scheduleAddonInitRetry();
        continue;
      }

      try {
        const didInit = safeInitModule(moduleKey, mod, 'addon');
        if (didInit) {
          __fjfe_addonInitKeys.add(moduleKey);
        }
        try {
          console.info('[FJFE Debug][bootstrap] addon module initialized', {
            addonId: addon?.id || addon?.name || 'unknown',
            moduleKey
          });
        } catch (_) {}
        try {
          const enabled = resolveAddonEnabled(addon, getCurrentSettingsSnapshot());
          applyAddonEnabledState(addon, enabled, 'module-init');
        } catch (_) {}
      } catch (error) {
        try { console.warn(`[FJFE] Addon init failed for module ${moduleKey}.`, error); } catch (_) {}
      }
    }
  };

  const fetchAddonMeta = () => {
    if (__fjfe_addonsFetchStarted) {
      try { console.info('[FJFE Debug][bootstrap] fetchAddonMeta skipped: already started'); } catch (_) {}
      return;
    }
    __fjfe_addonsFetchStarted = true;
    if (typeof chrome === 'undefined' || !chrome.runtime || typeof chrome.runtime.sendMessage !== 'function') {
      try { console.warn('[FJFE Debug][bootstrap] fetchAddonMeta unavailable: no runtime.sendMessage'); } catch (_) {}
      return;
    }
    try {
      chrome.runtime.sendMessage({ type: 'fjfe-get-addons' }, (response) => {
        if (chrome.runtime.lastError) {
          try {
            console.warn('[FJFE Debug][bootstrap] fetchAddonMeta runtime error', {
              message: chrome.runtime.lastError.message
            });
          } catch (_) {}
          return;
        }
        if (response && Array.isArray(response.addons)) {
          __fjfe_addonMeta = response.addons;
          try {
            console.info('[FJFE Debug][bootstrap] addon metadata received', {
              addonCount: response.addons.length,
              addons: response.addons.map((a) => ({
                id: a?.id,
                name: a?.name,
                moduleKey: a?.moduleKey,
                access: a?.access,
                settingName: a?.setting?.settingName
              }))
            });
          } catch (_) {}
          try { initModules().catch(() => {}); } catch (_) {}
          try { syncAddonEnabledStates('metadata-refresh'); } catch (_) {}
        } else {
          try {
            console.warn('[FJFE Debug][bootstrap] addon metadata missing/invalid payload', {
              hasResponse: Boolean(response),
              addonArray: Array.isArray(response?.addons)
            });
          } catch (_) {}
        }
      });
    } catch (_) {}
  };

  // Modules are grouped by privilege; initialize them lazily once credentials resolve.
  const initModules = async () => {
    if (!window.fjTweakerModules) {
      return;
    }
    const baselineModuleKeys = ['sel', 'apichk', 'workingPrev'];
    const limitedModuleKeys = ['modjs', 'ratetrack', 'userpop', 'warn', 'greeble'];
    const proModuleKeys = ['hunt', 'sccustom', 'nextMove', 'walcorn', 'batchassist'];
    await ensureModuleScripts(baselineModuleKeys, 'baseline');
    const getModules = () => window.fjTweakerModules || {};

    if (!__fjfe_baselineInit) {
      const modules = getModules();
      safeInitModule('sel', modules.sel, 'baseline');
      safeInitModule('apichk', modules.apichk, 'baseline');
      safeInitModule('workingPrev', modules.workingPrev, 'baseline');
      __fjfe_baselineInit = true;
    }

    // Limited modules are safe for restricted accounts.
    const initLimitedModules = () => {
      if (__fjfe_limitedModulesInit) return;
      const modules = getModules();
      safeInitModule('modjs', modules.modjs, 'limited');
      safeInitModule('ratetrack', modules.ratetrack, 'limited');
      safeInitModule('userpop', modules.userpop, 'limited');
      safeInitModule('warn', modules.warn, 'limited');
      safeInitModule('greeble', modules.greeble, 'limited');
      __fjfe_limitedModulesInit = true;
    };

    // Pro modules stay locked unless the user is unrestricted.
    const initProModules = () => {
      if (__fjfe_proModulesInit) return;
      const modules = getModules();
      safeInitModule('hunt', modules.hunt, 'pro');
      safeInitModule('sccustom', modules.sccustom, 'pro');
      safeInitModule('nextMove', modules.nextMove, 'pro');
      safeInitModule('walcorn', modules.walcorn, 'pro');
      safeInitModule('batchassist', modules.batchassist, 'pro');
      __fjfe_proModulesInit = true;
    };

    const authorized = (window.fjApichk && typeof window.fjApichk.isAuthorized === 'function') ? window.fjApichk.isAuthorized() : true;
    if (!authorized) return;

    const restricted = (window.fjApichk && typeof window.fjApichk.isRestricted === 'function') ? window.fjApichk.isRestricted() : false;
    await ensureModuleScripts(limitedModuleKeys, 'limited');
    if (restricted) {
      initLimitedModules();
      initAddonModules(true);
      return;
    }

    await ensureModuleScripts(proModuleKeys, 'pro');
    initLimitedModules();
    initProModules();
    initAddonModules(false);
  };

  // Typing this key chord opens the admin-only debug menu.
  const ACCESS_DEBUG_SEQUENCE = [';', '\'', '[', ']', '\\'];
  const ACCESS_DEBUG_OVERRIDE_MIN = 1;
  const ACCESS_DEBUG_OVERRIDE_MAX = 10;
  const accessDebugState = {
    container: null,
    labelEl: null,
    seqAttached: false,
    setupDone: false,
    lastDeniedNotice: 0
  };

  // Mirrors fjApichk.getLevel but guards against missing APIs.
  const getEffectiveAccessLevel = () => {
    try {
      if (!window.fjApichk || typeof window.fjApichk.getLevel !== 'function') return null;
      const level = window.fjApichk.getLevel();
      return Number.isFinite(level) ? level : null;
    } catch (_) {
      return null;
    }
  };

  const getOverrideAccessLevel = () => {
    try {
      if (!window.fjApichk || typeof window.fjApichk.getOverrideLevel !== 'function') return null;
      const level = window.fjApichk.getOverrideLevel();
      return Number.isFinite(level) ? level : null;
    } catch (_) {
      return null;
    }
  };

  const getKnownUsername = () => {
    try {
      const cached = window.fjApichk?.getCached?.();
      if (cached && typeof cached.username === 'string' && cached.username.trim()) {
        return cached.username.trim();
      }
    } catch (_) {}
    return null;
  };

  const isExcludedAdmin = () => {
    try {
      if (window.fjApichk && typeof window.fjApichk.isExcluded === 'function') {
        return Boolean(window.fjApichk.isExcluded());
      }
    } catch (_) {}
    try {
      const cached = window.fjApichk?.getCached?.();
      return Boolean(cached && cached.excluded);
    } catch (_) {
      return false;
    }
  };

  const hasAccessDebugPermission = () => isExcludedAdmin();

  // Tooltip text on the debug badge reflects current user + override state.
  const updateAccessDebugLabelMeta = ({ level, overrideLevel, isAdmin, username }) => {
    if (!accessDebugState.labelEl) return;
    if (isAdmin) {
      const nameSuffix = username ? ` (${username})` : '';
      const overrideSuffix = Number.isFinite(overrideLevel) ? ' Override active.' : '';
      accessDebugState.labelEl.title = `Admin access granted${nameSuffix}.${overrideSuffix}`.trim();
      return;
    }
    if (Number.isFinite(level)) {
      const overrideNote = Number.isFinite(overrideLevel) ? ` (override ${overrideLevel})` : '';
      accessDebugState.labelEl.title = `Restricted admin menu. Current level: ${level}${overrideNote}.`;
      return;
    }
    accessDebugState.labelEl.title = 'Restricted admin menu. Update credentials to continue.';
  };

  const promptAccessLevelOverride = () => {
    const api = window.fjApichk;
    if (!api || typeof api.setLevelOverride !== 'function') {
      alert('Credential override is unavailable.');
      return;
    }
    const current = getOverrideAccessLevel() ?? getEffectiveAccessLevel();
    const input = window.prompt('Enter override level (1-10). Leave blank to clear.', current ? String(current) : '');
    if (input === null) return;
    const trimmed = input.trim();
    if (!trimmed) {
      api.clearLevelOverride?.();
      return;
    }
    if (!/^\d+$/.test(trimmed)) {
      alert('Please enter a whole number between 1 and 10.');
      return;
    }
    const num = Number(trimmed);
    if (!Number.isInteger(num) || num < ACCESS_DEBUG_OVERRIDE_MIN || num > ACCESS_DEBUG_OVERRIDE_MAX) {
      alert('Please enter a whole number between 1 and 10.');
      return;
    }
    const ok = api.setLevelOverride?.(num);
    if (!ok) {
      alert('Unable to apply override. Ensure credentials are loaded.');
    }
  };

  // Small floating panel that lets admins override their level.
  // Small floating panel that exposes the credential override prompt.
  const buildAccessDebugMenu = () => {
    if (accessDebugState.container) return accessDebugState.container;
    if (!document.body) return null;
    const box = document.createElement('div');
    box.setAttribute('data-role', 'fjfe-access-debug-panel');
    Object.assign(box.style, {
      position: 'fixed',
      bottom: '20px',
      left: '20px',
      zIndex: '2147483647',
      background: '#151515',
      color: '#ddd',
      border: '1px solid #333',
      borderRadius: '8px',
      boxShadow: '0 8px 24px #0009',
      padding: '10px',
      display: 'flex',
      gap: '8px',
      alignItems: 'center'
    });
    const label = document.createElement('div');
    label.textContent = 'Debug';
    label.style.fontWeight = '700';
    label.style.marginRight = '6px';

    const makeButton = (text, handler) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = text;
      Object.assign(btn.style, {
        padding: '4px 8px',
        background: '#2a2a2a',
        color: '#fff',
        border: '1px solid #444',
        borderRadius: '4px',
        cursor: 'pointer'
      });
      btn.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        try {
          handler();
        } catch (_) {}
      });
      return btn;
    };

    const credsBtn = makeButton('Credentials Override', promptAccessLevelOverride);
    const closeBtn = makeButton('×', () => toggleAccessDebugMenu(false));
    closeBtn.style.fontWeight = '900';
    closeBtn.style.padding = '2px 8px';
    closeBtn.setAttribute('aria-label', 'Close debug menu');

    box.append(label, credsBtn, closeBtn);
    document.body.appendChild(box);
    accessDebugState.container = box;
    accessDebugState.labelEl = label;
    updateAccessDebugLabelMeta({
      level: getEffectiveAccessLevel(),
      overrideLevel: getOverrideAccessLevel(),
      isAdmin: isExcludedAdmin(),
      username: getKnownUsername()
    });
    return box;
  };

  const toggleAccessDebugMenu = (force) => {
    const want = typeof force === 'boolean' ? force : !accessDebugState.container;
    if (want) {
      if (!hasAccessDebugPermission()) return;
      if (!accessDebugState.container) buildAccessDebugMenu();
    } else {
      if (accessDebugState.container && accessDebugState.container.parentNode) {
        accessDebugState.container.parentNode.removeChild(accessDebugState.container);
      }
      accessDebugState.container = null;
      accessDebugState.labelEl = null;
    }
  };

  const handleAccessDebugStatus = (event) => {
    const detail = event && event.detail ? event.detail : null;
    const level = Number.isFinite(detail?.level) ? detail.level : getEffectiveAccessLevel();
    const override = Number.isFinite(detail?.overrideLevel) ? detail.overrideLevel : getOverrideAccessLevel();
    const isAdmin = typeof detail?.excluded === 'boolean' ? detail.excluded : isExcludedAdmin();
    const username = detail?.username || getKnownUsername();
    updateAccessDebugLabelMeta({ level, overrideLevel: override, isAdmin, username });
    if (!isAdmin) {
      toggleAccessDebugMenu(false);
    }
  };

  // Key chord gate so the menu does not show up accidentally.
  const attachAccessDebugSequence = () => {
    if (accessDebugState.seqAttached) return;
    const seq = ACCESS_DEBUG_SEQUENCE;
    let idx = 0;
    let timer = null;
    const reset = () => {
      idx = 0;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    };
    const isTyping = () => {
      const ae = document.activeElement;
      if (!ae) return false;
      const tag = (ae.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea') return true;
      return Boolean(ae.isContentEditable);
    };
    document.addEventListener('keydown', (event) => {
      try {
        if (isTyping()) return;
        const expected = seq[idx];
        if (event.key === expected) {
          idx++;
          if (idx === seq.length) {
            if (hasAccessDebugPermission()) {
              toggleAccessDebugMenu();
            } else {
              const now = Date.now();
              if (now - accessDebugState.lastDeniedNotice > 3000) {
                accessDebugState.lastDeniedNotice = now;
                try {
                  console.info('[FJFE] Debug menu is limited to administrator accounts.');
                } catch (_) {}
              }
            }
            reset();
          } else {
            if (timer) clearTimeout(timer);
            timer = setTimeout(reset, 4000);
          }
        } else {
          reset();
        }
      } catch (_) {
        reset();
      }
    }, { capture: true });
    accessDebugState.seqAttached = true;
  };

  const setupAccessDebugMenu = () => {
    if (accessDebugState.setupDone) return;
    accessDebugState.setupDone = true;
    attachAccessDebugSequence();
    document.addEventListener('fjApichkStatus', handleAccessDebugStatus, { passive: true });
    handleAccessDebugStatus();
  };

  const run = () => {
    
    
    try {
      document.querySelectorAll("[data-role='fjfe-debug-toggle-hotzone']").forEach(el => el.remove());
    } catch(_) {}
    
    fetchAddonMeta();
    initModules().catch(() => {});
    setupAccessDebugMenu();

    
    document.addEventListener('fjApichkStatus', () => {
      try { initModules().catch(() => {}); } catch (_) {}
    }, { passive: true });

    document.addEventListener('fjTweakerSettingsChanged', () => {
      try { syncAddonEnabledStates('settings-event'); } catch (_) {}
    }, { passive: true });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true });
  } else {
    run();
  }
})();
