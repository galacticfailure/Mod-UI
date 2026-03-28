(() => {
  const targetHost = 'funnyjunk.com';
  const MODULE_KEY = 'workingPrev';
  const SETTING_KEY = 'workingPrev';
  const HISTORY_KEY = 'fjTweakerPrevHistory';
  const STATE_KEY = 'fjTweakerPrevState';
  const MAX_HISTORY = 50;
  const OPEN_TABS_KEY = 'fjTweakerPrevActiveTabs';
  const OPEN_TAB_TTL = 1000 * 60 * 10;
  const OPEN_TAB_RENEW_INTERVAL = 60000;
  const TAB_TOKEN = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  const LIST_STAGE = {
    ACTIVE: 'active',
    WAITING: 'waitingFirstHop',
    ARMED: 'armed',
    EXPIRED: 'expired'
  };
  const PREV_SELECTORS = ['#cFP', '.cFP', '#prevBig', '.prevBig', '.additionNav .vvl a[rel="prev"]'];
  const NEXT_SELECTORS = ['#cFN', '.cFN', '#nextBig', '.nextBig', '.additionNav .vvr a[rel="next"]'];
  const CONTENT_MARKERS = ['id="cFN"', 'class="nextL"', 'id="prevBig"'];

  let enabled = false;
  let history = [];
  let listState = { active: false, index: null, url: null, stage: LIST_STAGE.EXPIRED };
  let isContentView = false;
  let currentUrl = '';
  let unloadHandled = false;
  let mutationObserver = null;
  let observerRefreshScheduled = false;
  let navigationLock = false;
  let pendingListNavigation = false;
  const availabilityCache = new Map();
  let tabPresenceRegistered = false;
  let openTabRenewTimer = null;
  let openTabsSnapshot = {};
  let skipHistoryBecauseRestored = false;
  const isRuntimeFlagEnabled = (flagName, fallback = true) => {
    try {
      return window.fjfeRuntimeFlags?.isEnabled
        ? window.fjfeRuntimeFlags.isEnabled(flagName, fallback)
        : fallback;
    } catch (_) {
      return fallback;
    }
  };

  const normalizeContentUrl = (raw) => {
    try {
      const url = new URL(raw, window.location.origin);
      let pathname = url.pathname || '/';
      if (!pathname.endsWith('/')) pathname += '/';
      return `${url.origin}${pathname}`;
    } catch (_) {
      return '';
    }
  };

  const isTypingTarget = (node) => {
    if (!node) return false;
    const tag = (node.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea') return true;
    return Boolean(node.isContentEditable);
  };

  const detectContentView = () => {
    return Boolean(document.querySelector('#vvr a#cFN, .additionNav .vvr a.cFN, #nextBig, a.nextL#cFN'));
  };

  const readOpenTabsFromStorage = () => {
    try {
      const raw = localStorage.getItem(OPEN_TABS_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (_) {
      return {};
    }
  };

  const pruneOpenTabsMap = (map) => {
    const cutoff = Date.now() - OPEN_TAB_TTL;
    const result = {};
    Object.entries(map || {}).forEach(([url, tokens]) => {
      if (!tokens || typeof tokens !== 'object') return;
      const cleaned = {};
      Object.entries(tokens).forEach(([token, timestamp]) => {
        const value = Number(timestamp);
        if (Number.isFinite(value) && value >= cutoff) {
          cleaned[token] = value;
        }
      });
      if (Object.keys(cleaned).length) {
        result[url] = cleaned;
      }
    });
    return result;
  };

  const persistOpenTabsMap = (map) => {
    try {
      const cleaned = pruneOpenTabsMap(map);
      localStorage.setItem(OPEN_TABS_KEY, JSON.stringify(cleaned));
      openTabsSnapshot = cleaned;
      return true;
    } catch (_) {
      openTabsSnapshot = {};
      return false;
    }
  };

  const mutateOpenTabsMap = (mutator) => {
    try {
      const map = readOpenTabsFromStorage();
      mutator(map);
      return persistOpenTabsMap(map);
    } catch (_) {
      return false;
    }
  };

  const refreshOpenTabsSnapshot = () => {
    try {
      openTabsSnapshot = pruneOpenTabsMap(readOpenTabsFromStorage());
    } catch (_) {
      openTabsSnapshot = {};
    }
  };

  const cancelOpenTabRenewal = () => {
    if (openTabRenewTimer) {
      clearInterval(openTabRenewTimer);
      openTabRenewTimer = null;
    }
  };

  const renewTabPresence = () => {
    if (!tabPresenceRegistered || !currentUrl) return;
    mutateOpenTabsMap((map) => {
      if (!map[currentUrl]) {
        map[currentUrl] = {};
      }
      map[currentUrl][TAB_TOKEN] = Date.now();
    });
  };

  const scheduleOpenTabRenewal = () => {
    cancelOpenTabRenewal();
    openTabRenewTimer = window.setInterval(renewTabPresence, OPEN_TAB_RENEW_INTERVAL);
  };

  const registerTabPresence = () => {
    if (tabPresenceRegistered || !isContentView || !currentUrl) return;
    const success = mutateOpenTabsMap((map) => {
      if (!map[currentUrl]) {
        map[currentUrl] = {};
      }
      map[currentUrl][TAB_TOKEN] = Date.now();
    });
    if (!success) {
      tabPresenceRegistered = false;
      return;
    }
    tabPresenceRegistered = true;
    scheduleOpenTabRenewal();
  };

  const unregisterTabPresence = () => {
    if (!tabPresenceRegistered || !currentUrl) {
      cancelOpenTabRenewal();
      tabPresenceRegistered = false;
      return;
    }
    cancelOpenTabRenewal();
    mutateOpenTabsMap((map) => {
      const tokens = map[currentUrl];
      if (!tokens || typeof tokens !== 'object') return;
      delete tokens[TAB_TOKEN];
      if (!Object.keys(tokens).length) {
        delete map[currentUrl];
      }
    });
    tabPresenceRegistered = false;
  };

  const isUrlOpenElsewhere = (url) => {
    if (!url) return false;
    openTabsSnapshot = pruneOpenTabsMap(openTabsSnapshot);
    const tokens = openTabsSnapshot[url];
    if (!tokens || typeof tokens !== 'object') return false;
    const tokenKeys = Object.keys(tokens);
    if (!tokenKeys.length) return false;
    if (tokenKeys.length === 1 && tokens[TAB_TOKEN]) {
      return false;
    }
    return tokenKeys.some((token) => token !== TAB_TOKEN);
  };

  const isSessionRestoreLoad = (normalizedUrl) => {
    try {
      const entries = performance?.getEntriesByType?.('navigation');
      if (!entries || !entries.length) {
        return false;
      }
      const entry = entries[0];
      if (!entry || entry.type !== 'reload') {
        return false;
      }
      const ref = (document.referrer || '').trim();
      if (!ref) {
        return true;
      }
      if (!normalizedUrl) {
        return false;
      }
      const normalizedRef = normalizeContentUrl(ref);
      return normalizedRef !== normalizedUrl;
    } catch (_) {
      return false;
    }
  };

  const loadHistory = () => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((entry) => typeof entry === 'string');
    } catch (_) {
      return [];
    }
  };

  const saveHistory = () => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-MAX_HISTORY)));
    } catch (_) {}
  };

  const addHistoryEntry = (url) => {
    const normalized = normalizeContentUrl(url);
    if (!normalized) return;
    for (let idx = history.length - 1; idx >= 0; idx--) {
      if (history[idx] === normalized) {
        history.splice(idx, 1);
      }
    }
    history.push(normalized);
    if (history.length > MAX_HISTORY) {
      history.splice(0, history.length - MAX_HISTORY);
    }
    saveHistory();
  };

  const readListState = () => {
    try {
      const raw = sessionStorage.getItem(STATE_KEY);
      if (!raw) return { active: false, index: null, url: null, stage: LIST_STAGE.EXPIRED };
      const parsed = JSON.parse(raw);
      return {
        active: Boolean(parsed?.active),
        index: Number.isFinite(parsed?.index) ? parsed.index : null,
        url: typeof parsed?.url === 'string' ? parsed.url : null,
        stage: Object.values(LIST_STAGE).includes(parsed?.stage) ? parsed.stage : LIST_STAGE.EXPIRED
      };
    } catch (_) {
      return { active: false, index: null, url: null, stage: LIST_STAGE.EXPIRED };
    }
  };

  const persistListState = (patch = {}) => {
    listState = { ...listState, ...patch };
    try {
      sessionStorage.setItem(STATE_KEY, JSON.stringify(listState));
    } catch (_) {}
  };

  const exitListMode = () => {
    persistListState({ active: false, index: null, url: null, stage: LIST_STAGE.EXPIRED });
  };

  const syncListIndexWithHistory = () => {
    if (!listState.active || !listState.url) {
      return;
    }
    const fallbackIdx = history.lastIndexOf(listState.url);
    if (fallbackIdx === -1) {
      exitListMode();
      return;
    }
    const preferredIdx = Number.isInteger(listState.index) ? listState.index : fallbackIdx;
    const index = history[preferredIdx] === listState.url ? preferredIdx : fallbackIdx;
    persistListState({ index });
  };

  const adjustListStateForLoad = () => {
    listState = readListState();
    if (!listState.active || !listState.url) {
      exitListMode();
      return;
    }
    if (listState.url === currentUrl) {
      if (listState.stage === LIST_STAGE.EXPIRED) {
        exitListMode();
        return;
      }
      persistListState({ stage: LIST_STAGE.ACTIVE });
      return;
    }
    if (listState.stage === LIST_STAGE.WAITING) {
      persistListState({ stage: LIST_STAGE.ARMED });
      return;
    }
    if (listState.stage === LIST_STAGE.ARMED) {
      exitListMode();
      return;
    }
    exitListMode();
  };

  const removeHistoryAt = (index) => {
    if (index < 0 || index >= history.length) return;
    history.splice(index, 1);
    if (listState.active && Number.isInteger(listState.index)) {
      if (index < listState.index) {
        persistListState({ index: listState.index - 1 });
      } else if (index === listState.index) {
        persistListState({ index: null });
      }
    }
    saveHistory();
  };

  const ensureContentAccessible = async (url) => {
    if (!url) return false;
    if (availabilityCache.has(url)) {
      return availabilityCache.get(url);
    }
    let controller;
    let timer;
    try {
      controller = new AbortController();
      timer = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(url, { method: 'GET', credentials: 'include', signal: controller.signal });
      clearTimeout(timer);
      if (!response.ok) {
        availabilityCache.set(url, false);
        return false;
      }
      const text = await response.text();
      const valid = CONTENT_MARKERS.some((marker) => text.includes(marker));
      availabilityCache.set(url, valid);
      return valid;
    } catch (_) {
      if (timer) clearTimeout(timer);
      availabilityCache.set(url, false);
      return false;
    }
  };

  const findBackwardIndex = async (startIdx) => {
    for (let idx = startIdx; idx >= 0; idx--) {
      const candidate = history[idx];
      if (!candidate || candidate === currentUrl) continue;
      if (isUrlOpenElsewhere(candidate)) continue;
      if (await ensureContentAccessible(candidate)) {
        return idx;
      }
      removeHistoryAt(idx);
    }
    exitListMode();
    return -1;
  };

  const findForwardIndex = async (startIdx) => {
    for (let idx = startIdx; idx < history.length; idx++) {
      const candidate = history[idx];
      if (!candidate || candidate === currentUrl) continue;
      if (isUrlOpenElsewhere(candidate)) continue;
      if (await ensureContentAccessible(candidate)) {
        return idx;
      }
      removeHistoryAt(idx);
      idx -= 1;
    }
    exitListMode();
    return -1;
  };

  const beginListNavigation = (url, index) => {
    if (!url) return;
    persistListState({ active: true, url, index, stage: LIST_STAGE.ACTIVE });
    pendingListNavigation = true;
    window.location.assign(url);
  };

  const computeRawBackwardIndex = () => {
    if (!history.length) return -1;
    const start = listState.active && Number.isInteger(listState.index)
      ? listState.index - 1
      : history.length - 1;
    const boundary = Math.min(start, history.length - 1);
    if (boundary < 0) return -1;
    for (let idx = boundary; idx >= 0; idx--) {
      const candidate = history[idx];
      if (candidate && candidate !== currentUrl && !isUrlOpenElsewhere(candidate)) {
        return idx;
      }
    }
    return -1;
  };

  const computeRawForwardIndex = () => {
    if (!listState.active || !Number.isInteger(listState.index)) return -1;
    for (let idx = listState.index + 1; idx < history.length; idx++) {
      const candidate = history[idx];
      if (candidate && candidate !== currentUrl && !isUrlOpenElsewhere(candidate)) {
        return idx;
      }
    }
    return -1;
  };

  const attemptPrevNavigation = async () => {
    if (navigationLock) return false;
    const startIdx = computeRawBackwardIndex();
    if (startIdx === -1) {
      updateButtonStates();
      return false;
    }
    navigationLock = true;
    try {
      const targetIdx = await findBackwardIndex(startIdx);
      if (targetIdx === -1) {
        updateButtonStates();
        return false;
      }
      const targetUrl = history[targetIdx];
      beginListNavigation(targetUrl, targetIdx);
      return true;
    } finally {
      navigationLock = false;
    }
  };

  const attemptNextNavigation = async () => {
    if (navigationLock) return false;
    const startIdx = computeRawForwardIndex();
    if (startIdx === -1) {
      return false;
    }
    navigationLock = true;
    try {
      const targetIdx = await findForwardIndex(startIdx);
      if (targetIdx === -1) {
        updateButtonStates();
        return false;
      }
      const targetUrl = history[targetIdx];
      beginListNavigation(targetUrl, targetIdx);
      return true;
    } finally {
      navigationLock = false;
    }
  };

  const handlePrevClick = async (event) => {
    if (!enabled || !isContentView) return;
    if (event) {
      if (event.button && event.button !== 0) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    }
    const navigated = await attemptPrevNavigation();
    if (!navigated) {
      updateButtonStates();
    }
  };

  const handleNextClick = async (event) => {
    if (!enabled || !isContentView) return;
    if (!listState.active) return;
    if (computeRawForwardIndex() === -1) {
      exitListMode();
      updateButtonStates();
      return;
    }
    if (event) {
      if (event.button && event.button !== 0) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    }
    const navigated = await attemptNextNavigation();
    if (!navigated && event) {
      event.stopImmediatePropagation();
    }
  };

  const queryButtons = (selectors) => {
    const set = new Set();
    selectors.forEach((selector) => {
      document.querySelectorAll(selector).forEach((el) => set.add(el));
    });
    return Array.from(set);
  };

  const copyAnchorStyling = (template, target, classFallback) => {
    if (!template) {
      if (classFallback) {
        target.className = classFallback;
      }
      if (!target.classList.contains('prevL')) {
        target.classList.add('prevL');
      }
      return;
    }

    const skip = new Set(['href', 'id', 'rel', 'title', 'data-next-cid']);
    template.getAttributeNames().forEach((name) => {
      const lowered = name.toLowerCase();
      if (name === 'class' || skip.has(lowered)) {
        return;
      }
      target.setAttribute(name, template.getAttribute(name));
    });

    const originalClass = template.getAttribute('class');
    if (originalClass) {
      const normalized = originalClass
        .replace(/nextBig/g, 'prevBig')
        .replace(/nextL/g, 'prevL')
        .replace(/\bnext\b/gi, 'prev');
      target.className = normalized;
    } else if (classFallback) {
      target.className = classFallback;
    }

    if (!target.classList.contains('prevL')) {
      target.classList.add('prevL');
    }
  };

  const createInlinePrevButtons = () => {
    const containers = [];
    document.querySelectorAll('#vvl, .additionNav .vvl').forEach((node) => containers.push(node));
    if (!containers.length) {
      const navWrap = document.querySelector('#vvr')?.parentElement || document.querySelector('.mediaContainer');
      if (navWrap) {
        const fallback = document.createElement('div');
        fallback.id = 'vvl';
        fallback.className = 'vvl';
        navWrap.insertBefore(fallback, navWrap.firstChild || null);
        containers.push(fallback);
      }
    }

    if (!containers.length) {
      return;
    }

    const template = document.querySelector('#vvr a#cFN, .additionNav .vvr a.cFN, a#cFN, a.nextL');

    containers.forEach((container) => {
      const wrapper = document.createElement('div');
      const anchor = document.createElement('a');
      if (!document.getElementById('cFP')) {
        anchor.id = 'cFP';
      }
      anchor.rel = 'prev';
      anchor.title = 'Previous (Left Arrow Key <-)';
      anchor.textContent = 'prev';
      anchor.href = currentUrl || window.location.href;
      anchor.dataset.fjWorkingPrevSynthetic = '1';
      copyAnchorStyling(template, anchor, 'cFP nbc z8 prevL');
      anchor.classList.add('cFP', 'nbc', 'z8', 'prevL');
      const onMouseDown = template?.getAttribute('onmousedown');
      if (onMouseDown) {
        anchor.setAttribute('onmousedown', onMouseDown);
      }
      wrapper.appendChild(anchor);
      container.insertBefore(wrapper, container.firstChild || null);
    });
  };

  const createOverlayPrevButton = () => {
    if (document.querySelector('#prevBig, .prevBig')) {
      return;
    }
    const template = document.querySelector('#nextBig, .nextBig');
    if (!template) {
      return;
    }
    const parent = template.parentElement || document.querySelector('.mediaContainer');
    if (!parent) {
      return;
    }
    const anchor = document.createElement('a');
    anchor.id = 'prevBig';
    anchor.rel = 'prev';
    anchor.title = 'Previous (Left Arrow Key <-)';
    anchor.href = currentUrl || window.location.href;
    anchor.dataset.fjWorkingPrevSynthetic = '1';
    copyAnchorStyling(template, anchor, 'prevBig z8 prevL');
    anchor.classList.add('prevBig', 'prevL', 'z8');
    anchor.textContent = '';
    const onMouseDown = template.getAttribute('onmousedown');
    if (onMouseDown) {
      anchor.setAttribute('onmousedown', onMouseDown);
    }
    parent.insertBefore(anchor, template);
  };

  const ensurePrevButtonsPresent = (preventCreation) => {
    if (preventCreation || !enabled || !isContentView) {
      return;
    }
    const inlineExists = Boolean(document.querySelector('#vvl a.prevL, .additionNav .vvl a.prevL'));
    if (!inlineExists) {
      createInlinePrevButtons();
    }
    if (!document.querySelector('#prevBig, .prevBig')) {
      createOverlayPrevButton();
    }
  };

  const attachButtonOverrides = () => {
    const shouldHidePrev = enabled && computeRawBackwardIndex() === -1;
    ensurePrevButtonsPresent(shouldHidePrev);
    const prevButtons = queryButtons(PREV_SELECTORS);
    prevButtons.forEach((button) => {
      if (button.dataset.fjWorkingPrevAttached === '1') return;
      button.dataset.fjWorkingPrevAttached = '1';
      button.addEventListener('click', handlePrevClick, true);
    });
    const nextButtons = queryButtons(NEXT_SELECTORS);
    nextButtons.forEach((button) => {
      if (button.dataset.fjWorkingPrevNextAttached === '1') return;
      button.dataset.fjWorkingPrevNextAttached = '1';
      button.addEventListener('click', handleNextClick, true);
    });
    updateButtonStates();
  };

  const setButtonsVisible = (buttons, visible, dataKey) => {
    buttons.forEach((button) => {
      const key = dataKey || 'fjWorkingPrevDisplay';
      if (!button.dataset[key]) {
        button.dataset[key] = button.style.display || '';
      }
      button.style.display = visible ? button.dataset[key] : 'none';
    });
  };

  const updateButtonStates = () => {
    if (!isContentView) return;
    const hasPrevOptions = computeRawBackwardIndex() !== -1;
    const shouldHidePrev = enabled && !hasPrevOptions;
    ensurePrevButtonsPresent(shouldHidePrev);
    const prevButtons = queryButtons(PREV_SELECTORS);
    setButtonsVisible(prevButtons, !shouldHidePrev, 'fjWorkingPrevDisplay');
  };

  const handleKeydown = async (event) => {
    if (!enabled || !isContentView) return;
    if (event.defaultPrevented) return;
    if (isTypingTarget(event.target)) return;
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      const navigated = await attemptPrevNavigation();
      if (!navigated) updateButtonStates();
      return;
    }
    if (event.key === 'ArrowRight') {
      if (!listState.active || computeRawForwardIndex() === -1) return;
      event.preventDefault();
      await attemptNextNavigation();
    }
  };

  const handlePageExit = () => {
    if (unloadHandled) return;
    unloadHandled = true;
    const shouldRecord = isContentView && currentUrl && !pendingListNavigation && !skipHistoryBecauseRestored;
    if (shouldRecord) {
      addHistoryEntry(currentUrl);
    }
    if (listState.active && pendingListNavigation) {
      persistListState({ stage: LIST_STAGE.WAITING });
    } else {
      exitListMode();
    }
    pendingListNavigation = false;
    unregisterTabPresence();
  };

  const addGlobalListener = (target, type, handler, options) => {
    target.addEventListener(type, handler, options);
  };

  const startObservers = () => {
    if (!isContentView || mutationObserver || !document.body) return;
    mutationObserver = new MutationObserver(() => {
      if (!isRuntimeFlagEnabled('observerCoalescing', true)) {
        attachButtonOverrides();
        return;
      }
      if (observerRefreshScheduled) {
        return;
      }
      observerRefreshScheduled = true;
      requestAnimationFrame(() => {
        observerRefreshScheduled = false;
        attachButtonOverrides();
      });
    });
    mutationObserver.observe(document.body, { childList: true, subtree: true });
  };

  const stopObservers = () => {
    if (mutationObserver) {
      mutationObserver.disconnect();
      mutationObserver = null;
    }
    observerRefreshScheduled = false;
  };

  const attach = () => {
    if (enabled && isContentView) {
      attachButtonOverrides();
      startObservers();
    } else {
      stopObservers();
      updateButtonStates();
    }
  };

  const applySetting = (nextState) => {
    const shouldEnable = Boolean(nextState);
    if (enabled === shouldEnable) {
      updateButtonStates();
      return;
    }
    enabled = shouldEnable;
    attach();
  };

  const handleSettingsChanged = (event) => {
    const detail = event.detail || {};
    if (typeof detail[SETTING_KEY] === 'undefined') {
      return;
    }
    applySetting(detail[SETTING_KEY]);
  };

  const init = () => {
    if (window.location.hostname !== targetHost) {
      return;
    }
    currentUrl = normalizeContentUrl(window.location.href);
    isContentView = detectContentView();
    skipHistoryBecauseRestored = isSessionRestoreLoad(currentUrl);
    if (isContentView && currentUrl) {
      registerTabPresence();
    }
    history = loadHistory();
    adjustListStateForLoad();
    syncListIndexWithHistory();
    addGlobalListener(window, 'beforeunload', handlePageExit, { capture: true });
    addGlobalListener(window, 'pagehide', handlePageExit, { capture: true });
    if (isContentView) {
      addGlobalListener(document, 'keydown', handleKeydown, true);
    }
    applySetting(Boolean((window.fjTweakerSettings || {})[SETTING_KEY]));
    document.addEventListener('fjTweakerSettingsChanged', handleSettingsChanged);
  };

  refreshOpenTabsSnapshot();
  window.addEventListener('storage', (event) => {
    if (event.key === OPEN_TABS_KEY) {
      refreshOpenTabsSnapshot();
    }
  });

  if (!window.fjTweakerModules) {
    window.fjTweakerModules = {};
  }

  window.fjTweakerModules[MODULE_KEY] = { init };
})();
