(() => {
  const TARGET_HOST = 'funnyjunk.com';
  const MODULE_KEY = 'radar';
  const SETTING_KEY = 'bosRadar';
  const SETTINGS_STORAGE_KEY = 'fjTweakerSettings';
  const RADAR_ENABLED_KEY = 'fjTweakerBosRadarEnabled';
  const WRAPPER_ID = 'fj-assist-buttons';
  const BUTTON_ID = 'fj-radar-button';
  const MENU_ID = 'fj-radar-menu';
  const ICON_PATH = 'icons/radar.png';
  const ASSIST_ANCHOR_ATTR = 'fjAssistAnchor';
  const RADAR_BUTTON_ORDER = 1;
  const RADAR_GLOW_COLOR = 'rgba(88, 255, 140, 0.78)';
  const isRuntimeFlagEnabled = (flagName, fallback = true) => {
    try {
      return window.fjfeRuntimeFlags?.isEnabled
        ? window.fjfeRuntimeFlags.isEnabled(flagName, fallback)
        : fallback;
    } catch (_) {
      return fallback;
    }
  };
  const getAssistCommon = () => (
    isRuntimeFlagEnabled('assistSharedHelpers', true) ? window.fjfeAssistCommon : null
  );

  if (!window.location.hostname.endsWith(TARGET_HOST)) {
    return;
  }

  const BOS_LIST = [
    'Linxus',
    'Murrlogic',
    'Murrcuryfoxx',
    'Krause',
    'Aznzeus',
    'Elricbros',
    'Chloesviel',
    'Jettom',
    'Zerotsu',
    'Bumsnatcher',
    'Andre Herring',
    'Stinkyjim',
    'Reindeerflotilla',
    'Sentientclay',
    'Enlightenednazie',
    'Buymestuff',
    'Presidentmoose',
    'Transkiller',
    'Lordoffembois',
    'Fastersmartertoo',
    'Sesshounamaru',
    'Zhuftiuv',
    'Greenweed',
    'Tuciroll',
    'Mikathesupercool',
    'Xxgawdkillerxx',
    'Yuritarded',
    'Downladid',
    'Manjerky',
    'Copyrighted',
    'Noxiousblues',
    'Ilovegura',
    'Mastordawn',
    'Lilithzael',
    'Gloryccp',
    'Unethiccal',
    'Syrinx',
    'Dsdasdasd',
    'Thatsnottrue',
    'GKP',
    'Rumcajs',
    'Girguy',
    'Astolforino',
    'Skir',
    'Nexlee',
    'Greatzamboniboy',
    'Sunest',
    'Qpalzmmzlapq',
    'Papanoah',
    'Rocstarsix',
    'Greenbacksloth',
    'Gonetohappylandpls',
    'Meatybaton',
    'Fighterboi',
    'Sturmabteilung',
    'BeezusSutami',
    'Drackmore',
    'Obamaroflmao',
    'Shadowspliter',
    'Hoopy',
    'SumoWamm',
    'Schme',
    'Twi',
    'Neppy'
  ];

  const BOS_POTENTIAL = [];
  const SEEN_USERS_KEY = 'fjRadarSeenUsers';
  const POTENTIAL_USERS_KEY = 'fjRadarPotentialUsers';
  const LAST_PING_KEY = 'fjRadarLastPing';
  const PING_LOCK_KEY = 'fjRadarPingLock';
  const PING_INTERVAL_MS = 5 * 60 * 1000;
  const PING_LOCK_TTL_MS = 60 * 1000;
  const SONAR_OWNER_KEY = 'fjRadarSonarOwner';
  const SONAR_ACTIVE_KEY = 'fjRadarSonarActive';
  const SONAR_STALE_MS = 15000;
  const MAX_SEEN_USERS = 100;
  const MATCHES_LABEL_ID = 'fj-radar-matches-label';
  const LAST_SCAN_LABEL_ID = 'fj-radar-last-scan';

  const resolveAssetUrl = (relativePath) => {
    if (!relativePath) return '';
    try {
      if (typeof chrome !== 'undefined' && chrome?.runtime?.getURL) {
        return chrome.runtime.getURL(relativePath);
      }
    } catch (_) {}
    try {
      if (typeof browser !== 'undefined' && browser?.runtime?.getURL) {
        return browser.runtime.getURL(relativePath);
      }
    } catch (_) {}
    return relativePath;
  };

  const getStoredSettings = () => {
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (!raw) return {};
      return JSON.parse(raw) || {};
    } catch (_) {
      return {};
    }
  };

  const getSettingValue = () => {
    const settings = window.fjTweakerSettings || getStoredSettings();
    if (typeof settings[SETTING_KEY] === 'undefined') {
      return false;
    }
    return Boolean(settings[SETTING_KEY]);
  };

  const loadRadarEnabled = () => {
    try {
      const stored = localStorage.getItem(RADAR_ENABLED_KEY);
      if (stored === null) return true;
      return stored === '1';
    } catch (_) {
      return true;
    }
  };

  const persistRadarEnabled = (value) => {
    try {
      if (value) {
        localStorage.setItem(RADAR_ENABLED_KEY, '1');
      } else {
        localStorage.setItem(RADAR_ENABLED_KEY, '0');
      }
    } catch (_) {}
  };

  const tabToken = (() => `radar-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)();
  let sonarAudio = null;
  let sonarPlaying = false;
  let radarFlashInterval = null;
  let radarFlashTimeout = null;
  let menuOutsideClickBound = false;
  let menuPositionUpdateBound = false;
  let menuPingedWhileOpen = false;
  let menuHideTimeout = null;
  let radarPingTimer = null;
  let statusTickTimer = null;

  const readStorageValue = (key, fallback) => new Promise((resolve) => {
    try {
      if (typeof chrome !== 'undefined' && chrome?.storage?.local) {
        chrome.storage.local.get({ [key]: fallback }, (result) => resolve(result?.[key] ?? fallback));
        return;
      }
    } catch (_) {}
    resolve(fallback);
  });

  const writeStorageValue = (key, value) => new Promise((resolve) => {
    try {
      if (typeof chrome !== 'undefined' && chrome?.storage?.local) {
        chrome.storage.local.set({ [key]: value }, () => resolve());
        return;
      }
    } catch (_) {}
    resolve();
  });

  const readLocalFlag = (key) => {
    try {
      return localStorage.getItem(key);
    } catch (_) {
      return null;
    }
  };

  const writeLocalFlag = (key, value) => {
    try {
      if (value === null || typeof value === 'undefined') {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, String(value));
      }
    } catch (_) {}
  };

  const setRadarFlashState = (active) => {
    const radarButton = document.getElementById(BUTTON_ID);
    if (!radarButton) return;
    if (!radarButton.dataset.fjRadarBaseBg) {
      radarButton.dataset.fjRadarBaseBg = radarButton.style.backgroundColor || '';
      radarButton.dataset.fjRadarBaseBorder = radarButton.style.borderColor || '';
      radarButton.dataset.fjRadarBaseColor = radarButton.style.color || '';
    }
    if (active) {
      radarButton.style.backgroundColor = '#b00020';
      radarButton.style.borderColor = '#7a0016';
      radarButton.style.color = '#fff0f0';
    } else {
      radarButton.style.backgroundColor = radarButton.dataset.fjRadarBaseBg || '#1f7a1f';
      radarButton.style.borderColor = radarButton.dataset.fjRadarBaseBorder || '#145a14';
      radarButton.style.color = radarButton.dataset.fjRadarBaseColor || '#eaffea';
    }
  };

  const setRadarButtonActive = (active) => {
    const radarButton = document.getElementById(BUTTON_ID);
    if (!radarButton) return;
    if (radarButton.dataset.fjRadarMenuOpen === '1') {
      setRadarMenuOpenState(true);
      return;
    }
    const baseShadow = radarButton.dataset.fjRadarBaseShadow || '';
    const baseFilter = radarButton.dataset.fjRadarBaseFilter || '';
    if (active) {
      radarButton.style.filter = 'brightness(1.2) saturate(1.1)';
      radarButton.style.boxShadow = `0 0 10px ${RADAR_GLOW_COLOR}, 0 0 18px ${RADAR_GLOW_COLOR}, ${baseShadow}`;
    } else {
      radarButton.style.filter = baseFilter;
      radarButton.style.boxShadow = baseShadow;
    }
  };

  const startRadarFlash = () => {
    if (radarFlashInterval) return;
    setRadarFlashState(true);
    radarFlashTimeout = window.setTimeout(() => setRadarFlashState(false), 1000);
    radarFlashInterval = window.setInterval(() => {
      setRadarFlashState(true);
      if (radarFlashTimeout) {
        clearTimeout(radarFlashTimeout);
      }
      radarFlashTimeout = window.setTimeout(() => setRadarFlashState(false), 1000);
    }, 2000);
  };

  const stopRadarFlash = () => {
    if (radarFlashInterval) {
      clearInterval(radarFlashInterval);
      radarFlashInterval = null;
    }
    if (radarFlashTimeout) {
      clearTimeout(radarFlashTimeout);
      radarFlashTimeout = null;
    }
    setRadarFlashState(false);
  };

  const playSonar = () => {
    if (sonarPlaying) return;
    const src = resolveAssetUrl('icons/sonar.mp3');
    if (!src) return;
    if (!sonarAudio) {
      sonarAudio = new Audio(src);
      sonarAudio.loop = true;
      sonarAudio.volume = 0.6;
    }
    sonarAudio.loop = true;
    sonarAudio.play().then(() => {
      sonarPlaying = true;
    }).catch(() => {});
  };

  const playSonarOnce = () => {
    const src = resolveAssetUrl('icons/sonar.mp3');
    if (!src) return;
    const oneShot = new Audio(src);
    oneShot.loop = false;
    oneShot.volume = 0.6;
    oneShot.play().catch(() => {});
  };

  const stopSonar = () => {
    if (!sonarAudio) return;
    try {
      sonarAudio.pause();
      sonarAudio.currentTime = 0;
    } catch (_) {}
    sonarPlaying = false;
  };

  const claimSonar = () => {
    const owner = readLocalFlag(SONAR_OWNER_KEY);
    const active = readLocalFlag(SONAR_ACTIVE_KEY) === '1';
    const ownerStamp = Number(readLocalFlag(`${SONAR_OWNER_KEY}:ts`) || 0);
    const now = Date.now();
    if (owner && owner !== tabToken && now - ownerStamp < SONAR_STALE_MS) {
      return false;
    }
    writeLocalFlag(SONAR_OWNER_KEY, tabToken);
    writeLocalFlag(`${SONAR_OWNER_KEY}:ts`, String(now));
    writeLocalFlag(SONAR_ACTIVE_KEY, '1');
    if (active && owner === tabToken) {
      return true;
    }
    return true;
  };

  const notifySonar = () => {
    if (!claimSonar()) return;
    const menu = document.getElementById(MENU_ID);
    const menuOpen = menu && menu.style.display !== 'none';
    if (menuOpen) {
      if (!menuPingedWhileOpen) {
        playSonarOnce();
        menuPingedWhileOpen = true;
      }
      stopRadarFlash();
      return;
    }
    playSonar();
    startRadarFlash();
  };

  const clearSonar = () => {
    const owner = readLocalFlag(SONAR_OWNER_KEY);
    writeLocalFlag(SONAR_ACTIVE_KEY, '0');
    if (owner === tabToken) {
      writeLocalFlag(SONAR_OWNER_KEY, null);
      writeLocalFlag(`${SONAR_OWNER_KEY}:ts`, null);
    }
    stopSonar();
    stopRadarFlash();
  };

  const isElementVisible = (el) => {
    const assistCommon = getAssistCommon();
    if (assistCommon?.isElementVisible) {
      return assistCommon.isElementVisible(el);
    }
    if (!el) return false;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    if (Number(style.opacity) === 0) return false;
    if (el.offsetParent === null && style.position !== 'fixed') return false;
    return true;
  };

  const findSearchButton = () => {
    const assistCommon = getAssistCommon();
    if (assistCommon?.findSearchButton) {
      return assistCommon.findSearchButton();
    }
    const selectors = [
      '.userbarBttn .fjse',
      '.userbarBttn a[title*="search" i]',
      '#sectionsNav .search-inner button.btn.btn-primary',
      '#sectionsNav .search-inner button[type="submit"]',
      '#sectionsNav .search-inner button',
      'button#searchBtn',
      'button.searchBtn',
      'button.searchButton',
      'button.search-btn',
      'button#searchButton',
      'input#searchBtn',
      'input.searchBtn',
      'form[action*="search"] button[type="submit"]',
      'form[action*="search"] input[type="submit"]',
      'form[action*="search"] button',
      'button[type="submit"][aria-label*="search" i]',
      'button[title*="search" i]',
      'button[class*="search" i]',
      'a[class*="search" i]',
      'a[title*="search" i]',
      'input[type="image"][alt*="search" i]'
    ];
    const candidates = [];
    selectors.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => candidates.push(el));
    });
    const visible = candidates.find(isElementVisible);
    if (visible) return visible;
    return candidates[0] || null;
  };

  const isCompressedAnchor = (searchButton) => {
    const assistCommon = getAssistCommon();
    if (assistCommon?.isCompressedAnchor) {
      return assistCommon.isCompressedAnchor(searchButton);
    }
    return searchButton && (searchButton.classList.contains('fjse') || (searchButton.tagName === 'A' && searchButton.closest('.userbarBttn')));
  };

  const applyButtonStyling = (radarButton, searchButton) => {
    const assistCommon = getAssistCommon();
    if (assistCommon?.applyButtonStyling) {
      assistCommon.applyButtonStyling(radarButton, searchButton);
      radarButton.style.background = '#1f7a1f';
      radarButton.style.borderColor = '#145a14';
      radarButton.style.color = '#eaffea';
      radarButton.style.backgroundImage = `url(${resolveAssetUrl(ICON_PATH)})`;
      radarButton.style.backgroundRepeat = 'no-repeat';
      radarButton.style.backgroundPosition = 'center';
      radarButton.style.backgroundSize = '70% 70%';
      return;
    }
    if (!radarButton || !searchButton) return;
    const searchStyle = window.getComputedStyle(searchButton);
    radarButton.className = searchButton.className || '';
    if (searchButton.getAttribute('style')) {
      radarButton.style.cssText = searchButton.getAttribute('style');
    }
    const sizeProps = ['width', 'height', 'minWidth', 'minHeight', 'padding', 'borderRadius', 'font', 'lineHeight'];
    sizeProps.forEach((prop) => {
      const value = searchStyle[prop];
      if (value && value !== 'auto') {
        radarButton.style[prop] = value;
      }
    });
    radarButton.style.background = '#1f7a1f';
    radarButton.style.borderColor = '#145a14';
    radarButton.style.color = '#eaffea';
    radarButton.style.backgroundImage = `url(${resolveAssetUrl(ICON_PATH)})`;
    radarButton.style.backgroundRepeat = 'no-repeat';
    radarButton.style.backgroundPosition = 'center';
    radarButton.style.backgroundSize = '70% 70%';
    radarButton.style.display = 'inline-flex';
    radarButton.style.alignItems = 'center';
    radarButton.style.justifyContent = 'center';
    radarButton.style.overflow = 'visible';
    const size = parseFloat(searchStyle.height) || parseFloat(searchStyle.width) || 28;
    radarButton.style.width = `${size}px`;
    radarButton.style.height = `${size}px`;
    radarButton.style.minWidth = `${size}px`;
    radarButton.style.minHeight = `${size}px`;
    radarButton.style.padding = '0';
    radarButton.style.borderRadius = '6px';
    if (!radarButton.dataset.fjRadarBaseShadow) {
      radarButton.dataset.fjRadarBaseShadow = 'inset 0 0 0 1px rgba(255, 255, 255, 0.12)';
    }
    if (!radarButton.dataset.fjRadarBaseFilter) {
      radarButton.dataset.fjRadarBaseFilter = radarButton.style.filter || '';
    }
    radarButton.style.boxShadow = radarButton.dataset.fjRadarBaseShadow;
    radarButton.style.transition = 'transform 120ms ease, box-shadow 180ms ease, filter 180ms ease';
    radarButton.style.transformOrigin = 'center';
    if (!radarButton.dataset.fjRadarPressBound) {
      radarButton.dataset.fjRadarPressBound = '1';
      radarButton.addEventListener('pointerdown', () => {
        radarButton.style.transform = 'scale(0.92)';
      });
      ['pointerup', 'pointerleave', 'pointercancel', 'blur'].forEach((evt) => {
        radarButton.addEventListener(evt, () => {
          radarButton.style.transform = '';
        });
      });
    }
  };

  const applyIconButtonStyling = (button, searchButton, options) => {
    if (!button) return;
    const assistCommon = getAssistCommon();
    if (assistCommon?.applyIconStyling) {
      assistCommon.applyIconStyling(button, searchButton, {
        background: options?.background,
        border: options?.border,
        color: options?.color,
        iconUrl: options?.iconPath ? resolveAssetUrl(options.iconPath) : ''
      });
      return;
    }
    applyButtonStyling(button, searchButton);
    if (!options) return;
    if (options.background) button.style.backgroundColor = options.background;
    if (options.border) button.style.borderColor = options.border;
    if (options.color) button.style.color = options.color;
    if (options.iconPath) {
      button.style.backgroundImage = `url(${resolveAssetUrl(options.iconPath)})`;
    }
  };

  const buildMenu = () => {
    const menu = document.createElement('div');
    menu.id = MENU_ID;
    Object.assign(menu.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '260px',
      background: '#1c1c1c',
      border: '1px solid #333',
      borderRadius: '8px',
      boxShadow: '0 8px 20px rgba(0,0,0,0.45)',
      padding: '10px',
      display: 'none',
      flexDirection: 'column',
      gap: '10px',
      zIndex: '999',
      opacity: '0',
      transform: 'translateY(-8px)',
      transition: 'opacity 160ms ease, transform 180ms ease'
    });

    const toggleRow = document.createElement('div');
    Object.assign(toggleRow.style, {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: '6px',
      font: "600 12px 'Segoe UI', sans-serif",
      color: '#eaeaea'
    });
    const toggleLabel = document.createElement('span');
    toggleLabel.textContent = 'BOS Radar';

    const toggleBox = document.createElement('button');
    toggleBox.type = 'button';
    toggleBox.setAttribute('aria-label', 'Toggle BOS Radar');
    Object.assign(toggleBox.style, {
      display: 'inline-flex',
      alignItems: 'stretch',
      borderRadius: '4px',
      border: '1px solid #3a3a3a',
      overflow: 'hidden',
      padding: '0',
      cursor: 'pointer',
      background: 'transparent'
    });
    const toggleLeft = document.createElement('span');
    const toggleRight = document.createElement('span');
    Object.assign(toggleLeft.style, {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '11px',
      height: '9px',
      font: "700 8px 'Segoe UI', sans-serif"
    });
    Object.assign(toggleRight.style, {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '20px',
      height: '9px',
      font: "700 7px 'Segoe UI', sans-serif",
      letterSpacing: '0.2px',
      borderLeft: '1px solid rgba(0, 0, 0, 0.35)'
    });
    toggleBox.append(toggleLeft, toggleRight);

    const updateToggleUi = (enabled) => {
      if (enabled) {
        toggleLeft.textContent = '✓';
        toggleRight.textContent = 'ON';
        toggleLeft.style.background = '#2f8f2f';
        toggleRight.style.background = '#2f8f2f';
        toggleLeft.style.color = '#f1fff1';
        toggleRight.style.color = '#f1fff1';
        toggleBox.style.borderColor = '#2f8f2f';
      } else {
        toggleLeft.textContent = '✕';
        toggleRight.textContent = 'OFF';
        toggleLeft.style.background = '#555';
        toggleRight.style.background = '#555';
        toggleLeft.style.color = '#e8e8e8';
        toggleRight.style.color = '#e8e8e8';
        toggleBox.style.borderColor = '#3a3a3a';
      }
      setRadarButtonActive(enabled);
    };

    const applyToggleChange = (enabled) => {
      persistRadarEnabled(enabled);
      updateToggleUi(enabled);
      if (enabled) {
        runRadarPing();
      } else {
        clearSonar();
      }
    };

    updateToggleUi(loadRadarEnabled());

    toggleBox.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const nextState = !loadRadarEnabled();
      applyToggleChange(nextState);
    });

    toggleRow.append(toggleLabel, toggleBox);

    const listLabel = document.createElement('div');
    listLabel.id = MATCHES_LABEL_ID;
    listLabel.textContent = 'Matches (0)';
    Object.assign(listLabel.style, {
      font: "600 12px 'Segoe UI', sans-serif",
      color: '#f5e9a6'
    });

    const list = document.createElement('div');
    list.id = 'fj-radar-potential-list';
    Object.assign(list.style, {
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      maxHeight: '420px',
      overflowY: 'auto',
      padding: '6px',
      background: '#141414',
      border: '1px solid #2c2c2c',
      borderRadius: '6px'
    });

    const divider = document.createElement('div');
    Object.assign(divider.style, {
      height: '1px',
      background: '#2f2f2f',
      width: '100%'
    });

    const selectLabel = document.createElement('div');
    selectLabel.textContent = 'Radar entries';
    Object.assign(selectLabel.style, {
      font: "600 12px 'Segoe UI', sans-serif",
      color: '#d8ffd8'
    });
    const select = document.createElement('select');
    select.size = 6;
    Object.assign(select.style, {
      width: '100%',
      background: '#151515',
      border: '1px solid #2c2c2c',
      color: '#e8e8e8',
      borderRadius: '6px',
      padding: '4px',
      maxHeight: '140px',
      overflowY: 'auto',
      font: "500 12px 'Segoe UI', sans-serif"
    });
    BOS_LIST.forEach((entry) => {
      const opt = document.createElement('option');
      opt.value = entry;
      opt.textContent = entry;
      select.appendChild(opt);
    });

    const refreshBtn = document.createElement('button');
    refreshBtn.type = 'button';
    refreshBtn.textContent = 'Run scan now';
    Object.assign(refreshBtn.style, {
      alignSelf: 'center',
      background: '#2b2b2b',
      color: '#e8e8e8',
      border: '1px solid #444',
      borderRadius: '6px',
      padding: '5px 12px',
      cursor: 'pointer',
      font: "600 12px 'Segoe UI', sans-serif"
    });
    refreshBtn.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();
      await writeStorageValue(SEEN_USERS_KEY, []);
      await writeStorageValue(POTENTIAL_USERS_KEY, []);
      writeLocalFlag(LAST_PING_KEY, '0');
      renderPotentialList();
      clearSonar();
      runRadarPing();
    });

    const lastScan = document.createElement('div');
    lastScan.id = LAST_SCAN_LABEL_ID;
    lastScan.textContent = 'Last scanned: never';
    Object.assign(lastScan.style, {
      font: "500 11px 'Segoe UI', sans-serif",
      color: '#9b9b9b',
      textAlign: 'center'
    });

    menu.append(toggleRow, listLabel, list, divider, selectLabel, select, refreshBtn, lastScan);
    return menu;
  };

  const positionMenuNearButton = (menu, button) => {
    if (!menu || !button) return;
    const rect = button.getBoundingClientRect();
    const left = rect.left;
    const top = rect.bottom + 6;
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
  };

  const setRadarMenuOpenState = (open) => {
    const radarButton = document.getElementById(BUTTON_ID);
    if (!radarButton) return;
    radarButton.dataset.fjRadarMenuOpen = open ? '1' : '0';
    const baseShadow = radarButton.dataset.fjRadarBaseShadow || '';
    if (open) {
      radarButton.style.boxShadow = `0 0 12px ${RADAR_GLOW_COLOR}, 0 0 22px ${RADAR_GLOW_COLOR}, ${baseShadow}`;
    } else {
      setRadarButtonActive(loadRadarEnabled());
    }
  };

  const showRadarMenu = (menu, button) => {
    if (!menu) return;
    if (menuHideTimeout) {
      clearTimeout(menuHideTimeout);
      menuHideTimeout = null;
    }
    menu.style.display = 'flex';
    menu.style.opacity = '0';
    menu.style.transform = 'translateY(-8px)';
    positionMenuNearButton(menu, button);
    requestAnimationFrame(() => {
      positionMenuNearButton(menu, button);
      menu.style.opacity = '1';
      menu.style.transform = 'translateY(0)';
    });
    setRadarMenuOpenState(true);
  };

  const hideRadarMenu = (menu) => {
    if (!menu) return;
    menu.style.opacity = '0';
    menu.style.transform = 'translateY(-8px)';
    if (menuHideTimeout) {
      clearTimeout(menuHideTimeout);
    }
    menuHideTimeout = window.setTimeout(() => {
      menu.style.display = 'none';
      menuHideTimeout = null;
    }, 190);
    setRadarMenuOpenState(false);
  };

  const bindMenuPositionUpdates = (menu, button) => {
    if (!menu || !button || menuPositionUpdateBound) return;
    menuPositionUpdateBound = true;
    const update = () => positionMenuNearButton(menu, button);
    menu._fjMenuUpdate = update;
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });
  };

  const unbindMenuPositionUpdates = (menu) => {
    if (!menu || !menuPositionUpdateBound) return;
    const update = menu._fjMenuUpdate;
    if (update) {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      delete menu._fjMenuUpdate;
    }
    menuPositionUpdateBound = false;
  };

  const positionCompressedWrapper = (wrapper, anchor) => {
    const assistCommon = getAssistCommon();
    if (assistCommon?.positionCompressedWrapper) {
      assistCommon.positionCompressedWrapper(wrapper, anchor);
      return;
    }
    if (!wrapper || !anchor) return;
    const parent = anchor.parentElement;
    if (!parent) return;
    const parentRect = parent.getBoundingClientRect();
    const rect = anchor.getBoundingClientRect();
    const left = rect.right - parentRect.left + 4;
    const top = rect.top - parentRect.top - 7;
    wrapper.style.left = `${left}px`;
    wrapper.style.top = `${top}px`;
  };

  const buildUI = (searchButton) => {
    if (!searchButton) return null;

    let wrapper = document.getElementById(WRAPPER_ID);
    if (!wrapper) {
      wrapper = document.createElement('div');
      wrapper.id = WRAPPER_ID;
      Object.assign(wrapper.style, {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        position: 'relative',
        marginLeft: '6px',
        verticalAlign: 'middle',
        overflow: 'visible',
        paddingRight: '12px'
      });
    }

    let radarButton = document.getElementById(BUTTON_ID);
    if (!radarButton) {
      radarButton = document.createElement('button');
      radarButton.type = 'button';
      radarButton.id = BUTTON_ID;
      radarButton.setAttribute('aria-label', 'BOS Radar');
      radarButton.setAttribute('title', 'BOS Radar');
    }

    applyButtonStyling(radarButton, searchButton);
    radarButton.style.order = String(RADAR_BUTTON_ORDER);

    let menu = document.getElementById(MENU_ID);
    if (!menu) {
      menu = buildMenu();
      document.body.appendChild(menu);
    }

    if (!radarButton.dataset.fjRadarBound) {
      radarButton.dataset.fjRadarBound = '1';
      radarButton.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        const isOpen = menu.style.display !== 'none';
        if (isOpen) {
          hideRadarMenu(menu);
          unbindMenuPositionUpdates(menu);
          menuPingedWhileOpen = false;
          return;
        }
        showRadarMenu(menu, radarButton);
        bindMenuPositionUpdates(menu, radarButton);
        menuPingedWhileOpen = false;
        clearSonar();
        renderPotentialList();
      });
    }

    if (!menuOutsideClickBound) {
      menuOutsideClickBound = true;
      document.addEventListener('click', (event) => {
        const currentMenu = document.getElementById(MENU_ID);
        const currentButton = document.getElementById(BUTTON_ID);
        if (!currentMenu || currentMenu.style.display === 'none') return;
        const target = event.target;
        if (currentMenu.contains(target) || (currentButton && currentButton.contains(target))) return;
        hideRadarMenu(currentMenu);
        unbindMenuPositionUpdates(currentMenu);
        menuPingedWhileOpen = false;
      });
    }

    if (searchButton.parentElement) {
      const previousAnchor = document.querySelector('[data-fj-assist-anchor="1"]');
      if (previousAnchor && previousAnchor !== searchButton) {
        delete previousAnchor.dataset[ASSIST_ANCHOR_ATTR];
      }
      searchButton.dataset[ASSIST_ANCHOR_ATTR] = '1';
      wrapper.style.marginLeft = '6px';
      wrapper.style.position = 'relative';
      wrapper.style.gap = '6px';
      wrapper.style.zIndex = '999';
      wrapper.style.overflow = 'visible';
      wrapper.style.paddingRight = '12px';
      wrapper.style.left = '';
      wrapper.style.top = '';
      searchButton.insertAdjacentElement('afterend', wrapper);

      if (!wrapper.contains(radarButton)) {
        wrapper.appendChild(radarButton);
      }
    }

    return wrapper;
  };

  const removeUI = () => {
    const wrapper = document.getElementById(WRAPPER_ID);
    const menu = document.getElementById(MENU_ID);
    const anchor = document.querySelector('[data-fj-assist-anchor="1"]');
    if (menu) {
      menu.remove();
    }
    stopRadarFlash();
    const radarButton = document.getElementById(BUTTON_ID);
    if (radarButton) {
      radarButton.remove();
    }
    if (wrapper && wrapper.children.length === 0) {
      if (anchor) {
        delete anchor.dataset[ASSIST_ANCHOR_ATTR];
      }
      wrapper.remove();
    }
  };

  const stopRadarPingLoop = () => {
    if (radarPingTimer) {
      clearTimeout(radarPingTimer);
      radarPingTimer = null;
    }
  };

  const scheduleRadarPingLoop = () => {
    if (radarPingTimer) {
      return;
    }
    const tick = async () => {
      radarPingTimer = null;
      if (getSettingValue() && loadRadarEnabled()) {
        await runRadarPing();
      }
      if (getSettingValue()) {
        radarPingTimer = setTimeout(tick, PING_INTERVAL_MS);
      }
    };
    radarPingTimer = setTimeout(tick, PING_INTERVAL_MS);
  };

  const stopStatusTickLoop = () => {
    if (statusTickTimer) {
      clearTimeout(statusTickTimer);
      statusTickTimer = null;
    }
  };

  const scheduleStatusTickLoop = () => {
    if (statusTickTimer) {
      return;
    }
    const tick = () => {
      statusTickTimer = null;
      if (getSettingValue()) {
        updateLastScanLabel();
        updateAccountAgeLabels();
        statusTickTimer = setTimeout(tick, 1000);
      }
    };
    statusTickTimer = setTimeout(tick, 1000);
  };

  const syncRuntimeLoops = () => {
    if (!isRuntimeFlagEnabled('timerHardening', true)) {
      return;
    }
    if (getSettingValue()) {
      scheduleRadarPingLoop();
      scheduleStatusTickLoop();
    } else {
      stopRadarPingLoop();
      stopStatusTickLoop();
    }
  };

  const renderPotentialList = async () => {
    const list = document.getElementById('fj-radar-potential-list');
    if (!list) return;
    list.textContent = '';
    const stored = await readStorageValue(POTENTIAL_USERS_KEY, BOS_POTENTIAL);
    const entries = Array.isArray(stored) ? stored : [];
    const normalizeEntry = (item) => {
      if (typeof item === 'string') {
        return {
          username: item,
          matchedType: 'approximate name',
          accountAgeSeconds: null,
          matchedAt: Date.now()
        };
      }
      return {
        username: item.username,
        matchedType: item.matchedType || 'approximate name',
        accountAgeSeconds: Number.isFinite(item.accountAgeSeconds) ? item.accountAgeSeconds : null,
        matchedAt: item.matchedAt || Date.now()
      };
    };
    const normalized = entries.map(normalizeEntry).filter((item) => item.username);
    const label = document.getElementById(MATCHES_LABEL_ID);
    if (label) {
      label.textContent = `Matches (${normalized.length})`;
    }
    if (!entries.length) {
      const empty = document.createElement('div');
      empty.textContent = 'No matches yet.';
      Object.assign(empty.style, {
        font: "500 12px 'Segoe UI', sans-serif",
        color: '#aaa',
        padding: '6px 8px',
        border: '1px solid #f5e9a6',
        borderRadius: '4px',
        background: '#1b1b1b'
      });
      list.appendChild(empty);
      stopRadarFlash();
      return;
    }
    normalized.forEach((entry) => {
      const row = document.createElement('div');
      Object.assign(row.style, {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        gap: '6px',
        font: "500 12px 'Segoe UI', sans-serif",
        color: '#cfcfcf',
        background: '#1f1f1f',
        border: '1px solid #f5e9a6',
        borderRadius: '4px',
        padding: '6px 8px'
      });
      const headerRow = document.createElement('div');
      Object.assign(headerRow.style, {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px'
      });
      const name = document.createElement('div');
      name.textContent = entry.username;
      Object.assign(name.style, {
        font: "600 12px 'Segoe UI', sans-serif",
        color: '#f7f7f7',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        flex: '1 1 auto'
      });
      const actionRow = document.createElement('div');
      Object.assign(actionRow.style, {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        flex: '0 0 auto'
      });
      const reviewBtn = document.createElement('button');
      reviewBtn.type = 'button';
      reviewBtn.textContent = 'Review';
      Object.assign(reviewBtn.style, {
        background: '#c1a642',
        color: '#2b2b2b',
        border: '1px solid #8f7a2f',
        borderRadius: '4px',
        padding: '2px 6px',
        cursor: 'pointer',
        font: "600 11px 'Segoe UI', sans-serif"
      });
      reviewBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        window.open(`https://funnyjunk.com/user/${encodeURIComponent(entry.username)}`, '_blank', 'noopener');
      });
      const dismissBtn = document.createElement('button');
      dismissBtn.type = 'button';
      dismissBtn.textContent = 'Dismiss';
      Object.assign(dismissBtn.style, {
        background: '#2b2b2b',
        color: '#e8e8e8',
        border: '1px solid #444',
        borderRadius: '4px',
        padding: '2px 6px',
        cursor: 'pointer',
        font: "600 11px 'Segoe UI', sans-serif"
      });
      dismissBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const next = normalized.filter((item) => item.username.toLowerCase() !== entry.username.toLowerCase());
        await writeStorageValue(POTENTIAL_USERS_KEY, next);
        renderPotentialList();
        if (!next.length) {
          clearSonar();
        }
      });
      actionRow.append(reviewBtn, dismissBtn);
      headerRow.append(name, actionRow);

      const details = document.createElement('ul');
      Object.assign(details.style, {
        margin: '0',
        paddingLeft: '18px',
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
        color: '#d8d8d8',
        font: "500 9px 'Segoe UI', sans-serif"
      });
      details.style.listStyleType = 'disc';
      details.style.listStylePosition = 'outside';
      details.style.setProperty('color', '#f5e9a6');

      const matchItem = document.createElement('li');
      const matchLabel = document.createElement('span');
      matchLabel.textContent = `matched: ${entry.matchedType || 'approximate name'}`;
      matchLabel.style.color = '#d8d8d8';
      matchItem.appendChild(matchLabel);

      const ageItem = document.createElement('li');
      const ageSeconds = Number.isFinite(entry.accountAgeSeconds) ? entry.accountAgeSeconds : 0;
      const matchedAt = entry.matchedAt || Date.now();
      const ageLabel = document.createElement('span');
      ageLabel.textContent = `account age: ${formatDuration(ageSeconds)}`;
      ageLabel.style.color = '#d8d8d8';
      ageLabel.dataset.fjAgeSeconds = String(ageSeconds);
      ageLabel.dataset.fjMatchedAt = String(matchedAt);
      ageItem.appendChild(ageLabel);

      details.append(matchItem, ageItem);
      row.append(headerRow, details);
      list.appendChild(row);
    });
  };

  const extractUsersFromHtml = (html) => {
    const results = [];
    const userIdMap = new Map();
    const bannedUsernames = new Set();
    const accountAgeMap = new Map();
    const parseAgeSeconds = (text) => {
      if (!text) return null;
      const longMatch = text.match(/(\d+)\s*(second|minute|hour|day|week|month|year)s?\s*ago/i);
      const shortMatch = text.match(/\((\d+)\s*([smhdw])\)/i);
      let value = null;
      let unit = null;
      if (longMatch) {
        value = Number(longMatch[1]);
        unit = longMatch[2].toLowerCase();
      } else if (shortMatch) {
        value = Number(shortMatch[1]);
        const shortUnit = shortMatch[2].toLowerCase();
        unit = {
          s: 'second',
          m: 'minute',
          h: 'hour',
          d: 'day',
          w: 'week'
        }[shortUnit];
      }
      if (!Number.isFinite(value) || !unit) return null;
      const multipliers = {
        second: 1,
        minute: 60,
        hour: 3600,
        day: 86400,
        week: 604800,
        month: 2592000,
        year: 31536000
      };
      return value * (multipliers[unit] || 1);
    };
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      doc.querySelectorAll('div.com[id^="u"]').forEach((card) => {
        const anchor = card.querySelector('a[href^="/user/"]');
        if (!anchor) return;
        const href = anchor.getAttribute('href') || '';
        const username = href.replace('/user/', '').trim();
        if (!username) return;
        const text = card.textContent || '';
        if (/\bBan:\s*/i.test(text)) {
          bannedUsernames.add(username.toLowerCase());
        }
        const ageSeconds = parseAgeSeconds(text);
        if (ageSeconds !== null) {
          accountAgeMap.set(username, ageSeconds);
        }
      });
      doc.querySelectorAll('a[href^="/user/"]').forEach((anchor) => {
        const href = anchor.getAttribute('href') || '';
        const username = href.replace('/user/', '').trim();
        if (username) results.push(username);
      });
      doc.querySelectorAll('.userPQ[onclick*="admintools.userP"]').forEach((node) => {
        const onclickValue = node.getAttribute('onclick') || '';
        const match = onclickValue.match(/admintools\.userP\([^,]+,\s*(\d+)\s*,\s*\d+\s*,\s*['\"]([^'\"]+)['\"]/i);
        if (match) {
          const userId = Number(match[1]);
          const username = String(match[2]);
          if (username && Number.isFinite(userId)) {
            userIdMap.set(username, userId);
          }
        }
      });
    } catch (_) {}
    return {
      usernames: Array.from(new Set(results)),
      userIdMap,
      bannedUsernames,
      accountAgeMap
    };
  };

  const levenshtein = (a, b) => {
    const m = a.length;
    const n = b.length;
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + cost
        );
      }
    }
    return dp[m][n];
  };

  const containsFuzzy = (haystack, needle) => {
    if (!haystack || !needle) return false;
    const h = haystack.toLowerCase();
    const n = needle.toLowerCase().trim();
    if (!n) return false;
    if (h.includes(n)) return true;

    if (n.length <= 3) {
      const len = n.length;
      for (let i = 0; i + len <= h.length; i++) {
        const slice = h.slice(i, i + len);
        if (levenshtein(slice, n) <= 1) return true;
      }
      return false;
    }

    const minLen = Math.max(1, n.length - 2);
    const maxLen = n.length + 2;
    for (let len = minLen; len <= maxLen; len++) {
      for (let i = 0; i + len <= h.length; i++) {
        const slice = h.slice(i, i + len);
        if (levenshtein(slice, n) <= 2) return true;
      }
    }
    return false;
  };

  const extractBanReasons = (payload) => {
    const reasons = [];
    const walk = (obj) => {
      if (!obj || typeof obj !== 'object') return;
      if (Object.prototype.hasOwnProperty.call(obj, 'ban_reason') && typeof obj.ban_reason === 'string') {
        reasons.push(obj.ban_reason);
      }
      Object.values(obj).forEach((value) => {
        if (Array.isArray(value)) {
          value.forEach(walk);
        } else if (value && typeof value === 'object') {
          walk(value);
        }
      });
    };
    try {
      walk(payload);
    } catch (_) {}
    return reasons;
  };

  const fetchNewUsers = async () => {
    const res = await fetch('https://funnyjunk.com/newusers/50/1/-24', {
      credentials: 'include',
      headers: { 'x-requested-with': 'XMLHttpRequest' }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.text();
  };

  const fetchUserIPInfo = async (userId) => {
    const body = new URLSearchParams({ uid: String(userId) });
    const res = await fetch('https://funnyjunk.com/ajax/superGetUsersByIP', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch (_) {
      return text;
    }
  };

  const fetchUserFingerprints = async (userId) => {
    const body = new URLSearchParams({ uid: String(userId) });
    const res = await fetch('https://funnyjunk.com/ajax/getFingerPrints', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch (_) {
      return text;
    }
  };

  const updateSeenUsers = async (usernames) => {
    const stored = await readStorageValue(SEEN_USERS_KEY, []);
    const list = Array.isArray(stored) ? stored.slice() : [];
    const seen = new Set(list.map((u) => u.toLowerCase()));
    const newOnes = [];
    usernames.forEach((name) => {
      const lower = name.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        list.push(name);
        newOnes.push(name);
      }
    });
    while (list.length > MAX_SEEN_USERS) {
      list.shift();
    }
    await writeStorageValue(SEEN_USERS_KEY, list);
    return newOnes;
  };

  const formatDuration = (seconds) => {
    if (!Number.isFinite(seconds) || seconds < 0) return 'unknown';
    const formatUnit = (value, unit) => `${value} ${unit}${value === 1 ? '' : 's'}`;
    if (seconds < 60) return formatUnit(Math.max(0, Math.round(seconds)), 'second');
    if (seconds < 3600) return formatUnit(Math.round(seconds / 60), 'minute');
    if (seconds < 86400) return formatUnit(Math.round(seconds / 3600), 'hour');
    return formatUnit(Math.round(seconds / 86400), 'day');
  };

  const updateLastScanLabel = () => {
    const label = document.getElementById(LAST_SCAN_LABEL_ID);
    if (!label) return;
    const lastPing = Number(readLocalFlag(LAST_PING_KEY) || 0);
    if (!lastPing) {
      label.textContent = 'Last scanned: never';
      return;
    }
    const secondsAgo = Math.max(0, Math.floor((Date.now() - lastPing) / 1000));
    label.textContent = `Last scanned: ${formatDuration(secondsAgo)} ago`;
  };

  const updateAccountAgeLabels = () => {
    document.querySelectorAll('[data-fj-age-seconds]').forEach((node) => {
      const baseSeconds = Number(node.dataset.fjAgeSeconds || 0);
      const matchedAt = Number(node.dataset.fjMatchedAt || 0);
      const extra = matchedAt ? Math.max(0, Math.floor((Date.now() - matchedAt) / 1000)) : 0;
      const total = baseSeconds + extra;
      node.textContent = `account age: ${formatDuration(total)}`;
    });
  };

  const updatePotentialUsers = async (entry) => {
    if (!entry || !entry.username) return;
    const stored = await readStorageValue(POTENTIAL_USERS_KEY, BOS_POTENTIAL);
    const list = Array.isArray(stored) ? stored.slice() : [];
    const normalize = (value) => String(value || '').toLowerCase();
    const rank = {
      'exact name': 2,
      'approximate name': 1
    };
    const incoming = {
      username: entry.username,
      matchedType: entry.matchedType || 'approximate name',
      accountAgeSeconds: Number.isFinite(entry.accountAgeSeconds) ? entry.accountAgeSeconds : null,
      matchedAt: entry.matchedAt || Date.now()
    };
    let updated = false;
    const next = list.map((item) => {
      if (typeof item === 'string') {
        const normalized = normalize(item);
        if (normalized === normalize(incoming.username)) {
          updated = true;
          return incoming;
        }
        return { username: item, matchedType: 'approximate name', accountAgeSeconds: null, matchedAt: Date.now() };
      }
      if (normalize(item.username) === normalize(incoming.username)) {
        const currentRank = rank[item.matchedType] || 0;
        const nextRank = rank[incoming.matchedType] || 0;
        const merged = {
          ...item,
          matchedType: nextRank >= currentRank ? incoming.matchedType : item.matchedType,
          accountAgeSeconds: Number.isFinite(incoming.accountAgeSeconds) ? incoming.accountAgeSeconds : item.accountAgeSeconds,
          matchedAt: item.matchedAt || incoming.matchedAt
        };
        updated = true;
        return merged;
      }
      return item;
    });
    if (!updated) {
      next.unshift(incoming);
    }
    await writeStorageValue(POTENTIAL_USERS_KEY, next);
    renderPotentialList();
    notifySonar();
  };

  const pruneBannedMatches = async (bannedUsernames) => {
    if (!bannedUsernames || !bannedUsernames.size) return;
    const stored = await readStorageValue(POTENTIAL_USERS_KEY, BOS_POTENTIAL);
    const list = Array.isArray(stored) ? stored.slice() : [];
    const next = list.filter((entry) => {
      const username = typeof entry === 'string' ? entry : entry?.username;
      return !bannedUsernames.has(String(username || '').toLowerCase());
    });
    if (next.length !== list.length) {
      await writeStorageValue(POTENTIAL_USERS_KEY, next);
      renderPotentialList();
      if (!next.length) {
        clearSonar();
      }
    }
  };

  const scanReasonsResponse = async (username, response, sourceLabel, accountAgeSeconds) => {
    const reasons = Array.isArray(response)
      ? extractBanReasons({ response })
      : extractBanReasons(response);
    if (!reasons.length && typeof response === 'string') {
      const matches = response.match(/"ban_reason"\s*:\s*"([^"]*)"/gi) || [];
      matches.forEach((entry) => {
        const val = entry.split(':').slice(1).join(':').replace(/["\s]/g, '').trim();
        if (val) reasons.push(val);
      });
    }
    const lowerReasons = reasons.map((r) => String(r));
    let matchType = null;
    for (const bos of BOS_LIST) {
      const bosLower = bos.toLowerCase();
      const exact = lowerReasons.some((reason) => String(reason).trim().toLowerCase() === bosLower);
      if (exact) {
        matchType = 'exact name';
        break;
      }
    }
    if (!matchType) {
      const partial = BOS_LIST.some((bos) => {
        const bosLower = bos.toLowerCase();
        return lowerReasons.some((reason) => {
          const normalized = String(reason).toLowerCase();
          return normalized.includes(bosLower);
        });
      });
      if (partial) {
        matchType = 'approximate name';
      }
    }
    if (matchType) {
      await updatePotentialUsers({ username, matchedType: matchType, accountAgeSeconds });
    }
  };

  const runRadarPing = async () => {
    if (!getSettingValue() || !loadRadarEnabled()) return;
    const now = Date.now();
    const lastPing = Number(readLocalFlag(LAST_PING_KEY) || 0);
    if (now - lastPing < PING_INTERVAL_MS) return;
    const lock = Number(readLocalFlag(PING_LOCK_KEY) || 0);
    if (lock && now - lock < PING_LOCK_TTL_MS) return;
    writeLocalFlag(PING_LOCK_KEY, String(now));
    try {
      const html = await fetchNewUsers();
      const { usernames, userIdMap, bannedUsernames, accountAgeMap } = extractUsersFromHtml(html);
      await pruneBannedMatches(bannedUsernames);
      const newOnes = await updateSeenUsers(usernames);
      for (const name of newOnes) {
        if (bannedUsernames && bannedUsernames.has(name.toLowerCase())) {
          continue;
        }
        const userId = userIdMap.get(name);
        if (!userId) {
          continue;
        }
        const accountAgeSeconds = accountAgeMap ? accountAgeMap.get(name) : null;
        try {
          const response = await fetchUserIPInfo(userId);
          await scanReasonsResponse(name, response, 'IP', accountAgeSeconds);
        } catch (_) {
          
        }
        try {
          const response = await fetchUserFingerprints(userId);
          await scanReasonsResponse(name, response, 'Fingerprints', accountAgeSeconds);
        } catch (_) {
          
        }
      }
    } catch (_) {
      
    }
    writeLocalFlag(LAST_PING_KEY, String(Date.now()));
    writeLocalFlag(PING_LOCK_KEY, null);
    updateLastScanLabel();
  };

  const ensureUI = () => {
    const existingWrapper = document.getElementById(WRAPPER_ID);
    if (existingWrapper) {
      const currentAnchor = document.querySelector('[data-fj-assist-anchor="1"]');
      let anchor = currentAnchor && isElementVisible(currentAnchor) ? currentAnchor : null;
      if (!anchor) {
        anchor = findSearchButton();
        if (!anchor) {
          removeUI();
          return false;
        }
      }
      if (currentAnchor && currentAnchor !== anchor) {
        delete currentAnchor.dataset[ASSIST_ANCHOR_ATTR];
      }
      anchor.dataset[ASSIST_ANCHOR_ATTR] = '1';
      existingWrapper.style.marginLeft = '6px';
      existingWrapper.style.position = 'relative';
      existingWrapper.style.gap = '6px';
      existingWrapper.style.zIndex = '999';
      existingWrapper.style.left = '';
      existingWrapper.style.top = '';
      anchor.insertAdjacentElement('afterend', existingWrapper);
      if (!document.getElementById(BUTTON_ID)) {
        buildUI(anchor);
      }
      return true;
    }
    const searchButton = findSearchButton();
    if (!searchButton) return false;
    const isCompressed = isCompressedAnchor(searchButton);
    buildUI(searchButton);
    if (isCompressed) {
      const wrapper = document.getElementById(WRAPPER_ID);
      if (wrapper) {
        positionCompressedWrapper(wrapper, searchButton);
      }
    }
    return true;
  };

  let observer = null;

  const ensureUIWithObserver = () => {
    if (ensureUI()) return;
    if (!observer && typeof MutationObserver !== 'undefined') {
      observer = new MutationObserver(() => {
        if (ensureUI()) {
          observer.disconnect();
          observer = null;
        }
      });
      if (document.body) {
        observer.observe(document.body, { childList: true, subtree: true });
      }
    }
  };

  let refreshScheduled = false;
  const scheduleRefresh = () => {
    if (refreshScheduled) return;
    refreshScheduled = true;
    requestAnimationFrame(() => {
      refreshScheduled = false;
      if (getSettingValue()) {
        ensureUIWithObserver();
        const wrapper = document.getElementById(WRAPPER_ID);
        const anchor = document.querySelector('[data-fj-assist-anchor="1"]');
        if (wrapper && anchor) {
          wrapper.style.marginLeft = '6px';
          wrapper.style.position = 'relative';
          wrapper.style.gap = '6px';
          wrapper.style.zIndex = '999';
          wrapper.style.left = '';
          wrapper.style.top = '';
          anchor.insertAdjacentElement('afterend', wrapper);
        }
      } else {
        removeUI();
      }
    });
  };

  const handleSettingsChanged = (event) => {
    const detail = event.detail || {};
    if (typeof detail[SETTING_KEY] === 'undefined') return;
    if (Boolean(detail[SETTING_KEY])) {
      ensureUIWithObserver();
    } else {
      removeUI();
    }
    syncRuntimeLoops();
  };

  const init = () => {
    if (getSettingValue()) {
      ensureUIWithObserver();
    }
    document.addEventListener('fjTweakerSettingsChanged', handleSettingsChanged);
    window.addEventListener('resize', scheduleRefresh, { passive: true });
    window.addEventListener('scroll', scheduleRefresh, { passive: true });
    window.addEventListener('storage', (event) => {
      if (event.key === SONAR_ACTIVE_KEY && event.newValue === '0') {
        stopSonar();
        stopRadarFlash();
      }
      if (event.key === POTENTIAL_USERS_KEY) {
        renderPotentialList();
      }
    });
    renderPotentialList();
    updateLastScanLabel();
    updateAccountAgeLabels();
    syncRuntimeLoops();
    runRadarPing();
    window.addEventListener('beforeunload', () => {
      stopRadarPingLoop();
      stopStatusTickLoop();
    }, { capture: true });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
