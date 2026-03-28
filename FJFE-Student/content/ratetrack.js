(() => {
  console.log('[FJFE-Student][ratetrack] script loaded on', window.location.href);

  /*
   * Rate counter widget.
   * Tracks how many pieces of content you've rated, keeps a draggable
   * floating panel, and syncs edits with chrome.storage/localStorage.
   */
  const targetHost = 'funnyjunk.com';
  const MODULE_KEY = 'ratetrack';
  const COUNT_KEY = 'fjTweakerRateCounter';
  const COUNT_EDITS_KEY = 'fjTweakerRateCountEdits';
  const PANEL_POSITION_KEY = 'fjTweakerRatePanelPosition';
  const PANEL_LOCK_KEY = 'fjTweakerRatePanelLocked';
  const SKIN_BUTTON_IDS = ['skinLevel1', 'skinLevel2', 'skinLevel3'];
  const PANEL_MARGIN = 12;
  const QUICK_MENU_ID = 'quickM';
  const QUICK_BUTTON_SELECTOR = '.ctButton4';
  const HISTORY_MAX_ENTRIES = 100;
  const HISTORY_VISIBLE_COUNT = 5;
  const HISTORY_MENU_ANIM_MS = 160;
  const HISTORY_STORAGE_KEY = 'fjTweakerRateHistory';
  const HISTORY_DROPDOWN_GAP = 4;
  const HISTORY_DROPDOWN_MIN_TOP = 32;
  const HISTORY_DROPDOWN_OVERLAP = 14;
  const HISTORY_DROPDOWN_PADDING_TOP = 22;
  const RATE_HISTORY_BUFFER_MS = 60 * 60 * 1000;
  const RATE_HISTORY_URL_BASE = 'https://fjme.me/mods/ratings';
  const PANEL_Z_INDEX = 2147483646;
  const PANEL_VERTICAL_BUFFER = 24;
  const RATE_FAILURE_MESSAGE = 'Rate upload failed. Retrying once in 5 seconds...';
  const RATE_FAILURE_WINDOW_MS = 3000;
  const RATE_FAILURE_PATTERNS = Array.from(new Set([
    'rate upload failed',
    RATE_FAILURE_MESSAGE.toLowerCase()
  ]));
  const RATE_FAILURE_METHODS = ['error', 'warn', 'log', 'info', 'debug'];
  const RATE_LIMIT_EVENT = 'fjfe:rateLimited';
  const RATE_LIMIT_MESSAGE_TYPE = 'fjfe-rate-limit-detected';
  const RATE_LIMIT_BRIDGE_ATTR = 'data-fjfe-rate-limit-hook';
  const RATE_LIMIT_BRIDGE_PATH = 'content/rate-limit-bridge.js';
  const RATE_LIMIT_BRIDGE_DATA_KEY = 'fjfeRateLimitConfig';
  const RATE_LIMIT_EVENT_ORIGIN_PAGE = 'page';
  const SCROLLBAR_STYLE_ID = 'fjfe-ratetrack-scrollbar-style';
  const ASSIST_WRAPPER_ID = 'fj-assist-buttons';
  const ASSIST_ANCHOR_ATTR = 'fjAssistAnchor';
  const ASSIST_BUTTON_ID = 'fj-assist-ratetrack-button';
  const ASSIST_BUTTON_ORDER = 4;
  const ASSIST_ICON_PATH = 'icons/ratetracker.png';
  const TOGGLE_STORAGE_KEY = 'fjTweakerRateTrackToggle';
  const ASSIST_GLOW_COLOR = 'rgba(255, 215, 64, 0.75)';
  const RATE_REVIEW_ACTIONS_CLASS = 'fjfe-rate-review-actions';
  const RATE_REVIEW_FLAG_LABEL = 'Flaggable';
  const RATE_REVIEW_REASON_GROUPS = [
    ['Skin 1', 'Skin 2', 'Skin 3'],
    ['PC 1', 'PC 2', 'Glow'],
    ['Politics', 'Anime', 'Gaming', 'Spicy', 'Comics/Art', 'Meta', 'Other/Memes'],
    [RATE_REVIEW_FLAG_LABEL]
  ];
  const RATE_REVIEW_REASON_ROWS = {
    SKIN: 0,
    PC: 1,
    CATEGORY: 2,
    FLAG: 3
  };
  const CATEGORY_MULTISELECT_LABELS = new Set(['spicy', 'meta']);
  const CATEGORY_OTHER_MEMES_LABEL = 'other/memes';
  const extractHeadingTitle = () => {
    try {
      const heading = document.querySelector('h1.contentTitle');
      if (!heading) {
        return '';
      }
      const clone = heading.cloneNode(true);
      const buttons = clone.querySelectorAll('button');
      buttons.forEach((button) => {
        try {
          button.remove();
        } catch (_) {}
      });
      const raw = (clone.textContent || clone.innerText || '').replace(/\s+/g, ' ').trim();
      return raw;
    } catch (_) {
      return '';
    }
  };

  const getResourceUrl = (resourcePath) => {
    try {
      if (chrome?.runtime?.getURL) {
        return chrome.runtime.getURL(resourcePath);
      }
    } catch (_) {}
    return resourcePath;
  };

  const isAssistElementVisible = (el) => {
    if (!el) return false;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    if (Number(style.opacity) === 0) return false;
    if (el.offsetParent === null && style.position !== 'fixed') return false;
    return true;
  };

  const findAssistSearchButton = () => {
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
    const visible = candidates.find(isAssistElementVisible);
    if (visible) return visible;
    return candidates[0] || null;
  };

  const isAssistCompressedAnchor = (searchButton) => (
    searchButton && (searchButton.classList.contains('fjse') || (searchButton.tagName === 'A' && searchButton.closest('.userbarBttn')))
  );

  const positionAssistCompressedWrapper = (wrapper, anchor) => {
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

  const applyAssistButtonStyling = (button, searchButton) => {
    if (!button || !searchButton) return;
    const searchStyle = window.getComputedStyle(searchButton);
    button.className = searchButton.className || '';
    if (searchButton.getAttribute('style')) {
      button.style.cssText = searchButton.getAttribute('style');
    }
    const sizeProps = ['width', 'height', 'minWidth', 'minHeight', 'padding', 'borderRadius', 'font', 'lineHeight'];
    sizeProps.forEach((prop) => {
      const value = searchStyle[prop];
      if (value && value !== 'auto') {
        button.style[prop] = value;
      }
    });
    button.style.display = 'inline-flex';
    button.style.alignItems = 'center';
    button.style.justifyContent = 'center';
    button.style.overflow = 'visible';
    const size = parseFloat(searchStyle.height) || parseFloat(searchStyle.width) || 28;
    button.style.width = `${size}px`;
    button.style.height = `${size}px`;
    button.style.minWidth = `${size}px`;
    button.style.minHeight = `${size}px`;
    button.style.padding = '0';
    button.style.borderRadius = '6px';
    button.style.backgroundRepeat = 'no-repeat';
    button.style.backgroundPosition = 'center';
    button.style.backgroundSize = '70% 70%';
    if (!button.dataset.fjAssistBaseShadow) {
      button.dataset.fjAssistBaseShadow = 'inset 0 0 0 1px rgba(255, 255, 255, 0.12)';
    }
    if (!button.dataset.fjAssistBaseFilter) {
      button.dataset.fjAssistBaseFilter = button.style.filter || '';
    }
    button.style.boxShadow = button.dataset.fjAssistBaseShadow;
    button.style.transition = 'transform 120ms ease, box-shadow 180ms ease, filter 180ms ease';
    button.style.transformOrigin = 'center';
    if (!button.dataset.fjAssistPressBound) {
      button.dataset.fjAssistPressBound = '1';
      button.addEventListener('pointerdown', () => {
        button.style.transform = 'scale(0.92)';
      });
      ['pointerup', 'pointerleave', 'pointercancel', 'blur'].forEach((evt) => {
        button.addEventListener(evt, () => {
          button.style.transform = '';
        });
      });
    }
  };

  const applyAssistIconButtonStyling = (button, searchButton, options) => {
    if (!button) return;
    applyAssistButtonStyling(button, searchButton);
    if (!options) return;
    if (options.background) button.style.backgroundColor = options.background;
    if (options.border) button.style.borderColor = options.border;
    if (options.color) button.style.color = options.color;
    if (options.iconPath) {
      button.style.backgroundImage = `url(${getResourceUrl(options.iconPath)})`;
    }
  };

  const loadToggleEnabled = () => {
    try {
      const raw = localStorage.getItem(TOGGLE_STORAGE_KEY);
      if (raw === null) {
        return true;
      }
      return raw === '1';
    } catch (_) {
      return true;
    }
  };

  const persistToggleEnabled = () => {
    try {
      if (toggleEnabled) {
        localStorage.setItem(TOGGLE_STORAGE_KEY, '1');
      } else {
        localStorage.setItem(TOGGLE_STORAGE_KEY, '0');
      }
    } catch (_) {}
  };

  const setAssistButtonActive = (active) => {
    if (!assistButton) return;
    const baseShadow = assistButton.dataset.fjAssistBaseShadow || '';
    const baseFilter = assistButton.dataset.fjAssistBaseFilter || '';
    if (active) {
      assistButton.style.filter = 'brightness(1.2) saturate(1.1)';
      assistButton.style.boxShadow = `0 0 10px ${ASSIST_GLOW_COLOR}, 0 0 18px ${ASSIST_GLOW_COLOR}, ${baseShadow}`;
    } else {
      assistButton.style.filter = baseFilter;
      assistButton.style.boxShadow = baseShadow;
    }
  };

  const ensureAssistWrapper = () => {
    let wrapper = document.getElementById(ASSIST_WRAPPER_ID);
    const currentAnchor = document.querySelector('[data-fj-assist-anchor="1"]');
    let anchor = currentAnchor && isAssistElementVisible(currentAnchor) ? currentAnchor : null;
    if (!anchor) {
      anchor = findAssistSearchButton();
    }
    if (wrapper && anchor) {
      if (currentAnchor && currentAnchor !== anchor) {
        delete currentAnchor.dataset[ASSIST_ANCHOR_ATTR];
      }
      anchor.dataset[ASSIST_ANCHOR_ATTR] = '1';
      wrapper.style.marginLeft = '6px';
      wrapper.style.position = 'relative';
      wrapper.style.gap = '6px';
      wrapper.style.zIndex = '999';
      wrapper.style.overflow = 'visible';
      wrapper.style.paddingRight = '12px';
      wrapper.style.left = '';
      wrapper.style.top = '';
      anchor.insertAdjacentElement('afterend', wrapper);
      return { wrapper, anchor };
    }

    const searchButton = anchor || findAssistSearchButton();
    if (!searchButton) return null;

    if (!wrapper) {
      wrapper = document.createElement('div');
      wrapper.id = ASSIST_WRAPPER_ID;
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

    const previousAnchor = currentAnchor || document.querySelector('[data-fj-assist-anchor="1"]');
    if (previousAnchor && previousAnchor !== searchButton) {
      delete previousAnchor.dataset[ASSIST_ANCHOR_ATTR];
    }
    searchButton.dataset[ASSIST_ANCHOR_ATTR] = '1';
    wrapper.style.marginLeft = '6px';
    wrapper.style.position = 'relative';
    wrapper.style.gap = '6px';
    wrapper.style.zIndex = '999';
    wrapper.style.left = '';
    wrapper.style.top = '';
    searchButton.insertAdjacentElement('afterend', wrapper);

    return { wrapper, anchor: searchButton };
  };

  let assistButton = null;
  let assistRefreshScheduled = false;
  let assistRefreshBound = false;

  const scheduleAssistRefresh = () => {
    if (assistRefreshScheduled) return;
    assistRefreshScheduled = true;
    requestAnimationFrame(() => {
      assistRefreshScheduled = false;
      if (settingEnabled) {
        ensureAssistButton();
      }
    });
  };

  const bindAssistRefresh = () => {
    if (assistRefreshBound) return;
    assistRefreshBound = true;
    window.addEventListener('resize', scheduleAssistRefresh, { passive: true });
    window.addEventListener('scroll', scheduleAssistRefresh, { passive: true });
  };

  const ensureAssistButton = () => {
    const wrapperInfo = ensureAssistWrapper();
    if (!wrapperInfo) return;
    const { wrapper, anchor } = wrapperInfo;
    if (!assistButton) {
      assistButton = document.getElementById(ASSIST_BUTTON_ID);
    }
    if (!assistButton) {
      assistButton = document.createElement('button');
      assistButton.type = 'button';
      assistButton.id = ASSIST_BUTTON_ID;
      assistButton.setAttribute('aria-label', 'Rate Tracker');
      assistButton.setAttribute('title', 'Rate Tracker');
    }
    applyAssistIconButtonStyling(assistButton, anchor, {
      background: '#8a6a00',
      border: '#6b5200',
      color: '#fff6d1',
      iconPath: ASSIST_ICON_PATH
    });
    assistButton.style.order = String(ASSIST_BUTTON_ORDER);
    setAssistButtonActive(toggleEnabled);
    if (!wrapper.contains(assistButton)) {
      wrapper.appendChild(assistButton);
    }
    if (!assistButton.dataset.fjAssistBound) {
      assistButton.dataset.fjAssistBound = '1';
      assistButton.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        toggleEnabled = !toggleEnabled;
        persistToggleEnabled();
        setAssistButtonActive(toggleEnabled);
        applySetting(settingEnabled);
      });
    }
  };

  const removeAssistButton = () => {
    const wrapper = document.getElementById(ASSIST_WRAPPER_ID);
    const anchor = document.querySelector('[data-fj-assist-anchor="1"]');
    if (assistButton && assistButton.parentElement) {
      assistButton.remove();
    }
    assistButton = null;
    if (wrapper && wrapper.children.length === 0) {
      if (anchor) {
        delete anchor.dataset[ASSIST_ANCHOR_ATTR];
      }
      wrapper.remove();
    }
  };

  const createRateReviewPrimaryButton = (label, colors = {}) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    const {
      background = '#1c1c1c',
      hover = '#272727',
      border = '#333333',
      text = '#f6f6f6'
    } = colors;
    Object.assign(button.style, {
      width: 'auto',
      maxWidth: '180px',
      alignSelf: 'flex-start',
      minHeight: '28px',
      padding: '5px 10px',
      borderRadius: '4px',
      border: `1px solid ${border}`,
      background,
      color: text,
      fontSize: '11px',
      fontWeight: '600',
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      cursor: 'pointer',
      transition: 'background 0.15s ease, transform 0.15s ease',
      boxShadow: '0 3px 10px rgba(0, 0, 0, 0.25)'
    });
    button.dataset.fjfeBaseBackground = background;
    button.dataset.fjfeBaseBorder = border;
    button.dataset.fjfeHoverBackground = hover;
    button.dataset.fjfeLockedHighlight = '0';
    button.addEventListener('pointerdown', (event) => {
      event.stopPropagation();
      button.style.transform = 'scale(0.98)';
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((evt) => {
      button.addEventListener(evt, () => {
        button.style.transform = '';
      });
    });
    button.addEventListener('mouseenter', () => {
      if (button.dataset.fjfeLockedHighlight === '1') {
        return;
      }
      button.style.background = button.dataset.fjfeHoverBackground || hover;
    });
    button.addEventListener('mouseleave', () => {
      if (button.dataset.fjfeLockedHighlight === '1') {
        return;
      }
      button.style.background = button.dataset.fjfeBaseBackground || background;
      button.style.borderColor = button.dataset.fjfeBaseBorder || border;
    });
    return button;
  };

  const setReasonButtonSelected = (button, selected) => {
    if (!button) {
      return;
    }
    button.dataset.fjfeSelected = selected ? '1' : '0';
    if (selected) {
      button.style.background = '#5a1b1b';
      button.style.borderColor = '#8a2a2a';
    } else {
      button.style.background = '#2a2a2a';
      button.style.borderColor = '#3a3a3a';
    }
  };

  const normalizeReasonLabel = (value) => {
    if (typeof value !== 'string') {
      return '';
    }
    const normalized = value.trim().toLowerCase();
    if (!normalized) {
      return '';
    }
    const squashed = normalized.replace(/[^a-z]/g, '');
    if (squashed === 'othermemes') {
      return CATEGORY_OTHER_MEMES_LABEL;
    }
    return normalized;
  };

  const handleCategoryReasonButtonClick = (button, buttons, currentlySelected) => {
    const normalizedLabel = normalizeReasonLabel(button.dataset.fjfeLabel || '');
    const rowIndex = button.dataset.fjfeRowIndex;
    const deselectByPredicate = (predicate) => {
      buttons.forEach((other) => {
        if (other === button) {
          return;
        }
        if (typeof predicate === 'function' && !predicate(other)) {
          return;
        }
        setReasonButtonSelected(other, false);
      });
    };

    if (CATEGORY_MULTISELECT_LABELS.has(normalizedLabel)) {
      const nextSelected = !currentlySelected;
      setReasonButtonSelected(button, nextSelected);
      if (nextSelected) {
        deselectByPredicate((candidate) => candidate.dataset.fjfeRowIndex === rowIndex && normalizeReasonLabel(candidate.dataset.fjfeLabel || '') === CATEGORY_OTHER_MEMES_LABEL);
      }
      return true;
    }

    if (normalizedLabel === CATEGORY_OTHER_MEMES_LABEL) {
      if (currentlySelected) {
        setReasonButtonSelected(button, false);
        return true;
      }
      deselectByPredicate((candidate) => candidate.dataset.fjfeRowIndex === rowIndex);
      setReasonButtonSelected(button, true);
      return true;
    }

    if (currentlySelected) {
      setReasonButtonSelected(button, false);
      return true;
    }

    deselectByPredicate((candidate) => {
      if (candidate.dataset.fjfeRowIndex !== rowIndex) {
        return false;
      }
      const candidateLabel = normalizeReasonLabel(candidate.dataset.fjfeLabel || '');
      if (CATEGORY_MULTISELECT_LABELS.has(candidateLabel)) {
        return false;
      }
      return true;
    });
    setReasonButtonSelected(button, true);
    return true;
  };

  const createRateReviewReasonButton = (label, { rowIndex, getButtons }) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    Object.assign(button.style, {
      padding: '5px 9px',
      borderRadius: '6px',
      border: '1px solid #3a3a3a',
      background: '#2a2a2a',
      color: '#f6f6f6',
      fontSize: '10px',
      fontWeight: '500',
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
      cursor: 'pointer',
      transition: 'background 0.15s ease, border-color 0.15s ease',
      whiteSpace: 'nowrap',
      flex: '0 0 auto'
    });
    button.dataset.fjfeRowIndex = String(rowIndex);
    button.dataset.fjfeLabel = label;
    setReasonButtonSelected(button, false);
    button.addEventListener('pointerdown', (event) => {
      event.stopPropagation();
    });
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const buttons = typeof getButtons === 'function' ? getButtons() : [];
      const isFlagButton = label === RATE_REVIEW_FLAG_LABEL;
      const currentlySelected = button.dataset.fjfeSelected === '1';
      const isCategoryRow = button.dataset.fjfeRowIndex === String(RATE_REVIEW_REASON_ROWS.CATEGORY);
      if (isFlagButton) {
        if (currentlySelected) {
          setReasonButtonSelected(button, false);
          return;
        }
        buttons.forEach((other) => {
          if (other !== button) {
            setReasonButtonSelected(other, false);
          }
        });
        setReasonButtonSelected(button, true);
        return;
      }
      const flagButton = buttons.find((other) => other.dataset.fjfeLabel === RATE_REVIEW_FLAG_LABEL);
      if (flagButton) {
        setReasonButtonSelected(flagButton, false);
      }
      if (isCategoryRow) {
        const handled = handleCategoryReasonButtonClick(button, buttons, currentlySelected);
        if (handled) {
          return;
        }
      }
      if (currentlySelected) {
        setReasonButtonSelected(button, false);
        return;
      }
      buttons.forEach((other) => {
        if (other !== button && other.dataset.fjfeRowIndex === String(rowIndex)) {
          setReasonButtonSelected(other, false);
        }
      });
      setReasonButtonSelected(button, true);
    });
    return button;
  };

  const setCategorySelections = (labels) => {
    const inputList = Array.isArray(labels)
      ? labels
      : (typeof labels === 'string' && labels ? [labels] : []);
    const normalizedRequested = inputList
      .map((value) => normalizeReasonLabel(value))
      .filter(Boolean);
    let targets;
    if (normalizedRequested.length === 0) {
      targets = new Set();
    } else if (normalizedRequested.includes(CATEGORY_OTHER_MEMES_LABEL)) {
      targets = new Set([CATEGORY_OTHER_MEMES_LABEL]);
    } else {
      targets = new Set();
      let nonMultiConsumed = false;
      normalizedRequested.forEach((label) => {
        if (CATEGORY_MULTISELECT_LABELS.has(label)) {
          targets.add(label);
          return;
        }
        if (nonMultiConsumed) {
          return;
        }
        targets.add(label);
        nonMultiConsumed = true;
      });
    }
    let changed = false;
    rateReviewReasonButtons.forEach((button) => {
      if (button.dataset.fjfeRowIndex !== String(RATE_REVIEW_REASON_ROWS.CATEGORY)) {
        return;
      }
      const normalizedLabel = normalizeReasonLabel(button.dataset.fjfeLabel || '');
      const shouldSelect = targets.has(normalizedLabel);
      const currentlySelected = button.dataset.fjfeSelected === '1';
      if (shouldSelect !== currentlySelected) {
        setReasonButtonSelected(button, shouldSelect);
        changed = true;
      }
    });
    return changed;
  };

  const setReasonRowSelection = (rowIndex, label) => {
    if (!Array.isArray(rateReviewReasonButtons) || !rateReviewReasonButtons.length) {
      return false;
    }
    if (rowIndex === RATE_REVIEW_REASON_ROWS.CATEGORY && (Array.isArray(label) || typeof label === 'string')) {
      return setCategorySelections(label);
    }
    const normalizedRow = String(rowIndex);
    const normalizedLabel = typeof label === 'string' ? label.trim().toLowerCase() : '';
    let changed = false;
    rateReviewReasonButtons.forEach((button) => {
      if (button.dataset.fjfeRowIndex !== normalizedRow) {
        return;
      }
      const buttonLabel = (button.dataset.fjfeLabel || '').trim().toLowerCase();
      const shouldSelect = normalizedLabel && buttonLabel === normalizedLabel;
      const currentlySelected = button.dataset.fjfeSelected === '1';
      if ((!normalizedLabel && currentlySelected) || shouldSelect !== currentlySelected) {
        setReasonButtonSelected(button, shouldSelect);
        changed = true;
      }
    });
    return changed;
  };

  const applySavedRejectDetailsToUi = (details, setRejectExpanded) => {
    if (!details || typeof details !== 'object') {
      return;
    }
    const selections = details.reasonSelections || {};
    let mutated = false;
    if (selections.skin) {
      mutated = setReasonRowSelection(RATE_REVIEW_REASON_ROWS.SKIN, selections.skin) || mutated;
    }
    if (selections.pc) {
      mutated = setReasonRowSelection(RATE_REVIEW_REASON_ROWS.PC, selections.pc) || mutated;
    }
    if (selections.category) {
      mutated = setReasonRowSelection(RATE_REVIEW_REASON_ROWS.CATEGORY, selections.category) || mutated;
    }
    if (typeof selections.flag === 'boolean') {
      const appliedFlag = setReasonRowSelection(
        RATE_REVIEW_REASON_ROWS.FLAG,
        selections.flag ? RATE_REVIEW_FLAG_LABEL : ''
      );
      mutated = appliedFlag || mutated;
    }
    if (details.note && rateReviewRejectNoteInput) {
      rateReviewRejectNoteInput.value = details.note;
      mutated = true;
    }
    if (mutated && typeof setRejectExpanded === 'function') {
      setRejectExpanded(true);
    }
  };

  const hydrateRateReviewRejectUi = async (setRejectExpanded) => {
    try {
      const currentUrl = normalizeQueueUrl(window.location.href);
      if (!currentUrl) {
        return;
      }
      if (rateReviewRejectHydratedUrl === currentUrl) {
        return;
      }
      const entry = await getQueueEntryForCurrentUrl();
      rateReviewRejectHydratedUrl = currentUrl;
      if (!entry || entry.status !== QUEUE_STATUS.REJECTED || !entry.rejectDetails) {
        return;
      }
      applySavedRejectDetailsToUi(entry.rejectDetails, setRejectExpanded);
    } catch (_) {}
  };

  const RATE_REVIEW_LEGACY_LABELS = ['acknowledge', 'stop review'];
  const BATCH_ASSIST_TOGGLE_KEY = 'fjTweakerBatchAssistToggle';
  let batchAssistToggleEnabled = false;
  const loadBatchAssistToggle = () => {
    try {
      return localStorage.getItem(BATCH_ASSIST_TOGGLE_KEY) === '1';
    } catch (_) {
      return false;
    }
  };
  const isBatchAssistSettingEnabled = () => Boolean(window.fjTweakerSettings?.batchAssist);
  const isBatchAssistEnabled = () => isBatchAssistSettingEnabled() && batchAssistToggleEnabled;


  const getSelectedReasonLabelsByRow = (rowIndex) => {
    if (!rateReviewReasonButtons.length) {
      return [];
    }
    return rateReviewReasonButtons
      .filter((candidate) => candidate?.dataset?.fjfeRowIndex === String(rowIndex) && candidate.dataset.fjfeSelected === '1')
      .map((button) => (button?.dataset?.fjfeLabel || '').trim())
      .filter(Boolean);
  };

  const getSelectedReasonLabelByRow = (rowIndex) => {
    const labels = getSelectedReasonLabelsByRow(rowIndex);
    return labels.length ? labels[0] : '';
  };

  const normalizeSkinValue = (label) => {
    if (!label) {
      return '';
    }
    const match = label.match(/(\d+)/);
    if (match) {
      return match[1];
    }
    const stripped = label.replace(/skin/gi, '').trim();
    return stripped || label.trim();
  };

  const normalizePcValue = (label) => {
    if (!label) {
      return '';
    }
    if (/glow/i.test(label)) {
      return 'Glow';
    }
    const match = label.match(/(\d+)/);
    if (match) {
      return match[1];
    }
    const stripped = label.replace(/pc/gi, '').trim();
    return stripped || label.trim();
  };

  const normalizeCategoryValues = (value) => {
    if (!value) {
      return [];
    }
    const list = Array.isArray(value) ? value : [value];
    return list
      .map((label) => (label || '').replace(/\s+/g, ' ').trim())
      .filter(Boolean);
  };

  const buildRateReviewRejectSummary = () => {
    const snapshot = {
      skin: normalizeSkinValue(getSkinLabel()),
      pc: normalizePcValue(getPcLabel()),
      categories: normalizeCategoryValues(getCategoryLabels())
    };

    const overrideSkin = normalizeSkinValue(getSelectedReasonLabelByRow(RATE_REVIEW_REASON_ROWS.SKIN));
    const overridePc = normalizePcValue(getSelectedReasonLabelByRow(RATE_REVIEW_REASON_ROWS.PC));
    const overrideCategoryLabels = getSelectedReasonLabelsByRow(RATE_REVIEW_REASON_ROWS.CATEGORY);
    const overrideCategories = normalizeCategoryValues(overrideCategoryLabels);
    const flagSelected = getSelectedReasonLabelByRow(RATE_REVIEW_REASON_ROWS.FLAG) === RATE_REVIEW_FLAG_LABEL;
    const hasRejectSelections = Boolean(
      overrideSkin ||
      overridePc ||
      overrideCategories.length ||
      flagSelected
    );

    if (flagSelected) {
      return {
        summaryText: RATE_REVIEW_FLAG_LABEL,
        segments: [{ text: RATE_REVIEW_FLAG_LABEL, overridden: false }]
      };
    }

    if (!hasRejectSelections) {
      return {
        summaryText: '',
        segments: []
      };
    }

    const segments = [];
    const pushSegment = (value, overridden = false) => {
      if (typeof value !== 'string') {
        return;
      }
      const text = value.trim();
      if (!text) {
        return;
      }
      segments.push({ text, overridden });
    };

    pushSegment(overrideSkin || snapshot.skin, Boolean(overrideSkin));
    pushSegment(overridePc || snapshot.pc, Boolean(overridePc));

    const categoryValues = overrideCategories.length ? overrideCategories : snapshot.categories;
    const categoriesOverridden = overrideCategories.length > 0;
    categoryValues.forEach((category) => pushSegment(category, categoriesOverridden));

    if (!segments.length) {
      return null;
    }

    return {
      summaryText: segments.map((segment) => segment.text).join('/'),
      segments
    };
  };

  const captureRateReviewReasonSelections = () => {
    const selectLabel = (rowIndex) => {
      const label = getSelectedReasonLabelByRow(rowIndex);
      return label ? label.trim() : '';
    };
    const selections = {};
    const skin = selectLabel(RATE_REVIEW_REASON_ROWS.SKIN);
    if (skin) {
      selections.skin = skin;
    }
    const pc = selectLabel(RATE_REVIEW_REASON_ROWS.PC);
    if (pc) {
      selections.pc = pc;
    }
    const categorySelections = getSelectedReasonLabelsByRow(RATE_REVIEW_REASON_ROWS.CATEGORY);
    if (categorySelections.length === 1) {
      selections.category = categorySelections[0];
    } else if (categorySelections.length > 1) {
      selections.category = categorySelections.slice();
    }
    if (getSelectedReasonLabelByRow(RATE_REVIEW_REASON_ROWS.FLAG) === RATE_REVIEW_FLAG_LABEL) {
      selections.flag = true;
    }
    return selections;
  };

  const getRateReviewRejectNoteValue = () => (rateReviewRejectNoteInput?.value || '').trim();
  const getRateReviewApproveNoteValue = () => (rateReviewApproveNoteInput?.value || '').trim();

  const copyTextToClipboard = async (text) => {
    if (!text) {
      return false;
    }
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (_) {}
    try {
      if (typeof document === 'undefined') {
        return false;
      }
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.top = '-9999px';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const success = document.execCommand('copy');
      textarea.remove();
      return success;
    } catch (_) {
      return false;
    }
  };

  const showRateReviewRejectHelperMessage = (message, tone = 'info') => {
    if (!rateReviewRejectHelper) {
      return;
    }
    const colors = {
      error: '#ffb1b1',
      success: '#b5f7c8',
      info: '#d4d4d4'
    };
    rateReviewRejectHelper.textContent = message || '';
    rateReviewRejectHelper.style.opacity = message ? '1' : '0';
    rateReviewRejectHelper.style.color = colors[tone] || colors.info;
    if (rateReviewRejectHelperTimeout) {
      clearTimeout(rateReviewRejectHelperTimeout);
      rateReviewRejectHelperTimeout = null;
    }
    if (message) {
      rateReviewRejectHelperTimeout = setTimeout(() => {
        if (rateReviewRejectHelper) {
          rateReviewRejectHelper.style.opacity = '0';
        }
      }, 4000);
    }
  };

  const showRateReviewApproveHelperMessage = (message, tone = 'info') => {
    if (!rateReviewApproveHelper) {
      return;
    }
    const colors = {
      error: '#ffb1b1',
      success: '#b5f7c8',
      info: '#d4ffd4'
    };
    rateReviewApproveHelper.textContent = message || '';
    rateReviewApproveHelper.style.opacity = message ? '1' : '0';
    rateReviewApproveHelper.style.color = colors[tone] || colors.info;
    if (rateReviewApproveHelperTimeout) {
      clearTimeout(rateReviewApproveHelperTimeout);
      rateReviewApproveHelperTimeout = null;
    }
    if (message) {
      rateReviewApproveHelperTimeout = setTimeout(() => {
        if (rateReviewApproveHelper) {
          rateReviewApproveHelper.style.opacity = '0';
        }
      }, 4000);
    }
  };

  const clearRateReviewApproveNote = () => {
    if (rateReviewApproveNoteInput) {
      rateReviewApproveNoteInput.value = '';
    }
  };

  const prepareRateReviewRejectSummary = async () => {
    try {
      const summaryRecord = buildRateReviewRejectSummary();
      if (!summaryRecord) {
        showRateReviewRejectHelperMessage('Unable to build reject summary.', 'error');
        return null;
      }
      const note = getRateReviewRejectNoteValue();
      const summaryText = typeof summaryRecord.summaryText === 'string' ? summaryRecord.summaryText.trim() : '';
      const payloadParts = [];
      if (summaryText) {
        payloadParts.push(summaryText);
      }
      if (note) {
        payloadParts.push(note);
      }
      if (!payloadParts.length) {
        showRateReviewRejectHelperMessage('Add a note or select reject reasons before rejecting.', 'error');
        return null;
      }
      const payload = payloadParts.length > 1 ? `${payloadParts[0]} — ${payloadParts[1]}` : payloadParts[0];
      const copied = await copyTextToClipboard(payload);
      if (copied) {
        showRateReviewRejectHelperMessage(`Copied: ${payload}`, 'success');
      } else {
        showRateReviewRejectHelperMessage(payload, 'error');
      }
      return {
        rejectDetails: {
          summaryText,
          segments: summaryRecord.segments,
          note,
          reasonSelections: captureRateReviewReasonSelections()
        }
      };
    } catch (_) {
      showRateReviewRejectHelperMessage('Unable to build reject summary.', 'error');
      return null;
    }
  };

  const prepareRateReviewApproveNote = async () => {
    const note = getRateReviewApproveNoteValue();
    if (!note) {
      showRateReviewApproveHelperMessage('Add a note before approving.', 'error');
      return null;
    }
    return { approveNote: note };
  };

  const findLegacyRateButtons = (heading) => {
    if (!heading) {
      return [];
    }
    return Array.from(heading.querySelectorAll('button')).filter((button) => {
      const label = (button.textContent || '').trim().toLowerCase();
      return RATE_REVIEW_LEGACY_LABELS.includes(label);
    });
  };

  const setLegacyRateButtonsHidden = (heading, hidden) => {
    const legacyButtons = findLegacyRateButtons(heading);
    if (!legacyButtons.length) {
      return false;
    }
    legacyButtons.forEach((button) => {
      if (hidden) {
        button.dataset.fjfeLegacyHidden = '1';
        button.style.display = 'none';
      } else {
        delete button.dataset.fjfeLegacyHidden;
        button.style.display = 'block';
      }
    });
    return true;
  };

  const removeRateReviewEnhancements = ({ showLegacyButtons = true } = {}) => {
    const heading = document.querySelector('h1.contentTitle');
    if (!heading) {
      return;
    }
    const wrapper = heading.querySelector(`.${RATE_REVIEW_ACTIONS_CLASS}`);
    if (wrapper) {
      wrapper.remove();
    }
    rateReviewReasonButtons = [];
    rateReviewRejectNoteInput = null;
    rateReviewRejectHelper = null;
    rateReviewApproveNoteInput = null;
    rateReviewApproveHelper = null;
    rateReviewActionsWrapper = null;
    collapseRateReviewReasons = null;
    collapseRateReviewApproveNote = null;
    if (rateReviewRejectHelperTimeout) {
      clearTimeout(rateReviewRejectHelperTimeout);
      rateReviewRejectHelperTimeout = null;
    }
    if (rateReviewApproveHelperTimeout) {
      clearTimeout(rateReviewApproveHelperTimeout);
      rateReviewApproveHelperTimeout = null;
    }
    setLegacyRateButtonsHidden(heading, !showLegacyButtons);
  };

  const ensureRateReviewEnhancements = () => {
    if (typeof document === 'undefined') {
      return;
    }
    const heading = document.querySelector('h1.contentTitle');
    if (!heading) {
      return;
    }
    if (!isBatchAssistSettingEnabled()) {
      removeRateReviewEnhancements({ showLegacyButtons: true });
      return;
    }
    if (!isBatchAssistEnabled()) {
      removeRateReviewEnhancements({ showLegacyButtons: false });
      return;
    }
    setLegacyRateButtonsHidden(heading, true);
    if (heading.querySelector(`.${RATE_REVIEW_ACTIONS_CLASS}`)) {
      return;
    }
    if (!findLegacyRateButtons(heading).length) {
      return;
    }
    const wrapper = document.createElement('div');
    wrapper.className = RATE_REVIEW_ACTIONS_CLASS;
    Object.assign(wrapper.style, {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: '6px',
      marginTop: '10px',
      marginBottom: '24px',
      width: '100%',
      maxWidth: '880px'
    });
    const blockHotkeyPropagation = (event) => {
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === 'function') {
        event.stopImmediatePropagation();
      }
    };

    const skipButton = createRateReviewPrimaryButton('Skip Rate', {
      background: '#1b3559',
      hover: '#24426b',
      border: '#2b4a75'
    });
    skipButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      handleRateQueueAction(RATE_QUEUE_ACTION.SKIP);
    });

    const approveButton = createRateReviewPrimaryButton('Approve Rate', {
      background: '#1a3a22',
      hover: '#21462a',
      border: '#2b5d35'
    });
    approveButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      handleRateQueueAction(RATE_QUEUE_ACTION.APPROVE);
    });

    const approveRow = document.createElement('div');
    Object.assign(approveRow.style, {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      alignSelf: 'flex-start'
    });
    const approveNoteButton = document.createElement('button');
    approveNoteButton.type = 'button';
    approveNoteButton.tabIndex = -1;
    approveNoteButton.setAttribute('aria-label', 'Approve with note');
    approveNoteButton.dataset.fjfeBaseBackground = '#1a3a22';
    approveNoteButton.dataset.fjfeBaseBorder = '#2b5d35';
    approveNoteButton.dataset.fjfeHoverBackground = '#21462a';
    approveNoteButton.dataset.fjfeLockedHighlight = '0';
    Object.assign(approveNoteButton.style, {
      width: '38px',
      height: '38px',
      minWidth: '38px',
      minHeight: '38px',
      borderRadius: '4px',
      border: '1px solid #2b5d35',
      background: '#1a3a22',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0',
      color: '#f6f6f6',
      boxShadow: '0 3px 10px rgba(0, 0, 0, 0.25)',
      transition: 'background 0.15s ease, transform 0.15s ease'
    });
    const approveNoteIcon = document.createElement('img');
    approveNoteIcon.src = getResourceUrl('icons/thumb.png');
    approveNoteIcon.alt = '';
    Object.assign(approveNoteIcon.style, {
      width: '24px',
      height: '24px',
      objectFit: 'contain',
      pointerEvents: 'none'
    });
    approveNoteButton.appendChild(approveNoteIcon);
    approveNoteButton.addEventListener('pointerdown', (event) => {
      event.stopPropagation();
      approveNoteButton.style.transform = 'scale(0.98)';
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((evt) => {
      approveNoteButton.addEventListener(evt, () => {
        approveNoteButton.style.transform = '';
      });
    });
    approveNoteButton.addEventListener('mouseenter', () => {
      if (approveNoteButton.dataset.fjfeLockedHighlight === '1') {
        return;
      }
      approveNoteButton.style.background = approveNoteButton.dataset.fjfeHoverBackground || '#146329';
    });
    approveNoteButton.addEventListener('mouseleave', () => {
      if (approveNoteButton.dataset.fjfeLockedHighlight === '1') {
        return;
      }
      approveNoteButton.style.background = approveNoteButton.dataset.fjfeBaseBackground || '#0f4b1d';
      approveNoteButton.style.borderColor = approveNoteButton.dataset.fjfeBaseBorder || '#1c7f36';
    });

    approveRow.append(approveButton, approveNoteButton);

    const queueBannerRow = document.createElement('div');
    queueBannerRow.dataset.fjfeQueueBannerRow = '1';
    Object.assign(queueBannerRow.style, {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-start',
      width: 'fit-content',
      maxWidth: '100%'
    });
    const syncApproveNoteButtonSize = () => {
      try {
        const rect = approveButton.getBoundingClientRect();
        const targetSize = Math.max(rect.height || 0, approveButton.offsetHeight || 0, 0);
        if (targetSize > 0) {
          const size = `${targetSize}px`;
          approveNoteButton.style.width = size;
          approveNoteButton.style.height = size;
          approveNoteButton.style.minWidth = size;
          approveNoteButton.style.minHeight = size;
          approveNoteButton.style.lineHeight = size;
        }
      } catch (_) {}
    };
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(syncApproveNoteButtonSize);
    } else {
      setTimeout(syncApproveNoteButtonSize, 0);
    }

    const approveNoteWrapper = document.createElement('div');
    Object.assign(approveNoteWrapper.style, {
      display: 'none',
      flexDirection: 'column',
      gap: '6px',
      paddingTop: '4px',
      marginBottom: '10px',
      width: '100%',
      maxWidth: '880px'
    });

    const approveNoteInput = document.createElement('textarea');
    approveNoteInput.placeholder = 'Insert note...';
    approveNoteInput.rows = 2;
    Object.assign(approveNoteInput.style, {
      width: '100%',
      minHeight: '28px',
      resize: 'vertical',
      background: '#111',
      color: '#f6f6f6',
      borderRadius: '10px',
      border: '1px solid #333',
      padding: '5px 8px',
      fontSize: '13px',
      fontFamily: 'inherit'
    });
    approveNoteInput.addEventListener('pointerdown', (event) => event.stopPropagation());
    ['keydown', 'keypress', 'keyup'].forEach((type) => {
      approveNoteInput.addEventListener(type, blockHotkeyPropagation, true);
    });
    approveNoteWrapper.appendChild(approveNoteInput);
    rateReviewApproveNoteInput = approveNoteInput;

    const approveNoteHelper = document.createElement('div');
    Object.assign(approveNoteHelper.style, {
      fontSize: '12px',
      color: '#d4ffd4',
      minHeight: '0',
      marginTop: '2px',
      opacity: '0',
      transition: 'opacity 0.2s ease',
      wordBreak: 'break-word'
    });
    approveNoteWrapper.appendChild(approveNoteHelper);
    rateReviewApproveHelper = approveNoteHelper;

    const approveNoteDoneRow = document.createElement('div');
    Object.assign(approveNoteDoneRow.style, {
      display: 'flex',
      justifyContent: 'flex-start'
    });
    const approveNoteDoneButton = createRateReviewPrimaryButton('Done', {
      background: '#1a3a22',
      hover: '#21462a',
      border: '#2b5d35'
    });
    approveNoteDoneButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      handleRateQueueAction(RATE_QUEUE_ACTION.APPROVE, {
        before: prepareRateReviewApproveNote,
        after: (result) => {
          if (result?.success) {
            showRateReviewApproveHelperMessage('Approved with note saved.', 'success');
            clearRateReviewApproveNote();
            setApproveNoteExpanded(false);
          }
        }
      });
    });
    approveNoteDoneRow.appendChild(approveNoteDoneButton);
    approveNoteWrapper.appendChild(approveNoteDoneRow);

    let approveNoteExpanded = false;
    const setApproveNoteExpanded = (expanded) => {
      approveNoteExpanded = expanded;
      approveNoteWrapper.style.display = expanded ? 'flex' : 'none';
      approveNoteButton.dataset.fjfeLockedHighlight = expanded ? '1' : '0';
      if (expanded) {
        approveNoteButton.style.background = '#1f8b3d';
        approveNoteButton.style.borderColor = '#28b34f';
      } else {
        approveNoteButton.style.background = approveNoteButton.dataset.fjfeBaseBackground || '#0f4b1d';
        approveNoteButton.style.borderColor = approveNoteButton.dataset.fjfeBaseBorder || '#1c7f36';
      }
    };
    collapseRateReviewApproveNote = () => setApproveNoteExpanded(false);
    setApproveNoteExpanded(false);

    approveNoteButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (typeof collapseRateReviewReasons === 'function') {
        collapseRateReviewReasons();
      }
      setApproveNoteExpanded(!approveNoteExpanded);
      if (approveNoteExpanded) {
        approveNoteInput.focus();
      }
    });

    const rejectButton = createRateReviewPrimaryButton('Reject Rate', {
      background: '#4a1414',
      hover: '#5a1b1b',
      border: '#7a2525'
    });

    const reasonsWrapper = document.createElement('div');
    Object.assign(reasonsWrapper.style, {
      display: 'none',
      flexDirection: 'column',
      gap: '6px',
      paddingTop: '4px',
      marginBottom: '12px',
      width: '100%',
      maxWidth: '880px'
    });

    const createInlineDivider = (label) => {
      const divider = document.createElement('div');
      Object.assign(divider.style, {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        width: '100%'
      });
      const text = document.createElement('div');
      text.textContent = label;
      Object.assign(text.style, {
        fontSize: '8px',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: '#c2c2c2',
        fontWeight: '600'
      });
      const line = document.createElement('div');
      Object.assign(line.style, {
        flex: '1 1 auto',
        height: '1px',
        background: '#2b2b2b'
      });
      divider.append(text, line);
      return divider;
    };

    reasonsWrapper.appendChild(createInlineDivider('Missed Rating'));

    const reasonButtons = [];
    const getReasonButtons = () => reasonButtons;

    RATE_REVIEW_REASON_GROUPS.forEach((group, groupIndex) => {
      const row = document.createElement('div');
      Object.assign(row.style, {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '4px',
        width: '100%',
        justifyContent: 'flex-start'
      });
      group.forEach((label) => {
        const button = createRateReviewReasonButton(label, { rowIndex: groupIndex, getButtons: getReasonButtons });
        reasonButtons.push(button);
        row.appendChild(button);
      });
      reasonsWrapper.appendChild(row);
    });

    rateReviewReasonButtons = reasonButtons;
    rateReviewActionsWrapper = wrapper;

    reasonsWrapper.appendChild(createInlineDivider('Rating Note'));

    const noteContainer = document.createElement('div');
    Object.assign(noteContainer.style, {
      display: 'flex',
      flexDirection: 'column',
      gap: '2px',
      width: '100%'
    });
    const noteInput = document.createElement('textarea');
    noteInput.placeholder = 'Insert note...';
    noteInput.rows = 2;
    Object.assign(noteInput.style, {
      width: '100%',
      minHeight: '32px',
      resize: 'vertical',
      background: '#111',
      color: '#f6f6f6',
      borderRadius: '10px',
      border: '1px solid #333',
      padding: '5px 8px',
      fontSize: '13px',
      fontFamily: 'inherit'
    });
    noteInput.addEventListener('pointerdown', (event) => event.stopPropagation());
    ['keydown', 'keypress', 'keyup'].forEach((type) => {
      noteInput.addEventListener(type, blockHotkeyPropagation, true);
    });
    noteContainer.appendChild(noteInput);
    rateReviewRejectNoteInput = noteInput;

    const noteHelper = document.createElement('div');
    Object.assign(noteHelper.style, {
      fontSize: '12px',
      color: '#d4d4d4',
      minHeight: '0',
      marginTop: '2px',
      opacity: '0',
      transition: 'opacity 0.2s ease',
      wordBreak: 'break-word'
    });
    noteContainer.appendChild(noteHelper);
    rateReviewRejectHelper = noteHelper;
    reasonsWrapper.appendChild(noteContainer);

    const doneRow = document.createElement('div');
    Object.assign(doneRow.style, {
      display: 'flex',
      justifyContent: 'flex-start',
      width: '100%',
      marginTop: '2px'
    });
    const doneButton = createRateReviewPrimaryButton('Done', {
      background: '#4a1414',
      hover: '#5a1b1b',
      border: '#7a2525'
    });
    doneButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      handleRateQueueAction(RATE_QUEUE_ACTION.REJECT, {
        before: prepareRateReviewRejectSummary,
        after: () => setRejectExpanded(false)
      });
    });
    doneRow.appendChild(doneButton);
    reasonsWrapper.appendChild(doneRow);

    let rejectExpanded = false;
    const setRejectExpanded = (expanded) => {
      rejectExpanded = expanded;
      reasonsWrapper.style.display = expanded ? 'flex' : 'none';
      rejectButton.dataset.fjfeLockedHighlight = expanded ? '1' : '0';
      if (expanded) {
        rejectButton.style.background = '#7b1717';
        rejectButton.style.borderColor = '#c73434';
      } else {
        rejectButton.style.background = rejectButton.dataset.fjfeBaseBackground || '#5b1111';
        rejectButton.style.borderColor = rejectButton.dataset.fjfeBaseBorder || '#9c2020';
      }
    };

    collapseRateReviewReasons = () => setRejectExpanded(false);
    setRejectExpanded(false);
    hydrateRateReviewRejectUi(setRejectExpanded);

    rejectButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (typeof collapseRateReviewApproveNote === 'function') {
        collapseRateReviewApproveNote();
      }
      setRejectExpanded(!rejectExpanded);
    });

    rateReviewPrimaryButtons = [skipButton, approveButton, rejectButton];
    wrapper.append(skipButton, approveRow, rejectButton, queueBannerRow, approveNoteWrapper, reasonsWrapper);
    heading.appendChild(wrapper);
    if (!window.fjfeSlickAnimateIn && !wrapper.dataset.fjfeBatchSlideIn) {
      wrapper.dataset.fjfeBatchSlideIn = '1';
      wrapper.style.opacity = '0';
      wrapper.style.transform = 'translateX(12px)';
      wrapper.style.transition = 'opacity 180ms ease, transform 200ms ease';
      requestAnimationFrame(() => {
        wrapper.style.opacity = '1';
        wrapper.style.transform = 'translateX(0)';
      });
    }
    if (window.fjfeSlickAnimateIn) {
      window.fjfeSlickAnimateIn(wrapper);
    } else if (window.fjTweakerModules?.slick?.openTweakerMenu) {
      window.fjTweakerModules.slick.openTweakerMenu(wrapper);
    }
    if (queueBannerElement) {
      positionQueueBanner(queueBannerElement);
    }
  };

  const refreshBatchAssistEnhancements = () => {
    ensureRateReviewEnhancements();
  };

  const handleBatchAssistSettingChange = (event) => {
    const detail = event?.detail;
    if (!detail || typeof detail.batchAssist === 'undefined') {
      return;
    }
    refreshBatchAssistEnhancements();
  };

  const startRateReviewObserver = () => {
    if (rateReviewObserver || typeof MutationObserver === 'undefined') {
      return;
    }
    if (!document.body) {
      if (rateReviewObserverPending) {
        return;
      }
      rateReviewObserverPending = true;
      document.addEventListener('DOMContentLoaded', () => {
        rateReviewObserverPending = false;
        ensureRateReviewEnhancements();
        startRateReviewObserver();
      }, { once: true });
      return;
    }
    rateReviewObserver = new MutationObserver(() => {
      ensureRateReviewEnhancements();
    });
    rateReviewObserver.observe(document.body, { childList: true, subtree: true });
  };

  const QUEUE_STORAGE_KEY = 'batchAssist';
  const QUEUE_FALLBACK_TITLE = 'Untitled import';
  const QUEUE_STATUS = {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    ACKNOWLEDGED: 'acknowledged'
  };
  const RATE_QUEUE_ACTION = {
    SKIP: 'skip',
    APPROVE: 'approve',
    REJECT: 'reject'
  };
  const QUEUE_EMPTY_MESSAGE = 'Queue is empty.';
  const QUEUE_COMPLETE_MESSAGE = 'Batch review complete!';

  const normalizeQueueUrl = (value) => {
    if (typeof value !== 'string') {
      return '';
    }
    const trimmed = value.trim();
    if (!trimmed) {
      return '';
    }
    try {
      const parsed = new URL(trimmed, window.location.origin);
      const pathname = parsed.pathname.replace(/\/+$/, '');
      return `${parsed.origin}${pathname}`;
    } catch (_) {
      return trimmed;
    }
  };

  const normalizeRateId = (value) => {
    if (typeof value === 'number' && Number.isFinite(value)) {
      const normalized = Math.abs(Math.trunc(value));
      return normalized ? String(normalized) : '';
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) {
        return '';
      }
      const match = trimmed.match(/\d+/);
      return match ? match[0] : '';
    }
    return '';
  };

  const sanitizeRejectSummarySegments = (segments) => {
    if (!Array.isArray(segments)) {
      return [];
    }
    return segments
      .map((segment) => {
        if (typeof segment === 'string') {
          const text = segment.trim();
          return text ? { text, overridden: false } : null;
        }
        if (!segment || typeof segment !== 'object') {
          return null;
        }
        const text = typeof segment.text === 'string' ? segment.text.trim() : '';
        if (!text) {
          return null;
        }
        return {
          text,
          overridden: segment.overridden === true
        };
      })
      .filter((segment) => {
        const text = (segment?.text || '').trim().toLowerCase();
        return text !== 'index' && text !== 'indexed' && text !== 'no-index' && text !== 'auto-no-index';
      })
      .filter(Boolean);
  };

  const sanitizeRejectSummaryText = (value) => {
    if (typeof value !== 'string') {
      return '';
    }
    return value
      .split('/')
      .map((part) => part.trim())
      .filter((part) => {
        const normalized = part.toLowerCase();
        return normalized !== 'index' && normalized !== 'indexed' && normalized !== 'no-index' && normalized !== 'auto-no-index';
      })
      .join('/');
  };

  const sanitizeReasonSelections = (value) => {
    if (!value || typeof value !== 'object') {
      return null;
    }
    const selectLabel = (label) => {
      if (typeof label !== 'string') {
        return null;
      }
      const trimmed = label.trim();
      return trimmed || null;
    };
    const normalizeCategorySelection = (input) => {
      if (typeof input === 'undefined' || input === null) {
        return null;
      }
      const entries = Array.isArray(input) ? input : [input];
      const normalizedRecords = entries
        .map((raw) => ({ raw: selectLabel(raw), normalized: normalizeReasonLabel(raw) }))
        .filter((record) => record.raw && record.normalized);
      if (!normalizedRecords.length) {
        return null;
      }
      let selectedRecords;
      if (normalizedRecords.some((record) => record.normalized === CATEGORY_OTHER_MEMES_LABEL)) {
        selectedRecords = normalizedRecords.filter((record) => record.normalized === CATEGORY_OTHER_MEMES_LABEL);
      } else {
        selectedRecords = [];
        const seen = new Set();
        let nonMultiConsumed = false;
        normalizedRecords.forEach((record) => {
          if (seen.has(record.normalized)) {
            return;
          }
          seen.add(record.normalized);
          if (CATEGORY_MULTISELECT_LABELS.has(record.normalized)) {
            selectedRecords.push(record);
            return;
          }
          if (nonMultiConsumed) {
            return;
          }
          selectedRecords.push(record);
          nonMultiConsumed = true;
        });
      }
      if (!selectedRecords.length) {
        return null;
      }
      if (selectedRecords.length === 1) {
        return selectedRecords[0].raw;
      }
      return selectedRecords.map((record) => record.raw);
    };
    const normalized = {};
    const skin = selectLabel(value.skin);
    if (skin) {
      normalized.skin = skin;
    }
    const pc = selectLabel(value.pc);
    if (pc) {
      normalized.pc = pc;
    }
    const category = normalizeCategorySelection(value.category);
    if (category) {
      normalized.category = category;
    }
    if (typeof value.flag === 'boolean') {
      normalized.flag = value.flag;
    }
    return Object.keys(normalized).length ? normalized : null;
  };

  const sanitizeQueueRejectDetails = (details) => {
    if (!details || typeof details !== 'object') {
      return null;
    }
    const summaryText = sanitizeRejectSummaryText(details.summaryText);
    const note = typeof details.note === 'string' ? details.note.trim() : '';
    const segments = sanitizeRejectSummarySegments(details.segments || details.summarySegments);
    const reasonSelections = sanitizeReasonSelections(details.reasonSelections);
    if (!summaryText && !note && !segments.length && !reasonSelections) {
      return null;
    }
    const payload = {
      summaryText,
      segments
    };
    if (note) {
      payload.note = note;
    }
    if (reasonSelections) {
      payload.reasonSelections = reasonSelections;
    }
    return payload;
  };

  const sanitizeQueueEntries = (entries) => {
    if (!Array.isArray(entries)) {
      return [];
    }
    const sanitized = [];
    entries.forEach((entry) => {
      if (typeof entry === 'string') {
        const url = normalizeQueueUrl(entry);
        if (url) {
          sanitized.push({ url, title: QUEUE_FALLBACK_TITLE, status: QUEUE_STATUS.PENDING });
        }
        return;
      }
      if (!entry || typeof entry !== 'object') {
        return;
      }
      const url = normalizeQueueUrl(typeof entry.url === 'string' ? entry.url : '');
      if (!url) {
        return;
      }
      const title = typeof entry.title === 'string' ? entry.title.trim() : '';
      const status = entry.status === QUEUE_STATUS.APPROVED || entry.status === QUEUE_STATUS.REJECTED || entry.status === QUEUE_STATUS.ACKNOWLEDGED
        ? entry.status
        : QUEUE_STATUS.PENDING;
      const approveNote = typeof entry.approveNote === 'string' ? entry.approveNote.trim() : '';
      const rejectDetails = sanitizeQueueRejectDetails(entry.rejectDetails);
      const rateActionAdded = Boolean(entry.rateActionAdded);
      const rateId = normalizeRateId(entry.rateId);
      const normalizedEntry = { url, title: title || QUEUE_FALLBACK_TITLE, status };
      if (rateActionAdded) {
        normalizedEntry.rateActionAdded = true;
      }
      if (rateId) {
        normalizedEntry.rateId = rateId;
      }
      if (approveNote && status === QUEUE_STATUS.APPROVED) {
        normalizedEntry.approveNote = approveNote;
      }
      if (rejectDetails) {
        normalizedEntry.rejectDetails = rejectDetails;
      }
      sanitized.push(normalizedEntry);
    });
    return sanitized;
  };

  const readQueueEntries = () => new Promise((resolve) => {
    try {
      if (typeof chrome !== 'undefined' && chrome?.storage?.local) {
        chrome.storage.local.get(QUEUE_STORAGE_KEY, (result = {}) => {
          resolve(sanitizeQueueEntries(result?.[QUEUE_STORAGE_KEY]));
        });
        return;
      }
    } catch (_) {}
    try {
      const raw = localStorage.getItem(`fjfe:${QUEUE_STORAGE_KEY}`);
      const parsed = raw ? JSON.parse(raw) : [];
      resolve(sanitizeQueueEntries(parsed));
    } catch (_) {
      resolve([]);
    }
  });

  const getQueueEntryForCurrentUrl = async () => {
    const currentUrl = normalizeQueueUrl(window.location.href);
    if (!currentUrl) {
      return null;
    }
    if (rateReviewQueueEntryCache.url === currentUrl) {
      return rateReviewQueueEntryCache.entry;
    }
    const entries = await readQueueEntries();
    const entry = entries.find((candidate) => candidate.url === currentUrl) || null;
    rateReviewQueueEntryCache = { url: currentUrl, entry };
    return entry;
  };

  document.addEventListener('fjTweakerSettingsChanged', handleBatchAssistSettingChange, { passive: true });

  const persistQueueEntries = (entries) => new Promise((resolve) => {
    const payload = sanitizeQueueEntries(entries);
    try {
      if (typeof chrome !== 'undefined' && chrome?.storage?.local) {
        chrome.storage.local.set({ [QUEUE_STORAGE_KEY]: payload }, () => resolve(true));
        return;
      }
    } catch (_) {}
    try {
      if (payload.length) {
        localStorage.setItem(`fjfe:${QUEUE_STORAGE_KEY}`, JSON.stringify(payload));
      } else {
        localStorage.removeItem(`fjfe:${QUEUE_STORAGE_KEY}`);
      }
      resolve(true);
    } catch (_) {
      resolve(false);
    }
  });

  const findQueueEntryIndex = (queue, url) => queue.findIndex((entry) => entry.url === url);
  const isCompletedQueueStatus = (status) => status === QUEUE_STATUS.APPROVED || status === QUEUE_STATUS.REJECTED || status === QUEUE_STATUS.ACKNOWLEDGED;
  const isAcknowledgedQueueStatus = (status) => status === QUEUE_STATUS.ACKNOWLEDGED;

  const getNextActionableQueueEntry = (queue, { excludeUrl } = {}) => queue.find((entry) => {
    if (isCompletedQueueStatus(entry.status)) {
      return false;
    }
    if (excludeUrl && entry.url === excludeUrl) {
      return false;
    }
    return true;
  }) || null;

  let queueBannerElement = null;
  let rateReviewPrimaryButtons = [];

  const positionQueueBanner = (banner) => {
    if (!banner) {
      return;
    }
    if (rateReviewActionsWrapper && rateReviewActionsWrapper.querySelector) {
      const bannerRow = rateReviewActionsWrapper.querySelector('[data-fjfe-queue-banner-row="1"]');
      if (bannerRow) {
        if (banner.parentElement !== bannerRow) {
          bannerRow.appendChild(banner);
        }
        return;
      }
    }
    const wrapper = rateReviewActionsWrapper;
    if (wrapper && wrapper.parentElement) {
      const parent = wrapper.parentElement;
      if (wrapper.nextSibling) {
        parent.insertBefore(banner, wrapper.nextSibling);
      } else {
        parent.appendChild(banner);
      }
      return;
    }
    const heading = document.querySelector('h1.contentTitle');
    const host = heading?.parentElement || document.body;
    if (heading) {
      host.insertBefore(banner, heading);
    } else if (host.firstChild) {
      host.insertBefore(banner, host.firstChild);
    } else {
      host.appendChild(banner);
    }
  };

  const ensureQueueBannerElement = () => {
    if (queueBannerElement && queueBannerElement.isConnected) {
      positionQueueBanner(queueBannerElement);
      return queueBannerElement;
    }
    const banner = document.createElement('div');
    Object.assign(banner.style, {
      width: 'auto',
      minWidth: '240px',
      padding: '8px 16px',
      background: '#0f2b1c',
      border: '1px solid #39ff9f',
      borderRadius: '4px',
      color: '#dfffea',
      fontWeight: '600',
      fontSize: '15px',
      fontFamily: "'Segoe UI', sans-serif",
      textAlign: 'center',
      marginTop: '6px',
      marginBottom: '8px',
      display: 'none',
      alignSelf: 'flex-start',
      boxShadow: '0 0 8px rgba(57, 255, 159, 0.55), 0 0 18px rgba(57, 255, 159, 0.35), inset 0 0 6px rgba(57, 255, 159, 0.3)',
      textShadow: '0 0 6px rgba(57, 255, 159, 0.65)'
    });
    banner.textContent = '';
    queueBannerElement = banner;
    positionQueueBanner(banner);
    return banner;
  };

  const showQueueBanner = (message) => {
    const banner = ensureQueueBannerElement();
    banner.textContent = message || '';
    if (rateReviewPrimaryButtons.length) {
      const widths = rateReviewPrimaryButtons
        .map((btn) => btn.getBoundingClientRect?.().width || btn.offsetWidth || 0)
        .filter((value) => Number.isFinite(value) && value > 0);
      const maxWidth = widths.length ? Math.max(...widths) : 0;
      banner.style.width = maxWidth > 0 ? `${Math.round(maxWidth)}px` : 'auto';
    } else {
      banner.style.width = 'auto';
    }
    banner.style.display = 'block';
  };

  const hideQueueBanner = () => {
    if (queueBannerElement) {
      queueBannerElement.style.display = 'none';
    }
  };

  const buildRateActionQueueEntry = (actionType, context = {}) => {
    const url = normalizeQueueUrl(window.location.href);
    if (!url) {
      return null;
    }
    const title = extractHeadingTitle() || QUEUE_FALLBACK_TITLE;
    const entry = {
      url,
      title,
      status: actionType === RATE_QUEUE_ACTION.REJECT ? QUEUE_STATUS.REJECTED : QUEUE_STATUS.APPROVED,
      rateActionAdded: true
    };
    if (actionType === RATE_QUEUE_ACTION.APPROVE) {
      const note = typeof context?.approveNote === 'string' ? context.approveNote.trim() : '';
      if (note) {
        entry.approveNote = note;
      }
    }
    if (actionType === RATE_QUEUE_ACTION.REJECT) {
      const rejectDetails = sanitizeQueueRejectDetails(context?.rejectDetails);
      if (rejectDetails) {
        entry.rejectDetails = rejectDetails;
      }
    }
    return entry;
  };

  const applyQueueAction = async (actionType, context = {}) => {
    const queue = await readQueueEntries();
    const working = queue.slice();
    const currentUrl = normalizeQueueUrl(window.location.href);
    const entryIndex = findQueueEntryIndex(working, currentUrl);
    let targetEntry = null;
    if (entryIndex >= 0) {
      const [removed] = working.splice(entryIndex, 1);
      if (removed) {
        targetEntry = { ...removed };
      }
    }
    if (!targetEntry && (actionType === RATE_QUEUE_ACTION.APPROVE || actionType === RATE_QUEUE_ACTION.REJECT)) {
      const createdEntry = buildRateActionQueueEntry(actionType, context);
      if (createdEntry) {
        targetEntry = createdEntry;
      }
    }
    if (!queue.length && !targetEntry) {
      return { success: false, nextEntry: null };
    }
    if (targetEntry) {
      const acknowledgedIndex = working.findIndex((entry) => isAcknowledgedQueueStatus(entry.status));
      const acknowledgedBoundary = acknowledgedIndex === -1 ? working.length : acknowledgedIndex;
      if (actionType === RATE_QUEUE_ACTION.APPROVE) {
        targetEntry.status = QUEUE_STATUS.APPROVED;
        delete targetEntry.rejectDetails;
        const note = typeof context?.approveNote === 'string' ? context.approveNote.trim() : '';
        if (note) {
          targetEntry.approveNote = note;
        } else {
          delete targetEntry.approveNote;
        }
        working.splice(acknowledgedBoundary, 0, targetEntry);
      } else if (actionType === RATE_QUEUE_ACTION.REJECT) {
        targetEntry.status = QUEUE_STATUS.REJECTED;
        const rejectDetails = sanitizeQueueRejectDetails(context?.rejectDetails);
        if (rejectDetails) {
          targetEntry.rejectDetails = rejectDetails;
        } else {
          delete targetEntry.rejectDetails;
        }
        const approvedIndex = working.findIndex((entry) => entry.status === QUEUE_STATUS.APPROVED);
        const targetIndex = approvedIndex === -1 ? acknowledgedBoundary : Math.min(approvedIndex, acknowledgedBoundary);
        const insertIndex = Math.min(targetIndex, acknowledgedBoundary);
        working.splice(insertIndex, 0, targetEntry);
      } else if (actionType === RATE_QUEUE_ACTION.SKIP) {
        if (!targetEntry.rateActionAdded) {
          const pendingBoundaryIndex = working.findIndex((entry) => entry.status === QUEUE_STATUS.REJECTED || entry.status === QUEUE_STATUS.APPROVED || entry.status === QUEUE_STATUS.ACKNOWLEDGED);
          const pendingBoundary = pendingBoundaryIndex === -1 ? working.length : pendingBoundaryIndex;
          const firstApprovedIndex = working.findIndex((entry) => entry.status === QUEUE_STATUS.APPROVED);
          const rejectedBoundary = firstApprovedIndex === -1 ? acknowledgedBoundary : Math.min(firstApprovedIndex, acknowledgedBoundary);
          let insertIndex = acknowledgedBoundary;
          if (targetEntry.status === QUEUE_STATUS.PENDING) {
            insertIndex = pendingBoundary;
          } else if (targetEntry.status === QUEUE_STATUS.REJECTED) {
            insertIndex = working.length;
          } else if (targetEntry.status === QUEUE_STATUS.APPROVED) {
            insertIndex = acknowledgedBoundary;
          } else if (targetEntry.status === QUEUE_STATUS.ACKNOWLEDGED) {
            insertIndex = working.length;
          }
          working.splice(insertIndex, 0, targetEntry);
        }
      } else {
        working.splice(entryIndex >= 0 ? entryIndex : working.length, 0, targetEntry);
      }
      await persistQueueEntries(working);
    }
    const effectiveQueue = targetEntry ? working : queue;
    const excludeUrl = actionType === RATE_QUEUE_ACTION.SKIP ? targetEntry?.url : undefined;
    const nextEntry = getNextActionableQueueEntry(effectiveQueue, { excludeUrl });
    return { success: Boolean(targetEntry), nextEntry, queue: effectiveQueue };
  };

  let rateQueueActionInFlight = false;

  const handleRateQueueAction = async (actionType, options = {}) => {
    if (rateQueueActionInFlight) {
      return;
    }
    rateQueueActionInFlight = true;
    try {
      hideQueueBanner();
      const currentEntry = await getQueueEntryForCurrentUrl();
      const wasRejected = currentEntry?.status === QUEUE_STATUS.REJECTED;
      let actionContext;
      if (typeof options.before === 'function') {
        const beforeResult = await options.before();
        if (beforeResult === null) {
          return;
        }
        if (beforeResult && typeof beforeResult === 'object') {
          actionContext = beforeResult;
        }
      }
      const result = await applyQueueAction(actionType, actionContext);
      if (typeof options.after === 'function') {
        await options.after(result);
      }
      if (result?.success && typeof collapseRateReviewApproveNote === 'function') {
        collapseRateReviewApproveNote();
      }
      let nextEntry = result?.nextEntry || null;
      if (wasRejected && Array.isArray(result?.queue)) {
        const queueFinished = result.queue.every((entry) => entry?.status !== QUEUE_STATUS.PENDING);
        if (queueFinished) {
          nextEntry = result.queue.find((entry) => entry?.status === QUEUE_STATUS.REJECTED && entry?.url && entry.url !== currentEntry?.url) || null;
        }
      }
      if (nextEntry?.url) {
        const nextUrl = nextEntry.url;
        const normalizedNext = normalizeQueueUrl(nextUrl);
        const normalizedCurrent = normalizeQueueUrl(window.location.href);
        if (normalizedNext && normalizedNext === normalizedCurrent) {
          window.location.reload();
        } else {
          window.location.href = nextUrl;
        }
      } else {
        if (result?.success) {
          if (typeof collapseRateReviewReasons === 'function') {
            collapseRateReviewReasons();
          }
          if (typeof collapseRateReviewApproveNote === 'function') {
            collapseRateReviewApproveNote();
          }
        } else if (actionType === RATE_QUEUE_ACTION.REJECT && typeof collapseRateReviewReasons === 'function') {
          collapseRateReviewReasons();
        }
        const bannerMessage = result?.success ? QUEUE_COMPLETE_MESSAGE : QUEUE_EMPTY_MESSAGE;
        showQueueBanner(bannerMessage);
      }
    } catch (error) {
      if (actionType === RATE_QUEUE_ACTION.REJECT && typeof collapseRateReviewReasons === 'function') {
        collapseRateReviewReasons();
      }
      showQueueBanner(QUEUE_EMPTY_MESSAGE);
    } finally {
      rateQueueActionInFlight = false;
    }
  };

  // Normalized scroll offsets so dragging works in every browser quirk mode
  const getScrollOffsets = () => ({
    left: window.pageXOffset || document.documentElement.scrollLeft || document.body.scrollLeft || 0,
    top: window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0
  });

  const getViewportSize = () => {
    const doc = document.documentElement;
    const width = doc && doc.clientWidth ? doc.clientWidth : window.innerWidth || 0;
    const height = doc && doc.clientHeight ? doc.clientHeight : window.innerHeight || 0;
    return { width, height };
  };

  // Converts pointer positions into absolute page coordinates
  const getPagePosition = (event) => {
    const { left, top } = getScrollOffsets();
    return {
      x: event.pageX !== undefined ? event.pageX : event.clientX + left,
      y: event.pageY !== undefined ? event.pageY : event.clientY + top
    };
  };

  let featureEnabled = false;
  let settingEnabled = false;
  let toggleEnabled = false;
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

  let historyEntries = [];
  let historyDropdown = null;
  let historyList = null;
  let historyEmptyState = null;
  let historyButtonElement = null;
  let historySection = null;
  let historyDropdownOpen = false;
  let historyOutsideClickHandler = null;
  let historyDropdownHideTimeout = null;
  let rateDetailsObserver = null;
  let historyLabelRefreshHandle = null;
  let rateDetailClickHandler = null;
  let historyDropdownViewportHandler = null;
  let rateReviewObserver = null;
  let rateReviewObserverPending = false;
  let rateReviewReasonButtons = [];
  let rateReviewRejectNoteInput = null;
  let rateReviewRejectHelper = null;
  let rateReviewRejectHelperTimeout = null;
  let rateReviewApproveNoteInput = null;
  let rateReviewApproveHelper = null;
  let rateReviewApproveHelperTimeout = null;
  let collapseRateReviewApproveNote = null;
  let rateReviewActionsWrapper = null;
  let collapseRateReviewReasons = null;
  let rateReviewRejectHydratedUrl = null;
  let rateReviewQueueEntryCache = { url: null, entry: null };
  let pendingRateUpdates = [];
  let rateUpdateSequence = 0;
  let rateFailureConsolePatched = false;
  let rateLimitMessageListener = null;
  let rateLimitDomListener = null;
  let lastRateLimitSignalId = null;
  let rateCopyStatus = null;
  let rateCopyStatusTimeout = null;

  const showRateCopyStatus = (message, tone = 'info') => {
    if (!rateCopyStatus) {
      return;
    }
    const colors = {
      info: '#bdd6ff',
      success: '#9de7b2',
      error: '#ffb0b0'
    };
    const hasMessage = Boolean(message);
    rateCopyStatus.textContent = message || '';
    rateCopyStatus.style.color = colors[tone] || colors.info;
    rateCopyStatus.style.opacity = hasMessage ? '1' : '0';
    if (rateCopyStatusTimeout) {
      clearTimeout(rateCopyStatusTimeout);
      rateCopyStatusTimeout = null;
    }
    if (hasMessage) {
      rateCopyStatusTimeout = setTimeout(() => {
        if (rateCopyStatus) {
          rateCopyStatus.style.opacity = '0';
          rateCopyStatus.textContent = '';
        }
      }, 3600);
    }
  };

  const normalizeHistoryUrl = (rawUrl) => {
    if (!rawUrl || typeof rawUrl !== 'string') {
      return '';
    }
    const trimmed = rawUrl.trim();
    if (!trimmed) {
      return '';
    }
    try {
      const base = window.location && window.location.origin ? window.location.origin : undefined;
      const parsed = new URL(trimmed, base);
      parsed.hash = '';
      return parsed.href;
    } catch (error) {
      return trimmed;
    }
  };

  const sanitizeHistoryLabels = (labels) => {
    if (!Array.isArray(labels)) {
      return [];
    }
    return labels
      .map((label) => (typeof label === 'string' ? label.trim() : ''))
      .filter(Boolean);
  };

  const sanitizeHistoryEntry = (entry) => {
    if (!entry || typeof entry !== 'object') {
      return null;
    }
    const title = typeof entry.title === 'string' && entry.title.trim() ? entry.title.trim() : 'Unknown content';
    const url = normalizeHistoryUrl(entry.url || '');
    if (!url) {
      return null;
    }
    const labels = sanitizeHistoryLabels(entry.labels);
    let timestampMs = null;
    const timestampCandidates = [entry.timestampMs, entry.timestampUTC, entry.timestampUtc, entry.timestamp];
    for (const candidate of timestampCandidates) {
      if (typeof candidate === 'number' && Number.isFinite(candidate)) {
        timestampMs = candidate;
        break;
      }
      if (typeof candidate === 'string') {
        const trimmed = candidate.trim();
        if (!trimmed) {
          continue;
        }
        const parsed = Number(trimmed);
        if (Number.isFinite(parsed)) {
          timestampMs = parsed;
          break;
        }
        const parsedDate = Date.parse(trimmed);
        if (Number.isFinite(parsedDate)) {
          timestampMs = parsedDate;
          break;
        }
      }
    }
    const normalized = { title, url, labels };
    if (Number.isFinite(timestampMs)) {
      normalized.timestampMs = timestampMs;
    }
    return normalized;
  };

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

  const getCurrentContentTitle = () => {
    const headingText = extractHeadingTitle();
    if (headingText) {
      return headingText;
    }
    try {
      const fallback = (document && document.title ? document.title : '').trim();
      return fallback || 'Unknown content';
    } catch (_) {
      return 'Unknown content';
    }
  };

  const getCurrentContentUrl = () => {
    try {
      return window.location && window.location.href ? window.location.href : '';
    } catch (error) {
      return '';
    }
  };

  const getSkinLabel = () => {
    for (const id of SKIN_BUTTON_IDS) {
      const el = document.getElementById(id);
      if (el && (el.classList.contains('nsfwBg') || el.classList.contains('selected') || el.classList.contains('active'))) {
        const match = id.match(/(\d+)/);
        const level = match ? match[1] : (el.textContent || '').trim();
        return level ? `Skin ${level}` : 'Skin';
      }
    }
    return null;
  };

  const PC_BUTTON_IDS = ['pcLevel1', 'pcLevel2', 'pcLevel3'];

  const getPcLabel = () => {
    for (const id of PC_BUTTON_IDS) {
      const el = document.getElementById(id);
      if (el && (el.classList.contains('nsfwBg') || el.classList.contains('selected') || el.classList.contains('active'))) {
        const match = id.match(/(\d+)/);
        const level = match ? match[1] : (el.textContent || '').trim();
        return level ? `PC ${level}` : 'PC';
      }
    }
    return null;
  };

  const getCategoryLabels = () => {
    try {
      const els = document.querySelectorAll('#catControls .ctButton4.selected');
      const labels = [];
      els.forEach((node) => {
        const text = (node.textContent || '').trim();
        if (text) {
          labels.push(text);
        }
      });
      return labels;
    } catch (error) {
      return [];
    }
  };

  const getNoIndexLabel = () => {
    const el = document.getElementById('noIndexEasy');
    const rawText = (el && el.textContent ? el.textContent : '').trim();
    const text = rawText.toLowerCase();
    const hasNoIndexText = text.includes('no indexed');
    const hasAutoCue = hasNoIndexText && text.includes('auto');
    const hasManualCue = hasNoIndexText && (text.includes('manually') || text.includes('manual'));
    const removeBtn = document.getElementById('rNIX');
    const makeBtn = document.getElementById('mNIX');
    const removeVisible = !!(removeBtn && removeBtn.style && removeBtn.style.display !== 'none');
    const makeHidden = !!(makeBtn && makeBtn.style && makeBtn.style.display === 'none');
    if (hasAutoCue) {
      return 'Auto-No-Index';
    }
    if (hasManualCue || removeVisible || makeHidden) {
      return 'No-Index';
    }
    return 'Indexed';
  };

  const getCurrentRateLabels = () => {
    const labels = [];
    const skin = getSkinLabel();
    if (skin) {
      labels.push(skin);
    }
    const pc = getPcLabel();
    if (pc) {
      labels.push(pc);
    }
    const categories = getCategoryLabels();
    if (categories.length) {
      labels.push(...categories);
    }
    return labels;
  };

  const updateHistoryEntryLabelsForUrl = (url, labels) => {
    const normalizedUrl = normalizeHistoryUrl(url);
    if (!normalizedUrl) {
      return false;
    }
    const cleanedLabels = sanitizeHistoryLabels(labels);
    const index = historyEntries.findIndex((entry) => entry.url === normalizedUrl);
    if (index === -1) {
      return false;
    }
    const existing = historyEntries[index];
    const shouldUpdate = JSON.stringify(existing.labels || []) !== JSON.stringify(cleanedLabels);
    if (!shouldUpdate) {
      return false;
    }
    historyEntries[index] = { ...existing, labels: cleanedLabels };
    renderHistoryEntries();
    persistHistoryEntries();
    return true;
  };

  const refreshCurrentPageHistoryLabels = () => {
    if (!featureEnabled || !historyEntries.length) {
      return;
    }
    const url = getCurrentContentUrl();
    if (!url) {
      return;
    }
    const labels = getCurrentRateLabels();
    updateHistoryEntryLabelsForUrl(url, labels);
  };

  const cancelHistoryLabelRefresh = () => {
    if (historyLabelRefreshHandle) {
      clearTimeout(historyLabelRefreshHandle);
      historyLabelRefreshHandle = null;
    }
  };

  const scheduleHistoryLabelRefresh = () => {
    if (!featureEnabled) {
      return;
    }
    if (historyLabelRefreshHandle) {
      return;
    }
    historyLabelRefreshHandle = setTimeout(() => {
      historyLabelRefreshHandle = null;
      refreshCurrentPageHistoryLabels();
    }, 120);
  };

  const updateHistoryDropdownPosition = () => {
    if (!historyDropdown || !historyDropdownOpen || !panel) {
      return;
    }
    const anchor = historyButtonElement || historySection || panel;
    if (!anchor) {
      return;
    }
    const anchorRect = anchor.getBoundingClientRect();
      const panelRect = panel.getBoundingClientRect();
      const width = Math.max(0, panelRect.width);
      historyDropdown.style.width = width + 'px';
      historyDropdown.style.minWidth = width + 'px';
      const baseTop = anchorRect.bottom + HISTORY_DROPDOWN_GAP - HISTORY_DROPDOWN_OVERLAP;
      const minViewportTop = HISTORY_DROPDOWN_MIN_TOP;
      const resolvedViewportTop = Math.max(baseTop, minViewportTop);
      const baseLeft = panelRect.left;
      if (panelLocked) {
        historyDropdown.style.position = 'fixed';
        historyDropdown.style.left = baseLeft + 'px';
        historyDropdown.style.top = resolvedViewportTop + 'px';
      } else {
        const scrollX = window.scrollX || window.pageXOffset || document.documentElement.scrollLeft || document.body.scrollLeft || 0;
        const scrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
        historyDropdown.style.position = 'absolute';
        historyDropdown.style.left = baseLeft + scrollX + 'px';
        historyDropdown.style.top = resolvedViewportTop + scrollY + 'px';
    }
  };

  const attachHistoryDropdownViewportHandlers = () => {
    if (historyDropdownViewportHandler) {
      return;
    }
    historyDropdownViewportHandler = () => {
      updateHistoryDropdownPosition();
    };
    window.addEventListener('scroll', historyDropdownViewportHandler, true);
    window.addEventListener('resize', historyDropdownViewportHandler);
  };

  const detachHistoryDropdownViewportHandlers = () => {
    if (!historyDropdownViewportHandler) {
      return;
    }
    window.removeEventListener('scroll', historyDropdownViewportHandler, true);
    window.removeEventListener('resize', historyDropdownViewportHandler);
    historyDropdownViewportHandler = null;
  };

  const cloneHistoryEntry = (entry) => ({
    title: entry.title,
    url: entry.url,
    labels: Array.isArray(entry.labels) ? [...entry.labels] : [],
    ...(Number.isFinite(entry.timestampMs) ? { timestampMs: entry.timestampMs } : {})
  });

  const captureRateStateSnapshot = () => ({
    counterValue,
    historyEntries: historyEntries.map((entry) => cloneHistoryEntry(entry))
  });

  const applyRateStateSnapshot = (snapshot) => {
    if (!snapshot) {
      return;
    }
    if (typeof snapshot.counterValue === 'number') {
      setCounter(snapshot.counterValue);
    }
    if (Array.isArray(snapshot.historyEntries)) {
      historyEntries = snapshot.historyEntries.map((entry) => cloneHistoryEntry(entry));
      renderHistoryEntries();
      persistHistoryEntries();
    }
  };

  const registerPendingRateUpdate = (reason = 'rate-change') => {
    const snapshot = captureRateStateSnapshot();
    const id = ++rateUpdateSequence;
    const entry = {
      id,
      reason,
      timestamp: Date.now(),
      snapshot,
      timeout: null
    };
    entry.timeout = setTimeout(() => {
      pendingRateUpdates = pendingRateUpdates.filter((item) => item.id !== id);
    }, RATE_FAILURE_WINDOW_MS);
    pendingRateUpdates.push(entry);
    return id;
  };

  const revertMostRecentPendingRateUpdate = () => {
    const now = Date.now();
    for (let i = pendingRateUpdates.length - 1; i >= 0; i -= 1) {
      const entry = pendingRateUpdates[i];
      if (now - entry.timestamp <= RATE_FAILURE_WINDOW_MS) {
        if (entry.timeout) {
          clearTimeout(entry.timeout);
        }
        pendingRateUpdates.splice(i, 1);
        applyRateStateSnapshot(entry.snapshot);
        return true;
      }
    }
    return false;
  };

  const handleRateUploadFailureDetected = () => {
    if (!featureEnabled) {
      return;
    }
    const reverted = revertMostRecentPendingRateUpdate();
    if (!reverted) {
      const now = Date.now();
      pendingRateUpdates = pendingRateUpdates.filter((entry) => {
        if (now - entry.timestamp > RATE_FAILURE_WINDOW_MS) {
          if (entry.timeout) {
            clearTimeout(entry.timeout);
          }
          return false;
        }
        return true;
      });
    }
  };

  const processExternalRateLimitSignal = (sourceLabel, signalId) => {
    if (signalId && lastRateLimitSignalId === signalId) {
      return;
    }
    if (signalId) {
      lastRateLimitSignalId = signalId;
    }
    handleRateUploadFailureDetected();
  };

  const handleRateLimitMessageEvent = (event) => {
    if (!event) {
      return;
    }
    const data = event.data;
    if (!data || data.type !== RATE_LIMIT_MESSAGE_TYPE) {
      return;
    }
    processExternalRateLimitSignal('page-message', data.signalId);
  };

  const ensureRateLimitMessageListener = () => {
    if (rateLimitMessageListener) {
      return;
    }
    rateLimitMessageListener = (event) => {
      handleRateLimitMessageEvent(event);
    };
    try {
      window.addEventListener('message', rateLimitMessageListener, false);
    } catch (_) {}
  };

  const handleRateLimitDomEvent = (event) => {
    const origin = event?.detail?.origin;
    if (origin !== RATE_LIMIT_EVENT_ORIGIN_PAGE) {
      return;
    }
    processExternalRateLimitSignal('page-dom', event?.detail?.signalId);
  };

  const ensureRateLimitDomEventListener = () => {
    if (rateLimitDomListener) {
      return;
    }
    rateLimitDomListener = (event) => {
      handleRateLimitDomEvent(event);
    };
    try {
      window.addEventListener(RATE_LIMIT_EVENT, rateLimitDomListener, false);
    } catch (_) {}
  };

  const injectPageRateLimitDetector = () => {
    const doc = document;
    if (!doc || !doc.documentElement) {
      window.addEventListener('DOMContentLoaded', injectPageRateLimitDetector, { once: true });
      return;
    }
    if (doc.documentElement.hasAttribute(RATE_LIMIT_BRIDGE_ATTR)) {
      return;
    }
    doc.documentElement.setAttribute(RATE_LIMIT_BRIDGE_ATTR, '1');
    const script = doc.createElement('script');
    script.type = 'text/javascript';
    script.src = getResourceUrl(RATE_LIMIT_BRIDGE_PATH);
    try {
      const config = {
        patterns: RATE_FAILURE_PATTERNS,
        methods: RATE_FAILURE_METHODS,
        messageType: RATE_LIMIT_MESSAGE_TYPE,
        domEventName: RATE_LIMIT_EVENT,
        domEventOrigin: RATE_LIMIT_EVENT_ORIGIN_PAGE
      };
      script.dataset[RATE_LIMIT_BRIDGE_DATA_KEY] = encodeURIComponent(JSON.stringify(config));
    } catch (_) {}
    const target = doc.head || doc.documentElement || doc.body;
    (target || doc.documentElement).appendChild(script);
  };

  const attachRateFailureConsoleWatch = () => {
    if (rateFailureConsolePatched) {
      return;
    }
    rateFailureConsolePatched = true;
    if (typeof console !== 'undefined') {
      RATE_FAILURE_METHODS.forEach((method) => {
        const original = console[method];
        if (typeof original !== 'function') {
          return;
        }
        if (original.__fjfeRateTrackerPatched) {
          return;
        }
        const wrapped = function patchedConsoleMethod(...args) {
          const failureHit = args.some((arg) => {
            if (typeof arg !== 'string') {
              return false;
            }
            const lower = arg.toLowerCase();
            return RATE_FAILURE_PATTERNS.some((needle) => needle && lower.includes(needle));
          });
          if (failureHit) {
            handleRateUploadFailureDetected();
          }
          return original.apply(this, args);
        };
        try {
          wrapped.__fjfeRateTrackerPatched = true;
          wrapped.__fjfeRateTrackerOriginal = original;
        } catch (_) {}
        console[method] = wrapped;
      });
    }
    ensureRateLimitMessageListener();
    ensureRateLimitDomEventListener();
    injectPageRateLimitDetector();
  };

  const RATE_DETAIL_CLICK_SELECTORS = [
    (target) => Boolean(target.closest && target.closest('#catControls .ctButton4')),
    (target) => Boolean(target.closest && target.closest('#rateBoxButtons .skinB')),
    (target) => Boolean(target.closest && target.closest('#rateBoxButtons .pcLevel')),
    (target) => Boolean(target.closest && target.closest('#noIndexEasy')),
    (target) => Boolean(target.closest && target.closest('#mNIX')),
    (target) => Boolean(target.closest && target.closest('#rNIX'))
  ];

  const handleRateDetailClick = (event) => {
    if (!featureEnabled) {
      return;
    }
    const target = event.target;
    if (!target) {
      return;
    }
    const matched = RATE_DETAIL_CLICK_SELECTORS.some((test) => {
      try {
        return test(target);
      } catch (error) {
        return false;
      }
    });
    if (matched) {
      const clickedCategory = target.closest && target.closest('#catControls .ctButton4');
      const clickedNoIndex = target.closest && (target.closest('#noIndexEasy') || target.closest('#mNIX') || target.closest('#rNIX'));
      const clickedPc = target.closest && target.closest('#rateBoxButtons .pcLevel');
      if (clickedCategory || clickedNoIndex || clickedPc) {
        registerPendingRateUpdate('rate-label');
      }
      scheduleHistoryLabelRefresh();
    }
  };

  const attachRateDetailClickHandler = () => {
    if (rateDetailClickHandler) {
      return;
    }
    rateDetailClickHandler = handleRateDetailClick;
    document.addEventListener('click', rateDetailClickHandler, true);
  };

  const detachRateDetailClickHandler = () => {
    if (!rateDetailClickHandler) {
      return;
    }
    document.removeEventListener('click', rateDetailClickHandler, true);
    rateDetailClickHandler = null;
  };

  const stopRateDetailsObserver = () => {
    if (rateDetailsObserver) {
      rateDetailsObserver.disconnect();
      rateDetailsObserver = null;
    }
  };

  const ensureRateDetailsObserverTargets = () => {
    if (!featureEnabled) {
      return;
    }
    if (rateDetailsObserver) {
      rateDetailsObserver.disconnect();
      rateDetailsObserver = null;
    }
    const targets = ['rateBoxButtons', 'catControls', 'noIndexEasy']
      .map((id) => document.getElementById(id))
      .filter(Boolean);
    if (!targets.length) {
      return;
    }
    rateDetailsObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes' || mutation.type === 'childList' || mutation.type === 'characterData') {
          scheduleHistoryLabelRefresh();
          break;
        }
      }
    });
    targets.forEach((target) => {
      try {
        rateDetailsObserver.observe(target, { attributes: true, childList: true, characterData: true, subtree: true });
      } catch (error) {
      }
    });
  };

  const createHistoryListItem = (entry) => {
    const button = document.createElement('button');
    button.type = 'button';
    Object.assign(button.style, {
      width: '100%',
      textAlign: 'left',
      background: '#181818',
      border: '1px solid #262626',
      borderLeft: '4px solid #262626',
      borderRadius: '6px',
      padding: '8px',
      color: '#f6f6f6',
      fontSize: '13px',
      fontWeight: '400',
      lineHeight: '1.3',
      cursor: 'pointer',
      whiteSpace: 'normal',
      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.3)',
      transition: 'transform 0.12s ease, filter 0.12s ease',
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      position: 'relative'
    });
    button.addEventListener('pointerdown', stopPropagation);
    button.addEventListener('mouseenter', () => {
      button.style.filter = 'brightness(1.1)';
    });
    button.addEventListener('mouseleave', () => {
      button.style.filter = '';
    });
    const titleEl = document.createElement('div');
    titleEl.textContent = entry.title;
    Object.assign(titleEl.style, {
      fontSize: '14px',
      fontWeight: '700'
    });

    const labelsRow = document.createElement('div');
    Object.assign(labelsRow.style, {
      display: entry.labels && entry.labels.length ? 'flex' : 'none',
      flexWrap: 'wrap',
      gap: '6px'
    });
    if (entry.labels && entry.labels.length) {
      entry.labels.forEach((label) => {
        const tag = document.createElement('span');
        tag.textContent = label;
        Object.assign(tag.style, {
          fontSize: '12px',
          fontWeight: '400',
          padding: '2px 6px',
          borderRadius: '4px',
          border: '1px solid #2f2f2f',
          background: '#101010',
          color: '#d9d9d9'
        });
        labelsRow.appendChild(tag);
      });
    }

    button.append(titleEl);
    if (entry.labels && entry.labels.length) {
      button.append(labelsRow);
    }

    button.addEventListener('click', (event) => {
      stopPropagation(event);
      const destination = entry.url || '';
      if (!destination) {
        return;
      }
      if (event.metaKey || event.ctrlKey) {
        try {
          window.open(destination, '_blank', 'noopener');
          return;
        } catch (_) {}
      }
      window.location.href = destination;
    });
    return button;
  };

  const renderHistoryEntries = () => {
    if (!historyList || !historyEmptyState) {
      return;
    }
    historyList.textContent = '';
    if (!historyEntries.length) {
      historyEmptyState.style.display = 'block';
      return;
    }
    historyEmptyState.style.display = 'none';
    historyEntries.forEach((entry) => {
      historyList.appendChild(createHistoryListItem(entry));
    });
  };

  const addHistoryEntry = (entry) => {
    if (!entry || (!entry.title && !entry.url)) {
      return;
    }
    const normalizedUrl = normalizeHistoryUrl(entry.url || getCurrentContentUrl());
    if (!normalizedUrl) {
      return;
    }
    const timestampMs = Number.isFinite(entry.timestampMs) ? entry.timestampMs : Date.now();
    const sanitized = sanitizeHistoryEntry({
      title: entry.title || getCurrentContentTitle(),
      url: normalizedUrl,
      labels: entry.labels || getCurrentRateLabels(),
      timestampMs
    });
    const existingIndex = historyEntries.findIndex((item) => item.url === sanitized.url);
    if (existingIndex !== -1) {
      historyEntries.splice(existingIndex, 1);
    }
    historyEntries.unshift(sanitized);
    if (historyEntries.length > HISTORY_MAX_ENTRIES) {
      historyEntries = historyEntries.slice(0, HISTORY_MAX_ENTRIES);
    }
    renderHistoryEntries();
    persistHistoryEntries();
  };

  const clearHistoryEntries = () => {
    historyEntries = [];
    renderHistoryEntries();
    persistHistoryEntries();
  };

  const recordHistoryEntry = () => {
    const title = getCurrentContentTitle();
    const url = getCurrentContentUrl();
    const labels = getCurrentRateLabels();
    addHistoryEntry({ title, url, labels, timestampMs: Date.now() });
  };

  const computeRateHistoryRange = () => {
    const timestamps = historyEntries
      .map((entry) => Number(entry.timestampMs))
      .filter((value) => Number.isFinite(value));
    if (!timestamps.length) {
      return null;
    }
    const minTs = Math.min(...timestamps);
    const maxTs = Math.max(...timestamps);
    const startMs = Math.max(0, minTs - RATE_HISTORY_BUFFER_MS);
    const endMs = Math.max(startMs + 1000, maxTs + RATE_HISTORY_BUFFER_MS);
    return { startMs, endMs };
  };

  const formatUtcTimestamp = (ms) => {
    if (!Number.isFinite(ms)) {
      return '';
    }
    const date = new Date(ms);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    const pad = (value) => String(value).padStart(2, '0');
    const year = date.getUTCFullYear();
    const month = pad(date.getUTCMonth() + 1);
    const day = pad(date.getUTCDate());
    const hours = pad(date.getUTCHours());
    const minutes = pad(date.getUTCMinutes());
    const seconds = pad(date.getUTCSeconds());
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  };

  const encodeTimestampForLink = (ms) => {
    const formatted = formatUtcTimestamp(ms);
    if (!formatted) {
      return '';
    }
    return formatted.replace(' ', '%20');
  };

  const getCachedApichkUsername = () => {
    try {
      const cached = window.fjApichk && typeof window.fjApichk.getCached === 'function'
        ? window.fjApichk.getCached()
        : null;
      const username = typeof cached?.username === 'string' ? cached.username.trim() : '';
      return username || '';
    } catch (_) {
      return '';
    }
  };

  const resolveModeratorUsername = async () => {
    let username = getCachedApichkUsername();
    if (username) {
      return username;
    }
    if (window.fjApichk && typeof window.fjApichk.ensureFetched === 'function') {
      try {
        await window.fjApichk.ensureFetched();
        username = getCachedApichkUsername();
        if (username) {
          return username;
        }
      } catch (_) {}
    }
    return '';
  };

  const buildRateHistoryLink = async () => {
    const range = computeRateHistoryRange();
    if (!range) {
      return { ok: false, reason: 'range', message: 'No recorded rates yet.' };
    }
    const username = await resolveModeratorUsername();
    if (!username) {
      return { ok: false, reason: 'username', message: 'Unable to detect username from APIChk.' };
    }
    const startToken = encodeTimestampForLink(range.startMs);
    const endToken = encodeTimestampForLink(range.endMs);
    if (!startToken || !endToken) {
      return { ok: false, reason: 'format', message: 'Unable to format timestamps.' };
    }
    const url = `${RATE_HISTORY_URL_BASE}/${encodeURIComponent(username)}/${startToken}/${endToken}`;
    return { ok: true, url, username, range };
  };

  const persistHistoryEntries = () => {
    try {
      if (!historyEntries.length) {
        localStorage.removeItem(HISTORY_STORAGE_KEY);
        return;
      }
      const payload = JSON.stringify(historyEntries.slice(0, HISTORY_MAX_ENTRIES));
      localStorage.setItem(HISTORY_STORAGE_KEY, payload);
    } catch (_) {}
  };

  const loadHistoryEntriesFromStorage = () => {
    try {
      const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return;
      }
      const restored = parsed.map((item) => sanitizeHistoryEntry(item)).filter(Boolean);
      if (restored.length) {
        historyEntries = restored.slice(0, HISTORY_MAX_ENTRIES);
      }
    } catch (_) {}
  };

  function detachHistoryOutsideClick() {
    if (!historyOutsideClickHandler) {
      return;
    }
    document.removeEventListener('pointerdown', historyOutsideClickHandler, true);
    historyOutsideClickHandler = null;
  }

  function closeHistoryDropdown() {
    historyDropdownOpen = false;
    if (historyDropdown) {
      historyDropdown.style.pointerEvents = 'none';
      historyDropdown.style.opacity = '0';
      historyDropdown.style.transform = 'translateY(-8px) scale(0.98)';
      if (historyDropdownHideTimeout) {
        clearTimeout(historyDropdownHideTimeout);
      }
      historyDropdownHideTimeout = setTimeout(() => {
        if (!historyDropdownOpen && historyDropdown) {
          historyDropdown.style.display = 'none';
        }
        historyDropdownHideTimeout = null;
      }, HISTORY_MENU_ANIM_MS);
    }
    detachHistoryOutsideClick();
    detachHistoryDropdownViewportHandlers();
  }

  function openHistoryDropdown() {
    historyDropdownOpen = true;
    if (historyDropdown) {
      if (historyDropdownHideTimeout) {
        clearTimeout(historyDropdownHideTimeout);
        historyDropdownHideTimeout = null;
      }
      updateHistoryDropdownPosition();
      historyDropdown.style.display = 'flex';
      historyDropdown.style.pointerEvents = 'auto';
      requestAnimationFrame(() => {
        if (historyDropdown) {
          historyDropdown.style.opacity = '1';
          historyDropdown.style.transform = 'translateY(0) scale(1)';
        }
      });
    }
    attachHistoryOutsideClick();
    attachHistoryDropdownViewportHandlers();
  }

  function attachHistoryOutsideClick() {
    if (historyOutsideClickHandler) {
      return;
    }
    historyOutsideClickHandler = (event) => {
      if (!historyDropdownOpen) {
        return;
      }
      if (historySection && historySection.contains(event.target)) {
        return;
      }
      if (historyDropdown && historyDropdown.contains(event.target)) {
        return;
      }
      closeHistoryDropdown();
    };
    document.addEventListener('pointerdown', historyOutsideClickHandler, true);
  }

  function setHistoryDropdownOpen(open) {
    if (open) {
      openHistoryDropdown();
    } else {
      closeHistoryDropdown();
    }
  }

  function toggleHistoryDropdown() {
    setHistoryDropdownOpen(!historyDropdownOpen);
  }

  // Prevent accidental double counts when shortcut + click fire together.
  // Avoid double increments when quick rate + keyboard fire within a heartbeat
  const tryCountRate = () => {
    const now = Date.now();
    if (lastRateCountAt && now - lastRateCountAt < DEDUP_WINDOW_MS) {
      return;
    }
    lastRateCountAt = now;
    registerPendingRateUpdate('rate-count');
    adjustCounter(1);
    recordHistoryEntry();
    scheduleHistoryLabelRefresh();
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
    counterValue = Math.max(0, Number(value) || 0);
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
    if (!Number.isFinite(parsed)) {
      return null;
    }
    return parsed < 0 ? null : parsed;
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
    const { width: viewportWidth, height: viewportHeight } = getViewportSize();
    const minTopLocked = PANEL_MARGIN + PANEL_VERTICAL_BUFFER;
    if (panelLocked) {
      const maxLeft = Math.max(PANEL_MARGIN, viewportWidth - width - PANEL_MARGIN);
      const maxTop = Math.max(minTopLocked, viewportHeight - height - PANEL_MARGIN);
      const clampedLeft = Math.min(Math.max(left, PANEL_MARGIN), maxLeft);
      const clampedTop = Math.min(Math.max(top, minTopLocked), maxTop);
      return { left: Math.round(clampedLeft), top: Math.round(clampedTop) };
    }
    const minTopUnlocked = scrollTop + PANEL_MARGIN + PANEL_VERTICAL_BUFFER;
    const maxLeft = scrollLeft + Math.max(PANEL_MARGIN, viewportWidth - width - PANEL_MARGIN);
    const rawMaxTop = scrollTop + Math.max(PANEL_MARGIN, viewportHeight - height - PANEL_MARGIN);
    const maxTop = Math.max(minTopUnlocked, rawMaxTop);
    const clampedLeft = Math.min(Math.max(left, scrollLeft + PANEL_MARGIN), maxLeft);
    const clampedTop = Math.min(Math.max(top, minTopUnlocked), maxTop);
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
      const rect = panel.getBoundingClientRect();
      const width = rect.width || 180;
      const height = rect.height || 210;
      if (panelLocked) {
        const { width: viewportWidth, height: viewportHeight } = getViewportSize();
        const defaultLeft = Math.max(PANEL_MARGIN, viewportWidth - width - PANEL_MARGIN);
        const defaultTop = Math.max(PANEL_MARGIN, viewportHeight - height - PANEL_MARGIN);
        panelPosition = clampPanelPosition(defaultLeft, defaultTop);
        panel.style.position = 'fixed';
        panel.style.left = panelPosition.left + 'px';
        panel.style.top = panelPosition.top + 'px';
        panel.style.bottom = '';
        panel.style.right = '';
      } else {
        const { left: scrollLeft, top: scrollTop } = getScrollOffsets();
        const { width: viewportWidth, height: viewportHeight } = getViewportSize();
        const defaultLeft = scrollLeft + Math.max(PANEL_MARGIN, viewportWidth - width - PANEL_MARGIN);
        const defaultTop = scrollTop + Math.max(PANEL_MARGIN, viewportHeight - height - PANEL_MARGIN);
        panelPosition = clampPanelPosition(defaultLeft, defaultTop);
        panel.style.position = 'absolute';
        panel.style.left = panelPosition.left + 'px';
        panel.style.top = panelPosition.top + 'px';
        panel.style.bottom = '';
        panel.style.right = '';
      }
      if (historyDropdownOpen) {
        updateHistoryDropdownPosition();
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
    if (historyDropdownOpen) {
      updateHistoryDropdownPosition();
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
    if (historyDropdownOpen) {
      updateHistoryDropdownPosition();
    }
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

  const applyButtonAnimations = (button) => {
    if (!button || button.dataset.fjfeAnimBound) return;
    button.dataset.fjfeAnimBound = '1';
    button.style.transition = 'transform 120ms ease, filter 160ms ease, box-shadow 160ms ease';
    button.style.transformOrigin = 'center';
    const press = (event) => {
      stopPropagation(event);
      button.style.transform = 'scale(0.96)';
    };
    const release = (event) => {
      stopPropagation(event);
      button.style.transform = '';
    };
    button.addEventListener('pointerdown', press);
    ['pointerup', 'pointerleave', 'pointercancel', 'blur'].forEach((evt) => {
      button.addEventListener(evt, release);
    });
    button.addEventListener('mouseenter', () => {
      button.style.filter = 'brightness(1.08)';
    });
    button.addEventListener('mouseleave', () => {
      button.style.filter = '';
    });
  };

  const ensureScrollbarStyles = () => {
    if (document.getElementById(SCROLLBAR_STYLE_ID)) {
      return;
    }
    const style = document.createElement('style');
    style.id = SCROLLBAR_STYLE_ID;
    style.textContent = `
      .fjfe-ratetrack-scroll {
        scrollbar-width: thin;
        scrollbar-color: #6a6a6a transparent;
      }
      .fjfe-ratetrack-scroll::-webkit-scrollbar {
        width: 8px;
      }
      .fjfe-ratetrack-scroll::-webkit-scrollbar-track {
        background: transparent;
      }
      .fjfe-ratetrack-scroll::-webkit-scrollbar-thumb {
        background: #6a6a6a;
        border-radius: 6px;
        border: 2px solid transparent;
        background-clip: padding-box;
      }
    `;
    document.head?.appendChild(style);
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
      padding: '0 12px 12px 12px',
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
      zIndex: String(PANEL_Z_INDEX)
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
      padding: '6px 0 4px 0',
      minHeight: '26px',
      gap: '8px'
    });

    const dragHandle = document.createElement('div');
    Object.assign(dragHandle.style, {
      cursor: 'move',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-start',
      minHeight: '22px',
      userSelect: 'none',
      flex: '0 0 auto'
    });
    const dragIcon = document.createElement('img');
    dragIcon.src = getResourceUrl('icons/menu.png');
    dragIcon.alt = '';
    Object.assign(dragIcon.style, {
      width: '20px',
      height: '20px',
      objectFit: 'contain',
      opacity: '0.75'
    });
    dragHandle.append(dragIcon);
    dragHandle.addEventListener('pointerdown', startDrag);

    const copyButton = document.createElement('button');
    copyButton.type = 'button';
    copyButton.tabIndex = -1;
    copyButton.setAttribute('aria-hidden', 'true');
    Object.assign(copyButton.style, {
      width: '25px',
      height: '25px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '4px',
      border: '1px solid #143462',
      background: 'linear-gradient(180deg, #2f67c0 0%, #12438a 52%, #0c2f61 100%)',
      cursor: 'pointer',
      flex: '0 0 auto',
      padding: '2px'
    });
    copyButton.style.boxShadow = 'inset 0 1px 0 rgba(255, 255, 255, 0.35), inset 0 -1px 0 rgba(0, 0, 0, 0.35), 0 1px 4px rgba(0, 0, 0, 0.35)';
    copyButton.title = 'Copy timecode';
    const copyIcon = document.createElement('img');
    copyIcon.src = getResourceUrl('icons/copy.png');
    copyIcon.alt = '';
    Object.assign(copyIcon.style, {
      width: '17px',
      height: '17px',
      objectFit: 'contain'
    });
    copyButton.appendChild(copyIcon);
    applyButtonAnimations(copyButton);
    copyButton.addEventListener('pointerdown', stopPropagation);
    copyButton.addEventListener('click', async (event) => {
      stopPropagation(event);
      event.preventDefault();
      const result = await buildRateHistoryLink();
      if (!result.ok) {
        showRateCopyStatus(result.message || 'Unable to build rate link.', 'error');
        return;
      }
      const success = await copyTextToClipboard(result.url);
      if (success) {
        const usernameLabel = result.username || 'moderator';
        showRateCopyStatus(`Copied rate link for ${usernameLabel}.`, 'success');
      } else {
        showRateCopyStatus('Unable to copy rate link to clipboard.', 'error');
      }
    });

    lockButton = document.createElement('button');
    Object.assign(lockButton.style, {
      width: '25px',
      height: '25px',
      lineHeight: '25px',
      textAlign: 'center',
      fontSize: '17px',
      border: '1px solid #3a3a3a',
      borderRadius: '4px',
      cursor: 'pointer',
      flex: '0 0 auto',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    });
    applyButtonAnimations(lockButton);
    lockButton.style.boxShadow = 'inset 0 1px 0 rgba(255, 255, 255, 0.25), inset 0 -1px 0 rgba(0, 0, 0, 0.35), 0 1px 4px rgba(0, 0, 0, 0.35)';
    const applyLockButtonUI = () => {
      if (!lockButton) return;
      if (panelLocked) {
        lockButton.textContent = '🔓︎';
        lockButton.style.background = 'linear-gradient(180deg, #5a5a5a 0%, #2d2d2d 55%, #1f1f1f 100%)';
        lockButton.style.color = '#e0e0e0';
        lockButton.style.borderColor = '#3a3a3a';
        lockButton.title = 'Unlock position';
      } else {
        lockButton.textContent = '🔒︎';
        lockButton.style.background = 'linear-gradient(180deg, #8c8c8c 0%, #6a6a6a 55%, #515151 100%)';
        lockButton.style.color = '#1a1a1a';
        lockButton.style.borderColor = '#7a7a7a';
        lockButton.title = 'Lock position';
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

    const copyStatusEl = document.createElement('div');
    rateCopyStatus = copyStatusEl;
    Object.assign(copyStatusEl.style, {
      flex: '1 1 auto',
      minWidth: '0',
      textAlign: 'center',
      fontSize: '9px',
      color: '#bdd6ff',
      opacity: '0',
      transition: 'opacity 0.2s ease',
      pointerEvents: 'none',
      display: 'block',
      whiteSpace: 'normal',
      wordBreak: 'break-word',
      lineHeight: '1.1',
      maxHeight: '24px',
      overflow: 'hidden',
      padding: '0 4px'
    });
    copyStatusEl.textContent = '';

    header.append(dragHandle, copyStatusEl, copyButton, lockButton);
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
      fontSize: '48px',
      fontWeight: '700',
      fontFamily: "'Segoe UI Rounded', 'Arial Rounded MT Bold', 'Nunito', 'Segoe UI', sans-serif",
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
      fontSize: '48px',
      fontWeight: '700',
      fontFamily: "'Segoe UI Rounded', 'Arial Rounded MT Bold', 'Nunito', 'Segoe UI', sans-serif",
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

    const trackedRatesLabel = document.createElement('div');
    trackedRatesLabel.textContent = 'TRACKED RATES';
    Object.assign(trackedRatesLabel.style, {
      fontSize: '9px',
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      color: '#9a9a9a',
      marginTop: '-4px',
      marginBottom: '2px',
      textAlign: 'center',
      width: '100%'
    });
    panel.append(trackedRatesLabel);

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
        border: '1px solid #3a3a3a',
        borderRadius: '4px',
        cursor: 'pointer'
      });
      applyButtonAnimations(button);
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
      width: '80%',
      padding: '5px 8px',
      fontSize: '14px',
      fontWeight: '500',
      color: '#ffaa00',
      background: '#161616',
      border: '2px solid #332200',
      borderRadius: '4px',
      cursor: 'pointer',
      alignSelf: 'center',
      marginTop: '4px',
      marginBottom: '-4px'
    });
    applyButtonAnimations(resetButton);
    const resetConfirmWrapper = document.createElement('div');
    Object.assign(resetConfirmWrapper.style, {
      width: '100%',
      display: 'none',
      gap: '8px',
      marginTop: '4px',
      marginBottom: '-4px'
    });

    const resetConfirmButton = document.createElement('button');
    resetConfirmButton.textContent = 'Reset';
    Object.assign(resetConfirmButton.style, {
      flex: '1 1 0',
      padding: '6px 8px',
      fontSize: '13px',
      fontWeight: '600',
      color: '#ffdddd',
      background: '#3c1414',
      border: '1px solid #6e1b1b',
      borderRadius: '4px',
      cursor: 'pointer'
    });
    applyButtonAnimations(resetConfirmButton);

    const resetCancelButton = document.createElement('button');
    resetCancelButton.textContent = "Don't Reset";
    Object.assign(resetCancelButton.style, {
      flex: '1 1 0',
      padding: '6px 8px',
      fontSize: '13px',
      fontWeight: '600',
      color: '#dcdcdc',
      background: '#1c1c1c',
      border: '1px solid #2f2f2f',
      borderRadius: '4px',
      cursor: 'pointer'
    });
    applyButtonAnimations(resetCancelButton);

    resetConfirmWrapper.append(resetConfirmButton, resetCancelButton);

    let resetConfirmVisible = false;
    const setResetConfirmVisible = (visible) => {
      resetConfirmVisible = Boolean(visible);
      resetButton.style.display = resetConfirmVisible ? 'none' : 'block';
      resetConfirmWrapper.style.display = resetConfirmVisible ? 'flex' : 'none';
    };

    resetButton.addEventListener('click', (event) => {
      stopPropagation(event);
      event.preventDefault();
      if (!resetConfirmVisible) {
        setResetConfirmVisible(true);
      }
    });

    resetConfirmButton.addEventListener('click', (event) => {
      stopPropagation(event);
      event.preventDefault();
      resetCounter();
      clearHistoryEntries();
      setHistoryDropdownOpen(false);
      setResetConfirmVisible(false);
    });

    resetCancelButton.addEventListener('click', (event) => {
      stopPropagation(event);
      event.preventDefault();
      setResetConfirmVisible(false);
    });

    panel.append(resetButton, resetConfirmWrapper);

    const resetHistoryDivider = document.createElement('div');
    Object.assign(resetHistoryDivider.style, {
      width: '100%',
      height: '1px',
      background: '#232323',
      margin: '1px 0 0 0'
    });
    panel.append(resetHistoryDivider);

    historySection = document.createElement('div');
    historySection.style.width = '100%';
    historySection.style.marginTop = '1px';
    historySection.style.position = 'relative';
    historySection.style.alignSelf = 'stretch';

    const historyButton = document.createElement('button');
    historyButton.type = 'button';
    historyButtonElement = historyButton;
    Object.assign(historyButton.style, {
      width: '100%',
      margin: '0',
      height: '32px',
      border: '1px solid #4a4a7a',
      borderRadius: '6px',
      padding: '0 8px',
      cursor: 'pointer',
      boxShadow: '0 2px 6px #0006',
      outline: 'none',
      background: '#242436',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '0px'
    });
    applyButtonAnimations(historyButton);

    const makeHistoryArrowIcon = () => {
      const img = document.createElement('img');
      const src = chrome.runtime && chrome.runtime.getURL ? chrome.runtime.getURL('icons/down_icon.png') : 'icons/down_icon.png';
      img.src = src;
      Object.assign(img.style, {
        width: '12px',
        height: '12px',
        objectFit: 'contain',
        pointerEvents: 'none',
        userSelect: 'none',
        flex: '0 0 auto'
      });
      return img;
    };

    const historyArrowLeft = makeHistoryArrowIcon();
    const historyArrowRight = makeHistoryArrowIcon();
    historyArrowLeft.style.marginRight = '2px';
    historyArrowRight.style.marginLeft = '2px';

    const historyLabel = document.createElement('span');
    historyLabel.textContent = 'HISTORY';
    Object.assign(historyLabel.style, {
      fontWeight: '600',
      letterSpacing: '0.12em',
      fontSize: '10px',
      color: '#d9d9e6',
      pointerEvents: 'none',
      userSelect: 'none',
      flex: '1 1 auto',
      textAlign: 'center',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    });

    historyButton.append(historyArrowLeft, historyLabel, historyArrowRight);

    historyButton.addEventListener('click', (event) => {
      stopPropagation(event);
      toggleHistoryDropdown();
    });

    historyDropdown = document.createElement('div');
    Object.assign(historyDropdown.style, {
      position: 'absolute',
      left: '0',
      top: '0',
      width: 'auto',
      minWidth: '0',
      boxSizing: 'border-box',
      background: '#111',
      border: '1px solid #222',
      borderRadius: '0 0 8px 8px',
      boxShadow: '0 8px 18px rgba(0, 0, 0, 0.55)',
      padding: '14px 10px 12px 10px',
      display: 'none',
      flexDirection: 'column',
      gap: '0',
      zIndex: String(PANEL_Z_INDEX - 1),
      opacity: '0',
      transform: 'translateY(-8px) scale(0.98)',
      transition: `opacity ${HISTORY_MENU_ANIM_MS}ms ease, transform ${HISTORY_MENU_ANIM_MS}ms ease`,
      pointerEvents: 'none'
    });
    historyDropdown.addEventListener('pointerdown', stopPropagation);
    historyDropdown.addEventListener('click', stopPropagation);

    historyEmptyState = document.createElement('div');
    historyEmptyState.textContent = 'No history yet';
    Object.assign(historyEmptyState.style, {
      fontSize: '12px',
      color: '#aaaaaa',
      textAlign: 'center',
      padding: '12px 0'
    });

    const historyDropdownTopSpacer = document.createElement('div');
    Object.assign(historyDropdownTopSpacer.style, {
      height: `${HISTORY_DROPDOWN_PADDING_TOP}px`
    });

    ensureScrollbarStyles();

    const historyContentWrapper = document.createElement('div');
    historyContentWrapper.className = 'fjfe-ratetrack-scroll';
    Object.assign(historyContentWrapper.style, {
      maxHeight: String(HISTORY_VISIBLE_COUNT * 64) + 'px',
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      paddingRight: '8px',
      boxSizing: 'border-box'
    });

    historyList = document.createElement('div');
    Object.assign(historyList.style, {
      display: 'flex',
      flexDirection: 'column',
      gap: '10px'
    });

    historyContentWrapper.append(historyEmptyState, historyList);
    historyDropdown.append(historyDropdownTopSpacer, historyContentWrapper);
    historySection.append(historyButton);
    if (document.body) {
      document.body.append(historyDropdown);
    }
    panel.append(historySection);

    renderHistoryEntries();
    setHistoryDropdownOpen(false);

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
      setHistoryDropdownOpen(false);
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
      ensureRateDetailsObserverTargets();
      scheduleHistoryLabelRefresh();
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
    settingEnabled = Boolean(enabled);

    if (settingEnabled) {
      ensureAssistButton();
      bindAssistRefresh();
    } else {
      removeAssistButton();
    }

    const nextActive = settingEnabled && toggleEnabled;
    if (nextActive === featureEnabled) {
      updatePanelVisibility();
      return;
    }

    featureEnabled = nextActive;

    ensurePanel();
    updatePanelVisibility();

    if (featureEnabled) {
      ensureSkinButtonsBound();
      observeContent();
      attachRateDetailClickHandler();
      ensureRateDetailsObserverTargets();
      scheduleHistoryLabelRefresh();
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
      stopRateDetailsObserver();
      detachRateDetailClickHandler();
      cancelHistoryLabelRefresh();
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

  // Bootstraps: load counts, honor prefs, and listen for setting toggles
  const init = () => {
    if (window.location.hostname !== targetHost) {
      console.log('[FJFE-Student][ratetrack] init skipped due to host', window.location.hostname);
      return;
    }

    console.log('[FJFE-Student][ratetrack] init start');

    batchAssistToggleEnabled = loadBatchAssistToggle();
    refreshBatchAssistEnhancements();
    startRateReviewObserver();

    loadHistoryEntriesFromStorage();
    refreshCurrentPageHistoryLabels();
    ensurePanel();
    attachRateFailureConsoleWatch();
    (async () => {
      const loaded = await loadCounter();
      setCounter(loaded, false);
    })();
    setCountEditsEnabled(loadCountEditsPreference(), false);
    toggleEnabled = loadToggleEnabled();
    applySetting(true);
    window.addEventListener('fjTweakerBatchAssistToggle', (event) => {
      const detail = event?.detail;
      if (!detail || typeof detail.enabled === 'undefined') {
        return;
      }
      batchAssistToggleEnabled = Boolean(detail.enabled);
      refreshBatchAssistEnhancements();
    });
    window.addEventListener('storage', (event) => {
      if (event.key === TOGGLE_STORAGE_KEY) {
        toggleEnabled = event.newValue === null ? true : event.newValue === '1';
        setAssistButtonActive(toggleEnabled);
        applySetting(settingEnabled);
      }
      if (event.key === BATCH_ASSIST_TOGGLE_KEY) {
        batchAssistToggleEnabled = event.newValue === '1';
        refreshBatchAssistEnhancements();
      }
    });
  };

  if (!window.fjTweakerModules) {
    window.fjTweakerModules = {};
  }

  window.fjTweakerModules[MODULE_KEY] = { init };
  init();
})();
