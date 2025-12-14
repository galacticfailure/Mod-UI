(() => {
  /*
   * Rate counter widget.
   * Tracks how many pieces of content you've rated, keeps a draggable
   * floating panel, and syncs edits with chrome.storage/localStorage.
   */
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

  // Normalized scroll offsets so dragging works in every browser quirk mode
  const getScrollOffsets = () => ({
    left: window.pageXOffset || document.documentElement.scrollLeft || document.body.scrollLeft || 0,
    top: window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0
  });

  // Converts pointer positions into absolute page coordinates
  const getPagePosition = (event) => {
    const { left, top } = getScrollOffsets();
    return {
      x: event.pageX !== undefined ? event.pageX : event.clientX + left,
      y: event.pageY !== undefined ? event.pageY : event.clientY + top
    };
  };

  let featureEnabled = true;
  let counterValue = 0;
  let countEditsEnabled = false;
  let panel = null;
  let countDisplay = null;
  let countInput = null;
  let lockButton = null;
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
  let quickKeydownHandler = null;
  let customShortcutEventListener = null;

  const DEDUP_WINDOW_MS = 600;
  let lastRateCountAt = 0;

  // chrome.storage helpers keep counter synced across tabs while falling back gracefully
  const storageAvailable = () => !!(typeof chrome !== 'undefined' && chrome && chrome.storage && chrome.storage.local);
  const storageGet = (keys) => new Promise((resolve) => {
    try {
      if (storageAvailable()) {
        chrome.storage.local.get(keys, (items) => resolve(items || {}));
      } else {
        resolve({});
      }
    } catch (e) {
      resolve({});
    }
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

  // Prevent accidental double counts when shortcut + click fire together.
  // Avoid double increments when quick rate + keyboard fire within a heartbeat
  const tryCountRate = () => {
    const now = Date.now();
    if (lastRateCountAt && now - lastRateCountAt < DEDUP_WINDOW_MS) {
      return;
    }
    lastRateCountAt = now;
    adjustCounter(1);
  };

  // Default to enabled unless the settings object explicitly disables us
  const getSettingValue = () => {
    const settings = window.fjTweakerSettings || {};
    if (typeof settings[SETTING_KEY] === 'undefined') {
      return true;
    }
    return Boolean(settings[SETTING_KEY]);
  };

  // Pull persisted counter from chrome.storage, migrating old localStorage values once
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
        try {
          await storageSet({ [COUNT_KEY]: safe });
          try {
            localStorage.removeItem(COUNT_KEY);
          }
 catch (_) {}
        } catch (_) {}
        return safe;
      }
    } catch (_) {}

    return 0;
  };

  // Store the latest value asynchronously; failure is non-fatal
  const persistCounter = async () => {
    try {
      await storageSet({ [COUNT_KEY]: String(counterValue) });
    } catch (error) {
    }
  };

  // Syncs the large number in the panel with the tracked value
  const updateDisplay = () => {
    if (countDisplay) {
      countDisplay.textContent = String(counterValue);
    }
  };

  // Helper for applying new values, optionally skipping persistence during init
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

  let isEditingCounter = false;

  // Sanitizes manual text entry to keep the counter numeric
  const parseManualCountInput = (raw) => {
    if (typeof raw !== 'string') {
      return null;
    }
    const trimmed = raw.trim();
    if (!trimmed) {
      return null;
    }
    if (!/^-?\d+$/.test(trimmed)) {
      return null;
    }
    const parsed = parseInt(trimmed, 10);
    return Number.isFinite(parsed) ? parsed : null;
  };

  // Visual feedback for invalid manual entries
  const setCounterInputInvalid = (invalid) => {
    if (!countInput) {
      return;
    }
    countInput.style.borderColor = invalid ? '#dd6666' : 'rgba(255, 255, 255, 0.25)';
  };

  const focusCounterInput = () => {
    if (!countInput) {
      return;
    }
    requestAnimationFrame(() => {
      countInput.focus();
      countInput.select();
    });
  };

  // Applies manual edits, refusing to commit invalid strings
  const applyCounterInput = () => {
    if (!countInput) {
      return false;
    }
    const parsed = parseManualCountInput(countInput.value);
    if (parsed === null) {
      setCounterInputInvalid(true);
      focusCounterInput();
      return false;
    }
    setCounter(parsed);
    setCounterInputInvalid(false);
    return true;
  };

  // Leaves edit mode either committing or reverting the current field value
  const exitCounterEditMode = (shouldApply) => {
    if (!countInput || !isEditingCounter) {
      return;
    }
    if (shouldApply) {
      if (!applyCounterInput()) {
        return;
      }
    } else {
      countInput.value = String(counterValue);
      setCounterInputInvalid(false);
    }
    isEditingCounter = false;
    countInput.style.display = 'none';
    if (countDisplay) {
      countDisplay.style.display = '';
    }
  };

  // Swap display text for an input so mods can type the exact count
  const enterCounterEditMode = () => {
    if (!countInput || isEditingCounter) {
      return;
    }
    isEditingCounter = true;
    countInput.value = String(counterValue);
    setCounterInputInvalid(false);
    if (countDisplay) {
      countDisplay.style.display = 'none';
    }
    countInput.style.display = 'block';
    focusCounterInput();
  };

  const stopPropagation = (event) => {
    event.stopPropagation();
  };

  // Remembers whether edit-rate clicks should count toward totals
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

  // Keeps checkbox, state, and storage aligned for the edit-counting option
  const setCountEditsEnabled = (value, shouldPersist = true) => {
    countEditsEnabled = Boolean(value);
    if (countEditsCheckbox) {
      countEditsCheckbox.checked = countEditsEnabled;
    }
    if (shouldPersist) {
      persistCountEditsPreference();
    }
  };

  // Restores last drag position so the widget stays where the mod left it
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

  // Locked panels stay fixed to the viewport while unlocked ones scroll
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
    } catch (_) {}
  };

  // Ensures we never drag the panel entirely off-screen regardless of mode
  const clampPanelPosition = (left, top) => {
    if (!panel) {
      return { left, top };
    }
    const rect = panel.getBoundingClientRect();
    const fallbackWidth = 180;
    const fallbackHeight = 210;
    const width = rect.width || fallbackWidth;
    const height = rect.height || fallbackHeight;
    const { left: scrollLeft, top: scrollTop } = getScrollOffsets();
    if (panelLocked) {
      const maxLeft = Math.max(PANEL_MARGIN, window.innerWidth - width - PANEL_MARGIN);
      const maxTop = Math.max(PANEL_MARGIN, window.innerHeight - height - PANEL_MARGIN);
      const clampedLeft = Math.min(Math.max(left, PANEL_MARGIN), maxLeft);
      const clampedTop = Math.min(Math.max(top, PANEL_MARGIN), maxTop);
      return { left: Math.round(clampedLeft), top: Math.round(clampedTop) };
    }
    const maxLeft = scrollLeft + Math.max(PANEL_MARGIN, window.innerWidth - width - PANEL_MARGIN);
    const maxTop = scrollTop + Math.max(PANEL_MARGIN, window.innerHeight - height - PANEL_MARGIN);
    const clampedLeft = Math.min(Math.max(left, scrollLeft + PANEL_MARGIN), maxLeft);
    const clampedTop = Math.min(Math.max(top, scrollTop + PANEL_MARGIN), maxTop);
    return {
      left: Math.round(clampedLeft),
      top: Math.round(clampedTop)
    };
  };

  // Applies either the saved location or a smart default depending on lock state
  const applyPanelPosition = () => {
    if (!panel) {
      return;
    }
    if (!panelPosition) {
      if (panelLocked) {
        panel.style.position = 'fixed';
        panel.style.left = '';
        panel.style.top = '';
        panel.style.bottom = PANEL_MARGIN + 'px';
        panel.style.right = PANEL_MARGIN + 'px';
      } else {
        const { left: scrollLeft, top: scrollTop } = getScrollOffsets();
        const rect = panel.getBoundingClientRect();
        const width = rect.width || 180;
        const height = rect.height || 210;
        const defaultLeft = scrollLeft + Math.max(PANEL_MARGIN, window.innerWidth - width - PANEL_MARGIN);
        const defaultTop = scrollTop + Math.max(PANEL_MARGIN, window.innerHeight - height - PANEL_MARGIN);
        panelPosition = clampPanelPosition(defaultLeft, defaultTop);
        panel.style.position = 'absolute';
        panel.style.left = panelPosition.left + 'px';
        panel.style.top = panelPosition.top + 'px';
        panel.style.bottom = '';
        panel.style.right = '';
      }
      return;
    }
    const clamped = clampPanelPosition(panelPosition.left, panelPosition.top);
    panelPosition = clamped;
    if (panelLocked) {
      panel.style.position = 'fixed';
      panel.style.left = clamped.left + 'px';
      panel.style.top = clamped.top + 'px';
      panel.style.bottom = '';
      panel.style.right = '';
    } else {
      panel.style.position = 'absolute';
      panel.style.left = clamped.left + 'px';
      panel.style.top = clamped.top + 'px';
      panel.style.bottom = '';
      panel.style.right = '';
    }
  };

  const removeGlobalDragListeners = () => {
    window.removeEventListener('pointermove', handleDragMove);
    window.removeEventListener('pointerup', finishDrag);
    window.removeEventListener('pointercancel', finishDrag);
  };

  // Moves the panel with pointer events, respecting absolute vs fixed logic
  const handleDragMove = (event) => {
    if (!dragState || event.pointerId !== dragState.pointerId) {
      return;
    }
    stopPropagation(event);
    let nextLeft, nextTop;
    if (panelLocked) {
      nextLeft = dragState.originLeft + (event.clientX - dragState.startClientX);
      nextTop = dragState.originTop + (event.clientY - dragState.startClientY);
    } else {
      const { x, y } = getPagePosition(event);
      nextLeft = dragState.originLeft + (x - dragState.startPageX);
      nextTop = dragState.originTop + (y - dragState.startPageY);
    }
    const clamped = clampPanelPosition(nextLeft, nextTop);
    panelPosition = clamped;
    if (panelLocked) {
      panel.style.position = 'fixed';
      panel.style.left = clamped.left + 'px';
      panel.style.top = clamped.top + 'px';
    } else {
      panel.style.position = 'absolute';
      panel.style.left = clamped.left + 'px';
      panel.style.top = clamped.top + 'px';
    }
    panel.style.bottom = '';
    panel.style.right = '';
  };

  // Finalizes drag, releases captures, and persists the resulting position
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

  // Begins pointer-based dragging from the header grip area
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
    const { left: scrollLeft, top: scrollTop } = getScrollOffsets();
    if (panelLocked) {
      const initialLeft = panelPosition ? panelPosition.left : rect.left;
      const initialTop = panelPosition ? panelPosition.top : rect.top;
      panelPosition = clampPanelPosition(initialLeft, initialTop);
      panel.style.position = 'fixed';
      panel.style.left = panelPosition.left + 'px';
      panel.style.top = panelPosition.top + 'px';
    } else {
      const initialLeft = panelPosition ? panelPosition.left : rect.left + scrollLeft;
      const initialTop = panelPosition ? panelPosition.top : rect.top + scrollTop;
      panelPosition = clampPanelPosition(initialLeft, initialTop);
      panel.style.position = 'absolute';
      panel.style.left = panelPosition.left + 'px';
      panel.style.top = panelPosition.top + 'px';
    }

    const startPosition = getPagePosition(event);

    dragState = {
      pointerId: event.pointerId,
      startPageX: startPosition.x,
      startPageY: startPosition.y,
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

    window.addEventListener('pointermove', handleDragMove);
    window.addEventListener('pointerup', finishDrag);
    window.addEventListener('pointercancel', finishDrag);
  };

  // Lazily constructs the floating panel UI plus its controls
  const ensurePanel = () => {
    if (panel) {
      return;
    }

    panelPosition = loadPanelPosition();

    panel = document.createElement('div');
    panel.id = 'fj-rate-menu';
    Object.assign(panel.style, {
      position: 'fixed',
      bottom: PANEL_MARGIN + 'px',
      top: 'auto',
      right: PANEL_MARGIN + 'px',
      width: '180px',
      padding: '12px',
      background: '#0d0d0d',
      color: '#f6f6f6',
      border: '1px solid #333',
      borderRadius: '6px',
      boxShadow: '0 6px 18px rgba(0, 0, 0, 0.45)',
      font: "500 15px 'Segoe UI', sans-serif",
      display: 'none',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '10px',
      zIndex: '2147483646'
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
      padding: '2px 0',
      gap: '8px'
    });

    const dragHandle = document.createElement('div');
    Object.assign(dragHandle.style, {
      cursor: 'move',
      fontSize: '11px',
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: '#a5a5a5',
      userSelect: 'none',
      flex: '1 1 auto'
    });
    dragHandle.textContent = 'Drag';
    dragHandle.addEventListener('pointerdown', startDrag);

    lockButton = document.createElement('button');
    Object.assign(lockButton.style, {
      width: '24px',
      height: '24px',
      lineHeight: '24px',
      textAlign: 'center',
      fontSize: '14px',
      border: '1px solid #2f2f2f',
      borderRadius: '4px',
      cursor: 'pointer',
      flex: '0 0 auto'
    });
    const applyLockButtonUI = () => {
      if (!lockButton) return;
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
      
      const { left: scrollLeft, top: scrollTop } = getScrollOffsets();
      if (!panelPosition) {
        
        const rect = panel.getBoundingClientRect();
        panelPosition = panelLocked ? { left: rect.left, top: rect.top } : { left: rect.left + scrollLeft, top: rect.top + scrollTop };
      } else {
        if (panelLocked) {
          
          panelPosition = { left: panelPosition.left + scrollLeft, top: panelPosition.top + scrollTop };
        } else {
          
          panelPosition = { left: panelPosition.left - scrollLeft, top: panelPosition.top - scrollTop };
        }
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

    const countWrapper = document.createElement('div');
    Object.assign(countWrapper.style, {
      width: '100%',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '42px',
      position: 'relative'
    });

    countDisplay = document.createElement('div');
    Object.assign(countDisplay.style, {
      fontSize: '32px',
      fontWeight: '700',
      lineHeight: '1',
      textAlign: 'center',
      cursor: 'pointer',
      width: '100%'
    });
    countDisplay.title = 'Click to set value';
    countDisplay.addEventListener('click', (event) => {
      stopPropagation(event);
      enterCounterEditMode();
    });

    countInput = document.createElement('input');
    countInput.type = 'text';
    countInput.inputMode = 'numeric';
    countInput.pattern = '-?[0-9]*';
    countInput.autocomplete = 'off';
    countInput.spellcheck = false;
    Object.assign(countInput.style, {
      display: 'none',
      width: '100%',
      fontSize: '32px',
      fontWeight: '700',
      lineHeight: '1',
      textAlign: 'center',
      background: 'rgba(0, 0, 0, 0)',
      color: '#f6f6f6',
      border: '1px solid rgba(255, 255, 255, 0.25)',
      borderRadius: '4px',
      padding: '2px',
      outline: 'none'
    });
    countInput.addEventListener('click', stopPropagation);
    countInput.addEventListener('pointerdown', stopPropagation);
    countInput.addEventListener('keydown', (event) => {
      stopPropagation(event);
      if (event.key === 'Enter') {
        event.preventDefault();
        exitCounterEditMode(true);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        exitCounterEditMode(false);
      }
    });
    countInput.addEventListener('blur', () => {
      exitCounterEditMode(true);
    });
    countInput.addEventListener('input', () => {
      setCounterInputInvalid(false);
    });

    countWrapper.append(countDisplay, countInput);
    panel.append(countWrapper);

    const adjustRow = document.createElement('div');
    adjustRow.style.display = 'flex';
    adjustRow.style.gap = '10px';
    adjustRow.style.justifyContent = 'center';

    const createAdjustButton = (text) => {
      const button = document.createElement('button');
      button.textContent = text;
      Object.assign(button.style, {
        width: '48px',
        height: '36px',
        fontSize: '20px',
        fontWeight: '600',
        color: '#f8f8f8',
        background: '#1c1c1c',
        border: '1px solid #2f2f2f',
        borderRadius: '4px',
        cursor: 'pointer'
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
      padding: '6px 8px',
      fontSize: '14px',
      fontWeight: '600',
      color: '#ffaa00',
      background: '#161616',
      border: '1px solid #332200',
      borderRadius: '4px',
      cursor: 'pointer'
    });
    resetButton.addEventListener('click', (event) => {
      stopPropagation(event);
      resetCounter();
    });

    panel.append(resetButton);

    const countEditsRow = document.createElement('label');
    countEditsRow.style.display = 'flex';
    countEditsRow.style.alignItems = 'center';
    countEditsRow.style.gap = '8px';
    countEditsRow.style.width = '100%';
    countEditsRow.style.cursor = 'pointer';
    countEditsRow.style.fontSize = '13px';

    countEditsCheckbox = document.createElement('input');
    countEditsCheckbox.type = 'checkbox';
    countEditsCheckbox.style.width = '16px';
    countEditsCheckbox.style.height = '16px';
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

  // Delegates to slick animations when available, otherwise toggles display
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

  // Walks DOM around the clicked button to find the "rated by" username link
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

  // Edit-count setting lets mods skip increments when it was their own rate
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

  // Avoid double counting NSFW rates when the selector already lit up
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

  // Central handler for the three skin buttons feeding the counter
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

  // All three NSFW buttons feed into the same counter logic.
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
        if (!event || event.isTrusted === false) {
          return;
        }
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

  // Matches quick-menu hotkeys to the rendered buttons for keyboard support
  const findQuickButtonForDigit = (digit) => {
    try {
      const quickMenu = document.getElementById(QUICK_MENU_ID);
      if (!quickMenu) return null;
      const buttons = quickMenu.querySelectorAll(QUICK_BUTTON_SELECTOR);
      for (const b of buttons) {
        const sk = b.querySelector('.shortKey');
        if (sk && (sk.textContent || '').trim() === String(digit)) {
          return b;
        }
      }
    } catch (error) {
    }
    return null;
  };

  // Captures quick-menu clicks before site handlers so we can count them
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

  // Allows 1-9 keys (desktop or numpad) to count if shortcuts are visible
  const handleQuickKeydown = (event) => {
    if (!featureEnabled) return;
    if (!event || event.isTrusted === false) return;

    const settings = window.fjTweakerSettings || {};
    if (settings.hideRateShortcuts) return;

    const active = document.activeElement;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) return;

    if (event.altKey || event.ctrlKey || event.metaKey) return;

    let digit = null;
    const key = event.key;
    const code = event.code || '';
    if (/^[1-9]$/.test(key)) digit = key;
    else {
      const m = code.match(/^Numpad([1-9])$/);
      if (m) digit = m[1];
    }
    if (!digit) return;

    const button = findQuickButtonForDigit(digit);
    if (!button) return;

    if (!shouldCountForClick(button)) return;
    tryCountRate();
  };

  // MutationObserver keeps button bindings alive while the site reloads markup
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

  // Turns the whole feature on/off and hooks all relevant event sources
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
        if (quickMenu) {
          quickMenu.addEventListener('click', quickMenuClickHandler, true);
        } else {
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

      if (!quickKeydownHandler) {
        quickKeydownHandler = handleQuickKeydown;
        document.addEventListener('keydown', quickKeydownHandler, true);
      }

      if (!customShortcutEventListener) {
        customShortcutEventListener = (event) => {
          if (!featureEnabled || !event || !event.detail) {
            return;
          }
          let { button, slot } = event.detail;
          if (!button || typeof button.matches !== 'function') {
            const slotNumber = Number(slot);
            if (Number.isFinite(slotNumber) && slotNumber > 0) {
              button = document.querySelector(`.ctButton4.desktopRate[data-sccustom-slot="${slotNumber}"]`) ||
                       document.querySelector(`.ctButton4.mobQuickRate[data-sccustom-slot="${slotNumber}"]`);
            }
            if (!button || typeof button.matches !== 'function') {
              return;
            }
          }
          if (!shouldCountForClick(button)) {
            return;
          }
          tryCountRate();
        };
        window.addEventListener('fjCustomShortcutTriggered', customShortcutEventListener, true);
      }
    } else {
      stopObserving();
      detachSkinButtons();
      try {
        const quickMenu = document.getElementById(QUICK_MENU_ID);
        if (quickMenu && quickMenuClickHandler) {
          quickMenu.removeEventListener('click', quickMenuClickHandler, true);
        }
      } catch (error) {
      }
      quickMenuClickHandler = null;

      if (quickKeydownHandler) {
        document.removeEventListener('keydown', quickKeydownHandler, true);
        quickKeydownHandler = null;
      }

      if (customShortcutEventListener) {
        window.removeEventListener('fjCustomShortcutTriggered', customShortcutEventListener, true);
        customShortcutEventListener = null;
      }
    }
  };

  const handleSettingsChanged = (event) => {
    const detail = event.detail || {};
    if (typeof detail[SETTING_KEY] === 'undefined') {
      return;
    }
    applySetting(Boolean(detail[SETTING_KEY]));
  };

  // Bootstraps: load counts, honor prefs, and listen for setting toggles
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
