(() => {
  const targetHost = 'funnyjunk.com';
  const MODULE_KEY = 'batchassist';
  const SETTING_KEY = 'batchAssist';
  const SETTINGS_STORAGE_KEY = 'fjTweakerSettings';
  const STORAGE_KEY = 'batchAssist';
  const STORAGE_META_KEY = 'batchAssistMeta';
  const PANEL_ID = 'fjfe-batchassist-menu';
  const PANEL_MARGIN = 12;
  const PANEL_Z_INDEX = 2147483645;
  const PANEL_POSITION_KEY = 'fjTweakerBatchPanelPosition';
  const PANEL_LOCK_KEY = 'fjTweakerBatchPanelLocked';
  const HISTORY_MENU_ANIM_MS = 160;
  const HISTORY_DROPDOWN_GAP = 4;
  const HISTORY_DROPDOWN_MIN_TOP = 32;
  const HISTORY_DROPDOWN_OVERLAP = 14;
  const HISTORY_DROPDOWN_PADDING_TOP = 22;
  const HISTORY_VISIBLE_COUNT = 5;
  const FALLBACK_QUEUE_TITLE = 'Untitled import';
  const QUEUE_STATUS = {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    ACKNOWLEDGED: 'acknowledged'
  };
  const MEME_TOKEN_STORAGE_KEY = 'PT_memeToken';
  const ACK_ENDPOINT_BASE = 'https://fjme.me/api/ratings/removeNeedsReview/';
  const ACK_REQUEST_DELAY_MS = 650;
  const SPINNER_STYLE_ID = 'fjfe-batchassist-spinner-style';
  const SCROLLBAR_STYLE_ID = 'fjfe-batchassist-scrollbar-style';
  const CATEGORY_MULTISELECT_LABELS = new Set(['spicy', 'meta']);
  const CATEGORY_OTHER_MEMES_LABEL = 'other/memes';
  const INVALID_DIALOG_MESSAGES = [
    "Go to the mods FJMeme ratings page and check if they've done any work ever."
  ];
  const ASSIST_WRAPPER_ID = 'fj-assist-buttons';
  const ASSIST_ANCHOR_ATTR = 'fjAssistAnchor';
  const ASSIST_BUTTON_ID = 'fj-assist-batch-button';
  const ASSIST_BUTTON_ORDER = 2;
  const ASSIST_ICON_PATH = 'icons/batchassist.png';
  const TOGGLE_STORAGE_KEY = 'fjTweakerBatchAssistToggle';
  const ASSIST_GLOW_COLOR = 'rgba(88, 164, 255, 0.75)';

  let featureEnabled = false;
  let settingEnabled = false;
  let toggleEnabled = false;
  let queueLinks = [];
  let queueMetadata = {};
  let panel = null;
  let panelPosition = null;
  let panelLocked = true;
  let dragState = null;
  let lockButton = null;
  let countDisplay = null;
  let historySection = null;
  let historyButtonElement = null;
  let historyDropdown = null;
  let historyList = null;
  let historyEmptyState = null;
  let historyDropdownOpen = false;
  let historyOutsideClickHandler = null;
  let historyDropdownHideTimeout = null;
  let historyDropdownViewportHandler = null;
  let storageListenerBound = false;
  let waitingForPanelMount = false;
  let invalidDialogObserver = null;
  let loadingIndicator = null;
  let percentIndicator = null;
  let noteElement = null;
  let queueStatusNote = '';
  let updateNoteForStateRef = null;
  let queueRemainingNote = '';
  let queueBarState = { approved: 0, rejected: 0, total: 0 };

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

  const getAssetUrl = (relativePath) => {
    if (!relativePath) {
      return '';
    }
    try {
      if (typeof chrome !== 'undefined' && chrome?.runtime?.getURL) {
        return chrome.runtime.getURL(relativePath);
      }
    } catch (_) {}
    return relativePath;
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
    button.style.transform = 'translateZ(0)';
    button.style.backfaceVisibility = 'hidden';
    button.style.willChange = 'transform, box-shadow, filter';
    if (!button.dataset.fjAssistPressBound) {
      button.dataset.fjAssistPressBound = '1';
      button.addEventListener('pointerdown', () => {
        button.style.transform = 'translateZ(0) scale(0.92)';
      });
      ['pointerup', 'pointerleave', 'pointercancel', 'blur'].forEach((evt) => {
        button.addEventListener(evt, () => {
          button.style.transform = 'translateZ(0)';
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
      button.style.backgroundImage = `url(${getAssetUrl(options.iconPath)})`;
    }
  };

  const loadToggleEnabled = () => {
    try {
      return localStorage.getItem(TOGGLE_STORAGE_KEY) === '1';
    } catch (_) {
      return false;
    }
  };

  const persistToggleEnabled = () => {
    try {
      if (toggleEnabled) {
        localStorage.setItem(TOGGLE_STORAGE_KEY, '1');
      } else {
        localStorage.removeItem(TOGGLE_STORAGE_KEY);
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
      assistButton.setAttribute('aria-label', 'Batch Assist');
      assistButton.setAttribute('title', 'Batch Assist');
    }
    applyAssistIconButtonStyling(assistButton, anchor, {
      background: '#1f4f7a',
      border: '#163958',
      color: '#e6f2ff',
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
        try {
          window.dispatchEvent(new CustomEvent('fjTweakerBatchAssistToggle', { detail: { enabled: toggleEnabled } }));
        } catch (_) {}
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

  const sleep = (ms = 0) => new Promise((resolve) => {
    const delay = Number.isFinite(ms) && ms > 0 ? ms : 0;
    setTimeout(resolve, delay);
  });

  const ensureSpinnerStyles = () => {
    if (document.getElementById(SPINNER_STYLE_ID)) {
      return;
    }
    const style = document.createElement('style');
    style.id = SPINNER_STYLE_ID;
    style.textContent = `@keyframes fjfeBatchAssistSpinner { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`;
    document.head?.appendChild(style);
  };

  const ensureScrollbarStyles = () => {
    if (document.getElementById(SCROLLBAR_STYLE_ID)) {
      return;
    }
    const style = document.createElement('style');
    style.id = SCROLLBAR_STYLE_ID;
    style.textContent = `
      .fjfe-batchassist-scroll {
        scrollbar-width: thin;
        scrollbar-color: #6a6a6a transparent;
      }
      .fjfe-batchassist-scroll::-webkit-scrollbar {
        width: 8px;
      }
      .fjfe-batchassist-scroll::-webkit-scrollbar-track {
        background: transparent;
      }
      .fjfe-batchassist-scroll::-webkit-scrollbar-thumb {
        background: #6a6a6a;
        border-radius: 6px;
        border: 2px solid transparent;
        background-clip: padding-box;
      }
    `;
    document.head?.appendChild(style);
  };

  const readMemeToken = () => {
    try {
      const token = window.localStorage?.getItem(MEME_TOKEN_STORAGE_KEY);
      return typeof token === 'string' ? token.trim() : '';
    } catch (_) {
      return '';
    }
  };

  const buildAcknowledgeUrl = (rateId) => `${ACK_ENDPOINT_BASE}${encodeURIComponent(rateId)}`;

  const sendAcknowledgeRequest = async (rateId, token) => {
    if (!rateId || !token) {
      return { ok: false, error: 'missing-params' };
    }
    let response;
    try {
      response = await fetch(buildAcknowledgeUrl(rateId), {
        method: 'GET',
        mode: 'cors',
        credentials: 'include',
        cache: 'no-store',
        headers: {
          Accept: 'application/json, text/plain, */*',
          Authorization: `Bearer ${token}`
        }
      });
    } catch (error) {
      return { ok: false, networkError: true, error };
    }
    let bodyText = '';
    try {
      bodyText = await response.text();
    } catch (_) {}
    const rateLimited = response.status === 429 || /too many attempts/i.test(bodyText);
    if (rateLimited) {
      return { ok: false, rateLimited: true, status: response.status, bodyText };
    }
    if (!response.ok) {
      return { ok: false, status: response.status, bodyText };
    }
    let parsed;
    try {
      parsed = JSON.parse(bodyText);
    } catch (_) {
      parsed = null;
    }
    const success = Array.isArray(parsed)
      ? parsed[0] === 'OK'
      : typeof bodyText === 'string' && bodyText.trim().replace(/"/g, '').toUpperCase() === 'OK';
    if (success) {
      return {
        ok: true,
        status: response.status,
        bodyText,
        parsed
      };
    }
    return { ok: false, status: response.status, bodyText, parsed };
  };

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

  const normalizeQueueStatus = (value) => (
    value === QUEUE_STATUS.APPROVED || value === QUEUE_STATUS.REJECTED || value === QUEUE_STATUS.ACKNOWLEDGED
      ? value
      : QUEUE_STATUS.PENDING
  );

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
      .filter(Boolean);
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
        .map((raw) => {
          const trimmed = selectLabel(raw);
          return { raw: trimmed, normalized: normalizeReasonLabel(trimmed) };
        })
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
    const index = selectLabel(value.index);
    if (index) {
      normalized.index = index;
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
    const summaryText = typeof details.summaryText === 'string' ? details.summaryText.trim() : '';
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

  const sanitizeQueueMetadata = (value) => {
    if (!value || typeof value !== 'object') {
      return {};
    }
    const metadata = {};
    if (typeof value.username === 'string') {
      const username = value.username.trim();
      if (username) {
        metadata.username = username;
      }
    }
    if (Number.isFinite(value.exportedAt)) {
      metadata.exportedAt = Number(value.exportedAt);
    }
    if (Number.isFinite(value.total)) {
      metadata.total = Number(value.total);
    }
    return metadata;
  };

  const QUEUE_STATUS_STYLES = {
    [QUEUE_STATUS.PENDING]: {
      background: '#181818',
      border: '#262626',
      text: '#f6f6f6'
    },
    [QUEUE_STATUS.APPROVED]: {
      background: '#0f2e19',
      border: '#1f6637',
      text: '#d5f7dc'
    },
    [QUEUE_STATUS.REJECTED]: {
      background: '#321010',
      border: '#6a1f1f',
      text: '#ffd6d6'
    },
    [QUEUE_STATUS.ACKNOWLEDGED]: {
      background: '#102436',
      border: '#1a4d7a',
      text: '#cfe8ff'
    }
  };

  const applyQueueEntryStyles = (element, status) => {
    if (!element) {
      return;
    }
    const style = QUEUE_STATUS_STYLES[status] || QUEUE_STATUS_STYLES[QUEUE_STATUS.PENDING];
    element.style.background = style.background;
    element.style.border = `1px solid ${style.border}`;
    element.style.color = style.text;
    element.style.borderLeft = `4px solid ${style.border}`;
  };

  const getRejectSummarySegments = (details) => {
    if (!details) {
      return [];
    }
    if (Array.isArray(details.segments) && details.segments.length) {
      return details.segments
        .map((segment) => {
          const text = typeof segment?.text === 'string' ? segment.text.trim() : '';
          if (!text) {
            return null;
          }
          return { text, overridden: segment.overridden === true };
        })
        .filter(Boolean);
    }
    if (typeof details.summaryText === 'string' && details.summaryText.trim()) {
      return details.summaryText
        .split('/')
        .map((part) => {
          const text = part.trim();
          return text ? { text, overridden: false } : null;
        })
        .filter(Boolean);
    }
    return [];
  };

  const createRejectSummaryBox = (details) => {
    const segments = getRejectSummarySegments(details);
    if (!segments.length) {
      return null;
    }
    const box = document.createElement('div');
    Object.assign(box.style, {
      width: '100%',
      background: '#1c1c1c',
      border: '1px solid #2b2b2b',
      borderRadius: '6px',
      padding: '6px 8px',
      boxSizing: 'border-box'
    });
    const row = document.createElement('div');
    Object.assign(row.style, {
      width: '100%',
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      fontSize: '12px',
      fontWeight: '400',
      gap: '0'
    });
    segments.forEach((segment, index) => {
      const valueSpan = document.createElement('span');
      valueSpan.textContent = segment.text;
      const isFlaggable = typeof segment.text === 'string' && segment.text.trim().toLowerCase() === 'flaggable';
      const highlight = segment.overridden === true || isFlaggable;
      valueSpan.style.color = highlight ? '#ff7272' : '#f0f0f0';
      row.appendChild(valueSpan);
      if (index < segments.length - 1) {
        const divider = document.createElement('span');
        divider.textContent = ' / ';
        divider.style.opacity = '0.6';
        divider.style.color = '#bbbbbb';
        row.appendChild(divider);
      }
    });
    box.appendChild(row);
    return box;
  };

  const createRejectNoteBox = (note) => {
    if (typeof note !== 'string') {
      return null;
    }
    const trimmed = note.trim();
    if (!trimmed) {
      return null;
    }
    const box = document.createElement('div');
    Object.assign(box.style, {
      width: '100%',
      background: '#1c1c1c',
      border: '1px solid #2b2b2b',
      borderRadius: '6px',
      padding: '6px 8px',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      gap: '4px'
    });
    const label = document.createElement('div');
    label.textContent = 'Note';
    Object.assign(label.style, {
      fontSize: '10px',
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: '#bbbbbb'
    });
    const text = document.createElement('div');
    text.textContent = trimmed;
    Object.assign(text.style, {
      fontSize: '11px',
      fontWeight: '400',
      color: '#f0f0f0',
      whiteSpace: 'pre-wrap',
      lineHeight: '1.35'
    });
    box.append(label, text);
    return box;
  };

  const createApproveNoteBox = (note) => {
    if (typeof note !== 'string') {
      return null;
    }
    const trimmed = note.trim();
    if (!trimmed) {
      return null;
    }
    const box = document.createElement('div');
    Object.assign(box.style, {
      width: '100%',
      background: '#112416',
      border: '1px solid #1f5d32',
      borderRadius: '6px',
      padding: '6px 8px',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      gap: '4px'
    });
    const label = document.createElement('div');
    label.textContent = 'Note';
    Object.assign(label.style, {
      fontSize: '10px',
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: '#bbbbbb'
    });
    const text = document.createElement('div');
    text.textContent = trimmed;
    Object.assign(text.style, {
      fontSize: '11px',
      fontWeight: '400',
      color: '#f0f0f0',
      whiteSpace: 'pre-wrap',
      lineHeight: '1.35'
    });
    box.append(label, text);
    return box;
  };

  const normalizeDialogText = (value) => (value || '').toString().replace(/\s+/g, ' ').trim().toLowerCase();

  const isInvalidDialogMessage = (text) => {
    if (!text) {
      return false;
    }
    const normalized = normalizeDialogText(text);
    return INVALID_DIALOG_MESSAGES.some((message) => normalizeDialogText(message) === normalized);
  };

  const removeInvalidDialogs = () => {
    if (!featureEnabled || typeof document === 'undefined') {
      return;
    }
    const dialogs = document.querySelectorAll('#flashM, .ui-dialog');
    dialogs.forEach((dialog) => {
      const contentNode = dialog?.querySelector?.('.ui-dialog-content');
      if (!contentNode) {
        return;
      }
      const text = contentNode.textContent || contentNode.innerText || '';
      if (isInvalidDialogMessage(text)) {
        dialog.remove();
      }
    });
  };

  const ensureInvalidDialogObserver = () => {
    if (invalidDialogObserver || typeof MutationObserver === 'undefined' || !document.body) {
      return;
    }
    removeInvalidDialogs();
    invalidDialogObserver = new MutationObserver(() => {
      removeInvalidDialogs();
    });
    invalidDialogObserver.observe(document.body, { childList: true, subtree: true });
  };

  const teardownInvalidDialogObserver = () => {
    if (invalidDialogObserver) {
      invalidDialogObserver.disconnect();
      invalidDialogObserver = null;
    }
  };

  const markDocument = (active) => {
    const root = document.documentElement;
    if (!root) return;
    if (active) {
      root.dataset.fjfeBatchAssist = '1';
    } else {
      delete root.dataset.fjfeBatchAssist;
    }
  };

  const getModeratorUsername = () => {
    if (queueMetadata?.username) {
      return queueMetadata.username;
    }
    if (typeof document === 'undefined') {
      return '';
    }
    const TEXT_NODE = typeof Node !== 'undefined' && Number.isInteger(Node.TEXT_NODE) ? Node.TEXT_NODE : 3;
    const extractText = (element) => {
      if (!element) return '';
      const text = Array.from(element.childNodes || [])
        .map((node) => (node.nodeType === TEXT_NODE ? node.textContent : ''))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (text) {
        return text.split(/\s+/).filter(Boolean)[0] || '';
      }
      const fallback = (element.textContent || '').trim();
      return fallback.split(/\s+/).filter(Boolean)[0] || '';
    };
    const userButton = document.querySelector('#userList');
    const buttonName = extractText(userButton);
    if (buttonName) {
      return buttonName;
    }
    const profileAnchor = document.querySelector('a.tMen.tProf[title="My Profile"]');
    const anchorName = extractText(profileAnchor);
    if (anchorName) {
      return anchorName;
    }
    return '';
  };

  const stopPropagation = (event) => {
    if (event && typeof event.stopPropagation === 'function') {
      event.stopPropagation();
    }
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

  const storageAvailable = () => Boolean(typeof chrome !== 'undefined' && chrome?.storage?.local);

  const sanitizeLinks = (links) => {
    if (!Array.isArray(links)) {
      return [];
    }
    const normalized = [];
    links.forEach((entry) => {
      if (typeof entry === 'string') {
        const url = normalizeQueueUrl(entry);
        if (url) {
          normalized.push({ url, title: FALLBACK_QUEUE_TITLE, status: QUEUE_STATUS.PENDING });
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
      const status = normalizeQueueStatus(entry.status);
      const approveNote = typeof entry.approveNote === 'string' ? entry.approveNote.trim() : '';
      const rejectDetails = sanitizeQueueRejectDetails(entry.rejectDetails);
      const rateId = normalizeRateId(entry.rateId);
      const rateActionAdded = Boolean(entry.rateActionAdded);
      const payload = {
        url,
        title: title || FALLBACK_QUEUE_TITLE,
        status
      };
      if (rateActionAdded) {
        payload.rateActionAdded = true;
      }
      if (rateId) {
        payload.rateId = rateId;
      }
      if (approveNote && (status === QUEUE_STATUS.APPROVED || status === QUEUE_STATUS.ACKNOWLEDGED)) {
        payload.approveNote = approveNote;
      }
      if (rejectDetails) {
        payload.rejectDetails = rejectDetails;
      }
      normalized.push(payload);
    });
    return normalized;
  };

  const readQueueFromStorage = () => new Promise((resolve) => {
    const finish = (linksValue, metaValue) => {
      queueMetadata = sanitizeQueueMetadata(metaValue);
      resolve(sanitizeLinks(linksValue));
    };
    try {
      if (storageAvailable()) {
        chrome.storage.local.get([STORAGE_KEY, STORAGE_META_KEY], (result = {}) => {
          finish(result?.[STORAGE_KEY], result?.[STORAGE_META_KEY]);
        });
        return;
      }
    } catch (_) {}
    try {
      const rawLinks = localStorage.getItem(`fjfe:${STORAGE_KEY}`);
      const rawMeta = localStorage.getItem(`fjfe:${STORAGE_META_KEY}`);
      const parsedLinks = rawLinks ? JSON.parse(rawLinks) : [];
      const parsedMeta = rawMeta ? JSON.parse(rawMeta) : null;
      finish(parsedLinks, parsedMeta);
    } catch (_) {
      queueMetadata = {};
      resolve([]);
    }
  });

  const removeStoredQueueMetadata = () => {
    queueMetadata = {};
    try {
      if (storageAvailable()) {
        chrome.storage.local.remove(STORAGE_META_KEY, () => {});
        return;
      }
    } catch (_) {}
    try {
      localStorage.removeItem(`fjfe:${STORAGE_META_KEY}`);
    } catch (_) {}
  };

  const persistQueueToStorage = (links) => new Promise((resolve) => {
    const payload = sanitizeLinks(links);
    try {
      if (storageAvailable()) {
        if (payload.length) {
          chrome.storage.local.set({ [STORAGE_KEY]: payload }, () => resolve(true));
        } else {
          chrome.storage.local.remove(STORAGE_KEY, () => {
            removeStoredQueueMetadata();
            resolve(true);
          });
        }
        return;
      }
    } catch (_) {}
    try {
      if (payload.length) {
        localStorage.setItem(`fjfe:${STORAGE_KEY}`, JSON.stringify(payload));
      } else {
        localStorage.removeItem(`fjfe:${STORAGE_KEY}`);
        removeStoredQueueMetadata();
      }
      resolve(true);
    } catch (_) {
      resolve(false);
    }
  });

  const setQueueLinks = (links, options = {}) => {
    queueLinks = sanitizeLinks(links);
    updateQueueDisplay();
    renderQueueEntries();
    if (options.persist) {
      persistQueueToStorage(queueLinks);
    }
  };

  const refreshQueueLinks = async () => {
    const links = await readQueueFromStorage();
    setQueueLinks(links);
  };

  const clearQueueLinks = () => {
    if (!queueLinks.length) {
      return;
    }
    setQueueLinks([], { persist: true });
  };

  const removeQueueEntryAt = (index) => {
    if (index < 0 || index >= queueLinks.length) {
      return;
    }
    const next = queueLinks.slice();
    next.splice(index, 1);
    setQueueLinks(next, { persist: true });
  };

  const openQueueEntryAt = (index, { newTab = false } = {}) => {
    const entry = queueLinks[index];
    const url = entry?.url;
    if (!url) {
      return;
    }
    try {
      if (newTab) {
        window.open(url, '_blank', 'noopener');
      } else {
        window.location.href = url;
      }
    } catch (_) {
      try {
        window.location.href = url;
      } catch (_) {}
    }
  };

  const openNextLink = () => {
    if (!queueLinks.length) {
      return;
    }
    openQueueEntryAt(0, { newTab: true });
  };

  const dequeueNextLink = () => {
    if (!queueLinks.length) {
      return;
    }
    removeQueueEntryAt(0);
  };

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

  const getPagePosition = (event) => {
    const { left, top } = getScrollOffsets();
    return {
      x: event.pageX !== undefined ? event.pageX : event.clientX + left,
      y: event.pageY !== undefined ? event.pageY : event.clientY + top
    };
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
    } catch (_) {
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
    } catch (_) {}
  };

  const loadPanelLocked = () => {
    try {
      const raw = localStorage.getItem(PANEL_LOCK_KEY);
      if (raw === null || raw === undefined) {
        return true;
      }
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
    const minTopLocked = PANEL_MARGIN + 24;
    if (panelLocked) {
      const maxLeft = Math.max(PANEL_MARGIN, viewportWidth - width - PANEL_MARGIN);
      const maxTop = Math.max(minTopLocked, viewportHeight - height - PANEL_MARGIN);
      const clampedLeft = Math.min(Math.max(left, PANEL_MARGIN), maxLeft);
      const clampedTop = Math.min(Math.max(top, minTopLocked), maxTop);
      return { left: Math.round(clampedLeft), top: Math.round(clampedTop) };
    }
    const minTopUnlocked = scrollTop + PANEL_MARGIN + 24;
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
      } else {
        const { left: scrollLeft, top: scrollTop } = getScrollOffsets();
        const { width: viewportWidth, height: viewportHeight } = getViewportSize();
        const defaultLeft = scrollLeft + Math.max(PANEL_MARGIN, viewportWidth - width - PANEL_MARGIN);
        const defaultTop = scrollTop + Math.max(PANEL_MARGIN, viewportHeight - height - PANEL_MARGIN);
        panelPosition = clampPanelPosition(defaultLeft, defaultTop);
        panel.style.position = 'absolute';
      }
    } else {
      const clamped = clampPanelPosition(panelPosition.left, panelPosition.top);
      panelPosition = clamped;
      panel.style.position = panelLocked ? 'fixed' : 'absolute';
    }
    panel.style.left = panelPosition.left + 'px';
    panel.style.top = panelPosition.top + 'px';
    panel.style.bottom = '';
    panel.style.right = '';
    if (historyDropdownOpen) {
      updateHistoryDropdownPosition();
    }
  };

  const removeGlobalDragListeners = () => {
    window.removeEventListener('pointermove', handleDragMove);
    window.removeEventListener('pointerup', finishDrag);
    window.removeEventListener('pointercancel', finishDrag);
  };

  const handleDragMove = (event) => {
    if (!dragState || event.pointerId !== dragState.pointerId) {
      return;
    }
    stopPropagation(event);
    let nextLeft;
    let nextTop;
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
    panel.style.position = panelLocked ? 'fixed' : 'absolute';
    panel.style.left = clamped.left + 'px';
    panel.style.top = clamped.top + 'px';
    panel.style.bottom = '';
    panel.style.right = '';
    if (historyDropdownOpen) {
      updateHistoryDropdownPosition();
    }
  };

  const finishDrag = (event) => {
    if (!dragState || (event.pointerId !== undefined && event.pointerId !== dragState.pointerId)) {
      return;
    }
    stopPropagation(event);
    if (panel && typeof panel.releasePointerCapture === 'function' && dragState.pointerId !== undefined) {
      try {
        panel.releasePointerCapture(dragState.pointerId);
      } catch (_) {}
    }
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
    const { left: scrollLeft, top: scrollTop } = getScrollOffsets();
    if (panelLocked) {
      const initialLeft = panelPosition ? panelPosition.left : rect.left;
      const initialTop = panelPosition ? panelPosition.top : rect.top;
      panelPosition = clampPanelPosition(initialLeft, initialTop);
      panel.style.position = 'fixed';
    } else {
      const initialLeft = panelPosition ? panelPosition.left : rect.left + scrollLeft;
      const initialTop = panelPosition ? panelPosition.top : rect.top + scrollTop;
      panelPosition = clampPanelPosition(initialLeft, initialTop);
      panel.style.position = 'absolute';
    }
    panel.style.left = panelPosition.left + 'px';
    panel.style.top = panelPosition.top + 'px';

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
      } catch (_) {}
    }

    window.addEventListener('pointermove', handleDragMove);
    window.addEventListener('pointerup', finishDrag);
    window.addEventListener('pointercancel', finishDrag);
  };

  const formatQueueCountMarkup = (approved, total, rejected) => {
    const span = (value, color) => `<span style="color:${color}">${value}</span>`;
    const approvedSpan = span(approved, '#3aae66');
    const totalSpan = span(total, '#f6f6f6');
    const rejectedSpan = span(rejected, '#c04a4a');
    return `${approvedSpan}/${totalSpan} (${rejectedSpan})`;
  };

  const updateQueueDisplay = () => {
    if (!countDisplay) {
      return;
    }
    let approved = 0;
    let rejected = 0;
    queueLinks.forEach((entry) => {
      if (entry?.status === QUEUE_STATUS.APPROVED || entry?.status === QUEUE_STATUS.ACKNOWLEDGED) {
        approved += 1;
      } else if (entry?.status === QUEUE_STATUS.REJECTED) {
        rejected += 1;
      }
    });
    const total = queueLinks.length;
    countDisplay.innerHTML = formatQueueCountMarkup(approved, total, rejected);
    queueBarState = { approved, rejected, total };
    if (total === 0) {
      queueRemainingNote = '';
      queueStatusNote = 'Import links from FJMeme to populate the queue.';
    } else {
      const remaining = Math.max(0, total - approved - rejected);
      const errorRate = Math.round((rejected / total) * 100);
      queueRemainingNote = `${remaining} REMAINING`;
      queueStatusNote = `${errorRate}% ERROR RATE`;
    }
    if (typeof updateNoteForStateRef === 'function') {
      updateNoteForStateRef();
    } else if (noteElement) {
      noteElement.textContent = queueStatusNote;
    }
  };

  const getRejectSummaryText = (details) => {
    if (!details) {
      return '';
    }
    if (typeof details.summaryText === 'string') {
      const trimmed = details.summaryText.trim();
      if (trimmed) {
        return trimmed;
      }
    }
    if (Array.isArray(details.segments) && details.segments.length) {
      const text = details.segments
        .map((segment) => (typeof segment?.text === 'string' ? segment.text.trim() : ''))
        .filter(Boolean)
        .join('/');
      if (text) {
        return text;
      }
    }
    return '';
  };

  const collectQueueErrorEntries = () => {
    if (!Array.isArray(queueLinks) || !queueLinks.length) {
      return [];
    }
    const errors = [];
    queueLinks.forEach((entry) => {
      if (!entry || entry.status !== QUEUE_STATUS.REJECTED) {
        return;
      }
      const url = typeof entry.url === 'string' ? entry.url.trim() : '';
      if (!url) {
        return;
      }
      const details = entry.rejectDetails || null;
      const summary = details ? getRejectSummaryText(details) : '';
      const rawNote = details && typeof details.note === 'string' ? details.note.trim() : '';
      const note = rawNote ? rawNote.replace(/\s+/g, ' ') : '';
      errors.push({ url, summary, note });
    });
    return errors;
  };

  const collectQueueApproveNoteEntries = () => {
    if (!Array.isArray(queueLinks) || !queueLinks.length) {
      return [];
    }
    const approvals = [];
    queueLinks.forEach((entry) => {
      if (!entry || (entry.status !== QUEUE_STATUS.APPROVED && entry.status !== QUEUE_STATUS.ACKNOWLEDGED)) {
        return;
      }
      const url = typeof entry.url === 'string' ? entry.url.trim() : '';
      const note = typeof entry.approveNote === 'string' ? entry.approveNote.trim() : '';
      if (!url || !note) {
        return;
      }
      approvals.push({ url, note });
    });
    return approvals;
  };

  const collectRateIdTargets = () => {
    if (!Array.isArray(queueLinks) || !queueLinks.length) {
      console.debug('[BatchAssist] collectRateIdTargets: queue is empty or invalid.', {
        hasQueueLinks: Array.isArray(queueLinks),
        queueLength: Array.isArray(queueLinks) ? queueLinks.length : null
      });
      return [];
    }
    const seen = new Set();
    const targets = [];
    const stats = {
      total: queueLinks.length,
      skippedRateActionAdded: 0,
      skippedMissingRateId: 0,
      skippedDuplicateRateId: 0,
      skippedStatusMismatch: 0,
      added: 0
    };
    queueLinks.forEach((entry, index) => {
      const status = entry?.status || QUEUE_STATUS.PENDING;
      if (status !== QUEUE_STATUS.APPROVED) {
        stats.skippedStatusMismatch += 1;
        console.debug('[BatchAssist] collectRateIdTargets skip: non-approved status', {
          index,
          url: entry?.url,
          status
        });
        return;
      }
      if (entry?.rateActionAdded) {
        stats.skippedRateActionAdded += 1;
        console.debug('[BatchAssist] collectRateIdTargets skip: rateActionAdded', {
          index,
          url: entry?.url,
          status: entry?.status
        });
        return;
      }
      const rateId = normalizeRateId(entry?.rateId);
      if (!rateId) {
        stats.skippedMissingRateId += 1;
        console.debug('[BatchAssist] collectRateIdTargets skip: missing rateId', {
          index,
          url: entry?.url,
          status: entry?.status,
          rawRateId: entry?.rateId
        });
        return;
      }
      if (seen.has(rateId)) {
        stats.skippedDuplicateRateId += 1;
        console.debug('[BatchAssist] collectRateIdTargets skip: duplicate rateId', {
          index,
          url: entry?.url,
          status: entry?.status,
          rateId
        });
        return;
      }
      seen.add(rateId);
      targets.push({
        rateId,
        index,
        url: typeof entry?.url === 'string' ? entry.url : '',
        title: typeof entry?.title === 'string' ? entry.title : '',
        status,
        approveNote: typeof entry?.approveNote === 'string' ? entry.approveNote : ''
      });
      stats.added += 1;
    });
    console.debug('[BatchAssist] collectRateIdTargets summary.', stats);
    return targets;
  };

  const logVerboseAcknowledgeSuccess = ({
    rateId,
    url,
    title,
    status,
    approveNote,
    index,
    total,
    elapsedMs,
    result,
    token,
    successCount,
    failureCount
  }) => {
    const now = new Date();
    const tokenPreview = token ? `${token.slice(0, 4)}...${token.slice(-4)}` : '';
    const bodyPreview = typeof result?.bodyText === 'string'
      ? result.bodyText.slice(0, 500)
      : '';

    console.groupCollapsed(`✅ [BatchAssist][Ack Success ${index}/${total}] rateId=${rateId}`);
    console.info('[BatchAssist] Acknowledge success summary', {
      timestampIso: now.toISOString(),
      timestampLocal: now.toLocaleString(),
      step: `${index}/${total}`,
      progressPercent: Math.round((index / Math.max(1, total)) * 100),
      elapsedMs,
      rateId,
      url,
      title,
      originalStatus: status,
      resultingStatus: QUEUE_STATUS.ACKNOWLEDGED,
      approveNote: approveNote || null,
      responseStatus: result?.status ?? null,
      responseOk: Boolean(result?.ok),
      responseRateLimited: Boolean(result?.rateLimited),
      responseHasParsed: result?.parsed !== null && typeof result?.parsed !== 'undefined',
      responseParsedType: result?.parsed === null ? 'null' : typeof result?.parsed,
      tokenPresent: Boolean(token),
      tokenLength: token ? token.length : 0,
      tokenPreview,
      runningTotals: {
        successCount,
        failureCount,
        attempted: index,
        remaining: Math.max(0, total - index)
      }
    });
    console.debug('[BatchAssist] Raw acknowledge response body (trimmed)', bodyPreview);
    console.debug('[BatchAssist] Parsed acknowledge response payload', result?.parsed ?? null);
    console.table([
      {
        metric: 'rateId',
        value: rateId
      },
      {
        metric: 'url',
        value: url || '(missing)'
      },
      {
        metric: 'title',
        value: title || '(untitled)'
      },
      {
        metric: 'elapsedMs',
        value: elapsedMs
      },
      {
        metric: 'httpStatus',
        value: result?.status ?? '(none)'
      },
      {
        metric: 'queueIndex',
        value: `${index}/${total}`
      },
      {
        metric: 'tokenLength',
        value: token ? token.length : 0
      }
    ]);
    console.groupEnd();
  };

  const buildQueueErrorClipboardPayload = () => {
    const errors = collectQueueErrorEntries();
    const approvals = collectQueueApproveNoteEntries();
    if (!errors.length && !approvals.length) {
      return { text: '', count: 0, rejectCount: 0, approveNoteCount: 0 };
    }
    const lines = [];
    const shouldDoubleSpaceRejects = errors.length > 0 && errors.length <= 15;

    errors.forEach((error, index) => {
      let line = `${index + 1}. ${error.url}`;
      if (error.summary) {
        line += ` - ${error.summary}`;
      }
      if (error.note) {
        line += ` - ${error.note}`;
      }
      lines.push(line);
      if (shouldDoubleSpaceRejects && index !== errors.length - 1) {
        lines.push('');
      }
    });

    if (errors.length && approvals.length) {
      lines.push('');
      lines.push('');
    }

    approvals.forEach((entry) => {
      let line = `${entry.url} - ${entry.note}`;
      lines.push(line);
    });
    return {
      text: lines.join('\n'),
      count: errors.length + approvals.length,
      rejectCount: errors.length,
      approveNoteCount: approvals.length
    };
  };

  const createQueueListItem = (entry, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    Object.assign(button.style, {
      width: '100%',
      textAlign: 'left',
      background: '#181818',
      border: '1px solid #262626',
      borderRadius: '6px',
      padding: '10px 12px',
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
      gap: '4px',
      position: 'relative'
    });
    const entryStatus = entry?.status || QUEUE_STATUS.PENDING;
    button.dataset.fjfeQueueStatus = entryStatus;
    applyQueueEntryStyles(button, entryStatus);
    button.addEventListener('pointerdown', stopPropagation);
    button.addEventListener('click', (event) => {
      stopPropagation(event);
      const openInNewTab = event.metaKey || event.ctrlKey;
      openQueueEntryAt(index, { newTab: openInNewTab });
    });
    button.addEventListener('mouseenter', () => {
      button.style.filter = 'brightness(1.08)';
    });
    button.addEventListener('mouseleave', () => {
      button.style.filter = '';
    });

    const titleEl = document.createElement('div');
    titleEl.textContent = entry?.title || `Entry ${index + 1}`;
    Object.assign(titleEl.style, {
      fontSize: '14px',
      fontWeight: '700',
      color: '#ffffff'
    });

    button.append(titleEl);

    if (entryStatus === QUEUE_STATUS.ACKNOWLEDGED) {
      const acknowledgedTag = document.createElement('div');
      acknowledgedTag.textContent = 'Acknowledged';
      Object.assign(acknowledgedTag.style, {
        display: 'inline-flex',
        alignSelf: 'flex-start',
        padding: '2px 6px',
        borderRadius: '999px',
        fontSize: '10px',
        fontWeight: '500',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        background: '#1f1f1f',
        color: '#dcdcdc',
        border: '1px solid #3a3a3a'
      });
      button.append(acknowledgedTag);
    }

    if (entry?.rateActionAdded) {
      const warningIcon = document.createElement('img');
      warningIcon.src = getAssetUrl('icons/warning.png');
      warningIcon.alt = '';
      warningIcon.title = 'Misattributed rate!';
      Object.assign(warningIcon.style, {
        position: 'absolute',
        right: '6px',
        bottom: '6px',
        width: '16px',
        height: '16px',
        objectFit: 'contain',
        pointerEvents: 'auto',
        userSelect: 'none',
        zIndex: '2'
      });
      button.append(warningIcon);
    }

    if (entryStatus === QUEUE_STATUS.REJECTED && entry?.rejectDetails) {
      const summaryBox = createRejectSummaryBox(entry.rejectDetails);
      if (summaryBox) {
        button.append(summaryBox);
      }
      const noteBox = createRejectNoteBox(entry.rejectDetails.note);
      if (noteBox) {
        button.append(noteBox);
      }
    }

    if ((entryStatus === QUEUE_STATUS.APPROVED || entryStatus === QUEUE_STATUS.ACKNOWLEDGED) && entry?.approveNote) {
      const approveBox = createApproveNoteBox(entry.approveNote);
      if (approveBox) {
        button.append(approveBox);
      }
    }

    return button;
  };

  const renderQueueEntries = () => {
    if (!historyList || !historyEmptyState) {
      return;
    }
    historyList.textContent = '';
    if (!queueLinks.length) {
      historyEmptyState.style.display = 'block';
      return;
    }
    historyEmptyState.style.display = 'none';
    queueLinks.forEach((entry, index) => {
      historyList.appendChild(createQueueListItem(entry, index));
    });
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
    if (panelLocked) {
      const clampedTop = Math.max(baseTop, HISTORY_DROPDOWN_MIN_TOP);
      historyDropdown.style.position = 'fixed';
      historyDropdown.style.left = panelRect.left + 'px';
      historyDropdown.style.top = clampedTop + 'px';
    } else {
      const scrollX = window.scrollX || window.pageXOffset || document.documentElement.scrollLeft || document.body.scrollLeft || 0;
      const scrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
      historyDropdown.style.position = 'absolute';
      historyDropdown.style.left = panelRect.left + scrollX + 'px';
      historyDropdown.style.top = baseTop + scrollY + 'px';
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

  const attachHistoryOutsideClick = () => {
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
  };

  const detachHistoryOutsideClick = () => {
    if (!historyOutsideClickHandler) {
      return;
    }
    document.removeEventListener('pointerdown', historyOutsideClickHandler, true);
    historyOutsideClickHandler = null;
  };

  const closeHistoryDropdown = () => {
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
  };

  const openHistoryDropdown = () => {
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
  };

  const setHistoryDropdownOpen = (open) => {
    if (open) {
      openHistoryDropdown();
    } else {
      closeHistoryDropdown();
    }
  };

  const toggleHistoryDropdown = () => {
    setHistoryDropdownOpen(!historyDropdownOpen);
  };

  const ensurePanel = () => {
    if (panel) {
      return;
    }
    if (!document.body) {
      if (!waitingForPanelMount) {
        waitingForPanelMount = true;
        document.addEventListener('DOMContentLoaded', () => {
          waitingForPanelMount = false;
          ensurePanel();
        }, { once: true });
      }
      return;
    }

    panelPosition = loadPanelPosition();
    panelLocked = loadPanelLocked();

    panel = document.createElement('div');
    panel.id = PANEL_ID;
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
      justifyContent: 'flex-start',
      borderBottom: '1px solid #1f1f1f',
      padding: '6px 0 4px 0',
      minHeight: '26px',
      gap: '8px'
    });

    const dragHandle = document.createElement('div');
    Object.assign(dragHandle.style, {
      cursor: 'move',
      userSelect: 'none',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-start',
      minHeight: '22px',
      flex: '0 0 auto'
    });
    const dragIcon = document.createElement('img');
    dragIcon.src = getAssetUrl('icons/menu.png');
    dragIcon.alt = '';
    Object.assign(dragIcon.style, {
      width: '20px',
      height: '20px',
      objectFit: 'contain',
      opacity: '0.75'
    });
    dragHandle.append(dragIcon);
    dragHandle.title = 'Drag to reposition';
    dragHandle.addEventListener('pointerdown', startDrag);

    const headerSpacer = document.createElement('div');
    Object.assign(headerSpacer.style, {
      flex: '1 1 auto'
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

    lockButton.addEventListener('pointerdown', stopPropagation);
    lockButton.addEventListener('click', (event) => {
      stopPropagation(event);
      event.preventDefault();
      const { left: scrollLeft, top: scrollTop } = getScrollOffsets();
      if (!panelPosition) {
        const rect = panel.getBoundingClientRect();
        panelPosition = panelLocked ? { left: rect.left, top: rect.top } : { left: rect.left + scrollLeft, top: rect.top + scrollTop };
      } else if (panelLocked) {
        panelPosition = { left: panelPosition.left + scrollLeft, top: panelPosition.top + scrollTop };
      } else {
        panelPosition = { left: panelPosition.left - scrollLeft, top: panelPosition.top - scrollTop };
      }
      panelLocked = !panelLocked;
      persistPanelLocked();
      applyLockButtonUI();
      applyPanelPosition();
      persistPanelPosition();
    });

    const handleHeaderPointerDown = (event) => {
      const targetButton = event.target?.closest('button');
      if (targetButton === lockButton) {
        return;
      }
      startDrag(event);
    };
    header.addEventListener('pointerdown', handleHeaderPointerDown);

    const instructorButton = document.createElement('button');
    instructorButton.type = 'button';
    instructorButton.tabIndex = -1;
    instructorButton.setAttribute('aria-hidden', 'true');
    Object.assign(instructorButton.style, {
      width: '25px',
      height: '25px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '4px',
      border: '1px solid #155427',
      background: 'linear-gradient(180deg, #2f9a52 0%, #1c7a36 52%, #145428 100%)',
      cursor: 'pointer',
      flex: '0 0 auto',
      padding: '2px'
    });
    instructorButton.style.boxShadow = 'inset 0 1px 0 rgba(255, 255, 255, 0.35), inset 0 -1px 0 rgba(0, 0, 0, 0.35), 0 1px 4px rgba(0, 0, 0, 0.35)';
    instructorButton.title = 'Copy instructor bot command';
    const instructorIcon = document.createElement('img');
    instructorIcon.src = getAssetUrl('icons/terminal.png');
    instructorIcon.alt = '';
    Object.assign(instructorIcon.style, {
      width: '17px',
      height: '17px',
      objectFit: 'contain'
    });
    instructorButton.appendChild(instructorIcon);
    applyButtonAnimations(instructorButton);

    const crestButton = document.createElement('button');
    crestButton.type = 'button';
    crestButton.tabIndex = -1;
    crestButton.setAttribute('aria-hidden', 'true');
    Object.assign(crestButton.style, {
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
    crestButton.style.boxShadow = 'inset 0 1px 0 rgba(255, 255, 255, 0.35), inset 0 -1px 0 rgba(0, 0, 0, 0.35), 0 1px 4px rgba(0, 0, 0, 0.35)';
    crestButton.title = 'Copy queue errors to clipboard';
    const crestIcon = document.createElement('img');
    crestIcon.src = getAssetUrl('icons/copy.png');
    crestIcon.alt = '';
    Object.assign(crestIcon.style, {
      width: '17px',
      height: '17px',
      objectFit: 'contain'
    });
    crestButton.appendChild(crestIcon);
    applyButtonAnimations(crestButton);

    let showStatusMessage = () => {};

    instructorButton.addEventListener('pointerdown', stopPropagation);
    instructorButton.addEventListener('click', async (event) => {
      stopPropagation(event);
      event.preventDefault();
      const username = getModeratorUsername();
      if (!username) {
        showStatusMessage('Moderator username not detected.', 'error');
        return;
      }
      const totalRates = Array.isArray(queueLinks) ? queueLinks.length : 0;
      const errorCount = collectQueueErrorEntries().length;
      const commandText = `!instructor ${username} ${totalRates} ${errorCount}`;
      const success = await copyTextToClipboard(commandText);
      if (success) {
        showStatusMessage('Instructor bot code copied.', 'success');
      } else {
        showStatusMessage('Unable to copy instructor code.', 'error');
      }
    });

    crestButton.addEventListener('pointerdown', stopPropagation);
    crestButton.addEventListener('click', async (event) => {
      stopPropagation(event);
      event.preventDefault();
      const { text, count, rejectCount = 0, approveNoteCount = 0 } = buildQueueErrorClipboardPayload();
      if (!count) {
        showStatusMessage('No rejected rates or noted approvals to copy.', 'error');
        return;
      }
      const success = await copyTextToClipboard(text);
      if (success) {
        let message;
        if (rejectCount && approveNoteCount) {
          message = `Copied ${rejectCount} rejects + ${approveNoteCount} noted approvals.`;
        } else if (rejectCount) {
          const noun = rejectCount === 1 ? 'error' : 'errors';
          message = `Copied ${rejectCount} ${noun} to clipboard.`;
        } else {
          const noun = approveNoteCount === 1 ? 'noted approval' : 'noted approvals';
          message = `Copied ${approveNoteCount} ${noun}.`;
        }
        showStatusMessage(message, 'success');
      } else {
        showStatusMessage('Unable to copy entries to clipboard.', 'error');
      }
    });

    applyLockButtonUI();
    header.append(dragHandle, headerSpacer, instructorButton, crestButton, lockButton);
    panel.append(header);

    const setLoadingIndicatorVisible = (visible) => {
      if (!loadingIndicator) {
        return;
      }
      loadingIndicator.style.display = visible ? 'inline-flex' : 'none';
    };

    ensureSpinnerStyles();
    ensureScrollbarStyles();
    loadingIndicator = document.createElement('div');
    Object.assign(loadingIndicator.style, {
      position: 'absolute',
      left: '16px',
      width: '14px',
      height: '14px',
      borderRadius: '50%',
      border: '2px solid rgba(255, 255, 255, 0.35)',
      borderTopColor: '#ffffff',
      animation: 'fjfeBatchAssistSpinner 0.9s linear infinite',
      display: 'none',
      pointerEvents: 'none'
    });
    loadingIndicator.setAttribute('aria-hidden', 'true');
    panel.append(loadingIndicator);
    const parsePxValue = (value) => {
      const numeric = parseFloat(value);
      return Number.isFinite(numeric) ? numeric : 0;
    };
    const getPanelPaddingTop = () => {
      if (panel.style.paddingTop) {
        return parsePxValue(panel.style.paddingTop);
      }
      if (panel.style.padding) {
        const parts = panel.style.padding.trim().split(/\s+/);
        return parts.length ? parsePxValue(parts[0]) : 0;
      }
      return 0;
    };
    const updateLoadingIndicatorPosition = () => {
      const paddingTop = getPanelPaddingTop();
      const headerHeight = header?.offsetHeight || 32;
      loadingIndicator.style.top = `${paddingTop + headerHeight + 4}px`;
    };
    updateLoadingIndicatorPosition();


    const countWrapper = document.createElement('div');
    Object.assign(countWrapper.style, {
      width: '100%',
      minHeight: '42px',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      position: 'relative'
    });

    countDisplay = document.createElement('div');
    Object.assign(countDisplay.style, {
      fontSize: '33px',
      fontWeight: '700',
      fontFamily: "'Segoe UI Rounded', 'Arial Rounded MT Bold', 'Nunito', 'Segoe UI', sans-serif",
      lineHeight: '1',
      textAlign: 'center',
      width: '100%'
    });
    countDisplay.innerHTML = formatQueueCountMarkup(0, 0, 0);
    countWrapper.append(countDisplay);
    panel.append(countWrapper);
    updateQueueDisplay();

    const defaultNoteText = 'Import links from FJMeme to populate the queue.';
    const confirmNoteText = 'Are you sure?';
    const noteWrapper = document.createElement('div');
    Object.assign(noteWrapper.style, {
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '4px',
      marginTop: '-4px',
      marginBottom: '0'
    });

    const noteSingle = document.createElement('div');
    noteSingle.textContent = defaultNoteText;
    Object.assign(noteSingle.style, {
      fontSize: '9px',
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      color: '#9a9a9a',
      textAlign: 'center',
      width: '100%',
      lineHeight: '1.2'
    });

    const noteRemaining = document.createElement('div');
    noteRemaining.textContent = '';
    Object.assign(noteRemaining.style, {
      fontSize: '9px',
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      color: '#9a9a9a',
      textAlign: 'center',
      width: '100%',
      lineHeight: '1.2'
    });

    const progressBar = document.createElement('div');
    Object.assign(progressBar.style, {
      width: '100%',
      height: '3px',
      background: '#242424',
      borderRadius: '999px',
      overflow: 'visible',
      position: 'relative',
      boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.08), 0 0 10px rgba(0, 0, 0, 0.7)'
    });
    const progressApproved = document.createElement('div');
    Object.assign(progressApproved.style, {
      position: 'absolute',
      left: '0',
      top: '0',
      bottom: '0',
      width: '0%',
      background: '#2b8a52',
      boxShadow: '0 0 4px rgba(84, 240, 150, 0.28), 0 0 7px rgba(43, 138, 82, 0.22)',
      filter: 'drop-shadow(0 0 2px rgba(84, 240, 150, 0.25))'
    });
    const progressRejected = document.createElement('div');
    Object.assign(progressRejected.style, {
      position: 'absolute',
      right: '0',
      top: '0',
      bottom: '0',
      width: '0%',
      background: '#a03a3a',
      boxShadow: '0 0 4px rgba(255, 110, 110, 0.28), 0 0 7px rgba(160, 58, 58, 0.22)',
      filter: 'drop-shadow(0 0 2px rgba(255, 110, 110, 0.25))'
    });
    progressBar.append(progressApproved, progressRejected);

    const noteError = document.createElement('div');
    noteError.textContent = '';
    Object.assign(noteError.style, {
      fontSize: '9px',
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      color: '#9a9a9a',
      textAlign: 'center',
      width: '100%',
      lineHeight: '1.2'
    });

    noteWrapper.append(noteSingle, noteRemaining, progressBar, noteError);
    panel.append(noteWrapper);
    noteElement = noteSingle;
    noteWrapper.dataset.fjfeNoteWrapper = '1';
    noteSingle.dataset.fjfeNoteSingle = '1';
    noteRemaining.dataset.fjfeNoteRemaining = '1';
    noteError.dataset.fjfeNoteError = '1';
    progressBar.dataset.fjfeNoteBar = '1';
    progressApproved.dataset.fjfeNoteApproved = '1';
    progressRejected.dataset.fjfeNoteRejected = '1';

    const resetButton = document.createElement('button');
    resetButton.textContent = 'Clear Queue';
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
    const confirmWrapper = document.createElement('div');
    Object.assign(confirmWrapper.style, {
      width: '100%',
      display: 'none',
      gap: '8px'
    });

    const confirmClearButton = document.createElement('button');
    confirmClearButton.textContent = 'Clear';
    Object.assign(confirmClearButton.style, {
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
    applyButtonAnimations(confirmClearButton);

    const confirmCancelButton = document.createElement('button');
    confirmCancelButton.textContent = "Don't Clear";
    Object.assign(confirmCancelButton.style, {
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
    applyButtonAnimations(confirmCancelButton);

    confirmWrapper.append(confirmClearButton, confirmCancelButton);

    const acknowledgeConfirmText = 'Acknowledge all rates?';
    const acknowledgeButton = document.createElement('button');
    acknowledgeButton.type = 'button';
    acknowledgeButton.textContent = 'Acknowledge';
    Object.assign(acknowledgeButton.style, {
      width: '80%',
      padding: '5px 8px',
      fontSize: '14px',
      fontWeight: '500',
      color: '#66d0ff',
      background: '#101d29',
      border: '2px solid #1f3650',
      borderRadius: '4px',
      cursor: 'pointer',
      alignSelf: 'center',
      marginTop: '0',
      marginBottom: '-4px'
    });
    applyButtonAnimations(acknowledgeButton);

    const acknowledgeConfirmWrapper = document.createElement('div');
    Object.assign(acknowledgeConfirmWrapper.style, {
      width: '100%',
      display: 'none',
      gap: '8px'
    });

    const acknowledgeConfirmYesButton = document.createElement('button');
    acknowledgeConfirmYesButton.textContent = 'Yes';
    Object.assign(acknowledgeConfirmYesButton.style, {
      flex: '1 1 0',
      padding: '6px 8px',
      fontSize: '13px',
      fontWeight: '600',
      color: '#e4f7ff',
      background: '#12506e',
      border: '1px solid #1b6a8f',
      borderRadius: '4px',
      cursor: 'pointer'
    });
    applyButtonAnimations(acknowledgeConfirmYesButton);

    const acknowledgeConfirmNoButton = document.createElement('button');
    acknowledgeConfirmNoButton.textContent = 'No';
    Object.assign(acknowledgeConfirmNoButton.style, {
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
    applyButtonAnimations(acknowledgeConfirmNoButton);

    acknowledgeConfirmWrapper.append(acknowledgeConfirmYesButton, acknowledgeConfirmNoButton);

    let clearConfirmVisible = false;
    let acknowledgeConfirmVisible = false;
    let acknowledgeInProgress = false;
    let transientNoteMessage = '';
    let transientNoteTimeout = null;
    let ackProgressMessage = '';

    const hasMisattributedRates = () => Array.isArray(queueLinks) && queueLinks.some((entry) => entry?.rateActionAdded);
    const hasRejectedRates = () => Array.isArray(queueLinks) && queueLinks.some((entry) => entry?.status === QUEUE_STATUS.REJECTED);

    const updateNoteForState = () => {
      if (!noteSingle || !noteRemaining || !noteError || !progressBar || !progressApproved || !progressRejected) {
        return;
      }
      if (transientNoteMessage) {
        noteSingle.textContent = transientNoteMessage;
        noteSingle.style.display = 'block';
        noteRemaining.style.display = 'none';
        noteError.style.display = 'none';
        progressBar.style.display = 'none';
        return;
      }
      if (acknowledgeInProgress && ackProgressMessage) {
        noteSingle.textContent = ackProgressMessage;
        noteSingle.style.display = 'block';
        noteRemaining.style.display = 'none';
        noteError.style.display = 'none';
        progressBar.style.display = 'none';
        return;
      }
      if (acknowledgeConfirmVisible) {
        noteSingle.style.display = 'block';
        noteRemaining.style.display = 'none';
        noteError.style.display = 'none';
        progressBar.style.display = 'none';
        if (hasRejectedRates()) {
          noteSingle.innerHTML = `${acknowledgeConfirmText}<br>Rejected rates are still present!`;
        } else if (hasMisattributedRates()) {
          noteSingle.innerHTML = `${acknowledgeConfirmText}<br>Misattributed rates won't be acknowledged.`;
        } else {
          noteSingle.textContent = acknowledgeConfirmText;
        }
        return;
      }
      if (clearConfirmVisible) {
        noteSingle.textContent = confirmNoteText;
        noteSingle.style.display = 'block';
        noteRemaining.style.display = 'none';
        noteError.style.display = 'none';
        progressBar.style.display = 'none';
        return;
      }
      if (!queueBarState.total) {
        noteSingle.textContent = queueStatusNote || defaultNoteText;
        noteSingle.style.display = 'block';
        noteRemaining.style.display = 'none';
        noteError.style.display = 'none';
        progressBar.style.display = 'none';
        return;
      }
      noteSingle.style.display = 'none';
      noteRemaining.style.display = 'block';
      noteError.style.display = 'block';
      progressBar.style.display = 'block';
      noteRemaining.textContent = queueRemainingNote;
      noteError.textContent = queueStatusNote;
      const total = Math.max(1, queueBarState.total);
      const approvedPct = Math.max(0, Math.min(100, (queueBarState.approved / total) * 100));
      const rejectedPct = Math.max(0, Math.min(100, (queueBarState.rejected / total) * 100));
      progressApproved.style.width = `${approvedPct}%`;
      progressRejected.style.width = `${rejectedPct}%`;
    };

    updateNoteForStateRef = updateNoteForState;

    const setTransientNoteMessage = (message, duration = 3600) => {
      if (transientNoteTimeout) {
        clearTimeout(transientNoteTimeout);
        transientNoteTimeout = null;
      }
      transientNoteMessage = message || '';
      if (transientNoteMessage && duration > 0) {
        transientNoteTimeout = setTimeout(() => {
          transientNoteTimeout = null;
          transientNoteMessage = '';
          updateNoteForState();
        }, duration);
      }
      updateNoteForState();
    };

    showStatusMessage = (message, tone = 'info') => {
      void tone;
      setTransientNoteMessage(message, 3600);
    };

    const updateActionVisibility = () => {
      if (acknowledgeInProgress) {
        resetButton.style.display = 'block';
        confirmWrapper.style.display = 'none';
        acknowledgeButton.style.display = 'block';
        acknowledgeConfirmWrapper.style.display = 'none';
        return;
      }
      resetButton.style.display = clearConfirmVisible ? 'none' : 'block';
      confirmWrapper.style.display = clearConfirmVisible ? 'flex' : 'none';
      acknowledgeButton.style.display = acknowledgeConfirmVisible ? 'none' : 'block';
      acknowledgeConfirmWrapper.style.display = acknowledgeConfirmVisible ? 'flex' : 'none';
    };

    const updateButtonInteractivity = () => {
      const disabled = acknowledgeInProgress;
      [resetButton, confirmClearButton, confirmCancelButton, acknowledgeButton, acknowledgeConfirmYesButton, acknowledgeConfirmNoButton].forEach((button) => {
        if (!button) {
          return;
        }
        button.disabled = disabled;
        button.style.opacity = disabled ? '0.6' : '';
        button.style.cursor = disabled ? 'default' : 'pointer';
      });
    };

    const setClearConfirmVisible = (visible) => {
      if (acknowledgeInProgress) {
        return;
      }
      clearConfirmVisible = Boolean(visible);
      if (clearConfirmVisible) {
        acknowledgeConfirmVisible = false;
        setTransientNoteMessage('');
      }
      updateActionVisibility();
      updateNoteForState();
    };

    const setAcknowledgeConfirmVisible = (visible) => {
      if (acknowledgeInProgress) {
        return;
      }
      acknowledgeConfirmVisible = Boolean(visible);
      if (acknowledgeConfirmVisible) {
        clearConfirmVisible = false;
        setTransientNoteMessage('');
      }
      updateActionVisibility();
      updateNoteForState();
    };

    resetButton.addEventListener('click', (event) => {
      stopPropagation(event);
      event.preventDefault();
      if (!clearConfirmVisible) {
        setClearConfirmVisible(true);
      }
    });

    confirmClearButton.addEventListener('click', (event) => {
      stopPropagation(event);
      event.preventDefault();
      clearQueueLinks();
      setHistoryDropdownOpen(false);
      setClearConfirmVisible(false);
    });

    confirmCancelButton.addEventListener('click', (event) => {
      stopPropagation(event);
      event.preventDefault();
      setClearConfirmVisible(false);
    });

    acknowledgeButton.addEventListener('click', (event) => {
      stopPropagation(event);
      event.preventDefault();
      if (!acknowledgeConfirmVisible) {
        setAcknowledgeConfirmVisible(true);
      }
    });

    acknowledgeConfirmNoButton.addEventListener('click', (event) => {
      stopPropagation(event);
      event.preventDefault();
      setAcknowledgeConfirmVisible(false);
    });

    const runAcknowledgeFlow = async () => {
      if (acknowledgeInProgress) {
        return;
      }
      setAcknowledgeConfirmVisible(false);
      setTransientNoteMessage('');
      const token = readMemeToken();
      if (!token) {
        console.warn('[BatchAssist] Acknowledge aborted: missing review token.', {
          storageKey: MEME_TOKEN_STORAGE_KEY,
          queueLength: Array.isArray(queueLinks) ? queueLinks.length : null
        });
        setTransientNoteMessage('Review token not found on funnyjunk.com (PT_memeToken).', 4800);
        return;
      }
      const targets = collectRateIdTargets();
      console.info('[BatchAssist] Acknowledge requested.', {
        targetCount: targets.length,
        hasToken: Boolean(token),
        tokenLength: token.length,
        queueLength: Array.isArray(queueLinks) ? queueLinks.length : null
      });
      if (!targets.length) {
        console.warn('[BatchAssist] Acknowledge aborted: no rate IDs found.', {
          queueSample: Array.isArray(queueLinks) ? queueLinks.slice(0, 3) : null
        });
        setTransientNoteMessage('No approved rates available to acknowledge.', 3600);
        return;
      }
      acknowledgeInProgress = true;
      ackProgressMessage = `Acknowledging 0/${targets.length}...`;
      setLoadingIndicatorVisible(true);
      updateActionVisibility();
      updateButtonInteractivity();
      updateNoteForState();

      let successCount = 0;
      let failureCount = 0;
      let rateLimited = false;
      const successfulRateIds = new Set();

      for (let index = 0; index < targets.length; index += 1) {
        const {
          rateId,
          url,
          title,
          status,
          approveNote
        } = targets[index];
        ackProgressMessage = `Acknowledging ${index + 1}/${targets.length}...`;
        updateNoteForState();
        console.debug('[BatchAssist] Acknowledge attempt starting.', {
          index: index + 1,
          total: targets.length,
          rateId,
          url
        });
        const startedAt = Date.now();
        const result = await sendAcknowledgeRequest(rateId, token);
        const elapsedMs = Date.now() - startedAt;
        console.info('[BatchAssist] Acknowledge response received.', {
          index: index + 1,
          total: targets.length,
          rateId,
          url,
          status: result.status,
          ok: result.ok,
          rateLimited: result.rateLimited,
          bodyText: result.bodyText,
          parsed: result.parsed,
          elapsedMs
        });
        if (result.ok) {
          successCount += 1;
          successfulRateIds.add(rateId);
          console.debug('[BatchAssist] Acknowledge attempt succeeded.', {
            index: index + 1,
            total: targets.length,
            rateId,
            url,
            elapsedMs
          });
          logVerboseAcknowledgeSuccess({
            rateId,
            url,
            title,
            status,
            approveNote,
            index: index + 1,
            total: targets.length,
            elapsedMs,
            result,
            token,
            successCount,
            failureCount
          });
        } else if (result.rateLimited) {
          rateLimited = true;
          console.warn('[BatchAssist] Rate limit encountered while acknowledging rate', {
            index: index + 1,
            total: targets.length,
            rateId,
            url,
            elapsedMs,
            status: result.status,
            bodyText: result.bodyText
          });
          break;
        } else {
          failureCount += 1;
          console.warn('[BatchAssist] Failed to acknowledge rate', {
            index: index + 1,
            total: targets.length,
            rateId,
            url,
            elapsedMs,
            status: result.status,
            bodyText: result.bodyText,
            networkError: result.networkError,
            error: result.error
          });
        }
        if (index < targets.length - 1) {
          console.debug('[BatchAssist] Acknowledge attempt waiting before next request.', {
            nextIndex: index + 2,
            delayMs: ACK_REQUEST_DELAY_MS
          });
          await sleep(ACK_REQUEST_DELAY_MS);
        }
      }

      acknowledgeInProgress = false;
      ackProgressMessage = '';
      setLoadingIndicatorVisible(false);
      updateActionVisibility();
      updateButtonInteractivity();
      updateNoteForState();

      console.info('[BatchAssist] Acknowledge flow complete.', {
        total: targets.length,
        successCount,
        failureCount,
        rateLimited
      });

      if (queueLinks.length && successfulRateIds.size) {
        const nextLinks = queueLinks.map((entry) => {
          if (!entry) {
            return entry;
          }
          const normalizedRateId = normalizeRateId(entry.rateId);
          if (entry.status === QUEUE_STATUS.APPROVED && normalizedRateId && successfulRateIds.has(normalizedRateId)) {
            const nextEntry = { ...entry, status: QUEUE_STATUS.ACKNOWLEDGED };
            delete nextEntry.rejectDetails;
            return nextEntry;
          }
          return entry;
        });
        setQueueLinks(nextLinks, { persist: true });
      }

      const total = targets.length;
      let message;
      if (rateLimited) {
        message = `Rate limit hit after ${successCount}/${total}. Try again shortly.`;
      } else if (successCount && failureCount) {
        message = `Acknowledged ${successCount}/${total}. ${failureCount} failed.`;
      } else if (successCount) {
        const noun = successCount === 1 ? 'rate' : 'rates';
        message = `Acknowledged ${successCount} ${noun}.`;
      } else {
        message = 'Unable to acknowledge rates.';
      }
      setTransientNoteMessage(message, 5000);
    };

    acknowledgeConfirmYesButton.addEventListener('click', async (event) => {
      stopPropagation(event);
      event.preventDefault();
      await runAcknowledgeFlow();
    });

    panel.append(acknowledgeButton, acknowledgeConfirmWrapper, resetButton, confirmWrapper);
    updateActionVisibility();
    updateButtonInteractivity();

    const acknowledgeQueueDivider = document.createElement('div');
    Object.assign(acknowledgeQueueDivider.style, {
      width: '100%',
      height: '1px',
      background: '#232323',
      margin: '1px 0 0 0'
    });
    panel.append(acknowledgeQueueDivider);

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
      img.src = getAssetUrl('icons/down_icon.png');
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
    historyLabel.textContent = 'QUEUE';
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

    historySection.append(historyButton);
    panel.append(historySection);

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

    const historyDropdownTopSpacer = document.createElement('div');
    Object.assign(historyDropdownTopSpacer.style, {
      height: `${HISTORY_DROPDOWN_PADDING_TOP}px`
    });

    const historyContentWrapper = document.createElement('div');
    historyContentWrapper.className = 'fjfe-batchassist-scroll';
    Object.assign(historyContentWrapper.style, {
      maxHeight: String(HISTORY_VISIBLE_COUNT * 64) + 'px',
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      paddingRight: '8px',
      boxSizing: 'border-box'
    });

    historyEmptyState = document.createElement('div');
    historyEmptyState.textContent = 'No queued links yet';
    Object.assign(historyEmptyState.style, {
      fontSize: '12px',
      color: '#aaaaaa',
      textAlign: 'center',
      padding: '12px 0'
    });

    historyList = document.createElement('div');
    Object.assign(historyList.style, {
      display: 'flex',
      flexDirection: 'column',
      gap: '10px'
    });

    historyContentWrapper.append(historyEmptyState, historyList);
    historyDropdown.append(historyDropdownTopSpacer, historyContentWrapper);
    document.body.append(historyDropdown);

    document.body.append(panel);
    updateQueueDisplay();
    renderQueueEntries();
    setHistoryDropdownOpen(false);
    applyPanelPosition();
  };

  const updatePanelVisibility = () => {
    if (!panel) {
      return;
    }
    if (featureEnabled) {
      applyPanelPosition();
      const slickModule = window.fjTweakerModules && window.fjTweakerModules.slick;
      if (slickModule && slickModule.openRateCounter) {
        slickModule.openRateCounter(panel);
      } else if (slickModule && slickModule.openTweakerMenu) {
        panel.style.display = 'flex';
        slickModule.openTweakerMenu(panel);
      } else {
        panel.style.display = 'flex';
        if (window.fjfeSlickAnimateIn) {
          window.fjfeSlickAnimateIn(panel);
        }
      }
    } else {
      setHistoryDropdownOpen(false);
      const slickModule = window.fjTweakerModules && window.fjTweakerModules.slick;
      if (slickModule && slickModule.closeRateCounter) {
        slickModule.closeRateCounter(panel);
      } else if (slickModule && slickModule.closeTweakerMenu) {
        slickModule.closeTweakerMenu(panel).then(() => {
          panel.style.display = 'none';
        });
      } else {
        panel.style.display = 'none';
      }
    }
  };

  const bindStorageListener = () => {
    if (storageListenerBound) {
      return;
    }
    try {
      if (!storageAvailable() || !chrome?.storage?.onChanged) {
        return;
      }
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName !== 'local') {
          return;
        }
        const queueChange = changes?.[STORAGE_KEY];
        if (queueChange) {
          const nextValue = sanitizeLinks(queueChange.newValue);
          setQueueLinks(nextValue, { persist: false });
        }
        if (changes?.[STORAGE_META_KEY]) {
          queueMetadata = sanitizeQueueMetadata(changes[STORAGE_META_KEY].newValue);
        }
      });
      storageListenerBound = true;
    } catch (_) {}
  };

  const applySetting = (value) => {
    settingEnabled = Boolean(value);
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
    markDocument(featureEnabled);
    if (featureEnabled) {
      ensurePanel();
      ensureInvalidDialogObserver();
    } else {
      teardownInvalidDialogObserver();
    }
    updatePanelVisibility();
  };

  const handleSettingsChanged = (event) => {
    const detail = event?.detail;
    if (!detail || typeof detail[SETTING_KEY] === 'undefined') {
      return;
    }
    applySetting(detail[SETTING_KEY]);
  };

  const init = () => {
    if (window.location.hostname !== targetHost) {
      return;
    }
    refreshQueueLinks();
    bindStorageListener();
    toggleEnabled = loadToggleEnabled();
    applySetting(getSettingValue());
    document.addEventListener('fjTweakerSettingsChanged', handleSettingsChanged, { passive: true });
    window.addEventListener('storage', (event) => {
      if (event.key === TOGGLE_STORAGE_KEY) {
        toggleEnabled = event.newValue === '1';
        setAssistButtonActive(toggleEnabled);
        applySetting(settingEnabled);
      }
    });
  };

  if (!window.fjTweakerModules) {
    window.fjTweakerModules = {};
  }

  window.fjTweakerModules[MODULE_KEY] = { init };
})();
