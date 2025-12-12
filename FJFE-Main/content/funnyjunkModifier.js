
(function () {
  const targetHost = 'funnyjunk.com';
  if (window.location.hostname !== targetHost) {
    return;
  }
  
  

  const HEHE_KEY = 'fjfe_hehe_overlay_shown';
  const heheImg = 'icons/hehe.png';
  const hiddenImg = 'icons/hidden.png';
  const vanishAudio = 'icons/vanish.mp3';

  function getResourceUrl(relPath) {
    return chrome.runtime.getURL(relPath);
  }

  function showHeheOverlay() {
    const img = document.createElement('img');
    img.src = getResourceUrl(heheImg);
    img.alt = 'hehe';
    img.style.position = 'fixed';
    img.style.right = '2vw';
    img.style.bottom = '2vh';
    img.style.zIndex = '2147483647';
    img.style.width = 'auto';
    img.style.height = 'auto';
    img.style.maxWidth = '50vw';
    img.style.maxHeight = '50vh';
    img.style.transform = 'scale(0.5)';
    img.style.transition = 'opacity 1s linear';
    img.style.cursor = 'pointer';
    img.style.pointerEvents = 'auto';
    img.id = 'fjfe-hehe-overlay';


    let audioUnlocked = false;
    function unlockAudio() {
      if (audioUnlocked) return;
      try {
        const ctx = window.AudioContext || window.webkitAudioContext;
        if (ctx) {
          const audioCtx = new ctx();
          const buffer = audioCtx.createBuffer(1, 1, 22050);
          const source = audioCtx.createBufferSource();
          source.buffer = buffer;
          source.connect(audioCtx.destination);
          source.start(0);
          if (audioCtx.state === 'suspended') {
            audioCtx.resume();
          }
        }
      } catch (e) {}
      audioUnlocked = true;
      window.removeEventListener('pointerdown', unlockAudio, true);
      window.removeEventListener('keydown', unlockAudio, true);
    }
    window.addEventListener('pointerdown', unlockAudio, true);
    window.addEventListener('keydown', unlockAudio, true);

    function playVanishAudio() {
      try {
        const ctx = window.AudioContext || window.webkitAudioContext;
        if (ctx) {
          const audioCtx = new ctx();
          if (audioCtx.state === 'suspended') {
            audioCtx.resume();
          }
        }
      } catch (e) {}
      const audio = document.createElement('audio');
      audio.src = getResourceUrl(vanishAudio);
      audio.preload = 'auto';
      audio.volume = 0.5;
      audio.style.position = 'fixed';
      audio.style.left = '-9999px';
      document.body.appendChild(audio);
      audio.play().catch(() => {});
      audio.addEventListener('ended', () => {
        audio.remove();
      });
    }

    img.addEventListener('mouseenter', function handleMouseEnter() {
      img.removeEventListener('mouseenter', handleMouseEnter);
      img.src = getResourceUrl(hiddenImg);
      playVanishAudio();
      img.style.opacity = '0';
      setTimeout(() => {
        img.remove();
      }, 1000);
      if (chrome && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ [HEHE_KEY]: true });
      }
    });

    document.body.appendChild(img);
  }


  function checkAndShowHehe() {
    function onFirstInteraction() {
      if (chrome && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get([HEHE_KEY], (result) => {
          if (!result[HEHE_KEY]) {
            showHeheOverlay();
          }
        });
      } else {
        showHeheOverlay();
      }
      window.removeEventListener('pointerdown', onFirstInteraction, true);
      window.removeEventListener('keydown', onFirstInteraction, true);
    }
    window.addEventListener('pointerdown', onFirstInteraction, true);
    window.addEventListener('keydown', onFirstInteraction, true);
  }

  let __fjfe_baselineInit = false;
  let __fjfe_limitedModulesInit = false;
  let __fjfe_proModulesInit = false;
  const initModules = () => {
    if (!window.fjTweakerModules) {
      return;
    }
    const { sel, modjs, ratetrack, sccustom, userpop, nextMove, remtz, walcorn, apichk, warn, hunt } = window.fjTweakerModules;
    
    if (!__fjfe_baselineInit) {
      if (sel && typeof sel.init === 'function') sel.init();
      if (apichk && typeof apichk.init === 'function') apichk.init();
      __fjfe_baselineInit = true;
    }
    
    const initLimitedModules = () => {
      if (__fjfe_limitedModulesInit) return;
      if (modjs && typeof modjs.init === 'function') modjs.init();
      if (ratetrack && typeof ratetrack.init === 'function') ratetrack.init();
      if (userpop && typeof userpop.init === 'function') userpop.init();
      if (warn && typeof warn.init === 'function') warn.init();
      __fjfe_limitedModulesInit = true;
    };

    const initProModules = () => {
      if (__fjfe_proModulesInit) return;
      if (hunt && typeof hunt.init === 'function') hunt.init();
      if (sccustom && typeof sccustom.init === 'function') sccustom.init();
      if (nextMove && typeof nextMove.init === 'function') nextMove.init();
      if (remtz && typeof remtz.init === 'function') remtz.init();
      if (walcorn && typeof walcorn.init === 'function') walcorn.init();
      __fjfe_proModulesInit = true;
    };

    const authorized = (window.fjApichk && typeof window.fjApichk.isAuthorized === 'function') ? window.fjApichk.isAuthorized() : true;
    if (!authorized) return;

    const restricted = (window.fjApichk && typeof window.fjApichk.isRestricted === 'function') ? window.fjApichk.isRestricted() : false;
    if (restricted) {
      initLimitedModules();
      return;
    }

    initLimitedModules();
    initProModules();
  };

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
    
    checkAndShowHehe();
    
    
    try {
      document.querySelectorAll("[data-role='fjfe-debug-toggle-hotzone'],[data-role='fjfe-farm-debug-toggle-hotzone']").forEach(el => el.remove());
    } catch(_) {}
    
    initModules();
    setupAccessDebugMenu();

    
    document.addEventListener('fjApichkStatus', () => {
      try { initModules(); } catch (_) {}
    }, { passive: true });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true });
  } else {
    run();
  }
})();
