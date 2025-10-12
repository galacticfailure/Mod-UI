(() => {
  const targetHost = 'funnyjunk.com';
  const MODULE_KEY = 'ratetrack';
  const SETTING_KEY = 'trackRates';
  const COUNT_KEY = 'fjTweakerRateCounter';
  const COUNT_EDITS_KEY = 'fjTweakerRateCountEdits';
  const PANEL_POSITION_KEY = 'fjTweakerRatePanelPosition';
  const PANEL_LOCK_KEY = 'fjTweakerRatePanelLocked';
  const SKIN_BUTTON_IDS = ['skinLevel1', 'skinLevel2', 'skinLevel3'];
  const PANEL_MARGIN = 12;
  const QUICK_MENU_ID = 'quickM';
  const QUICK_BUTTON_SELECTOR = '.ctButton4';

  let featureEnabled = true;
  let counterValue = 0;
  let countEditsEnabled = false;
  let panel = null;
  let countDisplay = null;
  let plusButton = null;
  let minusButton = null;
  let resetButton = null;
  let countEditsCheckbox = null;
  let observer = null;
  let panelPosition = null;
  let panelLocked = true;
  let dragState = null;

  const skinButtonHandlers = new Map();
  let quickMenuClickHandler = null;
  const DEDUP_WINDOW_MS = 600;
  let lastRateCountAt = 0;

  const storageAvailable = () => !!(typeof chrome !== 'undefined' && chrome && chrome.storage && chrome.storage.local);
  const storageGet = (keys) => new Promise((resolve) => {
    try {
      if (storageAvailable()) {
        chrome.storage.local.get(keys, (items) => resolve(items || {}));
      } else {
        resolve({});
      }
    } catch (e) { resolve({}); }
  });
  const storageSet = (items) => new Promise((resolve) => {
    try {
      if (storageAvailable()) {
        chrome.storage.local.set(items, () => resolve());
      } else {
        resolve();
      }
    } catch (e) {
      resolve();
    }

  });

  const tryCountRate = () => {
    const now = Date.now();
    if (lastRateCountAt && now - lastRateCountAt < DEDUP_WINDOW_MS) return;
    lastRateCountAt = now;
    adjustCounter(1);
  };

  const getSettingValue = () => {
    const settings = window.fjTweakerSettings || {};
    if (typeof settings[SETTING_KEY] === 'undefined') {
      return true;
    }
    return Boolean(settings[SETTING_KEY]);
  };

  const loadCounter = async () => {
    try {
      const items = await storageGet([COUNT_KEY]);
      const raw = items && items[COUNT_KEY];
      if (typeof raw !== 'undefined' && raw !== null) {
        const parsed = parseInt(String(raw), 10);
        return Number.isFinite(parsed) ? parsed : 0;
      }
    } catch (_) {}
    try {
      const rawLs = localStorage.getItem(COUNT_KEY);
      if (rawLs) {
        const parsed = parseInt(rawLs, 10);
        const safe = Number.isFinite(parsed) ? parsed : 0;
        await storageSet({ [COUNT_KEY]: safe });
        try {
          localStorage.removeItem(COUNT_KEY);
        }
 catch (_) {}
        return safe;
      }
    } catch (_) {}
    return 0;
  };

  const persistCounter = async () => {
    try { await storageSet({ [COUNT_KEY]: String(counterValue) }); } catch (_) {}
  };

  const updateDisplay = () => {
    if (countDisplay) {
      countDisplay.textContent = String(counterValue);
    }
  };

  const setCounter = (value, shouldPersist = true) => {
    counterValue = value;
    updateDisplay();
    if (shouldPersist) {
      persistCounter();
    }
  };

  const adjustCounter = (delta) => {
    setCounter(counterValue + delta);
  };

  const resetCounter = () => {
    setCounter(0);
  };

  const stopPropagation = (event) => {
    event.stopPropagation();
  };

  const loadCountEditsPreference = () => {
    try {
      const raw = localStorage.getItem(COUNT_EDITS_KEY);
      if (!raw) {
        return false;
      }
      return raw === '1' || raw === 'true';
    } catch (error) {
      return false;
    }
  };

  const persistCountEditsPreference = () => {
    try {
      localStorage.setItem(COUNT_EDITS_KEY, countEditsEnabled ? '1' : '0');
    } catch (error) {
    }
  };

  const setCountEditsEnabled = (value, shouldPersist = true) => {
    countEditsEnabled = Boolean(value);
    if (countEditsCheckbox) {
      countEditsCheckbox.checked = countEditsEnabled;
    }
    if (shouldPersist) {
      persistCountEditsPreference();
    }
  };

  const loadPanelPosition = () => {
    try {
      const raw = localStorage.getItem(PANEL_POSITION_KEY);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') {
        return null;
      }
      const left = Number(parsed.left);
      const top = Number(parsed.top);
      if (!Number.isFinite(left) || !Number.isFinite(top)) {
        return null;
      }
      return { left, top };
    } catch (error) {
      return null;
    }
  };

  const persistPanelPosition = () => {
    try {
      if (panelPosition && Number.isFinite(panelPosition.left) && Number.isFinite(panelPosition.top)) {
        localStorage.setItem(PANEL_POSITION_KEY, JSON.stringify(panelPosition));
      } else {
        localStorage.removeItem(PANEL_POSITION_KEY);
      }
    } catch (error) {
    }
  };

  const loadPanelLocked = () => {
    try {
      const raw = localStorage.getItem(PANEL_LOCK_KEY);
      if (raw === null || raw === undefined) return true;
      return raw === '1' || raw === 'true';
    } catch (_) {
      return true;
    }

  };
  const persistPanelLocked = () => {
    try {
      localStorage.setItem(PANEL_LOCK_KEY, panelLocked ? '1' : '0');
    }
 catch (_) {}
  };

  const clampPanelPosition = (left, top) => {
    if (!panel) {
      return { left, top };
    }
    const rect = panel.getBoundingClientRect();
    const fallbackWidth = 96;
    const fallbackHeight = 120;
    const width = rect.width || fallbackWidth;
    const height = rect.height || fallbackHeight;
    if (panelLocked) {
      const minLeft = PANEL_MARGIN;
      const minTop = PANEL_MARGIN;
      const maxLeft = Math.max(minLeft, window.innerWidth - width - PANEL_MARGIN);
      const maxTop = Math.max(minTop, window.innerHeight - height - PANEL_MARGIN);
      const clampedLeft = Math.min(Math.max(left, minLeft), maxLeft);
      const clampedTop = Math.min(Math.max(top, minTop), maxTop);
      return { left: Math.round(clampedLeft), top: Math.round(clampedTop) };
    }
    const { left: scrollLeft, top: scrollTop } = { left: window.scrollX, top: window.scrollY };
    const maxLeft = scrollLeft + Math.max(PANEL_MARGIN, window.innerWidth - width - PANEL_MARGIN);
    const maxTop = scrollTop + Math.max(PANEL_MARGIN, window.innerHeight - height - PANEL_MARGIN);
    const clampedLeft = Math.min(Math.max(left, scrollLeft + PANEL_MARGIN), maxLeft);
    const clampedTop = Math.min(Math.max(top, scrollTop + PANEL_MARGIN), maxTop);
    return {
      left: Math.round(clampedLeft),
      top: Math.round(clampedTop)
    };
  };

  const applyPanelPosition = () => {
    if (!panel) {
      return;
    }
    const rect = panel.getBoundingClientRect();
    const fallbackWidth = 96;
    const fallbackHeight = 120;
    const width = rect.width || fallbackWidth;
    const height = rect.height || fallbackHeight;

    if (!panelPosition) {
      if (panelLocked) {
        panel.style.position = 'fixed';
        panel.style.left = (window.innerWidth - width - PANEL_MARGIN) + 'px';
        panel.style.top = (window.innerHeight - height - PANEL_MARGIN) + 'px';
      } else {
        const defaultLeft = window.scrollX + window.innerWidth - width - PANEL_MARGIN;
        const defaultTop = window.scrollY + window.innerHeight - height - PANEL_MARGIN;
        panelPosition = clampPanelPosition(defaultLeft, defaultTop);
        panel.style.position = 'absolute';
        panel.style.left = panelPosition.left + 'px';
        panel.style.top = panelPosition.top + 'px';
      }
      panel.style.bottom = '';
      panel.style.right = '';
      return;
    }
    panelPosition = clampPanelPosition(panelPosition.left, panelPosition.top);
    if (panelLocked) {
      panel.style.position = 'fixed';
      panel.style.left = panelPosition.left + 'px';
      panel.style.top = panelPosition.top + 'px';
    } else {
      panel.style.position = 'absolute';
      panel.style.left = panelPosition.left + 'px';
      panel.style.top = panelPosition.top + 'px';
    }
    panel.style.bottom = '';
    panel.style.right = '';
  };

  const removeGlobalDragListeners = () => {
    window.removeEventListener('pointermove', handleDragMove);
    window.removeEventListener('pointerup', finishDrag);
    window.removeEventListener('pointercancel', finishDrag);

    window.removeEventListener('touchmove', handleTouchMove);
    window.removeEventListener('touchend', finishTouch);
    window.removeEventListener('touchcancel', finishTouch);
  };

  const handleDragMove = (event) => {
    if (!dragState || event.pointerId !== dragState.pointerId) {
      return;
    }
    stopPropagation(event);
    event.preventDefault();
    let nextLeft, nextTop;
    if (panelLocked) {
      nextLeft = dragState.originLeft + (event.clientX - dragState.startClientX);
      nextTop = dragState.originTop + (event.clientY - dragState.startClientY);
    } else {
      const currentPageX = event.pageX ?? (event.clientX + window.scrollX);
      const currentPageY = event.pageY ?? (event.clientY + window.scrollY);
      nextLeft = dragState.originLeft + (currentPageX - dragState.startPageX);
      nextTop = dragState.originTop + (currentPageY - dragState.startPageY);
    }
    const clamped = clampPanelPosition(nextLeft, nextTop);
    panelPosition = clamped;
    panel.style.left = clamped.left + 'px';
    panel.style.top = clamped.top + 'px';
    panel.style.bottom = '';
    panel.style.right = '';
  };


  const handleTouchMove = (event) => {
    if (!dragState || !event.touches || event.touches.length === 0) {
      return;
    }
    stopPropagation(event);
    event.preventDefault();
    const touch = event.touches[0];
    const currentPageX = touch.pageX;
    const currentPageY = touch.pageY;
    const nextLeft = dragState.originLeft + (currentPageX - dragState.startPageX);
    const nextTop = dragState.originTop + (currentPageY - dragState.startPageY);
    const clamped = clampPanelPosition(nextLeft, nextTop);
    panelPosition = clamped;
    panel.style.left = clamped.left + 'px';
    panel.style.top = clamped.top + 'px';
    panel.style.bottom = '';
    panel.style.right = '';
  };

  const finishDrag = (event) => {
    if (!dragState || (event.pointerId !== undefined && event.pointerId !== dragState.pointerId)) {
      return;
    }
    stopPropagation(event);
    if (panel && typeof panel.releasePointerCapture === 'function' && dragState.pointerId !== undefined) {
      try {
        panel.releasePointerCapture(dragState.pointerId);
      } catch (error) {
      }
    }
    panelPosition = clampPanelPosition(panelPosition.left, panelPosition.top);
    applyPanelPosition();
    removeGlobalDragListeners();
    dragState = null;
    persistPanelPosition();
  };


  const finishTouch = (event) => {
    if (!dragState) {
      return;
    }
    stopPropagation(event);
    panelPosition = clampPanelPosition(panelPosition.left, panelPosition.top);
    applyPanelPosition();
    removeGlobalDragListeners();
    dragState = null;
    persistPanelPosition();
  };

  const startDrag = (event) => {
    if (!panel) {
      return;
    }
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }
    stopPropagation(event);
    event.preventDefault();
    const rect = panel.getBoundingClientRect();
    panel.style.bottom = '';
    panel.style.right = '';
    if (panelLocked) {
      const currentLeft = panelPosition ? panelPosition.left : rect.left;
      const currentTop = panelPosition ? panelPosition.top : rect.top;
      panelPosition = clampPanelPosition(currentLeft, currentTop);
    } else {
      const currentLeft = panelPosition ? panelPosition.left : window.scrollX + rect.left;
      const currentTop = panelPosition ? panelPosition.top : window.scrollY + rect.top;
      panelPosition = clampPanelPosition(currentLeft, currentTop);
    }
    panel.style.left = panelPosition.left + 'px';
    panel.style.top = panelPosition.top + 'px';

    const startPageX = event.pageX ?? (event.clientX + window.scrollX);
    const startPageY = event.pageY ?? (event.clientY + window.scrollY);

    dragState = {
      pointerId: event.pointerId,
      startPageX,
      startPageY,
      startClientX: event.clientX,
      startClientY: event.clientY,
      originLeft: panelPosition.left,
      originTop: panelPosition.top
    };

    if (typeof panel.setPointerCapture === 'function' && dragState.pointerId !== undefined) {
      try {
        panel.setPointerCapture(dragState.pointerId);
      } catch (error) {
      }
    }

    window.addEventListener('pointermove', handleDragMove, { passive: false });
    window.addEventListener('pointerup', finishDrag);
    window.addEventListener('pointercancel', finishDrag);
    

    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', finishTouch);
    window.addEventListener('touchcancel', finishTouch);
  };


  const startTouchDrag = (event) => {
    if (!panel || !event.touches || event.touches.length === 0) {
      return;
    }
    stopPropagation(event);
    event.preventDefault();
    
    const touch = event.touches[0];
    const rect = panel.getBoundingClientRect();
    panel.style.bottom = '';
    panel.style.right = '';
    const currentLeft = panelPosition ? panelPosition.left : window.scrollX + rect.left;
    const currentTop = panelPosition ? panelPosition.top : window.scrollY + rect.top;
    panelPosition = clampPanelPosition(currentLeft, currentTop);
    panel.style.left = panelPosition.left + 'px';
    panel.style.top = panelPosition.top + 'px';

    const startPageX = touch.pageX;
    const startPageY = touch.pageY;

    dragState = {
      pointerId: 'touch',
      startPageX,
      startPageY,
      originLeft: panelPosition.left,
      originTop: panelPosition.top
    };

    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', finishTouch);
    window.addEventListener('touchcancel', finishTouch);
  };

  const ensurePanel = () => {
    if (panel) {
      return;
    }

    panelPosition = loadPanelPosition();

    panel = document.createElement('div');
    panel.id = 'fj-rate-menu';
    Object.assign(panel.style, {
      position: 'absolute',
      bottom: 'auto',
      top: 'auto',
      right: 'auto',
      left: 'auto',
      width: '96px',
      padding: '6px',
      background: '#0d0d0d',
      color: '#f6f6f6',
      border: '1px solid #333',
      borderRadius: '3px',
      boxShadow: '0 3px 12px rgba(0, 0, 0, 0.45)',
      font: "500 9px 'Segoe UI', sans-serif",
      display: 'none',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '4px',
      zIndex: '2147483646',
      touchAction: 'none'
    });

    ['pointerdown', 'mousedown', 'click'].forEach((eventName) => {
      panel.addEventListener(eventName, stopPropagation);
    });

    const header = document.createElement('div');
    Object.assign(header.style, {
      alignSelf: 'stretch',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottom: '1px solid #1f1f1f',
      padding: '1px 0',
      gap: '4px'
    });

    const dragHandle = document.createElement('div');
    Object.assign(dragHandle.style, {
      cursor: 'move',
      fontSize: '7px',
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: '#a5a5a5',
      userSelect: 'none',
      touchAction: 'none',
      flex: '1 1 auto'
    });
    dragHandle.textContent = 'Drag';
    dragHandle.addEventListener('pointerdown', startDrag, { passive: false });
    dragHandle.addEventListener('touchstart', startTouchDrag, { passive: false });

    const lockButton = document.createElement('button');
    Object.assign(lockButton.style, {
      width: '18px',
      height: '18px',
      lineHeight: '18px',
      textAlign: 'center',
      fontSize: '10px',
      border: '1px solid #2f2f2f',
      borderRadius: '3px',
      cursor: 'pointer',
      flex: '0 0 auto'
    });
    const applyLockButtonUI = () => {
      if (panelLocked) {
        lockButton.textContent = '🔒︎';
        lockButton.style.background = '#142a14';
        lockButton.style.color = '#66cc66';
        lockButton.title = 'Locked to screen (toggle)';
      } else {
        lockButton.textContent = '🔓︎';
        lockButton.style.background = '#2a1515';
        lockButton.style.color = '#dd6666';
        lockButton.title = 'Moves with page (toggle)';
      }
    };
    lockButton.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      const scrollLeft = window.scrollX, scrollTop = window.scrollY;
      if (!panelPosition) {
        const rect2 = panel.getBoundingClientRect();
        panelPosition = panelLocked ? { left: rect2.left, top: rect2.top } : { left: rect2.left + scrollLeft, top: rect2.top + scrollTop };
      } else {
        panelPosition = panelLocked
          ? { left: panelPosition.left + scrollLeft, top: panelPosition.top + scrollTop }
          : { left: panelPosition.left - scrollLeft, top: panelPosition.top - scrollTop };
      }
      panelLocked = !panelLocked;
      persistPanelLocked();
      applyLockButtonUI();
      applyPanelPosition();
      persistPanelPosition();
    });

    panelLocked = loadPanelLocked();
    applyLockButtonUI();

    header.append(dragHandle, lockButton);
    panel.append(header);

    countDisplay = document.createElement('div');
    Object.assign(countDisplay.style, {
      fontSize: '16px',
      fontWeight: '700',
      lineHeight: '1',
      textAlign: 'center'
    });
    panel.append(countDisplay);

    const adjustRow = document.createElement('div');
    adjustRow.style.display = 'flex';
    adjustRow.style.gap = '4px';
    adjustRow.style.justifyContent = 'center';

    const createAdjustButton = (text) => {
      const button = document.createElement('button');
      button.textContent = text;
      Object.assign(button.style, {
        minWidth: '44px',
        minHeight: '44px',
        width: '44px',
        height: '44px',
        fontSize: '16px',
        fontWeight: '600',
        color: '#f8f8f8',
        background: '#1c1c1c',
        border: '1px solid #2f2f2f',
        borderRadius: '3px',
        cursor: 'pointer',
        touchAction: 'manipulation',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      });
      button.addEventListener('click', stopPropagation);
      return button;
    };

    minusButton = createAdjustButton('-');
    plusButton = createAdjustButton('+');

    minusButton.addEventListener('click', () => {
      adjustCounter(-1);
    });

    plusButton.addEventListener('click', () => {
      adjustCounter(1);
    });

    adjustRow.append(minusButton, plusButton);
    panel.append(adjustRow);

    resetButton = document.createElement('button');
    resetButton.textContent = 'Reset';
    Object.assign(resetButton.style, {
      width: '100%',
      minHeight: '44px',
      padding: '8px 5px',
      fontSize: '12px',
      fontWeight: '600',
      color: '#ffaa00',
      background: '#161616',
      border: '1px solid #332200',
      borderRadius: '3px',
      cursor: 'pointer',
      touchAction: 'manipulation'
    });
    resetButton.addEventListener('click', (event) => {
      stopPropagation(event);
      resetCounter();
    });

    panel.append(resetButton);

    const countEditsRow = document.createElement('label');
    countEditsRow.style.display = 'flex';
    countEditsRow.style.alignItems = 'center';
    countEditsRow.style.gap = '4px';
    countEditsRow.style.width = '100%';
    countEditsRow.style.cursor = 'pointer';
    countEditsRow.style.fontSize = '8px';

    countEditsCheckbox = document.createElement('input');
    countEditsCheckbox.type = 'checkbox';
    countEditsCheckbox.style.width = '10px';
    countEditsCheckbox.style.height = '10px';
    countEditsCheckbox.checked = countEditsEnabled;

    countEditsCheckbox.addEventListener('click', stopPropagation);
    countEditsCheckbox.addEventListener('change', (event) => {
      setCountEditsEnabled(event.target.checked);
    });

    const countEditsLabel = document.createElement('span');
    countEditsLabel.textContent = 'Count Edits';

    countEditsRow.append(countEditsCheckbox, countEditsLabel);
    panel.append(countEditsRow);

    document.body.append(panel);
    applyPanelPosition();
  };

  const updatePanelVisibility = () => {
  const updatePanelVisibility = () => {
    if (!panel) {
      return;
    }
    
    const slickModule = window.fjTweakerModules && window.fjTweakerModules.slick;
    
    if (featureEnabled) {
      applyPanelPosition();
      if (slickModule && slickModule.openRateCounter) {
        slickModule.openRateCounter(panel);
      } else {
        panel.style.display = 'flex';
      }
    } else {
      if (slickModule && slickModule.closeRateCounter) {
        slickModule.closeRateCounter(panel);
      } else {
        panel.style.display = 'none';
      }
    }
  };
  };

  const getRatedByAnchor = (originButton) => {
    let scope = null;
    if (originButton && typeof originButton.closest === 'function') {
      scope = originButton.closest('#catControls') || originButton.closest('.catControlsCon') || originButton.closest('#cControlsCon');
    }
    if (!scope) {
      scope = document.getElementById('catControls');
    }
    if (!scope) {
      return null;
    }
    return scope.querySelector('span.ratedBy a.uName');
  };

  const getRatedByUsername = (originButton) => {
    const anchor = getRatedByAnchor(originButton);
    if (!anchor) {
      return null;
    }
    const text = anchor.textContent || '';
    const normalized = text.trim();
    return normalized || null;
  };

  const getLoggedInUsername = () => {
    const anchor = document.querySelector('a.tMen.tProf[title="My Profile"]');
    if (!anchor) {
      return null;
    }
    const text = anchor.textContent || '';
    const normalized = text.trim();
    return normalized || null;
  };

  const shouldCountForClick = (originButton) => {
    const ratedByUsername = getRatedByUsername(originButton);
    if (!countEditsEnabled) {
      return !ratedByUsername;
    }
    if (!ratedByUsername) {
      return true;
    }
    const currentUser = getLoggedInUsername();
    if (!currentUser) {
      return true;
    }
    return ratedByUsername.toLowerCase() !== currentUser.toLowerCase();
  };

  const isSkinSelectionActive = (originButton) => {
    if (originButton && typeof originButton.closest === 'function') {
      const rateBox = originButton.closest('#rateBoxButtons');
      if (rateBox) {
        return Boolean(rateBox.querySelector('span.skinB.nsfwBg'));
      }
    }
    return SKIN_BUTTON_IDS.some((id) => {
      const button = document.getElementById(id);
      return button && button.classList.contains('nsfwBg');
    });
  };

  const handleSkinButtonClick = (button) => {
    if (!featureEnabled) {
      return;
    }
    if (isSkinSelectionActive(button)) {
      return;
    }
    if (!shouldCountForClick(button)) {
      return;
    }
    tryCountRate();
  };

  const ensureSkinButtonsBound = () => {
    SKIN_BUTTON_IDS.forEach((id) => {
      const button = document.getElementById(id);
      const binding = skinButtonHandlers.get(id);

      if (!button) {
        if (binding) {
          binding.element.removeEventListener('click', binding.handler, true);
          skinButtonHandlers.delete(id);
        }
        return;
      }

      if (binding && binding.element === button) {
        return;
      }

      if (binding) {
        binding.element.removeEventListener('click', binding.handler, true);
      }

      const handler = (event) => {
        if (!event || event.isTrusted === false) return;
        handleSkinButtonClick(event.currentTarget);
      };

      button.addEventListener('click', handler, true);
      skinButtonHandlers.set(id, { element: button, handler });
    });
  };

  const detachSkinButtons = () => {
    skinButtonHandlers.forEach((binding) => {
      binding.element.removeEventListener('click', binding.handler, true);
    });
    skinButtonHandlers.clear();
  };

  const findQuickButtonForDigit = (digit) => {
    try {
      const quickMenu = document.getElementById(QUICK_MENU_ID);
      if (!quickMenu) return null;
      const buttons = quickMenu.querySelectorAll(QUICK_BUTTON_SELECTOR);
      for (const b of buttons) {
        const sk = b.querySelector('.shortKey');
        if (sk && (sk.textContent || '').trim() === String(digit)) return b;
      }
    } catch (error) {
    }
    return null;
  };

  const handleQuickMenuClick = (event) => {
    if (!featureEnabled) return;
    if (!event || event.isTrusted === false) return;
    const settings = window.fjTweakerSettings || {};
    if (settings.hideRateShortcuts) return;
    const target = event.target && event.target.closest ? event.target.closest(QUICK_BUTTON_SELECTOR) : null;
    if (!target) return;
    if (!shouldCountForClick(target)) return;
    tryCountRate();
  };

  const observeContent = () => {
    if (observer || !document.body) {
      return;
    }

    observer = new MutationObserver(() => {
      ensureSkinButtonsBound();
    });

    observer.observe(document.body, { childList: true, subtree: true });
  };

  const stopObserving = () => {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  };

  const applySetting = (enabled) => {
    featureEnabled = enabled;

    ensurePanel();
    updatePanelVisibility();

    if (featureEnabled) {
      ensureSkinButtonsBound();
      observeContent();
      if (!quickMenuClickHandler) {
        quickMenuClickHandler = handleQuickMenuClick;
        const quickMenu = document.getElementById(QUICK_MENU_ID);
        if (quickMenu) quickMenu.addEventListener('click', quickMenuClickHandler, true);
        else {
          const attachQuickObserver = new MutationObserver(() => {
            const qm = document.getElementById(QUICK_MENU_ID);
            if (qm) {
              qm.addEventListener('click', quickMenuClickHandler, true);
              attachQuickObserver.disconnect();
            }
          });
          if (document.body) attachQuickObserver.observe(document.body, { childList: true, subtree: true });
        }
      }
    } else {
      stopObserving();
      detachSkinButtons();
      try {
        const quickMenu = document.getElementById(QUICK_MENU_ID);
        if (quickMenu && quickMenuClickHandler) quickMenu.removeEventListener('click', quickMenuClickHandler, true);
      } catch (error) {}
      quickMenuClickHandler = null;
    }
  };

  const handleSettingsChanged = (event) => {
    const detail = event.detail || {};
    if (typeof detail[SETTING_KEY] === 'undefined') {
      return;
    }
    applySetting(Boolean(detail[SETTING_KEY]));
  };

  const init = () => {
    if (window.location.hostname !== targetHost) {
      return;
    }

    ensurePanel();
    (async () => {
      const loaded = await loadCounter();
      setCounter(loaded, false);
    })();
    setCountEditsEnabled(loadCountEditsPreference(), false);
    applySetting(getSettingValue());
    document.addEventListener('fjTweakerSettingsChanged', handleSettingsChanged);
  };

  if (!window.fjTweakerModules) {
    window.fjTweakerModules = {};
  }

  window.fjTweakerModules[MODULE_KEY] = { init };
})();
