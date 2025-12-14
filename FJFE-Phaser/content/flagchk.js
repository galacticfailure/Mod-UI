(() => {
  /*
   * Flag history helper + ban checklist overlay.
   * Adds a summary row to the mod history table and ships an interactive
   * decision tree that mirrors the community flowchart. All UI toggles
   * are driven by fjTweakerSettings so lower levels can disable them.
   */
  const targetHost = 'funnyjunk.com';
  const MODULE_KEY = 'flagchk';
  const FLAG_SUMMARY_SETTING_KEY = 'flagCheck';
  const BAN_CALCULATOR_SETTING_KEY = 'banCalculator';
  const SUMMARY_ROW_ID = 'fjfe-flag-summary-row';
  const CHECKLIST_BUTTON_ID = 'fjfe-flag-checklist-button';
  const CHECKLIST_PANEL_ID = 'fjfe-flag-checklist-panel';
  const CHECKLIST_PANEL_MARGIN = 18;
  const CHECKLIST_NAV_EVENTS = ['beforeunload', 'pagehide', 'popstate'];
  const CHECKLIST_STYLE_ID = 'fjfe-flag-checklist-style';
  const CHECKLIST_ANIMATION_IN = 'fjfeChecklistEnter';
  const CHECKLIST_ANIMATION_OUT = 'fjfeChecklistExit';
  const CHECKLIST_STEP_ANIMATION = 'fjfeChecklistStep';
  const SCAN_DEBOUNCE_MS = 200;
  const ONE_HOUR_MS = 60 * 60 * 1000;
  const RECENT_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
  const ACTION_ALLOW_LIST = new Set(['flag', 'comment_flag', 'spam_comment_flag']);
  const CATEGORY_SHI_RULES = [
    { label: 'Loli', keywords: ['loli'] },
    { label: 'Illegal', keywords: ['illegal'] },
    { label: 'Harassment', keywords: ['harassment'] },
    { label: 'Spam', keywords: ['spam'] }
  ];
  const CATEGORY_BLGORE_RULES = [
    { label: 'Borderline NSFW', keywords: ['borderline_nsfw', 'borderline nsfw'] },
    { label: 'Gore', keywords: ['gore'] }
  ];
  const CATEGORY_OTHER_LABEL = 'Other';
  const FLAG_FORM_SELECTOR = '#contentFlag, form.formModFlag';
  const NOTE_INPUT_SELECTOR = 'input[name="modeNote"]';
  // Settings are persisted as strings/ints, so normalize everything to booleans here.
  const coerceSettingEnabled = (value) => {
    if (value === true) {
      return true;
    }
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on') {
        return true;
      }
      return false;
    }
    if (typeof value === 'number') {
      return Number.isFinite(value) && value !== 0;
    }
    return false;
  };

  let initialized = false;
  let summaryEnabled = false;
  let checklistEnabled = false;
  let observer = null;
  let scanTimer = null;
  let checklistPanel = null;
  let checklistPanelPosition = null;
  let checklistDragState = null;
  let checklistNavHandlersAttached = false;
  let checklistContentEl = null;
  let checklistPromptEl = null;
  let checklistControlsEl = null;
  let checklistActionEl = null;
  let checklistErrorEl = null;
  let checklistBackButton = null;
  let checklistState = null;
  let moderatorLevel = null;
  let moderatorLevelRequestPending = false;

  // Skip DOM work entirely if neither the summary nor checklist are enabled.
  const hasActiveFeatures = () => summaryEnabled || checklistEnabled;

  // Guard against running inside iframes or other hostnames.
  const isTargetHost = () => {
    try {
      const hostname = window.location?.hostname || '';
      return hostname.toLowerCase().includes(targetHost);
    } catch (_) {
      return false;
    }
  };

  // History dates are returned as "YYYY-MM-DD HH:mm:ss"; convert to UTC Date objects.
  const parseDateTime = (value) => {
    if (!value) {
      return null;
    }
    const match = value.trim().match(/^([0-9]{4})-([0-9]{2})-([0-9]{2}) ([0-9]{2}):([0-9]{2}):([0-9]{2})$/);
    if (!match) {
      return null;
    }
    const [, year, month, day, hours, minutes, seconds] = match;
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hours), Number(minutes), Number(seconds)));
  };

  // Summary rows span the full width, so determine how many columns the table currently has.
  const getColumnCount = (table) => {
    if (!table) {
      return 1;
    }
    const selector = `tr:not(#${SUMMARY_ROW_ID})`;
    const sampleRow = table.querySelector(`tbody ${selector}`) || table.querySelector(selector);
    if (sampleRow && sampleRow.cells && sampleRow.cells.length > 0) {
      return sampleRow.cells.length;
    }
    const fallbackRow = table.rows?.[0];
    return fallbackRow && fallbackRow.cells ? Math.max(1, fallbackRow.cells.length) : 1;
  };

  // Scrape the history table and normalize each row so the summary logic is simple.
  const collectEntries = (table) => {
    if (!table) {
      return [];
    }

    const now = Date.now();
    const cutoffRecent = now - RECENT_WINDOW_MS;
    const cutoffAll = new Date();
    cutoffAll.setFullYear(cutoffAll.getFullYear() - 2);
    const cutoffAllTime = cutoffAll.getTime();

    const tbody = table.tBodies?.[0];
    const sourceRows = tbody ? Array.from(tbody.rows) : Array.from(table.rows || []);
    const rows = sourceRows || [];
    const entries = [];
    rows.forEach((row) => {
      if (!row || row.id === SUMMARY_ROW_ID || row.dataset?.fjfeFlagSummary === '1') {
        return;
      }
      const cells = row.cells;
      if (!cells || cells.length < 5) {
        return;
      }
      const action = (cells[4]?.textContent || '').trim().toLowerCase();
      if (!ACTION_ALLOW_LIST.has(action)) {
        return;
      }
      const date = parseDateTime((cells[1]?.textContent || '').trim());
      if (!date) {
        return;
      }
      const timestamp = date.getTime();
      const isOld = timestamp < cutoffAllTime;

      const description = (cells[2]?.textContent || '').trim();
      const descLower = description.toLowerCase();

      entries.push({
        date,
        timestamp,
        isRecent: !isOld && timestamp >= cutoffRecent,
        description,
        descLower,
        action,
        ignoredReason: isOld ? 'old' : null
      });
    });
    return entries;
  };

  // Apply heuristics so the summary ignores ancient or low-signal entries.
  // Ignore roll logs and back-to-back spam flags so the summary focuses on actionable items.
  const applyIgnoreRules = (entries) => {
    if (!Array.isArray(entries) || entries.length === 0) {
      return;
    }

    entries.forEach((entry) => {
      if (entry.ignoredReason) {
        return;
      }
      if (entry.descLower.includes('roll')) {
        entry.ignoredReason = 'roll';
      }
    });

    const spamEntries = entries
      .filter((entry) => !entry.ignoredReason && entry.descLower.includes('spam'))
      .sort((a, b) => a.timestamp - b.timestamp);

    let previousTimestamp = null;
    spamEntries.forEach((entry) => {
      if (previousTimestamp === null) {
        previousTimestamp = entry.timestamp;
        return;
      }
      const diff = entry.timestamp - previousTimestamp;
      if (diff <= ONE_HOUR_MS) {
        entry.ignoredReason = 'spam';
      }
      previousTimestamp = entry.timestamp;
    });
  };

  // Simple substring matcher for the category heuristics.
  const matchesCategoryRule = (descLower, rule) =>
    rule.keywords.some((keyword) => descLower.includes(keyword));

  const findCategoryRule = (descLower, rules) => rules.find((rule) => matchesCategoryRule(descLower, rule));

  // Each category keeps a tally plus a list of the specific reasons encountered.
  const createCategoryTracker = () => ({ count: 0, reasons: [] });

  const addCategoryReason = (tracker, label) => {
    if (!tracker || !label) {
      return;
    }
    tracker.count += 1;
    tracker.reasons.push(label);
  };

  // Crunch the scraped rows into totals used by the injected summary row.
  const summarizeEntries = (table) => {
    const entries = collectEntries(table);
    if (!entries.length) {
      return {
        total: 0,
        ignored: 0,
        ignoredReasons: [],
        categories: {
          shi: createCategoryTracker(),
          blGore: createCategoryTracker(),
          other: createCategoryTracker()
        }
      };
    }

    applyIgnoreRules(entries);

    let total = 0;
    const ignoredReasons = [];
    const categories = {
      shi: createCategoryTracker(),
      blGore: createCategoryTracker(),
      other: createCategoryTracker()
    };

    entries.forEach((entry) => {
      if (entry.ignoredReason) {
        ignoredReasons.push(entry.ignoredReason);
        return;
      }
      total += 1;
      if (entry.isRecent) {
        const shiMatch = findCategoryRule(entry.descLower, CATEGORY_SHI_RULES);
        if (shiMatch) {
          addCategoryReason(categories.shi, shiMatch.label);
          return;
        }
        const blGoreMatch = findCategoryRule(entry.descLower, CATEGORY_BLGORE_RULES);
        if (blGoreMatch) {
          addCategoryReason(categories.blGore, blGoreMatch.label);
          return;
        }
        addCategoryReason(categories.other, CATEGORY_OTHER_LABEL);
      }
    });

    return {
      total,
      ignored: ignoredReasons.length,
      ignoredReasons,
      categories
    };
  };

  // Group ignored reasons by label so the summary can show counts.
  const formatIgnoredReasons = (reasons) => {
    if (!Array.isArray(reasons) || !reasons.length) {
      return '';
    }
    const counts = reasons.reduce((map, reason) => {
      const key = reason || 'unknown';
      map[key] = (map[key] || 0) + 1;
      return map;
    }, {});
    return Object.entries(counts)
      .map(([reason, count]) => `${reason} x${count}`)
      .join(', ');
  };

  // Insert a summary <tr> above the real rows (if it does not already exist).
  const ensureSummaryRow = (table) => {
    if (!table) {
      return null;
    }
    const tbody = table.tBodies?.[0] || table;
    let row = table.querySelector(`#${SUMMARY_ROW_ID}`);
    if (row) {
      return row;
    }
    row = document.createElement('tr');
    row.id = SUMMARY_ROW_ID;
    row.dataset.fjfeFlagSummary = '1';
    const cell = document.createElement('td');
    cell.colSpan = getColumnCount(table);
    row.append(cell);
    tbody.insertBefore(row, tbody.firstElementChild);
    return row;
  };

  // Rebuild the summary row contents to reflect the latest scan.
  const updateSummaryRow = (row, table, summary) => {
    if (!row) {
      return;
    }
    const colSpan = getColumnCount(table);
    const cell = row.cells[0] || row.insertCell(0);
    cell.colSpan = colSpan;
    cell.textContent = '';

    const container = document.createElement('div');
    container.className = 'fjfe-flag-summary';
    Object.assign(container.style, {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '12px',
      font: "600 13px 'Segoe UI', sans-serif",
      color: '#f8f8f8',
      padding: '6px 4px'
    });

    const appendMetric = (label, count, reasons, contextText) => {
      const wrapper = document.createElement('span');
      wrapper.style.display = 'flex';
      wrapper.style.flexDirection = 'column';
      wrapper.style.lineHeight = '1.25';
      const safeCount = typeof count === 'number' && Number.isFinite(count) ? count : 0;
      const detail = Array.isArray(reasons) && reasons.length
        ? ` (${formatIgnoredReasons(reasons)})`
        : '';
      const mainLine = document.createElement('span');
      mainLine.textContent = `${label}: ${safeCount}${detail}`;
      wrapper.append(mainLine);
      if (contextText) {
        const contextLine = document.createElement('span');
        contextLine.textContent = contextText;
        contextLine.style.fontSize = '75%';
        contextLine.style.opacity = '0.75';
        wrapper.append(contextLine);
      }
      container.append(wrapper);
    };

    const categories = summary.categories || {};
    const shiCategory = categories.shi || createCategoryTracker();
    const blGoreCategory = categories.blGore || createCategoryTracker();
    const otherCategory = categories.other || createCategoryTracker();

    appendMetric('All-Time Flags', summary.total, null, '(past 2 years)');
    appendMetric('Spam/Harassment/Illegal', shiCategory.count, shiCategory.reasons, '(past 30 days)');
    appendMetric('BL/Gore', blGoreCategory.count, blGoreCategory.reasons, '(past 30 days)');
    appendMetric('Other', otherCategory.count, otherCategory.reasons, '(past 30 days)');
    appendMetric('Ignored Flags', summary.ignored, summary.ignoredReasons);

    cell.append(container);
  };

  const resolveNoteInputWidth = (input) => {
    if (!input) {
      return '90%';
    }
    return input.style.width || '90%';
  };

  // Lazily add the keyframe animations used by the draggable checklist UI.
  const ensureChecklistStyles = () => {
    if (document.getElementById(CHECKLIST_STYLE_ID)) {
      return;
    }
    const style = document.createElement('style');
    style.id = CHECKLIST_STYLE_ID;
    style.textContent = `
      @keyframes ${CHECKLIST_ANIMATION_IN} {
        0% { opacity: 0; transform: translateY(8px) scale(0.97); }
        100% { opacity: 1; transform: translateY(0) scale(1); }
      }
      @keyframes ${CHECKLIST_ANIMATION_OUT} {
        0% { opacity: 1; transform: translateY(0) scale(1); }
        100% { opacity: 0; transform: translateY(8px) scale(0.97); }
      }
      @keyframes ${CHECKLIST_STEP_ANIMATION} {
        0% {
          opacity: 0;
          transform: translateX(18px);
        }
        100% {
          opacity: 1;
          transform: translateX(0);
        }
      }
      .fjfe-flag-checklist-step {
        animation: ${CHECKLIST_STEP_ANIMATION} 140ms ease-out;
      }
    `;
    document.head?.append(style);
  };

  const runChecklistPanelAnimation = (animationName, duration) => {
    if (!checklistPanel) {
      return;
    }
    checklistPanel.style.animation = `${animationName} ${duration}ms ease-out`;
    checklistPanel.addEventListener('animationend', () => {
      if (checklistPanel) {
        checklistPanel.style.animation = '';
      }
    }, { once: true });
  };

  const animateChecklistOpen = () => {
    ensureChecklistStyles();
    runChecklistPanelAnimation(CHECKLIST_ANIMATION_IN, 180);
  };

  const animateChecklistClose = (onComplete) => {
    if (!checklistPanel) {
      if (typeof onComplete === 'function') {
        onComplete();
      }
      return;
    }
    ensureChecklistStyles();
    checklistPanel.style.animation = `${CHECKLIST_ANIMATION_OUT} 160ms ease-in`;
    checklistPanel.addEventListener('animationend', () => {
      if (typeof onComplete === 'function') {
        onComplete();
      }
    }, { once: true });
  };

  const triggerChecklistStepAnimation = () => {
    if (!checklistContentEl) {
      return;
    }
    ensureChecklistStyles();
    checklistContentEl.classList.remove('fjfe-flag-checklist-step');
    void checklistContentEl.offsetWidth;
    checklistContentEl.classList.add('fjfe-flag-checklist-step');
  };

  // Cache the level reported by fjApichk so the flow can gate long bans.
  const cacheModeratorLevel = (value) => {
    if (Number.isFinite(value)) {
      moderatorLevel = value;
    }
  };

  const handleApichkStatus = (event) => {
    cacheModeratorLevel(event?.detail?.level);
  };

  // If the level is unknown, ask fjApichk to refresh its data.
  const requestModeratorLevelUpdate = () => {
    if (moderatorLevelRequestPending) {
      return;
    }
    const api = window.fjApichk;
    if (!api || typeof api.ensureFetched !== 'function') {
      return;
    }
    moderatorLevelRequestPending = true;
    Promise.resolve()
      .then(() => api.ensureFetched())
      .then(() => {
        moderatorLevelRequestPending = false;
        if (typeof api.getLevel === 'function') {
          cacheModeratorLevel(api.getLevel());
        }
      })
      .catch(() => {
        moderatorLevelRequestPending = false;
      });
  };

  const getModeratorLevel = () => {
    if (Number.isFinite(moderatorLevel)) {
      return moderatorLevel;
    }
    const api = window.fjApichk;
    if (api && typeof api.getLevel === 'function') {
      const level = api.getLevel();
      if (Number.isFinite(level)) {
        moderatorLevel = level;
        return level;
      }
    }
    requestModeratorLevelUpdate();
    return null;
  };

  // visualViewport yields correct coordinates even when the on-screen keyboard is open.
  const getViewportSize = () => {
    const viewport = window.visualViewport;
    const width = viewport?.width || window.innerWidth || document.documentElement?.clientWidth || 0;
    const height = viewport?.height || window.innerHeight || document.documentElement?.clientHeight || 0;
    return {
      width: Math.max(0, width),
      height: Math.max(0, height)
    };
  };

  const clampChecklistPanelPosition = (left, top) => {
    if (!checklistPanel) {
      return { left, top };
    }
    const rect = checklistPanel.getBoundingClientRect();
    const panelWidth = rect.width || checklistPanel.offsetWidth || 240;
    const panelHeight = rect.height || checklistPanel.offsetHeight || 140;
    const { width: viewportWidth, height: viewportHeight } = getViewportSize();
    const maxLeft = Math.max(CHECKLIST_PANEL_MARGIN, viewportWidth - panelWidth - CHECKLIST_PANEL_MARGIN);
    const maxTop = Math.max(CHECKLIST_PANEL_MARGIN, viewportHeight - panelHeight - CHECKLIST_PANEL_MARGIN);
    return {
      left: Math.min(Math.max(left, CHECKLIST_PANEL_MARGIN), maxLeft),
      top: Math.min(Math.max(top, CHECKLIST_PANEL_MARGIN), maxTop)
    };
  };

  const applyChecklistPanelPosition = () => {
    if (!checklistPanel) {
      return;
    }
    if (!checklistPanelPosition) {
      checklistPanel.style.left = '';
      checklistPanel.style.top = '';
      checklistPanel.style.right = CHECKLIST_PANEL_MARGIN + 'px';
      checklistPanel.style.bottom = CHECKLIST_PANEL_MARGIN + 'px';
      return;
    }
    checklistPanel.style.left = checklistPanelPosition.left + 'px';
    checklistPanel.style.top = checklistPanelPosition.top + 'px';
    checklistPanel.style.right = '';
    checklistPanel.style.bottom = '';
  };

  const handleChecklistResize = () => {
    if (!checklistPanel) {
      return;
    }
    if (!checklistPanelPosition) {
      applyChecklistPanelPosition();
      return;
    }
    checklistPanelPosition = clampChecklistPanelPosition(checklistPanelPosition.left, checklistPanelPosition.top);
    applyChecklistPanelPosition();
  };

  const detachChecklistDragListeners = () => {
    window.removeEventListener('pointermove', handleChecklistDragMove);
    window.removeEventListener('pointerup', finishChecklistDrag);
    window.removeEventListener('pointercancel', finishChecklistDrag);
  };

  const handleChecklistDragMove = (event) => {
    if (!checklistDragState || (event.pointerId !== undefined && event.pointerId !== checklistDragState.pointerId)) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const deltaX = event.clientX - checklistDragState.startClientX;
    const deltaY = event.clientY - checklistDragState.startClientY;
    const nextLeft = checklistDragState.originLeft + deltaX;
    const nextTop = checklistDragState.originTop + deltaY;
    checklistPanelPosition = clampChecklistPanelPosition(nextLeft, nextTop);
    applyChecklistPanelPosition();
  };

  const finishChecklistDrag = (event) => {
    if (!checklistDragState || (event.pointerId !== undefined && event.pointerId !== checklistDragState.pointerId)) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    if (checklistPanel && typeof checklistPanel.releasePointerCapture === 'function' && checklistDragState.pointerId !== undefined) {
      try {
        checklistPanel.releasePointerCapture(checklistDragState.pointerId);
      } catch (_) {}
    }
    detachChecklistDragListeners();
    checklistDragState = null;
  };

  const startChecklistDrag = (event) => {
    if (!checklistPanel) {
      return;
    }
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const rect = checklistPanel.getBoundingClientRect();
    const initialLeft = rect.left;
    const initialTop = rect.top;
    checklistPanelPosition = clampChecklistPanelPosition(initialLeft, initialTop);
    checklistPanel.style.left = checklistPanelPosition.left + 'px';
    checklistPanel.style.top = checklistPanelPosition.top + 'px';
    checklistPanel.style.right = '';
    checklistPanel.style.bottom = '';

    checklistDragState = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      originLeft: checklistPanelPosition.left,
      originTop: checklistPanelPosition.top
    };

    if (typeof checklistPanel.setPointerCapture === 'function' && checklistDragState.pointerId !== undefined) {
      try {
        checklistPanel.setPointerCapture(checklistDragState.pointerId);
      } catch (_) {}
    }

    window.addEventListener('pointermove', handleChecklistDragMove);
    window.addEventListener('pointerup', finishChecklistDrag);
    window.addEventListener('pointercancel', finishChecklistDrag);
  };

  // Close the checklist if the page is unloading or history navigation occurs.
  const handleChecklistNavigation = () => {
    destroyChecklistPanel({ resetPosition: true });
  };

  const attachChecklistNavigationHandlers = () => {
    if (checklistNavHandlersAttached) {
      return;
    }
    CHECKLIST_NAV_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, handleChecklistNavigation);
    });
    window.addEventListener('resize', handleChecklistResize);
    checklistNavHandlersAttached = true;
  };

  const detachChecklistNavigationHandlers = () => {
    if (!checklistNavHandlersAttached) {
      return;
    }
    CHECKLIST_NAV_EVENTS.forEach((eventName) => {
      window.removeEventListener(eventName, handleChecklistNavigation);
    });
    window.removeEventListener('resize', handleChecklistResize);
    checklistNavHandlersAttached = false;
  };

  // Tear down DOM listeners + drag state; optionally animate before removal.
  const destroyChecklistPanel = (options = {}) => {
    const finalize = () => {
      if (checklistPanel) {
        detachChecklistDragListeners();
        if (checklistPanel.parentElement) {
          try {
            checklistPanel.remove();
          } catch (_) {}
        }
        checklistPanel = null;
      }
      checklistDragState = null;
      checklistContentEl = null;
      checklistPromptEl = null;
      checklistControlsEl = null;
      checklistActionEl = null;
      checklistErrorEl = null;
      checklistBackButton = null;
      checklistState = null;
      if (options.resetPosition) {
        checklistPanelPosition = null;
      }
      detachChecklistNavigationHandlers();
    };

    if (options.animate && checklistPanel) {
      animateChecklistClose(finalize);
      return;
    }
    finalize();
  };

  // Lazy-build the draggable checklist UI the first time it is requested.
  // Build the floating draggable panel only when requested to save DOM churn.
  const ensureChecklistPanel = () => {
    if (checklistPanel) {
      return checklistPanel;
    }
    if (!document.body) {
      return null;
    }
    ensureChecklistStyles();
    checklistPanel = document.createElement('div');
    checklistPanel.id = CHECKLIST_PANEL_ID;
    Object.assign(checklistPanel.style, {
      position: 'fixed',
      right: CHECKLIST_PANEL_MARGIN + 'px',
      bottom: CHECKLIST_PANEL_MARGIN + 'px',
      width: '340px',
      maxWidth: 'min(90vw, 420px)',
      padding: '14px',
      display: 'none',
      flexDirection: 'column',
      gap: '10px',
      background: '#0d0d0d',
      color: '#f6f6f6',
      border: '1px solid #333',
      borderRadius: '6px',
      boxShadow: '0 6px 18px rgba(0, 0, 0, 0.45)',
      zIndex: '2147483646',
      boxSizing: 'border-box'
    });

    ['pointerdown', 'mousedown', 'click', 'wheel'].forEach((eventName) => {
      checklistPanel.addEventListener(eventName, (event) => {
        event.stopPropagation();
      });
    });

    const header = document.createElement('div');
    Object.assign(header.style, {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '10px',
      borderBottom: '1px solid #1f1f1f',
      paddingBottom: '4px'
    });

    const dragHandle = document.createElement('div');
    dragHandle.textContent = 'D R A G';
    Object.assign(dragHandle.style, {
      font: "700 13px 'Segoe UI', sans-serif",
      letterSpacing: '0.3em',
      textTransform: 'uppercase',
      cursor: 'move',
      userSelect: 'none',
      flex: '1 1 auto'
    });
    dragHandle.addEventListener('pointerdown', startChecklistDrag);

    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.textContent = 'X';
    Object.assign(closeButton.style, {
      width: '28px',
      height: '28px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: '1px solid #2f2f2f',
      borderRadius: '4px',
      background: '#251010',
      color: '#ffaaaa',
      cursor: 'pointer',
      flex: '0 0 auto',
      fontWeight: '700',
      fontSize: '14px'
    });
    closeButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      destroyChecklistPanel({ animate: true });
    });

    header.append(dragHandle, closeButton);
    checklistPanel.append(header);

    const body = document.createElement('div');
    Object.assign(body.style, {
      minHeight: '150px',
      width: '100%',
      border: '1px dashed #2a2a2a',
      borderRadius: '4px',
      background: '#161616',
      color: '#f4f4f4',
      font: "500 13px 'Segoe UI', sans-serif",
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      padding: '14px',
      boxSizing: 'border-box',
      overflow: 'visible'
    });

    const prompt = document.createElement('div');
    Object.assign(prompt.style, {
      fontWeight: '700',
      fontSize: '15px',
      lineHeight: '1.35',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      whiteSpace: 'pre-line'
    });

    const controls = document.createElement('div');
    Object.assign(controls.style, {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    });

    const actionDisplay = document.createElement('div');
    Object.assign(actionDisplay.style, {
      fontWeight: '600',
      lineHeight: '1.4'
    });

    const errorDisplay = document.createElement('div');
    Object.assign(errorDisplay.style, {
      color: '#ff7f7f',
      minHeight: '18px',
      fontSize: '12px'
    });

    const navRow = document.createElement('div');
    Object.assign(navRow.style, {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '8px'
    });

    const backButton = document.createElement('button');
    backButton.type = 'button';
    backButton.textContent = 'Back';
    Object.assign(backButton.style, {
      padding: '4px 12px',
      borderRadius: '4px',
      border: '1px solid #2f2f2f',
      background: '#1f1f1f',
      color: '#f6f6f6',
      cursor: 'pointer',
      flex: '0 0 auto'
    });
    backButton.disabled = true;
    backButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      handleChecklistBack();
    });

    const navHint = document.createElement('span');
    navHint.textContent = 'Always consult the flowchart to confirm ban time.';
    Object.assign(navHint.style, {
      fontSize: '12px',
      color: '#bbbbbb',
      flex: '1 1 auto',
      textAlign: 'right'
    });

    navRow.append(backButton, navHint);

    body.append(prompt, controls, actionDisplay, errorDisplay, navRow);
    checklistPanel.append(body);

    checklistContentEl = body;
    checklistPromptEl = prompt;
    checklistControlsEl = controls;
    checklistActionEl = actionDisplay;
    checklistErrorEl = errorDisplay;
    checklistBackButton = backButton;

    document.body.append(checklistPanel);
    attachChecklistNavigationHandlers();
    applyChecklistPanelPosition();
    return checklistPanel;
  };

  const openChecklistPanel = () => {
    const panel = ensureChecklistPanel();
    if (!panel) {
      return;
    }
    if (!checklistState) {
      resetChecklistState();
    }
    panel.style.display = 'flex';
    applyChecklistPanelPosition();
    animateChecklistOpen();
    renderChecklistState();
  };

  const toggleChecklistPanel = () => {
    if (checklistPanel) {
      destroyChecklistPanel({ animate: true });
    } else {
      openChecklistPanel();
    }
  };

  const handleChecklistButtonClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    toggleChecklistPanel();
  };

  const createChecklistAction = (text, options = {}) => ({ type: 'action', text, ...options });

  const parseNonNegativeInteger = (value) => {
    if (!Number.isFinite(value) || value < 0) {
      return null;
    }
    return Math.floor(value);
  };

  const buildActionText = (primary, notes = []) => {
    const parts = [primary, ...notes];
    return parts.map((part) => (part || '').trim()).filter(Boolean).join(' ');
  };

  const LONG_BAN_WARNING_TEXT = 'For a ban of this length, you must get approval from 2 Highish mods, or 1 HC mod.';

  // Format the ban recommendation and append any warnings required for long durations.
  const buildBanAction = (hours, extraNotes = []) => {
    const notes = [...extraNotes];
    if (!Number.isFinite(hours) || hours <= 0) {
      return createChecklistAction(buildActionText('0 hour ban.', notes));
    }
    const level = getModeratorLevel();
    let highlightText = '';
    if (hours >= 50 && (!Number.isFinite(level) || level < 8)) {
      notes.push(LONG_BAN_WARNING_TEXT);
      highlightText = LONG_BAN_WARNING_TEXT;
    }
    const actionText = buildActionText(`${hours} hour ban.`, notes);
    return createChecklistAction(actionText, highlightText ? { highlightText } : undefined);
  };

  const buildBoogAction = () => {
    const level = getModeratorLevel();
    if (Number.isFinite(level) && level >= 8) {
      return createChecklistAction('Flag for 100x hour minimum.');
    }
    return createChecklistAction('Receive verification from 4 Highish mods or 2 HC to flag. Use the ban time they recommend; baseline 200x hours.');
  };

  const buildSevereContentAction = () => {
    const level = getModeratorLevel();
    if (!Number.isFinite(level) || level < 4) {
      return createChecklistAction('Leave it alone. Bring it to mod-help and ask a higher rank mod to handle it.');
    }
    if (level < 8) {
      return createChecklistAction('1 hour ban time immediately. Bring it to mod-help and ask HC to upgrade it.');
    }
    return createChecklistAction('200 hour ban time minimum, upgrade as needed.');
  };

  const makeTargetOutcome = (target, options = {}) => ({ target, ...options });
  const TOP_POSTER_FALLBACK = { useTopPosterFallback: true };

  const evaluateTopPosterPercent = (value) => {
    if (!Number.isFinite(value) || value < 0) {
      return null;
    }
    if (value < 0.2) {
      return createChecklistAction('No ban time.');
    }
    if (value < 0.4) {
      return buildBanAction(1);
    }
    if (value < 0.6) {
      return buildBanAction(5);
    }
    if (value < 0.8) {
      return buildBanAction(10);
    }
    return buildBanAction(15);
  };

  const evaluateTwoYearFlags = (count) => {
    if (!Number.isFinite(count) || count < 0) {
      return { hours: 0, notes: [] };
    }
    if (count < 20) {
      return { hours: 0, notes: [] };
    }
    if (count === 20) {
      return { hours: 20, notes: ['In the note, inform the user the next flag will be longer.'] };
    }
    if (count <= 29) {
      return { hours: 50, notes: [] };
    }
    if (count <= 39) {
      return { hours: 100, notes: [] };
    }
    if (count <= 49) {
      return { hours: 200, notes: [] };
    }
    return { hours: 1000, notes: [] };
  };

  const getQb1Last30Result = (count) => {
    if (count <= 2) return { hours: 1, notes: [] };
    if (count <= 4) return { hours: 5, notes: [] };
    if (count <= 6) return { hours: 10, notes: [] };
    if (count <= 9) return { hours: 20, notes: [] };
    if (count <= 12) return { hours: 50, notes: [] };
    if (count === 13) return { hours: 100, notes: [] };
    if (count === 14) return { hours: 200, notes: [] };
    if (count >= 15) return { hours: 1000, notes: [] };
    return { hours: 0, notes: [] };
  };

  const getQb2Last30Result = (count) => {
    if (count <= 2) return { hours: 0, notes: [] };
    if (count <= 4) return { hours: 1, notes: [] };
    if (count <= 6) return { hours: 5, notes: [] };
    if (count <= 9) return { hours: 10, notes: [] };
    if (count <= 12) return { hours: 20, notes: [] };
    if (count === 13) return { hours: 50, notes: [] };
    if (count === 14) return { hours: 100, notes: [] };
    if (count >= 15) return { hours: 200, notes: [] };
    return { hours: 0, notes: [] };
  };

  const evaluateCombinedFlagCounts = (counts, last30Resolver) => {
    if (!counts) {
      return null;
    }
    const last30Result = last30Resolver(counts.last30);
    const twoYearResult = evaluateTwoYearFlags(counts.last2Years);
    const finalHours = Math.max(last30Result.hours, twoYearResult.hours);
    const notes = [];
    if (last30Result.hours === finalHours) {
      notes.push(...last30Result.notes);
    }
    if (twoYearResult.hours === finalHours) {
      notes.push(...twoYearResult.notes);
    }
    return buildBanAction(finalHours, notes);
  };

  const evaluateQb1 = (counts) => evaluateCombinedFlagCounts(counts, getQb1Last30Result);
  const evaluateQb2 = (counts) => evaluateCombinedFlagCounts(counts, getQb2Last30Result);

  // Declarative flow definition for the ban calculator. Each node describes its own UI.
  const CHECKLIST_FLOW = {
    Q1: {
      type: 'boolean',
      prompt: 'Did the user post something flaggable?',
      onYes: makeTargetOutcome('Q2', { requireTopPosterCheck: true }),
      onNo: makeTargetOutcome('Q3', { requireTopPosterCheck: true })
    },
    QTP1: {
      type: 'boolean',
      prompt: 'Is the user a TOP 29 content poster?',
      onYes: 'QTP2',
      onNo: TOP_POSTER_FALLBACK
    },
    QTP2: {
      type: 'choice',
      prompt: 'Which situation applies?',
      options: [
        { label: 'Blatant NSFW, excessive gore, or a reposted flag', outcome: buildBanAction(15) },
        { label: 'Loli', next: 'QL' },
        { label: 'Boog', getOutcome: () => buildBoogAction() },
        { label: 'Something else', next: 'QTPB' }
      ]
    },
    QTPB: {
      type: 'numeric',
      prompt: 'What is the user\'s percent of content flagged in the last year?',
      inputLabel: 'Percent flagged (e.g., 0.35)',
      evaluate: (value) => evaluateTopPosterPercent(value)
    },
    Q2: {
      type: 'boolean',
      prompt: 'Could they have thought it was flaggable?',
      onYes: 'QA1',
      onNo: 'Q4'
    },
    Q3: {
      type: 'boolean',
      prompt: 'Is the image on admin\'s shitlist?',
      onYes: 'Q4',
      onNo: createChecklistAction('Don\'t flag it then.')
    },
    Q4: {
      type: 'choice',
      prompt: "What's it being flagged for?",
      options: [
        { label: 'Spam, Harassment, or Illegal', next: 'QBoogCheck' },
        { label: 'NSFW or Gore', next: 'QA2' },
        { label: 'Borderline NSFW', next: 'QB2' },
        { label: 'Loli', next: 'QL' }
      ]
    },
    QA1: {
      type: 'boolean',
      prompt: 'Did they say "I hope this isn\'t flaggable"?',
      onYes: buildBanAction(20),
      onNo: 'QC1'
    },
    QA2: {
      type: 'choice',
      prompt: 'How bad was it?',
      options: [
        { label: 'Mild gore or borderline NSFW', next: 'QB2' },
        { label: 'Incidental NSFW', outcome: buildBanAction(20) },
        { label: 'Intentional blatant NSFW or excessive gore', getOutcome: () => buildSevereContentAction() }
      ]
    },
    QC1: {
      type: 'boolean',
      prompt: 'Did they say "Fuck the mods"?',
      onYes: buildBanAction(1000),
      onNo: buildBanAction(200)
    },
    QBoogCheck: {
      type: 'boolean',
      prompt: 'Is it Boog content?',
      onYes: () => buildBoogAction(),
      onNo: 'QB1'
    },
    QB1: {
      type: 'dualNumeric',
      prompt: 'Flag count check',
      inputs: [
        { key: 'last30', label: 'Flags in last 30 days' },
        { key: 'last2Years', label: 'Flags in last 2 years' }
      ],
      evaluate: (counts) => evaluateQb1(counts)
    },
    QB2: {
      type: 'dualNumeric',
      prompt: 'Flag count check',
      inputs: [
        { key: 'last30', label: 'Flags in last 30 days' },
        { key: 'last2Years', label: 'Flags in last 2 years' }
      ],
      evaluate: (counts) => evaluateQb2(counts)
    },
    QL: {
      type: 'info',
      prompt: 'Take it to #mod-lolis, use ban time recommended by NSFW mods; if ban time due to past flags is higher, use that instead.',
      buttons: [
        { label: 'Got it', next: 'QB1' }
      ]
    }
  };

  // All checklist validation errors feed into the red line under the controls.
  const setChecklistError = (message) => {
    if (checklistErrorEl) {
      checklistErrorEl.textContent = message || '';
    }
  };

  const resetChecklistState = () => {
    checklistState = {
      history: [],
      currentNodeId: 'Q1',
      currentAction: null,
      pendingAfterTopPoster: null
    };
  };

  const createChecklistAnswerButton = (label) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    Object.assign(button.style, {
      width: '100%',
      padding: '10px 12px',
      borderRadius: '4px',
      border: '1px solid #2f2f2f',
      background: '#242424',
      color: '#f5f5f5',
      cursor: 'pointer',
      fontWeight: '600',
      textAlign: 'left',
      whiteSpace: 'normal',
      lineHeight: '1.35',
      display: 'flex',
      justifyContent: 'flex-start'
    });
    return button;
  };

  const resolveOutcomeValue = (value) => (typeof value === 'function' ? value() : value);

  // Central router for the state machine; outcomes can be node ids or final actions.
  const advanceChecklistFlow = (outcome) => {
    if (!checklistState) {
      resetChecklistState();
    }
    const pushHistory = () => {
      if (checklistState && (checklistState.currentNodeId || checklistState.currentAction)) {
        checklistState.history.push({
          nodeId: checklistState.currentNodeId,
          pendingAfterTopPoster: checklistState.pendingAfterTopPoster || null
        });
      }
    };
    const resolved = resolveOutcomeValue(outcome);
    if (!resolved) {
      setChecklistError('Unable to continue from this answer.');
      return;
    }
    if (resolved && resolved.type === 'action') {
      pushHistory();
      checklistState.currentNodeId = null;
      checklistState.currentAction = resolved;
      renderChecklistState();
      return;
    }
    let targetId = null;
    if (typeof resolved === 'string') {
      targetId = resolved;
    } else if (resolved && typeof resolved === 'object') {
      if (resolved.requireTopPosterCheck) {
        if (checklistState) {
          checklistState.pendingAfterTopPoster = resolved.target || null;
        }
        targetId = 'QTP1';
      } else if (resolved.useTopPosterFallback) {
        const fallback = checklistState?.pendingAfterTopPoster || resolved.fallback || 'Q2';
        checklistState.pendingAfterTopPoster = null;
        targetId = fallback;
      } else if (resolved.target) {
        targetId = resolved.target;
      }
    }

    if (!targetId) {
      setChecklistError('Unsupported checklist target.');
      return;
    }

    if (!CHECKLIST_FLOW[targetId]) {
        setChecklistError('Checklist step is undefined.');
        return;
      }
      pushHistory();
      checklistState.currentNodeId = targetId;
      checklistState.currentAction = null;
      renderChecklistState();
      return;
  };

  const handleChecklistBack = () => {
    if (!checklistState || !checklistState.history.length) {
      return;
    }
    const previous = checklistState.history.pop();
    checklistState.currentAction = null;
    checklistState.currentNodeId = previous.nodeId || 'Q1';
    checklistState.pendingAfterTopPoster = previous.pendingAfterTopPoster || null;
    renderChecklistState();
  };

  const renderBooleanQuestion = (nodeId, node) => {
    const container = document.createElement('div');
    Object.assign(container.style, {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    });
    const yesButton = createChecklistAnswerButton(node.yesLabel || 'Yes');
    yesButton.addEventListener('click', () => {
      setChecklistError('');
      advanceChecklistFlow(resolveOutcomeValue(node.onYes));
    });
    const noButton = createChecklistAnswerButton(node.noLabel || 'No');
    noButton.addEventListener('click', () => {
      setChecklistError('');
      advanceChecklistFlow(resolveOutcomeValue(node.onNo));
    });
    container.append(yesButton, noButton);
    return container;
  };

  const renderChoiceQuestion = (nodeId, node) => {
    const container = document.createElement('div');
    Object.assign(container.style, {
      display: 'flex',
      flexDirection: 'column',
      gap: '6px'
    });
    node.options.forEach((option) => {
      const button = createChecklistAnswerButton(option.label);
      button.addEventListener('click', () => {
        setChecklistError('');
        let outcome = null;
        if (typeof option.getOutcome === 'function') {
          outcome = option.getOutcome();
        } else if (Object.prototype.hasOwnProperty.call(option, 'outcome')) {
          outcome = resolveOutcomeValue(option.outcome);
        } else if (Object.prototype.hasOwnProperty.call(option, 'next')) {
          outcome = option.next;
        } else if (Object.prototype.hasOwnProperty.call(option, 'action')) {
          outcome = option.action;
        }
        advanceChecklistFlow(outcome);
      });
      container.append(button);
    });
    return container;
  };

  const renderNumericQuestion = (nodeId, node) => {
    const container = document.createElement('div');
    Object.assign(container.style, {
      display: 'flex',
      flexDirection: 'column',
      gap: '6px'
    });
    if (node.description) {
      const info = document.createElement('div');
      info.textContent = node.description;
      info.style.fontSize = '12px';
      info.style.color = '#bbbbbb';
      container.append(info);
    }
    const label = document.createElement('label');
    label.textContent = node.inputLabel || 'Enter a number';
    const input = document.createElement('input');
    input.type = 'number';
    input.inputMode = 'decimal';
    input.placeholder = node.inputPlaceholder || '';
    input.min = '0';
    Object.assign(input.style, {
      width: '100%',
      maxWidth: '100%',
      boxSizing: 'border-box',
      padding: '6px 8px',
      borderRadius: '4px',
      border: '1px solid #333',
      background: '#0e0e0e',
      color: '#f6f6f6'
    });
    const submitButton = createChecklistAnswerButton('Submit');
    const submitValue = () => {
      if (!input.value.length) {
        setChecklistError('Enter a valid number to continue.');
        return;
      }
      const raw = Number(input.value);
      if (!Number.isFinite(raw)) {
        setChecklistError('Enter a valid number to continue.');
        return;
      }
      const result = node.evaluate(raw);
      if (!result) {
        setChecklistError('Enter a valid number to continue.');
        return;
      }
      setChecklistError('');
      advanceChecklistFlow(result);
    };
    submitButton.addEventListener('click', submitValue);
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        submitValue();
      }
    });
    container.append(label, input, submitButton);
    return container;
  };

  const renderDualNumericQuestion = (nodeId, node) => {
    const container = document.createElement('div');
    Object.assign(container.style, {
      display: 'flex',
      flexDirection: 'column',
      gap: '10px'
    });
    if (node.description) {
      const info = document.createElement('div');
      info.textContent = node.description;
      info.style.fontSize = '12px';
      info.style.color = '#bbbbbb';
      container.append(info);
    }
    const inputs = new Map();
    (node.inputs || []).forEach((inputDef) => {
      const wrapper = document.createElement('div');
      wrapper.style.display = 'flex';
      wrapper.style.flexDirection = 'column';
      wrapper.style.gap = '4px';

      const label = document.createElement('label');
      label.textContent = inputDef.label || 'Value';
      const extraLines = [];
      if (inputDef.key === 'last30') {
        const extra = document.createElement('div');
        extra.style.fontSize = '10px';
        extra.style.color = '#bbbbbb';
        extra.textContent = nodeId === 'QB1'
          ? '(spam/harassment/illegal)'
          : nodeId === 'QB2'
            ? '(bl/gore)'
            : '';
        if (extra.textContent) {
          extra.style.marginTop = '-2px';
          extraLines.push(extra);
        }
      }

      const input = document.createElement('input');
      input.type = 'number';
      input.inputMode = 'numeric';
      input.min = '0';
      input.step = '1';
      input.placeholder = inputDef.placeholder || '';
      Object.assign(input.style, {
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
        padding: '6px 8px',
        borderRadius: '4px',
        border: '1px solid #333',
        background: '#0e0e0e',
        color: '#f6f6f6'
      });

      wrapper.append(label, ...extraLines, input);
      container.append(wrapper);
      inputs.set(inputDef.key, input);
    });

    const submitButton = createChecklistAnswerButton(node.submitLabel || 'Submit');
    const submitCounts = () => {
      const values = {};
      for (const inputDef of node.inputs || []) {
        const input = inputs.get(inputDef.key);
        if (!input || !input.value.length) {
          setChecklistError('Enter valid counts for both fields.');
          return;
        }
        const parsed = Number(input.value);
        if (!Number.isFinite(parsed) || parsed < 0) {
          setChecklistError('Enter valid counts for both fields.');
          return;
        }
        values[inputDef.key] = Math.floor(parsed);
      }
      const result = node.evaluate(values);
      if (!result) {
        setChecklistError('Enter valid counts for both fields.');
        return;
      }
      setChecklistError('');
      advanceChecklistFlow(result);
    };

    submitButton.addEventListener('click', submitCounts);
    (node.inputs || []).forEach((inputDef) => {
      const input = inputs.get(inputDef.key);
      input?.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          submitCounts();
        }
      });
    });

    container.append(submitButton);
    return container;
  };

  const renderInfoNode = (nodeId, node) => {
    const container = document.createElement('div');
    Object.assign(container.style, {
      display: 'flex',
      flexDirection: 'column',
      gap: '10px'
    });
    if (node.description) {
      const info = document.createElement('div');
      info.textContent = node.description;
      info.style.fontSize = '12px';
      info.style.color = '#bbbbbb';
      container.append(info);
    }
    (node.buttons || []).forEach((buttonConfig) => {
      const button = createChecklistAnswerButton(buttonConfig.label || 'Continue');
      button.addEventListener('click', () => {
        setChecklistError('');
        let outcome = null;
        if (typeof buttonConfig.getOutcome === 'function') {
          outcome = buttonConfig.getOutcome();
        } else if (Object.prototype.hasOwnProperty.call(buttonConfig, 'outcome')) {
          outcome = resolveOutcomeValue(buttonConfig.outcome);
        } else if (Object.prototype.hasOwnProperty.call(buttonConfig, 'next')) {
          outcome = buttonConfig.next;
        }
        advanceChecklistFlow(outcome);
      });
      container.append(button);
    });
    return container;
  };

  const renderChecklistActionText = (action) => {
    if (!checklistActionEl) {
      return;
    }
    const actionText = action?.text || '';
    const highlightText = action?.highlightText;
    checklistActionEl.textContent = '';
    if (highlightText && actionText.includes(highlightText)) {
      const startIndex = actionText.indexOf(highlightText);
      const before = actionText.slice(0, startIndex);
      const after = actionText.slice(startIndex + highlightText.length);
      if (before) {
        checklistActionEl.append(document.createTextNode(before));
      }
      const warningSpan = document.createElement('span');
      warningSpan.textContent = highlightText;
      warningSpan.style.color = '#ffa31a';
      warningSpan.style.fontWeight = '600';
      checklistActionEl.append(warningSpan);
      if (after) {
        checklistActionEl.append(document.createTextNode(after));
      }
      return;
    }
    checklistActionEl.textContent = actionText;
  };

  // Synchronize the panel UI with the current node or final recommendation.
  const renderChecklistState = () => {
    if (!checklistPanel || !checklistContentEl || !checklistState) {
      return;
    }
    if (!checklistPromptEl || !checklistControlsEl || !checklistActionEl) {
      return;
    }
    checklistControlsEl.textContent = '';
    checklistActionEl.textContent = '';
    setChecklistError('');
    if (checklistState.currentAction) {
      checklistPromptEl.textContent = 'Recommended Action';
      renderChecklistActionText(checklistState.currentAction);
    } else {
      const currentId = checklistState.currentNodeId;
      const node = CHECKLIST_FLOW[currentId];
      if (!node) {
        checklistPromptEl.textContent = 'Checklist unavailable';
        checklistActionEl.textContent = 'Flow definition missing.';
      } else {
        checklistPromptEl.textContent = node.prompt;
        if (node.note) {
          checklistActionEl.textContent = node.note;
        }
        let renderedControls = null;
        if (node.type === 'boolean') {
          renderedControls = renderBooleanQuestion(currentId, node);
        } else if (node.type === 'choice') {
          renderedControls = renderChoiceQuestion(currentId, node);
        } else if (node.type === 'numeric') {
          renderedControls = renderNumericQuestion(currentId, node);
        } else if (node.type === 'dualNumeric') {
          renderedControls = renderDualNumericQuestion(currentId, node);
        } else if (node.type === 'info') {
          renderedControls = renderInfoNode(currentId, node);
        }
        if (renderedControls) {
          checklistControlsEl.append(renderedControls);
        } else {
          checklistControlsEl.textContent = 'Unable to render this question.';
        }
      }
    }
    if (checklistBackButton) {
      const disabled = !checklistState.history.length;
      checklistBackButton.disabled = disabled;
      checklistBackButton.style.opacity = disabled ? '0.5' : '1';
      checklistBackButton.style.cursor = disabled ? 'default' : 'pointer';
    }
    triggerChecklistStepAnimation();
  };

  // Inject the "Calculate Ban Time" button beneath the flag notes field.
  const ensureChecklistButton = (form) => {
    if (!form || form.querySelector(`#${CHECKLIST_BUTTON_ID}`)) {
      return;
    }
    const noteInput = form.querySelector(NOTE_INPUT_SELECTOR);
    if (!noteInput) {
      return;
    }
    const noteLabel = noteInput.closest('label') || noteInput.parentElement;
    if (!noteLabel || !noteLabel.parentElement) {
      return;
    }

    const wrapper = document.createElement('div');
    wrapper.dataset.fjfeChecklistWrapper = '1';
    wrapper.style.textAlign = 'center';
    wrapper.style.margin = '4px 0 8px';

    const button = document.createElement('button');
    button.id = CHECKLIST_BUTTON_ID;
    button.type = 'button';
    button.textContent = 'Calculate Ban Time';
    const resolvedWidth = resolveNoteInputWidth(noteInput);
    Object.assign(button.style, {
      width: resolvedWidth,
      maxWidth: resolvedWidth,
      display: 'inline-block',
      padding: '6px 10px',
      border: '1px solid #8b0000',
      borderRadius: '4px',
      background: '#b22222',
      color: '#ffffff',
      font: "600 13px 'Segoe UI', sans-serif",
      cursor: 'pointer'
    });
    button.addEventListener('click', handleChecklistButtonClick);

    wrapper.append(button);
    noteLabel.insertAdjacentElement('afterend', wrapper);
  };

  // Iterate every open flag form and attach the calculator button.
  const enhanceFlagMenus = () => {
    const forms = document.querySelectorAll(FLAG_FORM_SELECTOR);
    forms.forEach((form) => ensureChecklistButton(form));
  };

  // Collect totals then hydrate/inject the summary row into a single table instance.
  const renderSummary = (table) => {
    if (!table) {
      return;
    }
    const summary = summarizeEntries(table);
    const row = ensureSummaryRow(table);
    updateSummaryRow(row, table, summary);
  };

  // Multiple history dialogs can exist; rescan each during DOM mutations.
  const scanHistoryDialogs = () => {
    const dialogs = document.querySelectorAll('#PT_HistoryDialog');
    dialogs.forEach((dialog) => {
      const table = dialog.querySelector('table');
      if (table) {
        renderSummary(table);
      }
    });
  };

  // Summary + checklist both depend on DOM availability, so scan conditionally.
  const scanActiveUIs = () => {
    if (!hasActiveFeatures()) {
      return;
    }
    if (summaryEnabled) {
      scanHistoryDialogs();
    }
    if (checklistEnabled) {
      enhanceFlagMenus();
    }
  };

  // Debounce scans so bursty mutations do not thrash the UI.
  const scheduleUiScan = () => {
    if (!hasActiveFeatures()) {
      return;
    }
    if (scanTimer) {
      clearTimeout(scanTimer);
    }
    scanTimer = window.setTimeout(() => {
      scanTimer = null;
      scanActiveUIs();
    }, SCAN_DEBOUNCE_MS);
  };

  // MutationObserver callback – just note whether any nodes were added and rescan.
  const handleMutations = (mutations) => {
    if (!mutations || !hasActiveFeatures()) {
      return;
    }
    let shouldScan = false;
    for (const mutation of mutations) {
      if (mutation.type !== 'childList') {
        continue;
      }
      if (mutation.addedNodes?.length) {
        shouldScan = true;
        break;
      }
    }
    if (shouldScan) {
      scheduleUiScan();
    }
  };

  // Attach MutationObserver lazily so idle pages do not pay the cost.
  const startObserver = () => {
    if (observer || !document.body) {
      scanActiveUIs();
      return;
    }
    observer = new MutationObserver(handleMutations);
    observer.observe(document.body, { childList: true, subtree: true });
    scanActiveUIs();
  };

  // Disconnect MutationObserver + timers so background tabs stay quiet.
  const stopObserver = () => {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    if (scanTimer) {
      clearTimeout(scanTimer);
      scanTimer = null;
    }
  };

  // When a user disables the summary, strip all injected rows immediately.
  const removeSummaryRows = () => {
    document.querySelectorAll(`#${SUMMARY_ROW_ID}`).forEach((row) => {
      try {
        row.remove();
      } catch (_) {}
    });
  };

  // Ditto for the calculator buttons/panel.
  const removeChecklistButtons = () => {
    document.querySelectorAll(`#${CHECKLIST_BUTTON_ID}`).forEach((button) => {
      const wrapper = button.parentElement;
      if (wrapper && wrapper.dataset?.fjfeChecklistWrapper === '1') {
        try {
          wrapper.remove();
        } catch (_) {}
      } else {
        try {
          button.remove();
        } catch (_) {}
      }
    });
    destroyChecklistPanel({ resetPosition: true });
  };

  // Settings toggles allow either feature to be switched off without reloading the page.
  // Apply user toggles at runtime and start/stop observers as needed.
  const applySettings = (settings = {}) => {
    const nextSummaryEnabled = coerceSettingEnabled(settings[FLAG_SUMMARY_SETTING_KEY]);
    const nextChecklistEnabled = coerceSettingEnabled(settings[BAN_CALCULATOR_SETTING_KEY]);
    if (nextSummaryEnabled === summaryEnabled && nextChecklistEnabled === checklistEnabled) {
      return;
    }
    summaryEnabled = nextSummaryEnabled;
    checklistEnabled = nextChecklistEnabled;

    if (hasActiveFeatures()) {
      startObserver();
      scheduleUiScan();
    } else {
      stopObserver();
    }

    if (!summaryEnabled) {
      removeSummaryRows();
    }
    if (!checklistEnabled) {
      removeChecklistButtons();
    }
  };

  // fjTweakerSettingsChanged fires whenever SEL toggles change; mirror them here.
  const handleSettingsChanged = (event) => {
    applySettings(event?.detail || window.fjTweakerSettings || {});
  };

  // Entry point: wire listeners + seed state once the host is correct.
  const init = () => {
    if (initialized || !isTargetHost()) {
      return;
    }
    initialized = true;
    document.addEventListener('fjApichkStatus', handleApichkStatus);
    cacheModeratorLevel(window.fjApichk && typeof window.fjApichk.getLevel === 'function' ? window.fjApichk.getLevel() : null);
    requestModeratorLevelUpdate();
    document.addEventListener('fjTweakerSettingsChanged', handleSettingsChanged);
    applySettings(window.fjTweakerSettings || {});
    if (hasActiveFeatures()) {
      startObserver();
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
