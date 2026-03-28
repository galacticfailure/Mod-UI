(() => {
  const targetHost = 'funnyjunk.com';
  const MODULE_KEY = 'betterments';
  const SETTINGS_KEY = 'fjTweakerSettings';
  const SETTING_FLAG = 'betterments';
  const BLOCK_STYLE_ID = 'fjfe-betterments-block-style';
  const BLOCK_SELECTOR = '.ugAddMenu';
  const PROGRESS_WRAP_SELECTOR = '.ugal-progress-wrap';
  const EMPTY_GALLERY_HINT_SELECTOR = '.ugEmptyGalleryHint';
  const STATUS_TIP_SELECTOR = '.ugStatusTip,.ugstatustip,.ugTuttip,.ugtuttip,#ugTuttip,#ugtuttip,[id*="tuttip" i],[class*="tuttip" i]';
  const BOTTOM_CONTROLS_SELECTOR = '.ugControlsBottom';
  const FOLDER_MORE_TOGGLE_SELECTOR = '.ugFolMoreToggle';
  const FOLDER_NEST_HINT_SELECTOR = '.ugFolNestHint';
  const OBSOLETE_TOP_CONTROLS_SELECTOR = [
    '.ugTypeTab',
    '#ugSortDate',
    '#ugSortThumbs',
    '.ugNsfwToggle',
    '.ugSearchIcon',
    '#ugSearchInput',
    '#ugSearchGo',
    '.ugSearchSortBtns',
    '#ugSearchReset'
  ].join(',');
  const NATIVE_FILTER_SORT_DISABLE_SELECTOR = [
    '.ugTypeTab',
    '#ugSortDate',
    '#ugSortThumbs',
    '#ugNsfwCheck',
    '.ugNsfwToggle'
  ].join(',');
  const FAVORITES_TITLE_CLASS = 'fjBettermentsFavoritesTitle';
  const TILE_CONTAINER_SELECTOR = '#ugTilesContainer';
  const TILE_COLUMN_CLASS = 'ugMasonryCol';
  const TILE_SIDE_COLUMN_CLASS = 'fjBettermentsSideCol';
  const TILE_MAIN_AREA_CLASS = 'fjBettermentsMainArea';
  const TILE_COLUMNS_ROW_CLASS = 'fjBettermentsColumnsRow';
  const TILE_TOP_BAR_CLASS = 'fjBettermentsTileTopBar';
  const TILE_ROW_SELECTOR = '.favRow.rowCon';
  const TILE_GAP_PX = 2;
  const TILE_TOP_BAR_HEIGHT_PX = 57;
  const TILE_COLUMNS_ENABLED = 4;
  const TILE_ROWS_PER_PAGE_DEFAULT = 2;
  const TILE_ROWS_PER_PAGE_MIN = 1;
  const TILE_ROWS_PER_PAGE_MAX = 10;
  const TILE_ROWS_PER_PAGE_STORAGE_KEY = 'fjBettermentsRowsPerPage';
  const TILES_PER_FETCH_SET = 70;
  const BAR_BG_COLOR = '#151515';
  const BAR_BORDER_COLOR = '#222';
  const GALLERY_SELECTOR = '#recentPics';
  const GALLERY_WIDTH_MULTIPLIER = 1.35;
  const LAYOUT_COOLDOWN_MS = 800;
  const FOLDER_ICON_ZONE_WIDTH_PX = 13;
  const FOLDER_ICON_SIZE_PX = 30;
  const FOLDER_BUTTON_HEIGHT_PX = 30;
  const FOLDER_ICON_CLOSED_LIGHT_REL_PATH = 'icons/folder_closed_light.png';
  const FOLDER_ICON_OPEN_LIGHT_REL_PATH = 'icons/folder_open_light.png';
  const FOLDER_ICON_CLOSED_DARK_REL_PATH = 'icons/folder_closed_dark.png';
  const FOLDER_ICON_OPEN_DARK_REL_PATH = 'icons/folder_open_dark.png';
  const RESET_ICON_REL_PATH = 'icons/reset.png';
  const DEFAULT_FOLDER_BG_COLOR = '#1a1a1a';
  const DEFAULT_FOLDER_TEXT_COLOR = '#dddddd';
  const FAVS_GALLERY_PATH = '/favorites/getFavsGallery';
  const DEBUG_FOLDERS = false;

  let enabled = false;
  let tileRowsPerPage = TILE_ROWS_PER_PAGE_DEFAULT;
  let tileRowsPerPageLoaded = false;
  let bodyObserver = null;
  let layoutFrame = 0;
  let galleryFrame = 0;
  let applyingTilesLayout = false;
  let recentPicsCaptureGuardAttached = false;
  let lastLayoutRunAt = 0;
  let favoritesPayloadCache = null;
  let favoritesRequestBodyCache = '';
  let favoritesPayloadVersion = 0;
  let favoritesRefreshInFlight = null;
  let favoritesBootstrapRequested = false;
  let favoritesCurrentPage = 1;
  let fullGalleryHydrationInFlight = null;
  let fullGalleryHydrationBodyKey = '';
  let nativePreloadInFlight = null;
  let nativePreloadContextKey = '';
  let nativePreloadTargetRows = 0;
  let nativePreloadExhausted = false;
  let nativePreloadToken = 0;
  let nativePreloadActive = false;
  let nativeGalleryRequestAllowDepth = 0;
  let nativeGalleryLoadGuardDepth = 0;
  let nativeShowMoreRecentOriginal = null;
  let nativeShowMoreRecentWrapped = null;
  let nativeMemeScrollOriginal = null;
  let nativeMemeScrollWrapped = null;
  let nativeScrollGateInstalled = false;
  let paginationOrderKey = '';
  let paginationRowOrder = [];
  let activeFolderExpectedCount = 0;
  let nsfwToggleInFlight = false;
  let nsfwMinLockUntil = 0;
  let detachedTopBarFilter = 'All';
  let detachedTopBarSort = 'Date';
  let detachedTopBarNsfw = false;
  let detachedTopBarRequestInFlight = false;
  let detachedTileRowsContextKey = '';
  const payloadItemOrderById = new Map();
  let payloadItemOrderContextKey = '';
  let payloadItemOrderNextIndex = 0;
  const detachedTileRowsByKey = new Map();
  const tileRowRuntimeIds = new WeakMap();
  let nextTileRuntimeId = 1;
  const favoritesPayloadSubscribers = new Set();
  const nativePreloadStatusSubscribers = new Set();
  const openParentFolderIdsState = new Set();
  let activeFolderSelectionId = '';
  const folderSelectionSubscribers = new Set();

  const normalizeSelectionId = (value) => String(value == null ? '' : value);

  const setActiveFolderExpectedCount = (value) => {
    const parsed = Number.parseInt(String(value == null ? '' : value), 10);
    activeFolderExpectedCount = Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  };

  const setActiveFolderSelectionId = (value) => {
    const next = normalizeSelectionId(value);
    if (next === activeFolderSelectionId) {
      return;
    }
    activeFolderSelectionId = next;
    if (!next) {
      setActiveFolderExpectedCount(0);
    }
    folderSelectionSubscribers.forEach((subscriber) => {
      try {
        subscriber(activeFolderSelectionId);
      } catch (_) {}
    });
  };

  const parseJsonSafe = (text) => {
    try {
      return JSON.parse(text);
    } catch (_) {
      return null;
    }
  };

  const clampTileRowsPerPage = (value) => {
    const parsed = Number.parseInt(String(value == null ? '' : value), 10);
    if (!Number.isFinite(parsed)) {
      return TILE_ROWS_PER_PAGE_DEFAULT;
    }
    return Math.min(TILE_ROWS_PER_PAGE_MAX, Math.max(TILE_ROWS_PER_PAGE_MIN, parsed));
  };

  const ensureTileRowsPerPageLoaded = () => {
    if (tileRowsPerPageLoaded) {
      return;
    }
    tileRowsPerPageLoaded = true;
    try {
      const stored = window.localStorage
        ? window.localStorage.getItem(TILE_ROWS_PER_PAGE_STORAGE_KEY)
        : null;
      tileRowsPerPage = clampTileRowsPerPage(stored);
    } catch (_) {
      tileRowsPerPage = TILE_ROWS_PER_PAGE_DEFAULT;
    }
  };

  const getTileRowsPerPage = () => {
    ensureTileRowsPerPageLoaded();
    return clampTileRowsPerPage(tileRowsPerPage);
  };

  const setTileRowsPerPage = (value, persist = true) => {
    ensureTileRowsPerPageLoaded();
    const next = clampTileRowsPerPage(value);
    const changed = next !== tileRowsPerPage;
    tileRowsPerPage = next;
    if (persist) {
      try {
        if (window.localStorage) {
          window.localStorage.setItem(TILE_ROWS_PER_PAGE_STORAGE_KEY, String(next));
        }
      } catch (_) {}
    }
    return changed;
  };

  const notifyFavoritesPayloadSubscribers = () => {
    favoritesPayloadSubscribers.forEach((subscriber) => {
      try {
        subscriber(favoritesPayloadCache, favoritesPayloadVersion);
      } catch (_) {}
    });
  };

  const notifyNativePreloadStatusSubscribers = () => {
    nativePreloadStatusSubscribers.forEach((subscriber) => {
      try {
        subscriber(nativePreloadActive);
      } catch (_) {}
    });
  };

  const setFavoritesUiInteractionLock = (locked) => {
    if (!document.body) {
      return;
    }
    document.body.classList.toggle('fjBettermentsUiLocked', Boolean(locked));
  };

  const setNativePreloadActive = (active) => {
    const next = Boolean(active);
    if (next === nativePreloadActive) {
      return;
    }
    nativePreloadActive = next;
    notifyNativePreloadStatusSubscribers();
  };

  const refreshPayloadItemOrderIndex = (payload, requestBody = '') => {
    if (!payload || !Array.isArray(payload.items)) {
      return;
    }

    const params = new URLSearchParams(
      requestBody || favoritesRequestBodyCache || 'size=70&sort=date&folderId=0&search=&typeFilter=&nsfw=0&tagsOnly=0'
    );
    const cursor = String(params.get('cursor') || '').trim();
    params.delete('cursor');
    const contextKey = params.toString();

    // Reset ordering when request context changes or when this is a fresh first-page load.
    if (contextKey !== payloadItemOrderContextKey || !cursor) {
      payloadItemOrderContextKey = contextKey;
      payloadItemOrderById.clear();
      payloadItemOrderNextIndex = 0;
    }

    payload.items.forEach((item, index) => {
      const id = String(item && item.id ? item.id : '').trim();
      if (!id) {
        return;
      }
      if (!payloadItemOrderById.has(id)) {
        payloadItemOrderById.set(id, payloadItemOrderNextIndex);
        payloadItemOrderNextIndex += 1;
      }
    });
  };

  const cacheFavoritesPayloadFromText = (url, responseText, requestBody = '') => {
    const href = String(url || '');
    if (!href.includes(FAVS_GALLERY_PATH)) {
      return false;
    }
    const parsed = parseJsonSafe(responseText);
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.folders)) {
      return false;
    }
    favoritesPayloadCache = parsed;
    refreshPayloadItemOrderIndex(parsed, requestBody);
    favoritesBootstrapRequested = true;
    favoritesPayloadVersion += 1;
    folderRuntimeDebug('favorites payload cached', {
      version: favoritesPayloadVersion,
      folderCount: parsed.folders.length,
      hasItems: Array.isArray(parsed.items)
    });
    notifyFavoritesPayloadSubscribers();
    return true;
  };

  const installFavoritesPayloadCapture = () => {
    if (window.fjBettermentsFavsCaptureInstalled === '1') {
      return;
    }
    window.fjBettermentsFavsCaptureInstalled = '1';

    const normalizeBodyText = (body) => {
      if (typeof body === 'string') {
        return body;
      }
      if (typeof URLSearchParams !== 'undefined' && body instanceof URLSearchParams) {
        return body.toString();
      }
      if (typeof FormData !== 'undefined' && body instanceof FormData) {
        const params = new URLSearchParams();
        body.forEach((value, key) => {
          if (typeof value === 'string') {
            params.append(key, value);
          }
        });
        return params.toString();
      }
      if (body && typeof body.toString === 'function') {
        try {
          return String(body.toString());
        } catch (_) {
          return '';
        }
      }
      return '';
    };

    const shouldBlockNativeCursorRequest = (url, body) => {
      const href = String(url || '');
      const gallery = document.querySelector(GALLERY_SELECTOR);
      const galleryOpen = Boolean(
        gallery
        && document.body
        && document.body.contains(gallery)
        && gallery.style.display !== 'none'
        && gallery.getBoundingClientRect().width > 0
        && gallery.getBoundingClientRect().height > 0
      );
      if (!enabled || !href.includes(FAVS_GALLERY_PATH)) {
        return false;
      }
      if (!galleryOpen) {
        return false;
      }
      if (nativeGalleryRequestAllowDepth > 0 || nativePreloadActive) {
        return false;
      }
      const bodyText = normalizeBodyText(body);
      if (!bodyText) {
        return false;
      }
      const params = new URLSearchParams(bodyText);
      const cursor = String(params.get('cursor') || '').trim();
      if (detachedTopBarRequestInFlight && cursor.length > 0) {
        return true;
      }
      return cursor.length > 0;
    };

    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function wrappedOpen(method, url, ...rest) {
      try {
        this.__fjBettermentsUrl = String(url || '');
      } catch (_) {
        this.__fjBettermentsUrl = '';
      }
      return originalOpen.call(this, method, url, ...rest);
    };
    XMLHttpRequest.prototype.send = function wrappedSend(body) {
      const url = String(this.__fjBettermentsUrl || '');
      if (url.includes(FAVS_GALLERY_PATH)) {
        const bodyText = normalizeBodyText(body);
        if (bodyText && bodyText.trim()) {
          favoritesRequestBodyCache = bodyText;
        }
        if (shouldBlockNativeCursorRequest(url, body)) {
          folderRuntimeDebug('blocked native cursor load', {
            url,
            body: bodyText
          });
          try {
            this.abort();
          } catch (_) {}
          return;
        }
        this.addEventListener('load', function onLoad() {
          try {
            cacheFavoritesPayloadFromText(url, String(this.responseText || ''), bodyText);
          } catch (_) {}
        }, { once: true });
      }
      return originalSend.call(this, body);
    };
  };

  const refreshFavoritesPayload = (force = false) => {
    if (favoritesRefreshInFlight && !force) {
      return favoritesRefreshInFlight;
    }
    const body = favoritesRequestBodyCache || 'sort=date&nsfw=0&type=&cursor=';
    nativeGalleryRequestAllowDepth += 1;
    favoritesRefreshInFlight = fetch(FAVS_GALLERY_PATH, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        Accept: 'application/json, text/javascript, */*; q=0.01',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body
    })
      .then((response) => response.text())
      .then((text) => {
        cacheFavoritesPayloadFromText(FAVS_GALLERY_PATH, text, body);
      })
      .catch((error) => {
        folderDebug('refreshFavoritesPayload failed', { error: String(error) });
      })
      .finally(() => {
        nativeGalleryRequestAllowDepth = Math.max(0, nativeGalleryRequestAllowDepth - 1);
        favoritesRefreshInFlight = null;
      });
    return favoritesRefreshInFlight;
  };

  const folderDebug = (...args) => {
    if (!DEBUG_FOLDERS) {
      return;
    }
    console.log('[FJFE Betterments]', ...args);
  };

  const folderRuntimeDebug = (...args) => {
    console.debug('[FJFE Betterments][debug]', ...args);
  };

  const resolveExtensionAssetUrl = (relativePath) => {
    try {
      if (typeof browser !== 'undefined' && browser.runtime && typeof browser.runtime.getURL === 'function') {
        return browser.runtime.getURL(relativePath);
      }
      if (typeof chrome !== 'undefined' && chrome.runtime && typeof chrome.runtime.getURL === 'function') {
        return chrome.runtime.getURL(relativePath);
      }
    } catch (_) {
      // fall through to relative path
    }
    return relativePath;
  };

  const FOLDER_ICON_CLOSED_LIGHT_URL = resolveExtensionAssetUrl(FOLDER_ICON_CLOSED_LIGHT_REL_PATH);
  const FOLDER_ICON_OPEN_LIGHT_URL = resolveExtensionAssetUrl(FOLDER_ICON_OPEN_LIGHT_REL_PATH);
  const FOLDER_ICON_CLOSED_DARK_URL = resolveExtensionAssetUrl(FOLDER_ICON_CLOSED_DARK_REL_PATH);
  const FOLDER_ICON_OPEN_DARK_URL = resolveExtensionAssetUrl(FOLDER_ICON_OPEN_DARK_REL_PATH);
  const RESET_ICON_URL = resolveExtensionAssetUrl(RESET_ICON_REL_PATH);
  const FOLDER_ICON_CLOSED_FALLBACK_URL = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"%3E%3Cpath fill="%23bfbfbf" d="M6 18a6 6 0 0 1 6-6h14l8 8h20a6 6 0 0 1 6 6v24a6 6 0 0 1-6 6H12a6 6 0 0 1-6-6V18z"/%3E%3Cpath fill="none" stroke="%23000" stroke-opacity=".35" d="M6.5 18.5a5.5 5.5 0 0 1 5.5-5.5h13.8l8 8H54a5.5 5.5 0 0 1 5.5 5.5V50A5.5 5.5 0 0 1 54 55.5H12A5.5 5.5 0 0 1 6.5 50V18.5z"/%3E%3C/svg%3E';
  const FOLDER_ICON_OPEN_FALLBACK_URL = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"%3E%3Cpath fill="%23c8c8c8" d="M8 24a6 6 0 0 1 6-6h14l6 6h16a6 6 0 0 1 5.8 7.6L51.3 48A8 8 0 0 1 43.5 54H12.4a6.5 6.5 0 0 1-6.2-8.6L10 30.2A9 9 0 0 1 18.6 24H8z"/%3E%3Cpath fill="none" stroke="%23000" stroke-opacity=".35" d="M9 24.5a5.5 5.5 0 0 1 5.5-5.5h13.3l6 6H50a5.5 5.5 0 0 1 5.3 7L50.8 47.7a7.5 7.5 0 0 1-7.1 5.3H12.6a6 6 0 0 1-5.7-7.8l3.8-14.9a8.5 8.5 0 0 1 8-5.8H9z"/%3E%3C/svg%3E';

  const isTargetHost = () => {
    const host = window.location.hostname || '';
    return host === targetHost || host.endsWith(`.${targetHost}`);
  };

  const getStoredSettings = () => {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) return {};
      return JSON.parse(raw) || {};
    } catch (_) {
      return {};
    }
  };

  const removeBlockedMenus = (rootNode) => {
    const root = rootNode && rootNode.nodeType === 1 ? rootNode : document;

    if (root.matches && root.matches(BLOCK_SELECTOR)) {
      root.remove();
      return;
    }

    const found = root.querySelectorAll ? root.querySelectorAll(BLOCK_SELECTOR) : [];
    found.forEach((node) => node.remove());
  };

  const removeProgressWrap = (rootNode) => {
    const root = rootNode && rootNode.nodeType === 1 ? rootNode : document;

    if (root.matches && root.matches(PROGRESS_WRAP_SELECTOR)) {
      root.remove();
      return;
    }

    const found = root.querySelectorAll ? root.querySelectorAll(PROGRESS_WRAP_SELECTOR) : [];
    found.forEach((node) => node.remove());
  };

  const removeEmptyGalleryHint = (rootNode) => {
    const root = rootNode && rootNode.nodeType === 1 ? rootNode : document;

    if (root.matches && root.matches(EMPTY_GALLERY_HINT_SELECTOR)) {
      root.style.setProperty('display', 'none', 'important');
      root.style.setProperty('visibility', 'hidden', 'important');
      root.style.setProperty('pointer-events', 'none', 'important');
      return;
    }

    const found = root.querySelectorAll ? root.querySelectorAll(EMPTY_GALLERY_HINT_SELECTOR) : [];
    found.forEach((node) => {
      node.style.setProperty('display', 'none', 'important');
      node.style.setProperty('visibility', 'hidden', 'important');
      node.style.setProperty('pointer-events', 'none', 'important');
    });
  };

  const removeStatusTip = (rootNode) => {
    const root = rootNode && rootNode.nodeType === 1 ? rootNode : document;

    if (root.matches && root.matches(STATUS_TIP_SELECTOR)) {
      root.remove();
      return;
    }

    const found = root.querySelectorAll ? root.querySelectorAll(STATUS_TIP_SELECTOR) : [];
    found.forEach((node) => node.remove());
  };

  const removeBottomControls = (rootNode) => {
    const root = rootNode && rootNode.nodeType === 1 ? rootNode : document;

    if (root.matches && root.matches(BOTTOM_CONTROLS_SELECTOR)) {
      root.style.setProperty('display', 'none', 'important');
      root.style.setProperty('visibility', 'hidden', 'important');
      root.style.setProperty('pointer-events', 'none', 'important');
      return;
    }

    const found = root.querySelectorAll ? root.querySelectorAll(BOTTOM_CONTROLS_SELECTOR) : [];
    found.forEach((node) => {
      node.style.setProperty('display', 'none', 'important');
      node.style.setProperty('visibility', 'hidden', 'important');
      node.style.setProperty('pointer-events', 'none', 'important');
    });
  };

  const protectRecentPicsInteractions = () => {
    const recentPics = document.querySelector(GALLERY_SELECTOR);
    if (!recentPics) {
      return;
    }

    if (!recentPicsCaptureGuardAttached) {
      const isInteractiveTarget = (target) => {
        if (!(target instanceof Element)) {
          return false;
        }
        return Boolean(target.closest([
          '#rFolder',
          '.ugGalleryCloseBtn',
          '.ugFavPreviewClose',
          '.rfolr',
          '.ugFolSub',
          '.ugFolSubView',
          '.ugFolSubChild',
          '.ugFolSubToggle',
          '.ugFolSubBtn',
          '.fjBettermentsFolderRow',
          '.favRow',
          'button',
          'a',
          'input',
          'label',
          'select',
          'textarea'
        ].join(',')));
      };

      const captureGuard = (event) => {
        if (!enabled) {
          return;
        }
        const currentRecentPics = document.querySelector(GALLERY_SELECTOR);
        if (!currentRecentPics || !(event.target instanceof Element)) {
          return;
        }
        if (!currentRecentPics.contains(event.target)) {
          return;
        }

        if (event.target.closest && event.target.closest('#rFolder')) {
          return;
        }

        if (isInteractiveTarget(event.target)) {
          return;
        }

        event.preventDefault();
        event.stopImmediatePropagation();
        event.stopPropagation();
      };

      window.addEventListener('pointerdown', captureGuard, true);
      window.addEventListener('mousedown', captureGuard, true);
      window.addEventListener('click', captureGuard, true);
      recentPicsCaptureGuardAttached = true;
    }

    if (recentPics.dataset.fjBettermentsProtected === '1') {
      return;
    }

    const stopBubble = (event) => {
      const closeBtn = event.target && event.target.closest
        ? event.target.closest('.ugGalleryCloseBtn')
        : null;
      if (closeBtn) {
        return;
      }
      event.stopPropagation();
    };

    recentPics.addEventListener('click', stopBubble);
    recentPics.addEventListener('mousedown', stopBubble);
    recentPics.dataset.fjBettermentsProtected = '1';
  };

  const removeFolderExtras = (rootNode) => {
    const root = rootNode && rootNode.nodeType === 1 ? rootNode : document;
    const selectors = [FOLDER_MORE_TOGGLE_SELECTOR, FOLDER_NEST_HINT_SELECTOR];

    selectors.forEach((selector) => {
      if (root.matches && root.matches(selector)) {
        root.remove();
        return;
      }
      const found = root.querySelectorAll ? root.querySelectorAll(selector) : [];
      found.forEach((node) => node.remove());
    });
  };

  const readFolderEntries = () => {
    const nodes = Array.from(document.querySelectorAll('#rFolder .ugFolList .rfolr'));
    const entries = nodes
      .filter((node) => !(node.classList && node.classList.contains('rncat')))
      .map((node) => {
        const nameEl = node.querySelector('.ugFolName');
        const countEl = node.querySelector('.ugFolCount');

        let name = '';
        if (nameEl) {
          name = (nameEl.textContent || '').trim();
        } else {
          const clone = node.cloneNode(true);
          clone.querySelectorAll('.ugFolCount,.ugFolOverflowBtn,.ugFolKeyNum').forEach((child) => child.remove());
          name = (clone.textContent || '').trim();
        }

        const count = countEl ? (countEl.textContent || '').trim() : '';
        const folderId = node.dataset ? (node.dataset.id || '') : '';
        return { node, name, count, folderId };
      })
      .filter((entry) => entry.name);
    folderDebug('readFolderEntries', {
      totalRows: nodes.length,
      usableRows: entries.length,
      entries: entries.map((entry) => ({ name: entry.name, count: entry.count, folderId: entry.folderId }))
    });
    return entries;
  };

  const replaceObsoleteTopControls = (rootNode) => {
    const root = rootNode && rootNode.nodeType === 1 ? rootNode : document;
    removeBottomControls(root);
    const topCenter = root.querySelector ? root.querySelector('.showMoreRecent .ugControlsCenter') : null;
    if (!topCenter) {
      return;
    }

    const obsoleteControls = topCenter.querySelectorAll(OBSOLETE_TOP_CONTROLS_SELECTOR);
    obsoleteControls.forEach((node) => {
      node.style.setProperty('display', 'none', 'important');
      node.style.setProperty('visibility', 'hidden', 'important');
      node.style.setProperty('pointer-events', 'none', 'important');
    });

    const disableNode = (node) => {
      if (!(node instanceof Element)) {
        return node;
      }
      if (node instanceof HTMLElement) {
        node.style.setProperty('display', 'none', 'important');
        node.style.setProperty('visibility', 'hidden', 'important');
        node.style.setProperty('pointer-events', 'none', 'important');
        node.setAttribute('aria-disabled', 'true');
        node.setAttribute('tabindex', '-1');
      }
      node.querySelectorAll('input,button,select,textarea,a').forEach((child) => {
        if (child instanceof HTMLElement) {
          child.style.setProperty('pointer-events', 'none', 'important');
          child.setAttribute('aria-disabled', 'true');
          child.setAttribute('tabindex', '-1');
        }
      });
      return node;
    };

    topCenter.querySelectorAll(NATIVE_FILTER_SORT_DISABLE_SELECTOR).forEach((node) => {
      disableNode(node);
    });

    let title = topCenter.querySelector(`.${FAVORITES_TITLE_CLASS}`);
    if (!title) {
      title = document.createElement('div');
      title.className = FAVORITES_TITLE_CLASS;
      title.textContent = 'Favorites';
      title.style.display = 'flex';
      title.style.alignItems = 'center';
      title.style.justifyContent = 'center';
      title.style.width = '100%';
      title.style.color = '#d8d8d8';
      title.style.font = "600 24px 'Segoe UI', sans-serif";
      title.style.lineHeight = '1.1';
      title.style.textAlign = 'center';
      title.style.pointerEvents = 'none';
      title.style.userSelect = 'none';
      topCenter.prepend(title);
    }

    const stickyCon = document.querySelector('.stickyCon');
    if (stickyCon) {
      stickyCon.style.setProperty('display', 'none', 'important');
      stickyCon.style.setProperty('visibility', 'hidden', 'important');
      stickyCon.style.setProperty('pointer-events', 'none', 'important');
      folderDebug('stickyCon hidden');
    }
  };

  const ensureBlockStyle = () => {
    if (document.getElementById(BLOCK_STYLE_ID)) {
      return;
    }
    const style = document.createElement('style');
    style.id = BLOCK_STYLE_ID;
    style.textContent = `${BLOCK_SELECTOR}{display:none !important; visibility:hidden !important; pointer-events:none !important;}`;
    (document.head || document.documentElement || document.body).appendChild(style);
  };

  const removeBlockStyle = () => {
    const style = document.getElementById(BLOCK_STYLE_ID);
    if (style) {
      style.remove();
    }
  };

  const ensureLayoutGuardStyles = () => {
    const styleId = 'fjfe-betterments-layout-guard-style';
    if (document.getElementById(styleId)) {
      return;
    }

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = [
      `#ugTilesContainer > .${TILE_MAIN_AREA_CLASS}{display:flex !important;flex-direction:column !important;align-items:stretch !important;}`,
      `#ugTilesContainer > .${TILE_MAIN_AREA_CLASS} > .${TILE_TOP_BAR_CLASS}{display:flex !important;width:100% !important;flex:0 0 auto !important;}`,
      `#ugTilesContainer > .${TILE_MAIN_AREA_CLASS} > .${TILE_COLUMNS_ROW_CLASS}{display:flex !important;width:100% !important;flex:0 0 auto !important;align-items:flex-start !important;}`,
      `.fjBettermentsSubfolderProxyRow .fjBettermentsSubfolderProxyDisplay{position:relative !important;z-index:2 !important;}`,
      `@keyframes fjBettermentsPagerSpinner{0%{transform:rotate(0deg);}100%{transform:rotate(360deg);}}`,
      `.fjBettermentsPagerLoadingHint{position:absolute !important;left:50% !important;top:calc(50% + 13px) !important;transform:translateX(-50%) !important;display:none;align-items:center;gap:6px;color:#cfcfcf;font:600 10px 'Segoe UI',sans-serif;white-space:nowrap;pointer-events:none;}`,
      `.fjBettermentsPagerLoadingHint.is-visible{display:inline-flex !important;}`,
      `.fjBettermentsPagerLoadingSpinner{width:10px;height:10px;border-radius:999px;border:2px solid #6a6a6a;border-top-color:#d6d6d6;animation:fjBettermentsPagerSpinner .7s linear infinite;box-sizing:border-box;}`,
      `.fjBettermentsUiLocked .${TILE_TOP_BAR_CLASS},.fjBettermentsUiLocked .${TILE_SIDE_COLUMN_CLASS}{pointer-events:none !important;}`,
      `.fjBettermentsUiLocked .${TILE_TOP_BAR_CLASS}{opacity:.82 !important;}`,
      `.fjBettermentsUiLocked .${TILE_COLUMNS_ROW_CLASS}{visibility:hidden !important;}`,
      `.fjBettermentsUiLocked .fjBettermentsPagerLoadingHint{display:inline-flex !important;}`,
      `.ugGalleryCloseBtn{width:24px !important;height:24px !important;min-width:24px !important;min-height:24px !important;border-radius:7px !important;background:linear-gradient(180deg,#7f2b2b 0%,#6a2020 100%) !important;border:1px solid #8e3b3b !important;color:#ffe8e8 !important;font-size:13px !important;font-weight:700 !important;line-height:1 !important;display:inline-flex !important;align-items:center !important;justify-content:center !important;box-shadow:0 2px 8px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.15) !important;transition:background .14s ease,box-shadow .14s ease,transform .14s ease !important;}`,
      `.ugGalleryCloseBtn:hover{background:linear-gradient(180deg,#8d3333 0%,#742626 100%) !important;box-shadow:0 3px 10px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.2) !important;}`,
      `.ugGalleryCloseBtn:active{transform:translateY(1px) !important;}`,
      `.ugTuttip,.ugtuttip,#ugTuttip,#ugtuttip,[id*="tuttip" i],[class*="tuttip" i]{display:none !important;visibility:hidden !important;pointer-events:none !important;opacity:0 !important;}`
    ].join('');
    (document.head || document.documentElement || document.body).appendChild(style);
  };

  const getRowOrder = (row, index) => {
    const itemId = row && row.dataset ? String(row.dataset.id || '').trim() : '';
    if (itemId && payloadItemOrderById.has(itemId)) {
      const payloadOrder = payloadItemOrderById.get(itemId);
      if (Number.isFinite(payloadOrder)) {
        return payloadOrder;
      }
    }
    const raw = row?.dataset?.order;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : index;
  };

  const getRowStableKey = (row) => {
    const dataId = row && row.dataset ? String(row.dataset.id || '').trim() : '';
    if (dataId) {
      return `id:${dataId}`;
    }
    const domId = String((row && row.id) || '').trim();
    if (domId) {
      return `dom:${domId}`;
    }
    let runtimeId = tileRowRuntimeIds.get(row);
    if (!runtimeId) {
      runtimeId = `runtime:${nextTileRuntimeId++}`;
      tileRowRuntimeIds.set(row, runtimeId);
    }
    return runtimeId;
  };

  const collectTileRows = (container) => {
    const rows = Array.from(container.querySelectorAll(`.${TILE_COLUMN_CLASS} ${TILE_ROW_SELECTOR}`));
    const rowsByKey = new Map();
    rows.forEach((row) => {
      const key = getRowStableKey(row);
      rowsByKey.set(key, row);
      detachedTileRowsByKey.delete(key);
    });

    detachedTileRowsByKey.forEach((row, key) => {
      if (row instanceof Element) {
        rowsByKey.set(key, row);
      }
    });

    if (!rowsByKey.size) {
      return [];
    }

    const previousOrderRankByKey = new Map();
    paginationRowOrder.forEach((key, rank) => {
      previousOrderRankByKey.set(key, rank);
    });

    const orderedRows = Array.from(rowsByKey.entries())
      .map(([key, row], index) => ({
        key,
        row,
        index,
        order: getRowOrder(row, index),
        prevRank: previousOrderRankByKey.has(key) ? previousOrderRankByKey.get(key) : -1
      }))
      .sort((a, b) => {
        const aHasPrevRank = a.prevRank >= 0;
        const bHasPrevRank = b.prevRank >= 0;

        if (aHasPrevRank && bHasPrevRank && a.prevRank !== b.prevRank) {
          return a.prevRank - b.prevRank;
        }
        if (aHasPrevRank !== bHasPrevRank) {
          return aHasPrevRank ? -1 : 1;
        }

        if (a.order !== b.order) {
          return a.order - b.order;
        }
        return a.index - b.index;
      })
      .map((entry) => entry.row)
      .filter((row) => row instanceof Element);

    paginationRowOrder = orderedRows.map((row) => getRowStableKey(row));
    return orderedRows;
  };

  const normalizeMaybeUrl = (value) => {
    const raw = String(value || '').trim();
    if (!raw) {
      return '';
    }
    if (/^https?:\/\//i.test(raw)) {
      return raw;
    }
    if (raw.startsWith('//')) {
      return `https:${raw}`;
    }
    if (raw.startsWith('/')) {
      return `https://${targetHost}${raw}`;
    }
    return `https://${targetHost}/${raw}`;
  };

  const resolveTileThumbUrl = (item, payloadPrefix) => {
    const itemPath = String(item && item.p ? item.p : '').trim();
    const prefix = String(payloadPrefix || '').trim();
    if (!itemPath && !prefix) {
      return '';
    }
    if (/^https?:\/\//i.test(itemPath)) {
      return itemPath;
    }
    if (itemPath.startsWith('//')) {
      return `https:${itemPath}`;
    }
    if (prefix) {
      const base = normalizeMaybeUrl(prefix).replace(/\/+$/, '');
      const path = itemPath.replace(/^\/+/, '');
      return path ? `${base}/${path}` : base;
    }
    return normalizeMaybeUrl(itemPath);
  };

  const buildPayloadTileRow = (item, payloadPrefix, index) => {
    const row = document.createElement('div');
    row.className = 'favRow rowCon fjBettermentsPayloadTile';
    row.dataset.order = String(index);
    row.style.display = 'flex';
    row.style.flexDirection = 'column';
    row.style.gap = '6px';
    row.style.padding = '6px';
    row.style.border = '1px solid #2a2a2a';
    row.style.borderRadius = '8px';
    row.style.background = '#141414';
    row.style.boxSizing = 'border-box';

    const href = normalizeMaybeUrl(item && item.url ? item.url : '');
    const thumbUrl = resolveTileThumbUrl(item, payloadPrefix);

    const link = document.createElement('a');
    link.href = href || '#';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.style.display = 'flex';
    link.style.flexDirection = 'column';
    link.style.gap = '6px';
    link.style.color = '#d9d9d9';
    link.style.textDecoration = 'none';

    const imgWrap = document.createElement('div');
    imgWrap.style.width = '100%';
    imgWrap.style.aspectRatio = '1 / 1';
    imgWrap.style.background = '#0f0f0f';
    imgWrap.style.borderRadius = '6px';
    imgWrap.style.overflow = 'hidden';

    const img = document.createElement('img');
    img.alt = String(item && item.title ? item.title : '').trim();
    img.decoding = 'async';
    img.loading = 'lazy';
    img.draggable = false;
    img.src = thumbUrl;
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'cover';
    img.style.display = 'block';
    imgWrap.appendChild(img);

    const title = document.createElement('div');
    title.textContent = String(item && item.title ? item.title : 'Untitled').trim() || 'Untitled';
    title.style.font = "600 12px 'Segoe UI', sans-serif";
    title.style.color = '#dddddd';
    title.style.lineHeight = '1.25';
    title.style.display = '-webkit-box';
    title.style.webkitLineClamp = '2';
    title.style.webkitBoxOrient = 'vertical';
    title.style.overflow = 'hidden';

    const meta = document.createElement('div');
    meta.style.display = 'flex';
    meta.style.justifyContent = 'space-between';
    meta.style.alignItems = 'center';
    meta.style.gap = '8px';
    meta.style.font = "500 11px 'Segoe UI', sans-serif";
    meta.style.color = '#a8a8a8';

    const thumbs = document.createElement('span');
    thumbs.textContent = String(item && item.thumbs ? item.thumbs : '');
    const date = document.createElement('span');
    date.textContent = String(item && item.ta ? item.ta : '');
    meta.append(thumbs, date);

    link.append(imgWrap, title, meta);
    row.appendChild(link);
    return row;
  };

  const renderTilesFromPayload = (payload) => {
    const container = document.querySelector(TILE_CONTAINER_SELECTOR);
    if (!container) {
      return;
    }

    const items = Array.isArray(payload && payload.items) ? payload.items : [];

    const existingColumns = Array.from(container.querySelectorAll(`.${TILE_COLUMN_CLASS}`));
    existingColumns.forEach((node) => node.remove());
    const existingSideColumns = Array.from(container.querySelectorAll(`.${TILE_SIDE_COLUMN_CLASS}`));
    existingSideColumns.forEach((node) => node.remove());
    const existingMainAreas = Array.from(container.querySelectorAll(`.${TILE_MAIN_AREA_CLASS}`));
    existingMainAreas.forEach((node) => node.remove());
    const existingEmpty = Array.from(container.querySelectorAll('.fjBettermentsTilesEmpty'));
    existingEmpty.forEach((node) => node.remove());

    if (!items.length) {
      const empty = document.createElement('div');
      empty.className = 'fjBettermentsTilesEmpty';
      empty.textContent = 'No items in this folder.';
      empty.style.padding = '14px';
      empty.style.color = '#a5a5a5';
      empty.style.font = "500 13px 'Segoe UI', sans-serif";
      container.appendChild(empty);
      return;
    }

    const seedColumn = buildTileColumn();
    items.forEach((item, index) => {
      seedColumn.appendChild(buildPayloadTileRow(item, payload && payload.prefix, index));
    });
    container.appendChild(seedColumn);
    scheduleFavoritesTileLayout(true);
  };

  const clearTilesEmptyPlaceholders = () => {
    const container = document.querySelector(TILE_CONTAINER_SELECTOR);
    if (!container) {
      return;
    }
    const stale = Array.from(container.querySelectorAll('.fjBettermentsTilesEmpty, .fjBettermentsNothingHere'));
    stale.forEach((node) => node.remove());
  };

  const getPayloadCursor = (payload) => {
    const cursor = [
      payload && payload.cursor,
      payload && payload.nextCursor,
      payload && payload.next,
      payload && payload.next_cursor,
      payload && payload.pagination && payload.pagination.cursor,
      payload && payload.pagination && payload.pagination.nextCursor
    ].find((value) => typeof value === 'string' && value.trim());
    return cursor ? String(cursor).trim() : '';
  };

  const getPayloadTotalCount = (payload) => {
    const raw = [
      payload && payload.realCount,
      payload && payload.totalCount,
      payload && payload.total,
      payload && payload.count
    ].find((value) => value != null && value !== '');
    const parsed = Number.parseInt(String(raw == null ? '' : raw), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  };

  const getTilesPerPage = (columns) => {
    const safeColumns = Math.max(1, Number(columns) || TILE_COLUMNS_ENABLED);
    return Math.max(1, safeColumns * getTileRowsPerPage());
  };

  const getRequiredFetchSetForPage = (page, columns) => {
    const safePage = Math.max(1, Number(page) || 1);
    const tilesNeeded = safePage * getTilesPerPage(columns);
    return Math.max(1, Math.ceil(tilesNeeded / TILES_PER_FETCH_SET));
  };

  const getTargetRowCountForFetchSet = (fetchSetIndex, totalKnownRows = 0) => {
    let targetRows = Math.max(1, Number(fetchSetIndex) || 1) * TILES_PER_FETCH_SET;
    if (Number(totalKnownRows) > 0) {
      targetRows = Math.min(targetRows, Number(totalKnownRows));
    }
    return targetRows;
  };

  const payloadHasMore = (payload) => {
    if (payload && typeof payload.hasMore === 'boolean') {
      return payload.hasMore;
    }
    if (payload && typeof payload.has_more === 'boolean') {
      return payload.has_more;
    }
    return null;
  };

  const getRequestKeyWithoutCursor = () => {
    const params = new URLSearchParams(favoritesRequestBodyCache || 'size=70&sort=date&folderId=0&search=&cursor=&typeFilter=&nsfw=0&tagsOnly=0');
    params.delete('cursor');
    return params.toString();
  };

  const setFavoritesRequestBodyNsfw = (enabledFlag) => {
    const params = new URLSearchParams(
      favoritesRequestBodyCache || 'size=70&sort=date&folderId=0&search=&cursor=&typeFilter=&nsfw=0&tagsOnly=0'
    );
    if (!params.has('size')) params.set('size', '70');
    if (!params.has('sort')) params.set('sort', 'date');
    if (!params.has('folderId')) params.set('folderId', '0');
    if (!params.has('search')) params.set('search', '');
    if (!params.has('typeFilter')) params.set('typeFilter', '');
    if (!params.has('tagsOnly')) params.set('tagsOnly', '0');
    params.set('nsfw', enabledFlag ? '1' : '0');
    params.set('cursor', '');
    favoritesRequestBodyCache = params.toString();
  };

  const getPreloadContextKey = () => `${getRequestKeyWithoutCursor()}::${String(activeFolderSelectionId || '')}`;

  const resetNativePreloadState = (nextContextKey = '') => {
    nativePreloadToken += 1;
    nativePreloadInFlight = null;
    nativePreloadTargetRows = 0;
    nativePreloadExhausted = false;
    nativePreloadContextKey = String(nextContextKey || '');
    setNativePreloadActive(false);
  };

  const resetDetachedTileRows = (nextContextKey = '') => {
    detachedTileRowsByKey.clear();
    detachedTileRowsContextKey = String(nextContextKey || '');
  };

  const canRunNativeGalleryLoad = () => {
    const gallery = document.querySelector(GALLERY_SELECTOR);
    const galleryOpen = Boolean(
      gallery
      && document.body
      && document.body.contains(gallery)
      && gallery.style.display !== 'none'
      && gallery.getBoundingClientRect().width > 0
      && gallery.getBoundingClientRect().height > 0
    );
    if (!galleryOpen) {
      return true;
    }
    if (!enabled) {
      return true;
    }
    return nativeGalleryLoadGuardDepth > 0 || nativePreloadActive;
  };

  const withAllowedNativeGalleryLoad = (run) => {
    nativeGalleryLoadGuardDepth += 1;
    try {
      return run();
    } finally {
      nativeGalleryLoadGuardDepth = Math.max(0, nativeGalleryLoadGuardDepth - 1);
    }
  };

  const onNativeScrollSignal = (event) => {
    if (canRunNativeGalleryLoad()) {
      return;
    }
    event.stopImmediatePropagation();
    event.stopPropagation();
  };

  const installNativeScrollGate = () => {
    if (nativeScrollGateInstalled) {
      return;
    }
    window.addEventListener('scroll', onNativeScrollSignal, true);
    window.addEventListener('wheel', onNativeScrollSignal, true);
    window.addEventListener('touchmove', onNativeScrollSignal, true);
    nativeScrollGateInstalled = true;
  };

  const restoreNativeScrollGate = () => {
    if (!nativeScrollGateInstalled) {
      return;
    }
    window.removeEventListener('scroll', onNativeScrollSignal, true);
    window.removeEventListener('wheel', onNativeScrollSignal, true);
    window.removeEventListener('touchmove', onNativeScrollSignal, true);
    nativeScrollGateInstalled = false;
  };

  const installNativeGalleryLoadGate = () => {
    const galleryApi = window.uGallery;
    if (!galleryApi || typeof galleryApi !== 'object') {
      return false;
    }

    if (typeof galleryApi.showMoreRecent === 'function' && galleryApi.showMoreRecent !== nativeShowMoreRecentWrapped) {
      nativeShowMoreRecentOriginal = galleryApi.showMoreRecent;
      nativeShowMoreRecentWrapped = function wrappedShowMoreRecent(...args) {
        if (!canRunNativeGalleryLoad()) {
          return false;
        }
        return nativeShowMoreRecentOriginal.apply(this, args);
      };
      galleryApi.showMoreRecent = nativeShowMoreRecentWrapped;
    }

    if (typeof galleryApi.memeScroll === 'function' && galleryApi.memeScroll !== nativeMemeScrollWrapped) {
      nativeMemeScrollOriginal = galleryApi.memeScroll;
      nativeMemeScrollWrapped = function wrappedMemeScroll(...args) {
        if (!canRunNativeGalleryLoad()) {
          return false;
        }
        return nativeMemeScrollOriginal.apply(this, args);
      };
      galleryApi.memeScroll = nativeMemeScrollWrapped;
    }

    return true;
  };

  const restoreNativeGalleryLoadGate = () => {
    const galleryApi = window.uGallery;
    if (galleryApi && typeof galleryApi === 'object') {
      if (nativeShowMoreRecentWrapped && galleryApi.showMoreRecent === nativeShowMoreRecentWrapped && nativeShowMoreRecentOriginal) {
        galleryApi.showMoreRecent = nativeShowMoreRecentOriginal;
      }
      if (nativeMemeScrollWrapped && galleryApi.memeScroll === nativeMemeScrollWrapped && nativeMemeScrollOriginal) {
        galleryApi.memeScroll = nativeMemeScrollOriginal;
      }
    }
    nativeShowMoreRecentOriginal = null;
    nativeShowMoreRecentWrapped = null;
    nativeMemeScrollOriginal = null;
    nativeMemeScrollWrapped = null;
    nativeGalleryLoadGuardDepth = 0;
    restoreNativeScrollGate();
  };

  const nudgeNativeLazyLoadSignal = () => {
    const gallery = document.querySelector(GALLERY_SELECTOR);
    if (gallery) {
      const previousTop = gallery.scrollTop;
      const bottomTop = Math.max(0, gallery.scrollHeight - gallery.clientHeight);
      try {
        gallery.scrollTop = bottomTop;
      } catch (_) {}
      gallery.dispatchEvent(new Event('scroll', { bubbles: true }));
      gallery.dispatchEvent(new Event('wheel', { bubbles: true }));
      try {
        gallery.scrollTop = previousTop;
      } catch (_) {}
    }
    try {
      if (window.uGallery && typeof window.uGallery.memeScroll === 'function') {
        withAllowedNativeGalleryLoad(() => {
          window.uGallery.memeScroll();
        });
      }
    } catch (_) {}
    window.dispatchEvent(new Event('scroll', { bubbles: true }));
  };

  const triggerNativeNextBatchLoad = () => {
    installNativeGalleryLoadGate();
    const triggerEl = document.querySelector('.showMoreRecent2.nextRecent');
    if (triggerEl instanceof HTMLElement) {
      withAllowedNativeGalleryLoad(() => {
        try {
          triggerEl.click();
        } catch (_) {}
        try {
          if (window.uGallery && typeof window.uGallery.showMoreRecent === 'function') {
            window.uGallery.showMoreRecent(triggerEl);
          }
        } catch (_) {}
        try {
          if (window.uGallery && typeof window.uGallery.memeScroll === 'function') {
            window.uGallery.memeScroll();
          }
        } catch (_) {}
      });
      nudgeNativeLazyLoadSignal();
      return;
    }

    try {
      if (window.uGallery && typeof window.uGallery.showMoreRecent === 'function') {
        const gallery = document.querySelector(GALLERY_SELECTOR) || document.body;
        const trigger = document.createElement('div');
        trigger.className = 'showMoreRecent2 nextRecent';
        trigger.style.display = 'none';
        gallery.appendChild(trigger);
        withAllowedNativeGalleryLoad(() => {
          window.uGallery.showMoreRecent(trigger);
        });
        nudgeNativeLazyLoadSignal();
        return;
      }
    } catch (_) {}

    const gallery = document.querySelector(GALLERY_SELECTOR);
    if (gallery) {
      try {
        gallery.scrollTop = gallery.scrollHeight;
      } catch (_) {}
      gallery.dispatchEvent(new Event('scroll', { bubbles: true }));
      gallery.dispatchEvent(new Event('wheel', { bubbles: true }));
    }
    nudgeNativeLazyLoadSignal();
  };

  const waitForNativeBatchProgress = (baselineRows, baselineVersion, timeoutMs = 1800) =>
    new Promise((resolve) => {
      const started = Date.now();
      let ticks = 0;
      const tick = () => {
        ticks += 1;
        if (ticks % 2 === 0) {
          nudgeNativeLazyLoadSignal();
        }
        const container = document.querySelector(TILE_CONTAINER_SELECTOR);
        const rowCount = container ? collectTileRows(container).length : 0;
        if (rowCount > baselineRows || favoritesPayloadVersion !== baselineVersion) {
          resolve();
          return;
        }
        if (Date.now() - started >= timeoutMs) {
          resolve();
          return;
        }
        window.setTimeout(tick, 120);
      };
      tick();
    });

  const ensureNativeTilesLoadedThrough = (targetRowCount) => {
    const requestedRows = Math.max(1, Number.parseInt(String(targetRowCount || 0), 10) || 1);
    const contextKey = getPreloadContextKey();
    if (nativePreloadContextKey !== contextKey) {
      resetNativePreloadState(contextKey);
    }

    nativePreloadTargetRows = Math.max(nativePreloadTargetRows, requestedRows);
    if (nativePreloadExhausted) {
      return Promise.resolve(true);
    }
    if (nativePreloadInFlight) {
      return nativePreloadInFlight;
    }

    const runToken = nativePreloadToken;
    let settled = false;
    setNativePreloadActive(true);
    nativePreloadInFlight = (async () => {
      const maxLoops = 220;
      let consecutiveNoProgress = 0;

      for (let loop = 0; loop < maxLoops; loop += 1) {
        if (runToken !== nativePreloadToken || nativePreloadContextKey !== contextKey) {
          break;
        }

        const container = document.querySelector(TILE_CONTAINER_SELECTOR);
        if (!container) {
          break;
        }

        const rowCount = collectTileRows(container).length;
        const expectedTotal = getPayloadTotalCount(favoritesPayloadCache);
        const hasMore = payloadHasMore(favoritesPayloadCache);
        const effectiveTarget = expectedTotal > 0
          ? Math.min(nativePreloadTargetRows, expectedTotal)
          : nativePreloadTargetRows;

        if (rowCount >= effectiveTarget || (expectedTotal > 0 && rowCount >= expectedTotal)) {
          if (expectedTotal > 0 && rowCount >= expectedTotal) {
            nativePreloadExhausted = true;
          }
          break;
        }

        const baselineVersion = favoritesPayloadVersion;
        triggerNativeNextBatchLoad();
        await waitForNativeBatchProgress(rowCount, baselineVersion);

        if (runToken !== nativePreloadToken || nativePreloadContextKey !== contextKey) {
          break;
        }

        const updatedContainer = document.querySelector(TILE_CONTAINER_SELECTOR);
        const nextRowCount = updatedContainer ? collectTileRows(updatedContainer).length : 0;
        const progressed = nextRowCount > rowCount || favoritesPayloadVersion !== baselineVersion;
        if (progressed) {
          consecutiveNoProgress = 0;
          const reachedTarget = nextRowCount >= nativePreloadTargetRows;
          if (reachedTarget || loop % 4 === 0) {
            scheduleFavoritesTileLayout(true);
          }
          continue;
        }

        consecutiveNoProgress += 1;
        if (hasMore === false && loop > 0) {
          nativePreloadExhausted = true;
          break;
        }
        const noProgressLimit = hasMore === true ? 18 : 8;
        if (consecutiveNoProgress >= noProgressLimit) {
          nativePreloadExhausted = true;
          break;
        }
      }

      scheduleFavoritesTileLayout(true);
      settled = true;
      return true;
    })().finally(() => {
      if (nativePreloadInFlight && runToken === nativePreloadToken) {
        nativePreloadInFlight = null;
      }
      // Always clear active state once this run has settled; resets also clear this proactively.
      if (settled || runToken === nativePreloadToken) {
        setNativePreloadActive(false);
      }
    });

    return nativePreloadInFlight;
  };

  const fetchAllVisibleGalleryTiles = () => {
    const bodyKey = String(favoritesRequestBodyCache || 'size=70&sort=date&folderId=0&search=&cursor=&typeFilter=&nsfw=0&tagsOnly=0');
    if (fullGalleryHydrationInFlight && fullGalleryHydrationBodyKey === bodyKey) {
      return fullGalleryHydrationInFlight;
    }

    fullGalleryHydrationBodyKey = bodyKey;
    const initialParams = new URLSearchParams(bodyKey);
    if (!initialParams.has('size')) initialParams.set('size', '70');
    if (!initialParams.has('sort')) initialParams.set('sort', 'date');
    if (!initialParams.has('search')) initialParams.set('search', '');
    if (!initialParams.has('typeFilter')) initialParams.set('typeFilter', '');
    if (!initialParams.has('nsfw')) initialParams.set('nsfw', '0');
    if (!initialParams.has('tagsOnly')) initialParams.set('tagsOnly', '0');

    const pageSize = Math.max(1, Number.parseInt(String(initialParams.get('size') || '70'), 10) || 70);
    const aggregated = { items: [], folders: [], prefix: '' };
    const seenIds = new Set();
    const seenCursors = new Set();
    let expectedTotal = 0;
    let cursor = String(initialParams.get('cursor') || '').trim();
    let loops = 0;
    const maxLoops = 180;

    const fetchPage = (cursorValue) => {
      const params = new URLSearchParams(initialParams.toString());
      params.set('cursor', String(cursorValue || ''));
      const body = params.toString();
      favoritesRequestBodyCache = body;
      return fetch(FAVS_GALLERY_PATH, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          Accept: 'application/json, text/javascript, */*; q=0.01',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body
      })
        .then((response) => response.text())
        .then((text) => parseJsonSafe(text))
        .then((parsed) => (parsed && typeof parsed === 'object') ? parsed : null);
    };

    const loop = () => {
      if (loops >= maxLoops) {
        return Promise.resolve(aggregated);
      }
      loops += 1;
      return fetchPage(cursor).then((parsed) => {
        if (!parsed) {
          return aggregated;
        }

        if (!aggregated.prefix && parsed.prefix) {
          aggregated.prefix = parsed.prefix;
        }
        if (!aggregated.folders.length && Array.isArray(parsed.folders)) {
          aggregated.folders = parsed.folders;
        }

        const totalFromPayload = getPayloadTotalCount(parsed);
        if (totalFromPayload > 0) {
          expectedTotal = totalFromPayload;
        }

        const pageItems = Array.isArray(parsed.items) ? parsed.items : [];
        pageItems.forEach((item) => {
          const id = String(item && item.id ? item.id : '');
          if (id && seenIds.has(id)) {
            return;
          }
          if (id) {
            seenIds.add(id);
          }
          aggregated.items.push(item);
        });

        const hasMore = payloadHasMore(parsed);
        const nextCursor = getPayloadCursor(parsed);
        const reachedExpected = expectedTotal > 0 && aggregated.items.length >= expectedTotal;
        const shortPage = pageItems.length < pageSize;
        if (reachedExpected || !hasMore || !nextCursor || seenCursors.has(nextCursor) || shortPage) {
          return aggregated;
        }

        seenCursors.add(nextCursor);
        cursor = nextCursor;
        return loop();
      });
    };

    fullGalleryHydrationInFlight = loop()
      .then((result) => {
        const normalized = (result && typeof result === 'object')
          ? result
          : { items: [], folders: [], prefix: '' };

        if (!Array.isArray(normalized.items)) {
          normalized.items = [];
        }
        if (!Array.isArray(normalized.folders)) {
          normalized.folders = [];
        }

        favoritesPayloadCache = normalized;
        refreshPayloadItemOrderIndex(normalized, bodyKey);
        favoritesPayloadVersion += 1;
        notifyFavoritesPayloadSubscribers();
        favoritesCurrentPage = 1;

        if (normalized.items.length) {
          renderTilesFromPayload(normalized);
        } else {
          renderNothingHereTiles();
        }
        return normalized;
      })
      .finally(() => {
        fullGalleryHydrationInFlight = null;
      });

    return fullGalleryHydrationInFlight;
  };

  const renderNothingHereTiles = (message = 'Nothing here!') => {
    const container = document.querySelector(TILE_CONTAINER_SELECTOR);
    if (!container) {
      return;
    }

    clearTilesEmptyPlaceholders();

    const mainArea = container.querySelector(`.${TILE_MAIN_AREA_CLASS}`);
    const columnsRow = mainArea
      ? mainArea.querySelector(`:scope > .${TILE_COLUMNS_ROW_CLASS}`)
      : null;

    if (columnsRow) {
      const columns = Array.from(columnsRow.querySelectorAll(`.${TILE_COLUMN_CLASS}`));
      columns.forEach((column) => {
        column.textContent = '';
      });

      const host = columns[0] || columnsRow;
      const empty = document.createElement('div');
      empty.className = 'fjBettermentsNothingHere';
      empty.textContent = String(message || 'Nothing here!');
      empty.style.padding = '14px';
      empty.style.color = '#a5a5a5';
      empty.style.font = "600 13px 'Segoe UI', sans-serif";
      host.appendChild(empty);
      return;
    }

    const fallback = document.createElement('div');
    fallback.className = 'fjBettermentsTilesEmpty fjBettermentsNothingHere';
    fallback.textContent = String(message || 'Nothing here!');
    fallback.style.padding = '14px';
    fallback.style.color = '#a5a5a5';
    fallback.style.font = "600 13px 'Segoe UI', sans-serif";
    container.appendChild(fallback);
  };

  const buildTileColumn = (widthPx) => {
    const column = document.createElement('div');
    column.className = TILE_COLUMN_CLASS;
    column.style.display = 'flex';
    column.style.flexDirection = 'column';
    column.style.gap = `${TILE_GAP_PX}px`;
    column.style.flex = '0 0 auto';
    if (Number.isFinite(widthPx) && widthPx > 0) {
      column.style.width = `${widthPx}px`;
    }
    return column;
  };

  const buildTileTopBar = (pagerState = null) => {
    const topBar = document.createElement('div');
    topBar.className = TILE_TOP_BAR_CLASS;
    topBar.style.height = `${TILE_TOP_BAR_HEIGHT_PX}px`;
    topBar.style.minHeight = `${TILE_TOP_BAR_HEIGHT_PX}px`;
    topBar.style.display = 'flex';
    topBar.style.alignItems = 'center';
    topBar.style.background = BAR_BG_COLOR;
    topBar.style.border = `1px solid ${BAR_BORDER_COLOR}`;
    topBar.style.borderRadius = '8px';
    topBar.style.boxSizing = 'border-box';
    topBar.style.width = '100%';
    topBar.style.justifyContent = 'space-between';

    const wrap = document.createElement('div');
    wrap.style.display = 'flex';
    wrap.style.flexDirection = 'column';
    wrap.style.justifyContent = 'center';
    wrap.style.alignItems = 'flex-start';
    wrap.style.flex = '1 1 auto';
    wrap.style.height = '100%';
    wrap.style.gap = '4px';
    wrap.style.padding = '4px 10px';
    wrap.style.color = '#d2d2d2';
    wrap.style.textAlign = 'left';

    const createRow = (titleText) => {
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.alignItems = 'center';
      row.style.gap = '6px';

      const title = document.createElement('span');
      title.textContent = titleText;
      title.style.display = 'inline-flex';
      title.style.alignItems = 'center';
      title.style.minWidth = '50px';
      title.style.font = "600 12px 'Segoe UI', sans-serif";
      title.style.color = '#d2d2d2';

      row.appendChild(title);
      return { row, title };
    };

    const createProxyButton = (label, getSourceElement, options = {}) => {
      const runAction = (source) => {
        if (typeof options.onClick === 'function') {
          options.onClick(source);
        } else {
          source.click();
        }
      };

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = label;
      btn.style.height = '20px';
      btn.style.padding = '0 8px';
      btn.style.border = '1px solid #2e2e2e';
      btn.style.borderRadius = '5px';
      btn.style.background = '#1b1b1b';
      btn.style.color = '#ddd';
      btn.style.font = "600 11px 'Segoe UI', sans-serif";
      btn.style.cursor = 'pointer';

      const syncState = () => {
        const source = getSourceElement();
        if (!source) {
          return;
        }
        if (typeof options.sync === 'function') {
          options.sync(btn, source);
          return;
        }
        const isActive = source.classList
          && source.classList.contains('ugTopBtnActive')
          && !(options.isFilter && activeFolderSelectionId);
        btn.style.background = isActive ? '#2a2a2a' : '#1b1b1b';
        btn.style.borderColor = isActive ? '#474747' : '#2e2e2e';
      };

      btn.addEventListener('click', () => {
        if (nsfwToggleInFlight) {
          return;
        }
        const source = getSourceElement();
        if (!source) {
          return;
        }

        const isAlreadyActive = !options.allowWhenActive
          && source.classList
          && source.classList.contains('ugTopBtnActive')
          && !(options.isFilter && activeFolderSelectionId);
        if (isAlreadyActive) {
          syncState();
          return;
        }

        const execute = () => {
          runAction(source);
          window.requestAnimationFrame(syncState);
        };

        if (typeof options.trigger === 'function') {
          options.trigger(execute);
          return;
        }

        execute();
      });

      syncState();
      return { btn, syncState };
    };

    const filterRow = createRow('Filters:');
    const sortRow = createRow('Sort:');

    const proxyControls = [];
    let switchTimestamps = [];
    let deferredSwitchActionTimer = null;
    let deferredSwitchAction = null;

    const triggerSwitchAction = (execute) => {
      if (nsfwToggleInFlight) {
        return;
      }
      const now = Date.now();
      switchTimestamps = switchTimestamps.filter((ts) => now - ts <= 2000);
      switchTimestamps.push(now);

      const shouldDebounce = switchTimestamps.length > 2;
      if (!shouldDebounce) {
        execute();
        return;
      }

      deferredSwitchAction = execute;
      if (deferredSwitchActionTimer) {
        clearTimeout(deferredSwitchActionTimer);
      }
      deferredSwitchActionTimer = window.setTimeout(() => {
        deferredSwitchActionTimer = null;
        const action = deferredSwitchAction;
        deferredSwitchAction = null;
        if (typeof action === 'function') {
          action();
        }
      }, 500);
    };

    const filterButtons = ['All', 'Content', 'Comments', 'Pics', 'Gifs', 'Movies'];

    const applyDetachedTopBarRequest = (actionType) => {
      if (detachedTopBarRequestInFlight) {
        return;
      }
      detachedTopBarRequestInFlight = true;
      window.setTimeout(() => {
        detachedTopBarRequestInFlight = false;
      }, 1400);

      const params = new URLSearchParams(
        favoritesRequestBodyCache || 'size=70&sort=date&folderId=0&search=&typeFilter=&nsfw=0&tagsOnly=0'
      );
      params.set('size', '70');
      params.set('search', params.get('search') || '');
      params.set('tagsOnly', params.get('tagsOnly') || '0');
      params.set('folderId', normalizeSelectionId(activeFolderSelectionId) || '0');

      const typeFilterMap = {
        All: '',
        Content: 'content',
        Comments: 'comment',
        Pics: 'picture',
        Gifs: 'gifs',
        Movies: 'video'
      };
      params.set('typeFilter', typeFilterMap[detachedTopBarFilter] || '');

      if (detachedTopBarSort === 'Thumbs') {
        params.set('sort', 'thumbs');
        params.set('subSort', '');
        params.set('needFastSortTutorialState', '0');
      } else {
        params.set('sort', 'date');
        params.delete('subSort');
        params.delete('needFastSortTutorialState');
      }

      params.set('nsfw', detachedTopBarNsfw ? '1' : '0');
      params.set('cursor', '');

      favoritesRequestBodyCache = params.toString();
      favoritesCurrentPage = 1;
      paginationOrderKey = '';
      paginationRowOrder = [];
      resetNativePreloadState();
      resetDetachedTileRows();

      const triggerFilter = () => {
        const selectorMap = {
          All: '.ugTypeTab[data-type=""]',
          Content: '.ugTypeTab[data-type="content"]',
          Comments: '.ugTypeTab[data-type="comment"]',
          Pics: '.ugTypeTab[data-type="picture"]',
          Gifs: '.ugTypeTab[data-type="gifs"]',
          Movies: '.ugTypeTab[data-type="video"]'
        };
        const node = document.querySelector(selectorMap[detachedTopBarFilter] || selectorMap.All);
        if (node instanceof HTMLElement) {
          node.click();
        }
      };

      const triggerSort = () => {
        const selector = detachedTopBarSort === 'Thumbs' ? '#ugSortThumbs' : '#ugSortDate';
        const node = document.querySelector(selector);
        if (node instanceof HTMLElement) {
          node.click();
        }
      };

      const triggerNsfw = () => {
        const checkbox = document.querySelector('#ugNsfwCheck');
        if (!(checkbox instanceof HTMLInputElement)) {
          return;
        }
        checkbox.checked = Boolean(detachedTopBarNsfw);
        checkbox.dispatchEvent(new Event('input', { bubbles: true }));
        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
      };

      withAllowedNativeGalleryLoad(() => {
        if (actionType === 'filter') {
          triggerFilter();
        } else if (actionType === 'sort') {
          triggerSort();
        } else if (actionType === 'nsfw') {
          triggerNsfw();
        }
      });

      // Let native handlers update the gallery rows; then relayout custom columns.
      window.setTimeout(() => {
        scheduleFavoritesTileLayout(true);
      }, 120);
    };

    const createDetachedButton = (label, options = {}) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = label;
      btn.style.height = '20px';
      btn.style.padding = '0 8px';
      btn.style.border = '1px solid #2e2e2e';
      btn.style.borderRadius = '5px';
      btn.style.background = '#1b1b1b';
      btn.style.color = '#ddd';
      btn.style.font = "600 11px 'Segoe UI', sans-serif";
      btn.style.cursor = 'pointer';

      const syncState = () => {
        const active = typeof options.isActive === 'function' ? Boolean(options.isActive()) : false;
        if (typeof options.sync === 'function') {
          options.sync(btn, active);
          return;
        }
        btn.style.background = active ? '#2a2a2a' : '#1b1b1b';
        btn.style.borderColor = active ? '#474747' : '#2e2e2e';
      };

      btn.addEventListener('click', () => {
        if (nsfwToggleInFlight) {
          return;
        }
        if (typeof options.onClick === 'function') {
          options.onClick();
        }
        window.requestAnimationFrame(() => {
          proxyControls.forEach((proxy) => {
            if (proxy && typeof proxy.syncState === 'function') {
              proxy.syncState();
            }
          });
        });
      });

      syncState();
      return { btn, syncState };
    };

    filterButtons.forEach((label) => {
      const proxy = createDetachedButton(label, {
        isActive: () => detachedTopBarFilter === label,
        onClick: () => {
          detachedTopBarFilter = label;
          setActiveFolderSelectionId('');
          setActiveFolderExpectedCount(0);
          applyDetachedTopBarRequest('filter');
        }
      });
      proxyControls.push(proxy);
      filterRow.row.appendChild(proxy.btn);
    });

    const dateProxy = createDetachedButton('Date', {
      isActive: () => detachedTopBarSort === 'Date',
      onClick: () => {
        detachedTopBarSort = 'Date';
        applyDetachedTopBarRequest('sort');
      }
    });
    const thumbsProxy = createDetachedButton('Thumbs', {
      isActive: () => detachedTopBarSort === 'Thumbs',
      onClick: () => {
        detachedTopBarSort = 'Thumbs';
        applyDetachedTopBarRequest('sort');
      }
    });
    proxyControls.push(dateProxy, thumbsProxy);
    sortRow.row.append(dateProxy.btn, thumbsProxy.btn);

    const nsfwProxy = createDetachedButton('NSFW', {
      isActive: () => detachedTopBarNsfw,
      onClick: () => {
        detachedTopBarNsfw = !detachedTopBarNsfw;
        applyDetachedTopBarRequest('nsfw');
      },
      sync: (btn, active) => {
        btn.style.background = active ? '#7e1c1c' : '#1b1b1b';
        btn.style.borderColor = active ? '#b03a3a' : '#2e2e2e';
        btn.style.color = active ? '#ffdede' : '#ddd';
      }
    });
    proxyControls.push(nsfwProxy);
    sortRow.row.appendChild(nsfwProxy.btn);

    // Sync states when the bar is interacted with.
    const syncAll = () => {
      proxyControls.forEach((proxy) => {
        if (proxy && typeof proxy.syncState === 'function') {
          proxy.syncState();
        }
      });
    };
    topBar.addEventListener('mouseenter', syncAll);
    topBar.addEventListener('focusin', syncAll);

    const folderSelectionSubscriber = () => syncAll();
    folderSelectionSubscribers.add(folderSelectionSubscriber);
    topBar.addEventListener('DOMNodeRemoved', () => {
      folderSelectionSubscribers.delete(folderSelectionSubscriber);
    }, { once: true });

    const divider = document.createElement('div');
    divider.style.width = '100%';
    divider.style.height = '1px';
    divider.style.background = '#2a2a2a';

    const pagerPane = document.createElement('div');
    pagerPane.style.position = 'relative';
    pagerPane.style.display = 'flex';
    pagerPane.style.alignItems = 'center';
    pagerPane.style.justifyContent = 'center';
    pagerPane.style.height = '100%';
    pagerPane.style.padding = '0 10px 0 0';
    pagerPane.style.flex = '0 0 auto';

    const rowsWrap = document.createElement('div');
    rowsWrap.style.display = 'inline-flex';
    rowsWrap.style.alignItems = 'center';
    rowsWrap.style.justifyContent = 'center';
    rowsWrap.style.gap = '6px';
    rowsWrap.style.margin = '0 10px 0 0';

    const rowsLabel = document.createElement('span');
    rowsLabel.textContent = 'Rows:';
    rowsLabel.style.color = '#d7d7d7';
    rowsLabel.style.font = "600 11px 'Segoe UI', sans-serif";

    const rowsInput = document.createElement('input');
    rowsInput.type = 'text';
    rowsInput.inputMode = 'numeric';
    rowsInput.maxLength = 2;
    rowsInput.value = String(getTileRowsPerPage());
    rowsInput.style.width = '34px';
    rowsInput.style.height = '22px';
    rowsInput.style.border = '1px solid #2e2e2e';
    rowsInput.style.borderRadius = '4px';
    rowsInput.style.background = '#121212';
    rowsInput.style.color = '#e7e7e7';
    rowsInput.style.textAlign = 'center';
    rowsInput.style.padding = '0';
    rowsInput.style.font = "700 11px 'Segoe UI', sans-serif";

    const commitRowsInput = () => {
      if (nsfwToggleInFlight) {
        rowsInput.value = String(getTileRowsPerPage());
        return;
      }
      const raw = String(rowsInput.value || '').trim();
      const parsed = Number.parseInt(raw, 10);
      if (!Number.isFinite(parsed)) {
        rowsInput.value = String(getTileRowsPerPage());
        return;
      }
      const clamped = Math.min(TILE_ROWS_PER_PAGE_MAX, Math.max(TILE_ROWS_PER_PAGE_MIN, parsed));
      rowsInput.value = String(clamped);
      const changed = setTileRowsPerPage(clamped, true);
      if (changed) {
        favoritesCurrentPage = 1;
        scheduleFavoritesTileLayout(true);
      }
    };

    rowsInput.addEventListener('keydown', (event) => {
      event.stopPropagation();
      if (event.key === 'Enter') {
        event.preventDefault();
        commitRowsInput();
        rowsInput.blur();
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        rowsInput.value = String(getTileRowsPerPage());
        rowsInput.blur();
      }
    });
    rowsInput.addEventListener('blur', () => {
      commitRowsInput();
    });
    rowsInput.addEventListener('click', (event) => event.stopPropagation());

    rowsWrap.append(rowsLabel, rowsInput);

    const pagerWrap = document.createElement('div');
    pagerWrap.style.display = 'inline-flex';
    pagerWrap.style.alignItems = 'center';
    pagerWrap.style.justifyContent = 'center';
    pagerWrap.style.height = '100%';
    pagerWrap.style.gap = '4px';

    const pagerLoadingHint = document.createElement('div');
    pagerLoadingHint.className = 'fjBettermentsPagerLoadingHint';
    const pagerLoadingSpinner = document.createElement('span');
    pagerLoadingSpinner.className = 'fjBettermentsPagerLoadingSpinner';
    const pagerLoadingText = document.createElement('span');
    pagerLoadingText.textContent = 'Loading...page may lag!';
    pagerLoadingHint.append(pagerLoadingSpinner, pagerLoadingText);

    const syncPagerLoadingHint = (isLoading) => {
      pagerLoadingHint.classList.toggle('is-visible', Boolean(isLoading));
    };
    syncPagerLoadingHint(nativePreloadActive);
    nativePreloadStatusSubscribers.add(syncPagerLoadingHint);
    topBar.addEventListener('DOMNodeRemoved', () => {
      nativePreloadStatusSubscribers.delete(syncPagerLoadingHint);
    }, { once: true });
    pagerPane.append(rowsWrap, pagerWrap, pagerLoadingHint);

    const createPagerBox = (label, options = {}) => {
      const box = document.createElement('button');
      box.type = 'button';
      box.textContent = label;
      box.style.width = '24px';
      box.style.height = '24px';
      box.style.border = options.arrow ? '1px solid transparent' : '1px solid #2e2e2e';
      box.style.borderRadius = options.arrow ? '0' : '4px';
      box.style.background = options.arrow ? 'transparent' : (options.active ? '#390f5c' : '#1b1b1b');
      box.style.color = '#e7e7e7';
      box.style.font = options.arrow
        ? "700 24px 'Segoe UI', sans-serif"
        : "700 12px 'Segoe UI', sans-serif";
      box.style.lineHeight = '1';
      box.style.transform = options.arrow ? 'translateY(-2px)' : 'none';
      box.style.cursor = options.disabled ? 'default' : 'pointer';
      box.style.display = 'inline-flex';
      box.style.alignItems = 'center';
      box.style.justifyContent = 'center';
      if (options.disabled) {
        box.style.opacity = '0.45';
      }
      if (typeof options.onClick === 'function' && !options.disabled) {
        box.addEventListener('click', options.onClick);
      }
      return box;
    };

    const totalPages = Math.max(1, Number(pagerState && pagerState.totalPages) || 1);
    let currentPage = Math.min(
      totalPages,
      Math.max(1, Number(pagerState && pagerState.currentPage) || 1)
    );
    const requestPageChange = (nextPage) => {
      const clamped = Math.min(totalPages, Math.max(1, Number(nextPage) || 1));
      if (clamped === currentPage) {
        return;
      }
      currentPage = clamped;
      if (pagerState && typeof pagerState.onPageChange === 'function') {
        pagerState.onPageChange(clamped);
      }
    };

    const startInlinePageEdit = (box) => {
      if (!box || box.dataset.pagerEditing === '1') {
        return;
      }
      box.dataset.pagerEditing = '1';
      const initialValue = String(currentPage);
      box.textContent = '';

      const input = document.createElement('input');
      input.type = 'text';
      input.inputMode = 'numeric';
      input.maxLength = String(totalPages).length;
      input.value = initialValue;
      input.style.width = '100%';
      input.style.height = '100%';
      input.style.border = 'none';
      input.style.outline = 'none';
      input.style.padding = '0';
      input.style.margin = '0';
      input.style.background = '#390f5c';
      input.style.color = '#e7e7e7';
      input.style.textAlign = 'center';
      input.style.font = "700 12px 'Segoe UI', sans-serif";

      const finish = (commit) => {
        if (commit) {
          const parsed = Number.parseInt(String(input.value || '').trim(), 10);
          if (Number.isFinite(parsed)) {
            const clamped = Math.min(totalPages, Math.max(1, parsed));
            requestPageChange(clamped);
          }
        }
        renderPlaceholderPager();
      };

      input.addEventListener('keydown', (event) => {
        event.stopPropagation();
        if (event.key === 'Enter') {
          event.preventDefault();
          finish(true);
          return;
        }
        if (event.key === 'Escape') {
          event.preventDefault();
          finish(false);
        }
      });
      input.addEventListener('blur', () => finish(false), { once: true });
      input.addEventListener('click', (event) => event.stopPropagation());

      box.appendChild(input);
      input.focus();
      input.select();
    };

    const renderPlaceholderPager = () => {
      pagerWrap.textContent = '';

      const canGoPrev = currentPage > 1;
      const canGoNext = currentPage < totalPages;
      const startPage = Math.min(
        Math.max(1, currentPage - 2),
        Math.max(1, totalPages - 4)
      );
      const pageNums = Array.from({ length: 5 }, (_, i) => startPage + i).filter((n) => n <= totalPages);

      pagerWrap.appendChild(createPagerBox('←', {
        arrow: true,
        disabled: !canGoPrev,
        onClick: () => {
          requestPageChange(currentPage - 1);
          renderPlaceholderPager();
        }
      }));

      pageNums.forEach((pageNum) => {
        let numberBox = null;
        numberBox = createPagerBox(String(pageNum), {
          active: pageNum === currentPage,
          onClick: () => {
            if (pageNum === currentPage) {
              startInlinePageEdit(numberBox);
              return;
            }
            requestPageChange(pageNum);
            renderPlaceholderPager();
          }
        });
        pagerWrap.appendChild(numberBox);
      });

      pagerWrap.appendChild(createPagerBox('→', {
        arrow: true,
        disabled: !canGoNext,
        onClick: () => {
          requestPageChange(currentPage + 1);
          renderPlaceholderPager();
        }
      }));
    };

    renderPlaceholderPager();

    wrap.append(filterRow.row, divider, sortRow.row);
    topBar.appendChild(wrap);
    topBar.appendChild(pagerPane);
    return topBar;
  };

  const buildSideColumn = (widthPx) => {
    folderDebug('buildSideColumn start', { widthPx });
    const column = document.createElement('div');
    column.className = TILE_SIDE_COLUMN_CLASS;
    column.style.display = 'flex';
    column.style.flexDirection = 'column';
    column.style.flex = '0 0 auto';
    column.style.background = BAR_BG_COLOR;
    column.style.border = `1px solid ${BAR_BORDER_COLOR}`;
    column.style.borderRadius = '8px';
    column.style.boxSizing = 'border-box';
    if (Number.isFinite(widthPx) && widthPx > 0) {
      column.style.width = `${widthPx}px`;
      column.style.minWidth = `${widthPx}px`;
    }

    const runSidebarSearch = (value) => {
      const sourceInput = document.querySelector('#ugSearchInput');
      const sourceGo = document.querySelector('#ugSearchGo');
      if (!(sourceInput instanceof HTMLInputElement) || !(sourceGo instanceof HTMLElement)) {
        return;
      }
      sourceInput.value = value;
      sourceInput.dispatchEvent(new Event('input', { bubbles: true }));
      sourceInput.dispatchEvent(new Event('change', { bubbles: true }));
      sourceGo.click();
    };

    const sidebarSearchWrap = document.createElement('div');
    sidebarSearchWrap.style.display = 'flex';
    sidebarSearchWrap.style.gap = '6px';
    sidebarSearchWrap.style.padding = '10px 12px 6px 12px';

    const sidebarSearchInput = document.createElement('input');
    sidebarSearchInput.type = 'text';
    sidebarSearchInput.maxLength = 100;
    sidebarSearchInput.placeholder = 'Search favorites';
    sidebarSearchInput.style.flex = '1 1 auto';
    sidebarSearchInput.style.minWidth = '0';
    sidebarSearchInput.style.height = '28px';
    sidebarSearchInput.style.padding = '0 8px';
    sidebarSearchInput.style.border = '1px solid #2e2e2e';
    sidebarSearchInput.style.background = '#101010';
    sidebarSearchInput.style.color = '#ddd';
    sidebarSearchInput.style.borderRadius = '6px';
    sidebarSearchInput.style.font = "400 12px 'Segoe UI', sans-serif";

    const sidebarSearchButton = document.createElement('button');
    sidebarSearchButton.type = 'button';
    sidebarSearchButton.textContent = 'Go';
    sidebarSearchButton.style.height = '28px';
    sidebarSearchButton.style.padding = '0 10px';
    sidebarSearchButton.style.border = '1px solid #2e2e2e';
    sidebarSearchButton.style.background = '#1b1b1b';
    sidebarSearchButton.style.color = '#ddd';
    sidebarSearchButton.style.borderRadius = '6px';
    sidebarSearchButton.style.cursor = 'pointer';
    sidebarSearchButton.style.font = "600 12px 'Segoe UI', sans-serif";

    sidebarSearchButton.addEventListener('click', () => {
      runSidebarSearch(sidebarSearchInput.value || '');
    });
    sidebarSearchInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        runSidebarSearch(sidebarSearchInput.value || '');
      }
    });

    sidebarSearchWrap.append(sidebarSearchInput, sidebarSearchButton);
    column.appendChild(sidebarSearchWrap);

    const sideTitle = document.createElement('div');
    sideTitle.textContent = 'Folders';
    sideTitle.style.padding = '6px 12px 10px 12px';
    sideTitle.style.color = '#e0e0e0';
    sideTitle.style.font = "400 18px 'Segoe UI', sans-serif";
    sideTitle.style.lineHeight = '1';
    sideTitle.style.textAlign = 'left';
    column.appendChild(sideTitle);

    const refreshRow = document.createElement('div');
    refreshRow.style.display = 'flex';
    refreshRow.style.padding = '0 12px 8px 12px';

    const uncategorizedDropButton = document.createElement('button');
    uncategorizedDropButton.type = 'button';
    uncategorizedDropButton.className = 'fjBettermentsUncategorizedDrop';
    uncategorizedDropButton.textContent = 'Uncategorized';
    uncategorizedDropButton.style.width = '100%';
    uncategorizedDropButton.style.height = '26px';
    uncategorizedDropButton.style.border = '1px solid #2e2e2e';
    uncategorizedDropButton.style.background = '#1b1b1b';
    uncategorizedDropButton.style.color = '#ddd';
    uncategorizedDropButton.style.borderRadius = '6px';
    uncategorizedDropButton.style.cursor = 'pointer';
    uncategorizedDropButton.style.font = "600 11px 'Segoe UI', sans-serif";
    uncategorizedDropButton.style.transition = 'background .12s ease,border-color .12s ease,color .12s ease,box-shadow .12s ease';

    const setUncategorizedDropHover = (isActive) => {
      const active = Boolean(isActive);
      uncategorizedDropButton.style.background = active ? '#2a2a2a' : '#1b1b1b';
      uncategorizedDropButton.style.borderColor = active ? '#73aefb' : '#2e2e2e';
      uncategorizedDropButton.style.color = active ? '#e8f3ff' : '#ddd';
      uncategorizedDropButton.style.boxShadow = active ? '0 0 0 1px rgba(115,174,251,.26) inset' : 'none';
    };

    const getUnassignedCount = () => {
      const payload = favoritesPayloadCache || {};
      const topLevel = Number.parseInt(String(payload && payload.unassigned != null ? payload.unassigned : ''), 10);
      if (Number.isFinite(topLevel) && topLevel >= 0) {
        return topLevel;
      }
      const sfw = payload && payload.counts && payload.counts.SFW
        ? Number.parseInt(String(payload.counts.SFW.UNASSIGNED), 10)
        : NaN;
      if (Number.isFinite(sfw) && sfw >= 0) {
        return sfw;
      }
      return 0;
    };

    const buildUncategorizedEntry = () => ({
      id: '-1',
      name: 'Uncategorized',
      count: toCountText(getUnassignedCount()),
      parentId: ''
    });

    const syncUncategorizedButtonState = () => {
      const active = normalizeId(activeFolderSelectionId) === '-1';
      uncategorizedDropButton.style.background = active ? '#2a2a2a' : '#1b1b1b';
      uncategorizedDropButton.style.borderColor = active ? '#73aefb' : '#2e2e2e';
      uncategorizedDropButton.style.color = active ? '#e8f3ff' : '#ddd';
      uncategorizedDropButton.style.boxShadow = active ? '0 0 0 1px rgba(115,174,251,.26) inset' : 'none';
      const count = getUnassignedCount();
      uncategorizedDropButton.textContent = `Uncategorized (${count})`;
    };

    uncategorizedDropButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      const entry = buildUncategorizedEntry();
      const id = normalizeId(entry.id);
      if (id === normalizeId(activeFolderSelectionId)) {
        syncUncategorizedButtonState();
        return;
      }
      setActiveFolderSelectionId(id);
      setActiveFolderExpectedCount(entry && entry.count);
      renderFolders();
      loadFolderTiles(entry);
    });

    uncategorizedDropButton.addEventListener('mouseenter', () => setUncategorizedDropHover(true));
    uncategorizedDropButton.addEventListener('mouseleave', () => setUncategorizedDropHover(false));

    refreshRow.appendChild(uncategorizedDropButton);
    column.appendChild(refreshRow);

    const listWrap = document.createElement('div');
    listWrap.style.display = 'flex';
    listWrap.style.flexDirection = 'column';
    listWrap.style.gap = '5px';
    listWrap.style.padding = '0 10px 10px 10px';
    listWrap.style.boxSizing = 'border-box';
    column.appendChild(listWrap);

    const openParentIds = new Set(openParentFolderIdsState);
    let selectedFolderId = '';
    let localFolderSelectionId = '';
    let folderLoadToken = 0;
    let nextLocalFolderId = 1;
    let localFolderDraftId = '';
    let pendingDraftFocusId = '';
    const localFolders = [];
    let dragState = null;
    let dragPlaceholder = null;
    let dragHighlightRow = null;
    let dragHighlightIconPrevSrc = '';
    let dragGhost = null;
    let suppressNextRowClick = false;
    let folderDragMutationInFlight = false;
    let tileDragContext = {
      active: false,
      ids: []
    };
    let tileDropHighlightRow = null;
    let tileDropHighlightIconPrevSrc = '';
    const normalizeId = (value) => String(value == null ? '' : value);
    const toCountText = (value) => String(value == null ? '0' : value);

    const getActiveDraggedTileIds = (event) => {
      const ids = [];
      const selected = Array.from(document.querySelectorAll('.favRow.rowCon input[name^="favc-"]:checked'));
      selected.forEach((input) => {
        const value = String(input && input.value || '').trim();
        if (value) {
          ids.push(value);
        }
      });

      const eventTarget = event && event.target instanceof Element
        ? event.target
        : null;
      const tileRow = eventTarget ? eventTarget.closest('.favRow.rowCon') : null;
      const tileId = tileRow && tileRow.dataset ? String(tileRow.dataset.id || '').trim() : '';
      if (tileId) {
        ids.push(tileId);
      }

      if (!ids.length) {
        const draggedRows = Array.from(document.querySelectorAll('.favRow.rowCon'))
          .filter((node) => {
            const opacity = Number.parseFloat(String(node.style && node.style.opacity || ''));
            return Number.isFinite(opacity) && opacity > 0 && opacity <= 0.72;
          });
        draggedRows.forEach((node) => {
          const value = String(node && node.dataset ? node.dataset.id || '' : '').trim();
          if (value) {
            ids.push(value);
          }
        });
      }

      return ids;
    };

    const setTileDropHighlight = (row) => {
      if (tileDropHighlightRow && tileDropHighlightRow !== row) {
        const prevIcon = tileDropHighlightRow.__fjIcon;
        if (prevIcon instanceof HTMLImageElement && tileDropHighlightIconPrevSrc) {
          prevIcon.src = tileDropHighlightIconPrevSrc;
        }
        tileDropHighlightIconPrevSrc = '';
        tileDropHighlightRow.style.outline = '';
        tileDropHighlightRow.style.outlineOffset = '';
      }
      if (!row) {
        tileDropHighlightRow = null;
        return;
      }
      tileDropHighlightRow = row;
      row.style.outline = '2px solid rgba(114, 186, 255, .78)';
      row.style.outlineOffset = '-2px';
      const icon = row.__fjIcon;
      if (icon instanceof HTMLImageElement) {
        if (!tileDropHighlightIconPrevSrc) {
          tileDropHighlightIconPrevSrc = icon.src;
        }
        const useDarkBackground = String(row.dataset.folderDarkBg || '0') === '1';
        icon.src = getFolderIconSource(true, useDarkBackground);
      }
    };

    const clearTileDropHighlight = () => {
      if (tileDropHighlightRow) {
        const icon = tileDropHighlightRow.__fjIcon;
        if (icon instanceof HTMLImageElement && tileDropHighlightIconPrevSrc) {
          icon.src = tileDropHighlightIconPrevSrc;
        }
        tileDropHighlightIconPrevSrc = '';
        tileDropHighlightRow.style.outline = '';
        tileDropHighlightRow.style.outlineOffset = '';
      }
      tileDropHighlightRow = null;
    };

    const installTileDragBridge = () => {
      if (window.fjBettermentsTileFolderDropBridgeInstalled === '1') {
        return;
      }
      window.fjBettermentsTileFolderDropBridgeInstalled = '1';

      const TILE_DRAG_THRESHOLD_SQ = 16;
      const TILE_STACK_OFFSET_PX = 10;
      let customTileDragState = null;
      let customTileDragGhost = null;
      let suppressTileClickUntil = 0;

      const getTileRowFromEvent = (event) => {
        const target = event.target instanceof Element ? event.target : null;
        return target ? target.closest('.favRow.rowCon') : null;
      };

      const restoreDraggedTileRows = () => {
        if (!customTileDragState) {
          return;
        }
        const snapshots = Array.isArray(customTileDragState.rowStyleSnapshots)
          ? customTileDragState.rowStyleSnapshots
          : [];
        snapshots.forEach((snapshot) => {
          if (!snapshot || !(snapshot.row instanceof HTMLElement)) {
            return;
          }
          snapshot.row.style.opacity = snapshot.opacity;
          snapshot.row.style.transition = snapshot.transition;
          snapshot.row.style.filter = snapshot.filter;
        });
      };

      const clearCustomTileGhost = () => {
        if (customTileDragGhost && customTileDragGhost.parentNode) {
          customTileDragGhost.parentNode.removeChild(customTileDragGhost);
        }
        customTileDragGhost = null;
      };

      const stopCustomTileDrag = (markSuppressClick) => {
        if (!customTileDragState) {
          return;
        }
        window.removeEventListener('pointermove', onCustomTilePointerMove, true);
        window.removeEventListener('pointerup', onCustomTilePointerUp, true);
        window.removeEventListener('pointercancel', onCustomTilePointerUp, true);
        clearCustomTileGhost();
        restoreDraggedTileRows();
        if (document.body && document.body.style) {
          document.body.style.userSelect = customTileDragState.prevBodyUserSelect;
          document.body.style.cursor = customTileDragState.prevBodyCursor;
        }
        if (typeof setUncategorizedDropHover === 'function') {
          setUncategorizedDropHover(false);
        }
        tileDragContext = { active: false, ids: [] };
        clearTileDropHighlight();
        if (markSuppressClick && customTileDragState.started) {
          suppressTileClickUntil = Date.now() + 220;
        }
        customTileDragState = null;
      };

      const positionCustomTileGhost = (clientX, clientY) => {
        if (!customTileDragState || !customTileDragGhost) {
          return;
        }
        customTileDragGhost.style.left = `${Math.round(clientX - customTileDragState.offsetX)}px`;
        customTileDragGhost.style.top = `${Math.round(clientY - customTileDragState.offsetY)}px`;
      };

      const ensureCustomTileGhost = () => {
        if (!customTileDragState || customTileDragGhost || !(customTileDragState.row instanceof HTMLElement)) {
          return;
        }
        const row = customTileDragState.row;
        const rect = row.getBoundingClientRect();
        const dragRows = Array.isArray(customTileDragState.dragRows) && customTileDragState.dragRows.length
          ? customTileDragState.dragRows
          : [row];
        const stackCount = dragRows.length;

        const ghost = document.createElement('div');
        ghost.style.position = 'fixed';
        ghost.style.left = `${Math.round(rect.left)}px`;
        ghost.style.top = `${Math.round(rect.top)}px`;
        ghost.style.width = `${Math.max(1, Math.round(rect.width + ((stackCount - 1) * TILE_STACK_OFFSET_PX)))}px`;
        ghost.style.height = `${Math.max(1, Math.round(rect.height + ((stackCount - 1) * TILE_STACK_OFFSET_PX)))}px`;
        ghost.style.margin = '0';
        ghost.style.zIndex = '10050';
        ghost.style.pointerEvents = 'none';
        ghost.style.boxSizing = 'border-box';
        ghost.style.transform = 'translateZ(0)';

        dragRows.forEach((stackRow, index) => {
          if (!(stackRow instanceof HTMLElement)) {
            return;
          }
          const layer = stackRow.cloneNode(true);
          layer.style.position = 'absolute';
          layer.style.left = `${index * TILE_STACK_OFFSET_PX}px`;
          layer.style.top = `${index * TILE_STACK_OFFSET_PX}px`;
          layer.style.width = `${Math.max(1, Math.round(rect.width))}px`;
          layer.style.height = `${Math.max(1, Math.round(rect.height))}px`;
          layer.style.margin = '0';
          layer.style.pointerEvents = 'none';
          layer.style.boxSizing = 'border-box';
          layer.style.opacity = index === 0 ? '0.48' : '0.72';
          layer.style.boxShadow = '0 14px 28px rgba(0,0,0,.35)';
          ghost.appendChild(layer);
        });

        (document.body || document.documentElement).appendChild(ghost);
        customTileDragGhost = ghost;

        // Leave transparent placeholders behind where dragged tiles started.
        dragRows.forEach((dragRow) => {
          if (!(dragRow instanceof HTMLElement)) {
            return;
          }
          dragRow.style.opacity = '0.18';
          dragRow.style.transition = 'opacity .08s linear';
          dragRow.style.filter = 'saturate(0.8)';
        });
      };

      const getSelectedTileRowsForDrag = (fallbackRow) => {
        const selectedInputs = Array.from(document.querySelectorAll('.favRow.rowCon input[name^="favc-"]:checked'));
        const selectedIds = selectedInputs
          .map((input) => String(input && input.value || '').trim())
          .filter(Boolean);

        const byId = new Map();
        Array.from(document.querySelectorAll('.favRow.rowCon')).forEach((node) => {
          const id = String(node && node.dataset ? node.dataset.id || '' : '').trim();
          if (id && !byId.has(id)) {
            byId.set(id, node);
          }
        });

        const rows = [];
        const seen = new Set();
        const pushRow = (node) => {
          if (!(node instanceof HTMLElement)) {
            return;
          }
          if (seen.has(node)) {
            return;
          }
          seen.add(node);
          rows.push(node);
        };

        if (selectedIds.length > 1) {
          selectedIds.forEach((id) => pushRow(byId.get(id)));
          return rows.length ? rows : [fallbackRow];
        }

        pushRow(fallbackRow);
        return rows;
      };

      const onCustomTilePointerMove = (event) => {
        if (!customTileDragState || event.pointerId !== customTileDragState.pointerId) {
          return;
        }

        // Prevent accidental text/content selection while dragging.
        event.preventDefault();

        const dx = event.clientX - customTileDragState.startX;
        const dy = event.clientY - customTileDragState.startY;
        const distanceSq = (dx * dx) + (dy * dy);
        if (!customTileDragState.started && distanceSq < TILE_DRAG_THRESHOLD_SQ) {
          return;
        }

        if (!customTileDragState.started) {
          customTileDragState.started = true;
          ensureCustomTileGhost();
          tileDragContext = {
            active: true,
            ids: Array.isArray(customTileDragState.dragIds) && customTileDragState.dragIds.length
              ? customTileDragState.dragIds.slice()
              : getActiveDraggedTileIds({ target: customTileDragState.row })
          };
        }

        positionCustomTileGhost(event.clientX, event.clientY);

        const hoverTarget = document.elementFromPoint(event.clientX, event.clientY);
        const hoverUncategorized = hoverTarget instanceof Element
          ? hoverTarget.closest('.fjBettermentsUncategorizedDrop')
          : null;
        if (hoverUncategorized instanceof HTMLElement) {
          customTileDragState.hoverUncategorized = true;
          customTileDragState.hoverFolderId = '';
          setUncategorizedDropHover(true);
          clearTileDropHighlight();
          return;
        }
        customTileDragState.hoverUncategorized = false;
        setUncategorizedDropHover(false);

        const hoverRow = hoverTarget instanceof Element
          ? hoverTarget.closest('.fjBettermentsFolderDataRow')
          : null;
        if (hoverRow instanceof HTMLElement) {
          customTileDragState.hoverFolderId = normalizeId(hoverRow.dataset && hoverRow.dataset.folderId);
          setTileDropHighlight(hoverRow);
        } else {
          customTileDragState.hoverFolderId = '';
          clearTileDropHighlight();
        }
      };

      const dropTileIdsToFolder = (folderId, ids) => {
        const normalizedFolderId = normalizeId(folderId);
        const normalizedIds = Array.from(new Set((ids || [])
          .map((id) => normalizeId(id))
          .filter(Boolean)));
        if (!normalizedFolderId || !normalizedIds.length || folderDragMutationInFlight) {
          return;
        }

        const body = new URLSearchParams();
        body.set('folderId', normalizedFolderId);
        normalizedIds.forEach((id) => body.append('ids[]', id));
        body.set('isGlobal', '0');
        body.set('nsfw', '0');

        folderDragMutationInFlight = true;
        postFavoritesForm('/favorites/addIdsToFavFolder', body)
          .then((parsed) => {
            if (!parsed || parsed.success !== true) {
              throw new Error('addIdsToFavFolder failed');
            }
            return refreshFoldersFromMutation(parsed);
          })
          .catch((error) => {
            folderRuntimeDebug('custom tile drop to folder failed', {
              error: String(error),
              folderId: normalizedFolderId,
              ids: normalizedIds
            });
          })
          .finally(() => {
            folderDragMutationInFlight = false;
          });
      };

      const dropTileIdsToUncategorized = (ids) => {
        const currentFolderId = normalizeId(activeFolderSelectionId);
        const normalizedIds = Array.from(new Set((ids || [])
          .map((id) => normalizeId(id))
          .filter(Boolean)));
        if (!currentFolderId || currentFolderId === '-1' || !normalizedIds.length || folderDragMutationInFlight) {
          return;
        }

        const body = new URLSearchParams();
        normalizedIds.forEach((id) => body.append('favIds[]', id));
        body.set('folderId', currentFolderId);
        body.set('nsfw', '0');

        folderDragMutationInFlight = true;
        postFavoritesForm('/favorites/removeSelectedFav', body)
          .then((parsed) => {
            if (!parsed || parsed.success !== true) {
              throw new Error('removeSelectedFav failed');
            }
            return refreshFoldersFromMutation(parsed)
              .then(() => {
                // After removing from folder, reload currently viewed folder tiles
                // so the removed items disappear immediately from the tile grid.
                if (normalizeId(activeFolderSelectionId) !== currentFolderId) {
                  return;
                }
                const raw = getRawFolderById(currentFolderId);
                if (!raw) {
                  scheduleFavoritesTileLayout(true);
                  return;
                }
                setActiveFolderExpectedCount(raw && raw.count);
                return loadFolderTiles({
                  id: raw.id,
                  name: raw.name,
                  count: raw.count,
                  parentId: normalizeParentId(raw.parent_id)
                });
              });
          })
          .catch((error) => {
            folderRuntimeDebug('custom tile drop to uncategorized failed', {
              error: String(error),
              folderId: currentFolderId,
              ids: normalizedIds
            });
          })
          .finally(() => {
            folderDragMutationInFlight = false;
          });
      };

      const onCustomTilePointerUp = (event) => {
        if (!customTileDragState || event.pointerId !== customTileDragState.pointerId) {
          return;
        }
        const started = customTileDragState.started;
        const targetFolderId = normalizeId(customTileDragState.hoverFolderId);
        const targetUncategorized = Boolean(customTileDragState.hoverUncategorized);
        const idsToDrop = Array.isArray(customTileDragState.dragIds)
          ? customTileDragState.dragIds.slice()
          : [];
        if (customTileDragState.started) {
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();
        }
        stopCustomTileDrag(true);
        if (started && targetUncategorized && idsToDrop.length) {
          dropTileIdsToUncategorized(idsToDrop);
          return;
        }
        if (started && targetFolderId && idsToDrop.length) {
          dropTileIdsToFolder(targetFolderId, idsToDrop);
        }
      };

      const canStartCustomTileDrag = (event, tileRow) => {
        if (!(event.target instanceof Element) || !(tileRow instanceof HTMLElement)) {
          return false;
        }
        if (event.button !== 0) {
          return false;
        }
        if (event.target.closest('input,button,select,textarea,label,.favDelete,.favViewBtn,.ugOverflowBtn,.ugPinBtn,.sel')) {
          return false;
        }
        return true;
      };

      const startCustomTileDragCandidate = (event, tileRow) => {
        stopCustomTileDrag(false);
        const rect = tileRow.getBoundingClientRect();
        const dragRows = getSelectedTileRowsForDrag(tileRow);
        const dragIds = dragRows
          .map((row) => String(row && row.dataset ? row.dataset.id || '' : '').trim())
          .filter(Boolean);
        customTileDragState = {
          row: tileRow,
          dragRows,
          dragIds,
          hoverFolderId: '',
          hoverUncategorized: false,
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          offsetX: event.clientX - rect.left,
          offsetY: event.clientY - rect.top,
          started: false,
          rowStyleSnapshots: dragRows.map((row) => ({
            row,
            opacity: row.style.opacity || '',
            transition: row.style.transition || '',
            filter: row.style.filter || ''
          })),
          prevBodyUserSelect: document.body && document.body.style ? document.body.style.userSelect : '',
          prevBodyCursor: document.body && document.body.style ? document.body.style.cursor : ''
        };
        if (document.body && document.body.style) {
          document.body.style.userSelect = 'none';
          document.body.style.cursor = 'grabbing';
        }
        window.addEventListener('pointermove', onCustomTilePointerMove, true);
        window.addEventListener('pointerup', onCustomTilePointerUp, true);
        window.addEventListener('pointercancel', onCustomTilePointerUp, true);
      };

      const forceTileNotDraggable = (row) => {
        if (!(row instanceof Element)) {
          return;
        }
        row.draggable = false;
        row.setAttribute('draggable', 'false');
        row.style.webkitUserDrag = 'none';
        const candidates = row.querySelectorAll('a,img,[draggable="true"]');
        candidates.forEach((node) => {
          if (!(node instanceof Element)) {
            return;
          }
          node.draggable = false;
          node.setAttribute('draggable', 'false');
          node.style.webkitUserDrag = 'none';
        });
      };

      // Hard-disable site-native tile drag behavior; tile drag attempts should do nothing.
      const onNativeTileDragStartBlock = (event) => {
        const tileRow = getTileRowFromEvent(event);
        if (!tileRow) {
          return;
        }
        forceTileNotDraggable(tileRow);
        tileDragContext = { active: false, ids: [] };
        clearTileDropHighlight();
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
      };

      const onNativeTilePointerDownBlock = (event) => {
        const tileRow = getTileRowFromEvent(event);
        if (!tileRow) {
          return;
        }
        forceTileNotDraggable(tileRow);
        tileDragContext = { active: false, ids: [] };
        clearTileDropHighlight();
        if (event.type === 'pointerdown' && canStartCustomTileDrag(event, tileRow)) {
          startCustomTileDragCandidate(event, tileRow);
        }
        // Prevent native handlers from arming sortable/drag state.
        event.stopPropagation();
        event.stopImmediatePropagation();
      };

      const onNativeTileDragLifecycleBlock = (event) => {
        const tileRow = getTileRowFromEvent(event);
        const shouldBlock = !!tileRow || tileDragContext.active;
        if (!shouldBlock) {
          return;
        }
        tileDragContext = { active: false, ids: [] };
        clearTileDropHighlight();
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
      };

      const onDragEnd = () => {
        tileDragContext = { active: false, ids: [] };
        clearTileDropHighlight();
      };

      const onTileClickSuppress = (event) => {
        if (Date.now() > suppressTileClickUntil) {
          return;
        }
        const tileRow = getTileRowFromEvent(event);
        if (!tileRow) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
      };

      window.addEventListener('pointerdown', onNativeTilePointerDownBlock, true);
      window.addEventListener('mousedown', onNativeTilePointerDownBlock, true);
      window.addEventListener('dragstart', onNativeTileDragStartBlock, true);
      window.addEventListener('dragenter', onNativeTileDragLifecycleBlock, true);
      window.addEventListener('dragover', onNativeTileDragLifecycleBlock, true);
      window.addEventListener('dragleave', onNativeTileDragLifecycleBlock, true);
      window.addEventListener('drop', onNativeTileDragLifecycleBlock, true);
      window.addEventListener('dragend', onDragEnd, true);
      window.addEventListener('drop', onDragEnd, true);
      window.addEventListener('click', onTileClickSuppress, true);

      const existingRows = Array.from(document.querySelectorAll('.favRow.rowCon'));
      existingRows.forEach((row) => forceTileNotDraggable(row));
    };

    installTileDragBridge();

    const startLocalFolderDraft = () => {
      if (localFolderDraftId) {
        pendingDraftFocusId = localFolderDraftId;
        renderFolders();
        return;
      }
      const id = `local:${nextLocalFolderId++}`;
      localFolders.push({ id, name: '', isDraft: true });
      localFolderDraftId = id;
      pendingDraftFocusId = id;
      renderFolders();
    };

    const finalizeLocalFolderDraft = (id, rawName) => {
      const key = normalizeId(id);
      const index = localFolders.findIndex((entry) => normalizeId(entry.id) === key);
      if (index < 0) {
        localFolderDraftId = '';
        pendingDraftFocusId = '';
        renderFolders();
        return;
      }

      const nextName = String(rawName || '').trim();
      if (!nextName) {
        localFolders.splice(index, 1);
        if (localFolderSelectionId === key) {
          localFolderSelectionId = '';
        }
      } else {
        localFolders[index].name = nextName;
        localFolders[index].isDraft = false;
        localFolderSelectionId = key;

        const preservedPage = favoritesCurrentPage;
        const preservedSelectionId = activeFolderSelectionId;
        const preservedExpectedCount = activeFolderExpectedCount;

        const body = new URLSearchParams();
        body.set('fname', nextName);
        body.set('bgColor', '#1a1a1a');
        body.set('textColor', '#dddddd');
        body.set('parentId', '');
        body.set('nsfw', '0');
        body.set('folderFont', '0');
        body.set('folderSize', '0');

        fetch('/favorites/addFavFolder', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            Accept: 'application/json, text/javascript, */*; q=0.01',
            'X-Requested-With': 'XMLHttpRequest'
          },
          body: body.toString()
        })
          .then((response) => response.text())
          .then((text) => parseJsonSafe(text))
          .then((parsed) => {
            if (!parsed || parsed.success !== true) {
              throw new Error('addFavFolder failed');
            }

            const removeIndex = localFolders.findIndex((entry) => normalizeId(entry.id) === key);
            if (removeIndex >= 0) {
              localFolders.splice(removeIndex, 1);
            }
            if (localFolderSelectionId === key) {
              localFolderSelectionId = '';
            }

            if (Array.isArray(parsed.folders)) {
              favoritesPayloadCache = {
                ...(favoritesPayloadCache || {}),
                ...parsed,
                folders: parsed.folders
              };
              favoritesPayloadVersion += 1;
              notifyFavoritesPayloadSubscribers();
            }

            return refreshFavoritesPayload(true);
          })
          .then(() => {
            favoritesCurrentPage = preservedPage;
            setActiveFolderSelectionId(preservedSelectionId);
            setActiveFolderExpectedCount(preservedExpectedCount);
            scheduleFavoritesTileLayout(true);
            renderFolders();
          })
          .catch((error) => {
            folderRuntimeDebug('finalizeLocalFolderDraft:createRealFolder failed', {
              error: String(error),
              folderName: nextName
            });
            renderFolders();
          });
      }

      if (localFolderDraftId === key) {
        localFolderDraftId = '';
      }
      pendingDraftFocusId = '';
      renderFolders();
    };

    const normalizeHexColor = (value, fallback) => {
      const text = String(value || '').trim();
      const normalized = text.startsWith('#') ? text : `#${text}`;
      return /^#[0-9a-f]{6}$/i.test(normalized) ? normalized.toLowerCase() : fallback;
    };

    const normalizeFolderColorPair = (bgRaw, textRaw) => {
      const bg = normalizeHexColor(bgRaw, DEFAULT_FOLDER_BG_COLOR);
      const text = normalizeHexColor(textRaw, DEFAULT_FOLDER_TEXT_COLOR);
      const isLegacyBg = bg === '#5c5c5c' || bg === '#2b2b2b';
      const isLegacyText = text === '#000000' || text === '#ffffff';
      if (isLegacyBg && isLegacyText) {
        return {
          bg: DEFAULT_FOLDER_BG_COLOR,
          text: DEFAULT_FOLDER_TEXT_COLOR
        };
      }
      return { bg, text };
    };

    const isDarkHexColor = (value) => {
      const normalized = normalizeHexColor(value, '#1a1a1a');
      const r = Number.parseInt(normalized.slice(1, 3), 16);
      const g = Number.parseInt(normalized.slice(3, 5), 16);
      const b = Number.parseInt(normalized.slice(5, 7), 16);
      // Perceived luminance threshold for light vs dark backgrounds.
      const luminance = (0.2126 * r) + (0.7152 * g) + (0.0722 * b);
      return luminance < 150;
    };

    const getFolderIconSource = (isOpen, darkBackground) => {
      const useLightIcon = Boolean(darkBackground);
      const openSrc = useLightIcon
        ? (FOLDER_ICON_OPEN_LIGHT_URL || FOLDER_ICON_OPEN_FALLBACK_URL)
        : (FOLDER_ICON_OPEN_DARK_URL || FOLDER_ICON_OPEN_FALLBACK_URL);
      const closedSrc = useLightIcon
        ? (FOLDER_ICON_CLOSED_LIGHT_URL || FOLDER_ICON_CLOSED_FALLBACK_URL)
        : (FOLDER_ICON_CLOSED_DARK_URL || FOLDER_ICON_CLOSED_FALLBACK_URL);
      return isOpen ? openSrc : closedSrc;
    };

    const createFolderIconSvg = (isOpen, darkBackground) => {
      const icon = document.createElement('img');
      icon.alt = '';
      icon.decoding = 'async';
      icon.draggable = false;
      icon.src = getFolderIconSource(isOpen, darkBackground);
      icon.style.display = 'inline-flex';
      icon.style.width = '30px';
      icon.style.height = '30px';
      icon.style.flex = '0 0 auto';
      icon.style.objectFit = 'contain';
      icon.style.objectPosition = 'center';
      icon.addEventListener('error', () => {
        icon.src = isOpen ? FOLDER_ICON_OPEN_FALLBACK_URL : FOLDER_ICON_CLOSED_FALLBACK_URL;
      }, { once: true });
      return icon;
    };

    const postFavoritesForm = (path, bodyParams) => {
      return fetch(path, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          Accept: 'application/json, text/javascript, */*; q=0.01',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: bodyParams.toString()
      })
        .then((response) => response.text())
        .then((text) => parseJsonSafe(text));
    };

    const getRawFolderById = (folderId) => {
      const key = normalizeId(folderId);
      const folders = Array.isArray(favoritesPayloadCache && favoritesPayloadCache.folders)
        ? favoritesPayloadCache.folders
        : [];
      return folders.find((folder) => normalizeId(folder && folder.id) === key) || null;
    };

    const normalizeParentId = (value) => {
      const key = normalizeId(value);
      return key === '0' ? '' : key;
    };

    const isDescendantFolder = (candidateId, ancestorId) => {
      const ancestorKey = normalizeId(ancestorId);
      let current = normalizeId(candidateId);
      let guard = 0;
      while (current && current !== '0' && guard < 256) {
        if (current === ancestorKey) {
          return true;
        }
        const raw = getRawFolderById(current);
        if (!raw) {
          break;
        }
        current = normalizeId(raw.parent_id);
        guard += 1;
      }
      return false;
    };

    const clickNativeNode = (node) => {
      if (!node) {
        return;
      }
      const dispatchSafe = (factory, type, options) => {
        try {
          node.dispatchEvent(new factory(type, options));
          return true;
        } catch (_) {
          return false;
        }
      };

      const baseOpts = { bubbles: true, cancelable: true, composed: true };
      if (typeof PointerEvent !== 'undefined') {
        dispatchSafe(PointerEvent, 'pointerdown', { ...baseOpts, pointerType: 'mouse', isPrimary: true, buttons: 1 });
      }
      dispatchSafe(MouseEvent, 'mousedown', { ...baseOpts, buttons: 1 });
      if (typeof PointerEvent !== 'undefined') {
        dispatchSafe(PointerEvent, 'pointerup', { ...baseOpts, pointerType: 'mouse', isPrimary: true, buttons: 0 });
      }
      dispatchSafe(MouseEvent, 'mouseup', { ...baseOpts, buttons: 0 });

      if (typeof node.click === 'function') {
        node.click();
      } else {
        dispatchSafe(MouseEvent, 'click', { ...baseOpts, buttons: 0 });
      }
    };

    const clickNativeFolderRow = (row) => {
      if (!row) {
        return;
      }
      try {
        const selection = window.getSelection && window.getSelection();
        if (selection && selection.removeAllRanges) {
          selection.removeAllRanges();
        }
      } catch (_) {}
      const preferredTarget = row.querySelector(
        '.ugFolName, .ugFolSubChild, .ugFolSubChildName, .ugFolBtn, .ugFolLabel'
      );
      clickNativeNode(preferredTarget || row);
    };

    const findNativeFolderRow = (folderId) => {
      const id = normalizeId(folderId);
      const rows = Array.from(document.querySelectorAll('#rFolder .rfolr'));
      return rows.find((row) => normalizeId(row.dataset && row.dataset.id) === id) || null;
    };

    const captureNativeFolderDebugState = (folderId, parentId) => {
      const id = normalizeId(folderId);
      const parentKey = normalizeId(parentId);
      const container = document.querySelector(TILE_CONTAINER_SELECTOR);
      const nativeRoot = document.querySelector('#rFolder');
      const nativeRows = Array.from(document.querySelectorAll('#rFolder .rfolr'));
      const subRows = Array.from(document.querySelectorAll(`#rFolder .ugFolSubView[data-parent="${parentKey}"] .ugFolSubChild`));
      const pageRows = container ? collectTileRows(container).length : 0;

      return {
        folderId: id,
        parentId: parentKey,
        activeFolderSelectionId,
        activeFolderExpectedCount,
        favoritesPayloadVersion,
        payloadTotal: getPayloadTotalCount(favoritesPayloadCache),
        payloadHasMore: payloadHasMore(favoritesPayloadCache),
        payloadItemCount: Array.isArray(favoritesPayloadCache && favoritesPayloadCache.items)
          ? favoritesPayloadCache.items.length
          : -1,
        containerFound: Boolean(container),
        pageRows,
        nativeRootFound: Boolean(nativeRoot),
        nativeRootHidden: nativeRoot
          ? {
            left: nativeRoot.style.left || '',
            opacity: nativeRoot.style.opacity || '',
            pointerEvents: nativeRoot.style.pointerEvents || ''
          }
          : null,
        nativeRowsCount: nativeRows.length,
        hasTargetRow: Boolean(findNativeFolderRow(id)),
        hasParentRow: Boolean(findNativeFolderRow(parentKey)),
        subRowsForParent: subRows.length,
        subToggleFound: Boolean(document.querySelector(`#rFolder .ugFolSub[data-parent="${parentKey}"]`)),
        showMoreButtonFound: Boolean(document.querySelector('.showMoreRecent2.nextRecent')),
        requestBody: favoritesRequestBodyCache
      };
    };

    const findNativeSubfolderRow = (folderId, parentId, folderName = '') => {
      const id = normalizeId(folderId);
      const parentKey = normalizeId(parentId);
      const safeName = String(folderName || '').trim().toLowerCase();

      const directSelectors = [
        `#rFolder .ugFolSubView[data-parent="${parentKey}"] .ugFolSubChild[data-id="${id}"]`,
        `#rFolder .ugFolSubView[data-parent="${parentKey}"] .rfolr[data-id="${id}"]`,
        `#rFolder .ugFolSubView[data-parent="${parentKey}"] [data-id="${id}"]`,
        `#rFolder [data-parent="${parentKey}"] [data-id="${id}"]`,
        `#rFolder #rf${id}`,
        `.ugFolSubView[data-parent="${parentKey}"] .ugFolSubChild[data-id="${id}"]`,
        `.ugFolSubView[data-parent="${parentKey}"] .rfolr[data-id="${id}"]`,
        `.ugFolSubView[data-parent="${parentKey}"] [data-id="${id}"]`,
        `[data-parent="${parentKey}"] [data-id="${id}"]`,
        `#rf${id}`,
        `[data-id="${id}"]`
      ];
      for (const selector of directSelectors) {
        const hit = document.querySelector(selector);
        if (hit) {
          return hit;
        }
      }

      const byId = findNativeFolderRow(id);
      if (byId) {
        return byId;
      }

      if (!safeName) {
        return null;
      }

      const pool = Array.from(document.querySelectorAll(
        `#rFolder .ugFolSubView[data-parent="${parentKey}"] .ugFolSubChild, #rFolder .ugFolSubView[data-parent="${parentKey}"] .rfolr, .ugFolSubView[data-parent="${parentKey}"] .ugFolSubChild, .ugFolSubView[data-parent="${parentKey}"] .rfolr, [data-parent="${parentKey}"] [data-id]`
      ));
      const byName = pool.find((node) => String(node.textContent || '').trim().toLowerCase().includes(safeName));
      return byName || null;
    };

    const triggerNativeFolderLoad = (folderId, parentId, isCurrentLoad, folderName = '') => {
      const id = normalizeId(folderId);
      const parentKey = normalizeId(parentId);
      folderRuntimeDebug('triggerNativeFolderLoad:start', captureNativeFolderDebugState(id, parentKey));

      if (!parentKey || parentKey === '0') {
        if (typeof isCurrentLoad === 'function' && !isCurrentLoad()) {
          folderRuntimeDebug('triggerNativeFolderLoad:aborted-root-not-current', { folderId: id, parentId: parentKey });
          return Promise.resolve(false);
        }
        const topRow = document.querySelector(`#rFolder .ugFolList .rfolr[data-id="${id}"]`) || findNativeFolderRow(id);
        if (!topRow) {
          folderRuntimeDebug('triggerNativeFolderLoad:missing-root-row', captureNativeFolderDebugState(id, parentKey));
          return Promise.resolve(false);
        }
        clickNativeFolderRow(topRow);
        folderRuntimeDebug('triggerNativeFolderLoad:clicked-root-row', captureNativeFolderDebugState(id, parentKey));
        return Promise.resolve(true);
      }

      const parentRow = document.querySelector(`#rFolder .ugFolList .rfolr[data-id="${parentKey}"]`) || findNativeFolderRow(parentKey);
      if (!parentRow) {
        folderRuntimeDebug('triggerNativeFolderLoad:missing-parent-row', captureNativeFolderDebugState(id, parentKey));
        return Promise.resolve(false);
      }

      const subToggle = document.querySelector(`#rFolder .ugFolSub[data-parent="${parentKey}"]`)
        || parentRow.querySelector('.ugFolSub, .ugFolSubBtn, .ugFolNestHint, .ugFolSubToggle');
      if (subToggle) {
        clickNativeNode(subToggle);
        folderRuntimeDebug('triggerNativeFolderLoad:clicked-sub-toggle', captureNativeFolderDebugState(id, parentKey));
      } else {
        folderRuntimeDebug('triggerNativeFolderLoad:missing-sub-toggle', captureNativeFolderDebugState(id, parentKey));
      }

      return new Promise((resolve) => {
        let attempts = 0;
        const maxAttempts = 10;
        const delayMs = 80;

        const tryClickChild = () => {
          if (typeof isCurrentLoad === 'function' && !isCurrentLoad()) {
            folderRuntimeDebug('triggerNativeFolderLoad:aborted-child-not-current', { folderId: id, parentId: parentKey, attempts });
            resolve(false);
            return;
          }
          const childRow = findNativeSubfolderRow(id, parentKey, folderName);
          if (childRow) {
            clickNativeFolderRow(childRow);
            folderRuntimeDebug('triggerNativeFolderLoad:clicked-child-row', {
              folderId: id,
              parentId: parentKey,
              attempts,
              state: captureNativeFolderDebugState(id, parentKey)
            });
            resolve(true);
            return;
          }

          attempts += 1;
          if (attempts >= maxAttempts) {
            folderRuntimeDebug('triggerNativeFolderLoad:child-not-found', {
              folderId: id,
              parentId: parentKey,
              attempts,
              state: captureNativeFolderDebugState(id, parentKey)
            });
            resolve(false);
            return;
          }

          // Re-tap the toggle mid-way in case native animation/state gating delayed injection.
          if ((attempts === 3 || attempts === 6) && subToggle) {
            clickNativeNode(subToggle);
            folderRuntimeDebug('triggerNativeFolderLoad:retapped-sub-toggle', {
              folderId: id,
              parentId: parentKey,
              attempts,
              state: captureNativeFolderDebugState(id, parentKey)
            });
          }

          window.setTimeout(tryClickChild, delayMs);
        };

        window.setTimeout(tryClickChild, delayMs);
      });
    };

    const buildFolderRequestBody = (folderId, cursorValue = '') => {
      const params = new URLSearchParams(favoritesRequestBodyCache || 'size=70&sort=date&folderId=&search=&typeFilter=&nsfw=0&tagsOnly=0');
      if (!params.has('size')) params.set('size', '70');
      if (!params.has('sort')) params.set('sort', 'date');
      if (!params.has('search')) params.set('search', '');
      if (!params.has('typeFilter')) params.set('typeFilter', '');
      if (!params.has('nsfw')) params.set('nsfw', '0');
      if (!params.has('tagsOnly')) params.set('tagsOnly', '0');
      params.set('folderId', normalizeId(folderId));
      params.set('cursor', String(cursorValue || ''));
      return params.toString();
    };

    const extractNextCursor = (parsed, fallbackItem) => {
      const fromParsed = [
        parsed && parsed.cursor,
        parsed && parsed.nextCursor,
        parsed && parsed.next,
        parsed && parsed.next_cursor,
        parsed && parsed.lastCursor,
        parsed && parsed.last_cursor,
        parsed && parsed.pagination && parsed.pagination.cursor,
        parsed && parsed.pagination && parsed.pagination.nextCursor,
        parsed && parsed.page && parsed.page.cursor
      ].find((value) => typeof value === 'string' && value.trim());
      if (fromParsed) {
        return String(fromParsed).trim();
      }

      const fromItem = [
        fallbackItem && fallbackItem.cursor,
        fallbackItem && fallbackItem.nextCursor,
        fallbackItem && fallbackItem.next,
        fallbackItem && fallbackItem.c,
        fallbackItem && fallbackItem.sc,
        fallbackItem && fallbackItem.sortCursor,
        fallbackItem && fallbackItem.sort_cursor
      ].find((value) => typeof value === 'string' && value.trim());
      return fromItem ? String(fromItem).trim() : '';
    };

    const fetchFolderPayload = (folderId, cursorValue = '') => {
      const body = buildFolderRequestBody(folderId, cursorValue);
      favoritesRequestBodyCache = body;
      return fetch(FAVS_GALLERY_PATH, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          Accept: 'application/json, text/javascript, */*; q=0.01',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body
      })
        .then((response) => response.text())
        .then((text) => {
          const parsed = parseJsonSafe(text);
          if (!parsed || typeof parsed !== 'object') {
            return null;
          }
          return parsed;
        });
    };

    const fetchAllFolderPayload = (folderId, isCurrentLoad) => {
      const aggregated = {
        items: [],
        folders: [],
        prefix: ''
      };
      const seenItemIds = new Set();
      const seenCursors = new Set();
      const maxLoops = 120;
      let nextCursor = '';
      let loops = 0;
      let expectedTotal = 0;

      const parseSize = () => {
        const params = new URLSearchParams(favoritesRequestBodyCache || 'size=70');
        const parsed = Number.parseInt(String(params.get('size') || '70'), 10);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : 70;
      };
      const pageSize = parseSize();

      const readItems = (parsed) => Array.isArray(parsed && parsed.items) ? parsed.items : [];

      const appendItems = (items) => {
        items.forEach((item) => {
          const id = String(item && item.id ? item.id : '');
          if (id && seenItemIds.has(id)) {
            return;
          }
          if (id) {
            seenItemIds.add(id);
          }
          aggregated.items.push(item);
        });
      };

      const loop = () => {
        if (typeof isCurrentLoad === 'function' && !isCurrentLoad()) {
          return Promise.resolve(null);
        }
        if (loops >= maxLoops) {
          return Promise.resolve(aggregated);
        }
        loops += 1;
        return fetchFolderPayload(folderId, nextCursor)
          .then((parsed) => {
            if (!parsed || (typeof isCurrentLoad === 'function' && !isCurrentLoad())) {
              return null;
            }

            if (!aggregated.prefix && parsed.prefix) {
              aggregated.prefix = parsed.prefix;
            }
            if (!aggregated.folders.length && Array.isArray(parsed.folders)) {
              aggregated.folders = parsed.folders;
            }

            const payloadTotal = getPayloadTotalCount(parsed);
            if (payloadTotal > 0) {
              expectedTotal = payloadTotal;
            }

            const pageItems = readItems(parsed);
            appendItems(pageItems);

            const candidateCursor = extractNextCursor(parsed, pageItems[pageItems.length - 1]);
            const reachedExpected = expectedTotal > 0 && aggregated.items.length >= expectedTotal;
            const hasMoreFlag = payloadHasMore(parsed);
            const hasMoreBySize = pageItems.length >= pageSize;
            const shouldContinue = hasMoreFlag || hasMoreBySize;
            if (reachedExpected || !candidateCursor || seenCursors.has(candidateCursor) || !shouldContinue) {
              return aggregated;
            }
            seenCursors.add(candidateCursor);
            nextCursor = candidateCursor;
            return loop();
          });
      };

      return loop().then((result) => {
        if (!result) {
          return null;
        }
        favoritesPayloadCache = result;
        refreshPayloadItemOrderIndex(result, buildFolderRequestBody(folderId, ''));
        favoritesPayloadVersion += 1;
        notifyFavoritesPayloadSubscribers();
        return result;
      });
    };

    const loadFolderTiles = (entry) => {
      const folderId = normalizeId(entry && entry.id);
      const parentId = normalizeId(entry && entry.parentId);
      const folderCount = Number(entry && entry.count ? entry.count : 0);
      const currentToken = ++folderLoadToken;
      const isCurrentLoad = () => currentToken === folderLoadToken;
      const getLiveRowSnapshot = () => {
        const container = document.querySelector(TILE_CONTAINER_SELECTOR);
        if (!container) {
          return { count: 0, signature: '' };
        }
        const liveRows = Array.from(container.querySelectorAll(`.${TILE_COLUMN_CLASS} ${TILE_ROW_SELECTOR}`));
        const signature = liveRows.slice(0, 8).map((row) => {
          const dataId = row && row.dataset ? String(row.dataset.id || '') : '';
          const href = row.querySelector ? String((row.querySelector('a') || {}).href || '') : '';
          return dataId || href || String(row.textContent || '').slice(0, 24);
        }).join('|');
        return {
          count: liveRows.length,
          signature
        };
      };
      const baselineSnapshot = getLiveRowSnapshot();
      const waitForRows = (timeoutMs = 900) => new Promise((resolve) => {
        const started = Date.now();
        let samples = 0;
        const tick = () => {
          if (!isCurrentLoad()) {
            folderRuntimeDebug('loadFolderTiles:waitForRows-abort-not-current', {
              folderId,
              parentId,
              waitedMs: Date.now() - started,
              state: captureNativeFolderDebugState(folderId, parentId)
            });
            resolve(false);
            return;
          }
          const snapshot = getLiveRowSnapshot();
          const hasRows = snapshot.count > 0;
          const changed = snapshot.count !== baselineSnapshot.count
            || snapshot.signature !== baselineSnapshot.signature;
          if (hasRows && changed) {
            folderRuntimeDebug('loadFolderTiles:waitForRows-success', {
              folderId,
              parentId,
              waitedMs: Date.now() - started,
              samples,
              baselineSnapshot,
              snapshot,
              state: captureNativeFolderDebugState(folderId, parentId)
            });
            resolve(true);
            return;
          }
          if (Date.now() - started >= timeoutMs) {
            folderRuntimeDebug('loadFolderTiles:waitForRows-timeout', {
              folderId,
              parentId,
              waitedMs: Date.now() - started,
              samples,
              baselineSnapshot,
              snapshot,
              state: captureNativeFolderDebugState(folderId, parentId)
            });
            resolve(false);
            return;
          }
          samples += 1;
          if (samples === 1 || samples % 5 === 0) {
            folderRuntimeDebug('loadFolderTiles:waitForRows-poll', {
              folderId,
              parentId,
              samples,
              waitedMs: Date.now() - started,
              baselineSnapshot,
              snapshot,
              state: captureNativeFolderDebugState(folderId, parentId)
            });
          }
          window.setTimeout(tick, 90);
        };
        tick();
      });
      folderRuntimeDebug('loadFolderTiles:start', {
        folderId,
        parentId,
        folderCount,
        token: currentToken,
        state: captureNativeFolderDebugState(folderId, parentId)
      });
      favoritesCurrentPage = 1;
      paginationOrderKey = '';
      paginationRowOrder = [];
      resetNativePreloadState();
      resetDetachedTileRows();

      if (folderCount <= 0 && folderId !== '-1') {
        folderRuntimeDebug('loadFolderTiles:empty-known-count', { folderId, parentId, folderCount });
        renderNothingHereTiles();
        return Promise.resolve();
      }

      clearTilesEmptyPlaceholders();

      return triggerNativeFolderLoad(folderId, parentId, isCurrentLoad, String(entry && entry.name || ''))
        .then((nativeLoaded) => {
          folderRuntimeDebug('loadFolderTiles:trigger-result', {
            folderId,
            parentId,
            nativeLoaded,
            state: captureNativeFolderDebugState(folderId, parentId)
          });
          if (!isCurrentLoad() || nativeLoaded) {
            return;
          }
          const nativeRow = findNativeFolderRow(folderId);
          if (nativeRow) {
            clickNativeFolderRow(nativeRow);
            folderRuntimeDebug('loadFolderTiles:manual-row-click', {
              folderId,
              parentId,
              state: captureNativeFolderDebugState(folderId, parentId)
            });
          } else {
            folderRuntimeDebug('loadFolderTiles:manual-row-click-skipped-no-row', {
              folderId,
              parentId,
              state: captureNativeFolderDebugState(folderId, parentId)
            });
          }
        })
        .then(() => waitForRows())
        .then((hasRows) => {
          if (!isCurrentLoad()) {
            folderRuntimeDebug('loadFolderTiles:end-not-current', { folderId, parentId, token: currentToken });
            return;
          }
          if (hasRows) {
            folderRuntimeDebug('loadFolderTiles:end-native-success', {
              folderId,
              parentId,
              token: currentToken,
              state: captureNativeFolderDebugState(folderId, parentId)
            });
            return;
          }
          folderRuntimeDebug('loadFolderTiles:end-native-no-rows', {
            folderId,
            parentId,
            token: currentToken,
            state: captureNativeFolderDebugState(folderId, parentId)
          });
          renderNothingHereTiles('Native load failed for this folder. Check console debug logs.');
        })
        .catch((error) => {
          if (!isCurrentLoad()) {
            return;
          }
          folderRuntimeDebug('loadFolderTiles:error', {
            error: String(error),
            folderId,
            parentId,
            token: currentToken,
            state: captureNativeFolderDebugState(folderId, parentId)
          });
          folderDebug('loadFolderTiles failed', { error: String(error), folderId });
        });
    };

    const getFolderTree = (payload) => {
      const folders = Array.isArray(payload && payload.folders) ? payload.folders : [];
      const normalized = folders.map((folder) => {
        const pair = normalizeFolderColorPair(folder && folder.color1, folder && folder.color2);
        return {
          id: normalizeId(folder.id),
          name: String(folder.name || '').trim(),
          count: toCountText(folder.count),
          color1: pair.bg,
          color2: pair.text,
          parentId: normalizeId(folder.parent_id),
          childCount: Number(folder.childCount || 0)
        };
      }).filter((folder) => folder.id && folder.name);

      const byParent = new Map();
      normalized.forEach((folder) => {
        const key = folder.parentId || '0';
        const list = byParent.get(key) || [];
        list.push(folder);
        byParent.set(key, list);
      });

      const roots = byParent.get('0') || byParent.get('') || [];
      return roots.map((root) => ({
        ...root,
        children: byParent.get(root.id) || []
      }));
    };

    const ensureDragPlaceholder = (sourceRow) => {
      if (dragPlaceholder) {
        return dragPlaceholder;
      }
      const placeholder = sourceRow instanceof HTMLElement
        ? sourceRow.cloneNode(true)
        : document.createElement('div');
      placeholder.className = 'fjBettermentsFolderDropPlaceholder';
      placeholder.style.height = `${FOLDER_BUTTON_HEIGHT_PX}px`;
      placeholder.style.minHeight = `${FOLDER_BUTTON_HEIGHT_PX}px`;
      placeholder.style.opacity = '0.38';
      placeholder.style.borderStyle = 'dashed';
      placeholder.style.pointerEvents = 'none';
      placeholder.querySelectorAll('button,input,select,textarea').forEach((node) => {
        node.remove();
      });
      dragPlaceholder = placeholder;
      return dragPlaceholder;
    };

    const ensureDragGhost = (sourceRow, sourceEntry) => {
      if (dragGhost) {
        return dragGhost;
      }
      if (!(sourceRow instanceof HTMLElement)) {
        return null;
      }
      const sourceRect = sourceRow.getBoundingClientRect();
      const ghost = document.createElement('div');
      ghost.className = 'fjBettermentsFolderDragGhost';
      ghost.style.position = 'fixed';
      ghost.style.left = '0';
      ghost.style.top = '0';
      ghost.style.margin = '0';
      ghost.style.width = `${Math.max(180, Math.round(sourceRect.width || 220))}px`;
      ghost.style.height = `${FOLDER_BUTTON_HEIGHT_PX}px`;
      ghost.style.display = 'flex';
      ghost.style.alignItems = 'center';
      ghost.style.gap = '8px';
      ghost.style.padding = '0 8px 0 4px';
      ghost.style.borderRadius = '6px';
      ghost.style.border = '1px solid rgba(220,220,220,.35)';
      ghost.style.background = 'rgba(26,26,26,.92)';
      ghost.style.color = '#dddddd';
      ghost.style.font = "500 12px 'Segoe UI', sans-serif";
      ghost.style.boxSizing = 'border-box';
      ghost.style.zIndex = '999999';
      ghost.style.pointerEvents = 'none';
      ghost.style.opacity = '0.86';
      ghost.style.filter = 'saturate(1.05) brightness(1.02)';
      ghost.style.boxShadow = '0 8px 22px rgba(0,0,0,.42)';

      const iconSlot = document.createElement('span');
      iconSlot.style.display = 'inline-flex';
      iconSlot.style.alignItems = 'center';
      iconSlot.style.justifyContent = 'center';
      iconSlot.style.width = '30px';
      iconSlot.style.minWidth = '30px';

      const sourceIcon = sourceRow.__fjIcon;
      if (sourceIcon instanceof HTMLImageElement) {
        const icon = document.createElement('img');
        icon.alt = '';
        icon.decoding = 'async';
        icon.draggable = false;
        icon.src = sourceIcon.src;
        icon.style.width = '30px';
        icon.style.height = '30px';
        iconSlot.appendChild(icon);
      }

      const label = document.createElement('span');
      label.textContent = String(sourceEntry && sourceEntry.name ? sourceEntry.name : 'Folder');
      label.style.whiteSpace = 'nowrap';
      label.style.overflow = 'hidden';
      label.style.textOverflow = 'ellipsis';
      label.style.flex = '1 1 auto';

      ghost.append(iconSlot, label);
      document.body.appendChild(ghost);
      dragGhost = ghost;
      return dragGhost;
    };

    const positionDragGhost = (x, y) => {
      if (!(dragGhost instanceof HTMLElement)) {
        return;
      }
      dragGhost.style.transform = `translate(${Math.round(x + 10)}px, ${Math.round(y + 10)}px)`;
    };

    const clearDragPreview = () => {
      if (dragHighlightRow) {
        dragHighlightRow.style.outline = '';
        dragHighlightRow.style.outlineOffset = '';
        const icon = dragHighlightRow.__fjIcon;
        if (icon instanceof HTMLImageElement && dragHighlightIconPrevSrc) {
          icon.src = dragHighlightIconPrevSrc;
        }
      }
      dragHighlightRow = null;
      dragHighlightIconPrevSrc = '';
      if (dragPlaceholder && dragPlaceholder.parentNode) {
        dragPlaceholder.parentNode.removeChild(dragPlaceholder);
      }
    };

    const clearDragVisuals = () => {
      clearDragPreview();
      if (dragGhost && dragGhost.parentNode) {
        dragGhost.parentNode.removeChild(dragGhost);
      }
      dragGhost = null;
      if (dragState && dragState.sourceRow) {
        dragState.sourceRow.style.opacity = '';
        dragState.sourceRow.style.filter = '';
        dragState.sourceRow.style.display = '';
      }
      if (document.body && document.body.style) {
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
      }
    };

    const clearDragState = () => {
      clearDragVisuals();
      dragState = null;
    };

    const getDraggableFolderRows = () => {
      if (!(listWrap instanceof HTMLElement) || !dragState) {
        return [];
      }
      const sourceId = normalizeId(dragState.sourceEntry && dragState.sourceEntry.id);
      return Array.from(listWrap.querySelectorAll('.fjBettermentsFolderDataRow'))
        .filter((row) => normalizeId(row.dataset && row.dataset.folderId) !== sourceId);
    };

    const computeDropIntent = (targetRow, clientY) => {
      if (!dragState) {
        return null;
      }
      const sourceId = normalizeId(dragState.sourceEntry && dragState.sourceEntry.id);
      if (targetRow instanceof HTMLElement) {
        const targetId = normalizeId(targetRow.dataset.folderId);
        if (targetId && sourceId !== targetId) {
          const rect = targetRow.getBoundingClientRect();
          const centerY = rect.top + (rect.height * 0.5);
          const targetLevel = Number.parseInt(String(targetRow.dataset.folderLevel || '0'), 10) || 0;
          const targetParentId = normalizeId(targetRow.dataset.folderParentId);
          const isCenterStrip = Math.abs(clientY - centerY) <= 6;
          if (isCenterStrip && targetLevel === 0) {
            return {
              mode: 'into',
              targetId,
              targetLevel,
              targetParentId
            };
          }
        }
      }

      const rows = getDraggableFolderRows();
      if (!rows.length) {
        return null;
      }

      // Stable gap targeting: find the first row midpoint below cursor.
      const anchor = rows.find((row) => {
        const rect = row.getBoundingClientRect();
        const midpoint = rect.top + (rect.height * 0.5);
        return clientY < midpoint;
      }) || null;

      if (anchor) {
        return {
          mode: 'between',
          targetId: normalizeId(anchor.dataset.folderId),
          targetLevel: Number.parseInt(String(anchor.dataset.folderLevel || '0'), 10) || 0,
          targetParentId: normalizeId(anchor.dataset.folderParentId),
          before: true
        };
      }

      const last = rows[rows.length - 1];
      return {
        mode: 'between',
        targetId: normalizeId(last.dataset.folderId),
        targetLevel: Number.parseInt(String(last.dataset.folderLevel || '0'), 10) || 0,
        targetParentId: normalizeId(last.dataset.folderParentId),
        before: false
      };
    };

    const applyDragPreview = (intent, targetRow) => {
      if (!dragState || !intent || !targetRow) {
        return;
      }
      const previewKey = `${intent.mode}:${intent.targetId}:${intent.before ? 'b' : 'a'}`;
      if (dragState.previewKey === previewKey && dragState.previewRow === targetRow) {
        return;
      }
      clearDragPreview();
      if (dragState.sourceRow) {
        dragState.sourceRow.style.opacity = '0.4';
        dragState.sourceRow.style.filter = 'saturate(0.75)';
      }

      if (intent.mode === 'into') {
        targetRow.style.outline = '2px dashed rgba(205,205,205,.82)';
        targetRow.style.outlineOffset = '-2px';
        const icon = targetRow.__fjIcon;
        if (icon instanceof HTMLImageElement) {
          dragHighlightIconPrevSrc = icon.src;
          const useDarkBackground = String(targetRow.dataset.folderDarkBg || '0') === '1';
          icon.src = getFolderIconSource(true, useDarkBackground);
        }
        dragHighlightRow = targetRow;
      } else {
        const placeholder = ensureDragPlaceholder(dragState.sourceRow);
        const anchorRow = Array.from(listWrap.querySelectorAll('.fjBettermentsFolderDataRow'))
          .find((row) => normalizeId(row.dataset && row.dataset.folderId) === normalizeId(intent.targetId));
        if (anchorRow && intent.before) {
          listWrap.insertBefore(placeholder, anchorRow);
        } else {
          const afterAnchor = anchorRow && anchorRow.nextSibling;
          if (afterAnchor) {
            listWrap.insertBefore(placeholder, afterAnchor);
          } else {
            const firstNonFolder = Array.from(listWrap.children)
              .find((node) => !(node.classList && node.classList.contains('fjBettermentsFolderDataRow')));
            if (firstNonFolder) {
              listWrap.insertBefore(placeholder, firstNonFolder);
            } else {
              listWrap.appendChild(placeholder);
            }
          }
        }
      }
      dragState.intent = intent;
      dragState.previewKey = previewKey;
      dragState.previewRow = targetRow;
    };

    const refreshFoldersFromMutation = (parsed) => {
      if (parsed && Array.isArray(parsed.folders)) {
        favoritesPayloadCache = {
          ...(favoritesPayloadCache || {}),
          ...parsed,
          folders: parsed.folders
        };
        favoritesPayloadVersion += 1;
        notifyFavoritesPayloadSubscribers();
      }
      return refreshFavoritesPayload(true).then(() => {
        scheduleFavoritesTileLayout(true);
        renderFolders();
      });
    };

    const buildTopLevelOrderAfterDrop = (sourceId, targetId, before) => {
      const roots = getFolderTree(favoritesPayloadCache);
      const ordered = roots.map((folder) => normalizeId(folder.id));
      const next = ordered.filter((id) => id !== sourceId);
      const index = next.indexOf(targetId);
      if (index < 0) {
        next.push(sourceId);
        return next;
      }
      const insertIndex = before ? index : index + 1;
      next.splice(insertIndex, 0, sourceId);
      return next;
    };

    const applyFolderDropMutation = (intent) => {
      if (!dragState || !intent || folderDragMutationInFlight) {
        return Promise.resolve();
      }
      const source = dragState.sourceEntry;
      const sourceId = normalizeId(source && source.id);
      const sourceParentId = normalizeParentId(source && source.parentId);
      if (!sourceId) {
        return Promise.resolve();
      }

      const runReorder = (orderedIds) => {
        if (!Array.isArray(orderedIds) || !orderedIds.length) {
          return Promise.resolve(null);
        }
        const body = new URLSearchParams();
        orderedIds.forEach((id) => body.append('orderedIds[]', normalizeId(id)));
        body.set('nsfw', '0');
        return postFavoritesForm('/favorites/reorderFavFolders', body);
      };

      const moveToParent = (parentId) => {
        const parentKey = normalizeId(parentId);
        if (parentKey) {
          const body = new URLSearchParams();
          body.set('folderId', sourceId);
          body.set('parentId', parentKey);
          return postFavoritesForm('/favorites/setFavFolderParent', body);
        }
        const raw = getRawFolderById(sourceId) || source || {};
        const body = new URLSearchParams();
        body.set('folderId', sourceId);
        body.set('editFolderId', sourceId);
        body.set('fname', String(raw.name || source.name || '').trim() || 'Folder');
        body.set('bgColor', normalizeHexColor(raw.color1 || source.color1, DEFAULT_FOLDER_BG_COLOR));
        body.set('textColor', normalizeHexColor(raw.color2 || source.color2, DEFAULT_FOLDER_TEXT_COLOR));
        body.set('parentId', '');
        body.set('nsfw', '0');
        body.set('folderFont', String(raw.folder_font ?? raw.folderFont ?? 0));
        body.set('folderSize', String(raw.folder_size ?? raw.folderSize ?? 0));
        return postFavoritesForm('/favorites/addFavFolder', body);
      };

      folderDragMutationInFlight = true;

      let mutationFlow = Promise.resolve(null);
      if (intent.mode === 'into') {
        if (isDescendantFolder(intent.targetId, sourceId)) {
          folderDragMutationInFlight = false;
          return Promise.resolve();
        }
        if (normalizeId(intent.targetId) !== sourceParentId) {
          mutationFlow = moveToParent(intent.targetId);
        }
      } else {
        const desiredParentId = intent.targetLevel === 0 ? '' : intent.targetParentId;
        const normalizedDesiredParentId = normalizeParentId(desiredParentId);
        if (normalizedDesiredParentId !== sourceParentId) {
          mutationFlow = mutationFlow.then(() => moveToParent(normalizedDesiredParentId));
        }
        if (!normalizedDesiredParentId) {
          const orderedIds = buildTopLevelOrderAfterDrop(sourceId, intent.targetId, Boolean(intent.before));
          mutationFlow = mutationFlow.then(() => runReorder(orderedIds));
        }
      }

      return mutationFlow
        .then((parsed) => refreshFoldersFromMutation(parsed))
        .catch((error) => {
          folderRuntimeDebug('folder drag mutation failed', {
            error: String(error),
            sourceId,
            intent
          });
        })
        .finally(() => {
          folderDragMutationInFlight = false;
        });
    };

    const attachFolderDragHandlers = (row, entry, level) => {
      if (!(row instanceof HTMLElement) || !entry) {
        return;
      }
      row.dataset.folderId = normalizeId(entry.id);
      row.dataset.folderLevel = String(level || 0);
      row.dataset.folderParentId = normalizeParentId(entry.parentId);
      row.draggable = false;

      row.addEventListener('pointerdown', (event) => {
        if (folderDragMutationInFlight) {
          return;
        }
        if (!(event.target instanceof Element)) {
          return;
        }
        if (event.button !== 0) {
          return;
        }
        if (event.target.closest('button,input,select,textarea')) {
          return;
        }

        const startX = event.clientX;
        const startY = event.clientY;
        let dragStarted = false;
        let finished = false;

        const cleanupListeners = () => {
          window.removeEventListener('pointermove', onPointerMove, true);
          window.removeEventListener('pointerup', onPointerUp, true);
          window.removeEventListener('pointercancel', onPointerUp, true);
        };

        const onPointerMove = (moveEvent) => {
          if (finished) {
            return;
          }
          moveEvent.preventDefault();
          const dx = moveEvent.clientX - startX;
          const dy = moveEvent.clientY - startY;
          const distanceSq = (dx * dx) + (dy * dy);
          if (!dragStarted && distanceSq < 16) {
            return;
          }

          if (!dragStarted) {
            dragStarted = true;
            dragState = {
              sourceRow: row,
              sourceEntry: {
                ...entry,
                parentId: normalizeParentId(entry.parentId)
              },
              intent: null,
              previewKey: '',
              previewRow: null,
              dropped: false
            };
            const placeholder = ensureDragPlaceholder(row);
            if (row.parentNode) {
              row.parentNode.insertBefore(placeholder, row);
            }
            row.style.display = 'none';
            row.style.opacity = '0.4';
            row.style.filter = 'saturate(0.75)';
            ensureDragGhost(row, entry);
            if (document.body && document.body.style) {
              document.body.style.userSelect = 'none';
              document.body.style.cursor = 'grabbing';
            }
            positionDragGhost(startX, startY);
          }

          positionDragGhost(moveEvent.clientX, moveEvent.clientY);

          const target = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY);
          let targetRow = target instanceof Element
            ? target.closest('.fjBettermentsFolderDataRow')
            : null;

          if (!(targetRow instanceof HTMLElement)) {
            const rows = getDraggableFolderRows();
            targetRow = rows.find((rowNode) => {
              const rect = rowNode.getBoundingClientRect();
              return moveEvent.clientY >= rect.top && moveEvent.clientY <= rect.bottom;
            }) || null;
          }

          const intent = computeDropIntent(targetRow instanceof HTMLElement ? targetRow : null, moveEvent.clientY);
          if (!intent) {
            clearDragPreview();
            dragState.previewKey = '';
            dragState.previewRow = null;
            return;
          }

          let previewRow = targetRow;
          if (!(previewRow instanceof HTMLElement) || normalizeId(previewRow.dataset.folderId) !== normalizeId(intent.targetId)) {
            previewRow = Array.from(listWrap.querySelectorAll('.fjBettermentsFolderDataRow'))
              .find((rowNode) => normalizeId(rowNode.dataset && rowNode.dataset.folderId) === normalizeId(intent.targetId)) || null;
          }
          if (!(previewRow instanceof HTMLElement)) {
            return;
          }
          applyDragPreview(intent, previewRow);
        };

        const onPointerUp = (upEvent) => {
          if (finished) {
            return;
          }
          finished = true;
          cleanupListeners();
          if (!dragStarted || !dragState) {
            return;
          }
          upEvent.preventDefault();
          upEvent.stopPropagation();
          upEvent.stopImmediatePropagation();
          dragState.dropped = true;
          const intent = dragState.intent;
          const snapshot = dragState;
          clearDragVisuals();
          suppressNextRowClick = true;
          window.setTimeout(() => {
            suppressNextRowClick = false;
          }, 120);
          applyFolderDropMutation(intent).finally(() => {
            if (dragState === snapshot) {
              clearDragState();
            }
          });
        };

        window.addEventListener('pointermove', onPointerMove, true);
        window.addEventListener('pointerup', onPointerUp, true);
        window.addEventListener('pointercancel', onPointerUp, true);
      });

      row.addEventListener('dragenter', (event) => {
        if (!tileDragContext.active || folderDragMutationInFlight) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        setTileDropHighlight(row);
      });

      row.addEventListener('dragover', (event) => {
        if (!tileDragContext.active || folderDragMutationInFlight) {
          return;
        }
        event.preventDefault();
        if (event.dataTransfer) {
          event.dataTransfer.dropEffect = 'move';
        }
        setTileDropHighlight(row);
      });

      row.addEventListener('dragleave', (event) => {
        if (!tileDragContext.active) {
          return;
        }
        const related = event.relatedTarget;
        if (related instanceof Element && row.contains(related)) {
          return;
        }
        clearTileDropHighlight();
      });

      row.addEventListener('drop', (event) => {
        if (!tileDragContext.active || folderDragMutationInFlight) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        const folderId = normalizeId(entry && entry.id);
        const ids = tileDragContext.ids.slice();
        if (!folderId || !ids.length) {
          clearTileDropHighlight();
          return;
        }

        const body = new URLSearchParams();
        body.set('folderId', folderId);
        ids.forEach((id) => body.append('ids[]', normalizeId(id)));
        body.set('isGlobal', '0');
        body.set('nsfw', '0');

        folderDragMutationInFlight = true;
        postFavoritesForm('/favorites/addIdsToFavFolder', body)
          .then((parsed) => {
            if (!parsed || parsed.success !== true) {
              throw new Error('addIdsToFavFolder failed');
            }
            return refreshFoldersFromMutation(parsed);
          })
          .catch((error) => {
            folderRuntimeDebug('tile drop to folder failed', {
              error: String(error),
              folderId,
              ids
            });
          })
          .finally(() => {
            folderDragMutationInFlight = false;
            tileDragContext = { active: false, ids: [] };
            clearTileDropHighlight();
          });
      });
    };

    const renderFolderRow = (entry, level, hasChildren, isOpen) => {
      const row = document.createElement('div');
      row.className = 'fjBettermentsFolderRow fjBettermentsFolderDataRow';
      row.style.display = 'flex';
      row.style.alignItems = 'center';
      row.style.justifyContent = 'space-between';
      row.style.gap = '8px';
      row.style.width = '100%';
      row.style.height = `${FOLDER_BUTTON_HEIGHT_PX}px`;
      row.style.minHeight = `${FOLDER_BUTTON_HEIGHT_PX}px`;
      row.style.padding = '0 8px 0 4px';
      if (level > 0) {
        row.style.marginLeft = '14px';
        row.style.width = 'calc(100% - 14px)';
      }
      const normalizedColors = normalizeFolderColorPair(entry && entry.color1, entry && entry.color2);
      const rowBgColor = normalizedColors.bg;
      const rowTextColor = normalizedColors.text;
      const darkBg = isDarkHexColor(rowBgColor);
      const actionBaseColor = darkBg ? '#cdcdcd' : '#323232';
      const actionHoverColor = darkBg ? '#f0f0f0' : '#1f1f1f';

      row.style.border = `1px solid ${darkBg ? '#2a2a2a' : '#5f5f5f'}`;
      row.style.borderRadius = '6px';
      const isSelected = normalizeId(entry.id) === selectedFolderId;
      row.style.background = rowBgColor;
      row.style.color = rowTextColor;
      if (isSelected) {
        row.style.boxShadow = darkBg
          ? 'inset 0 0 0 1px rgba(255,255,255,.25)'
          : 'inset 0 0 0 1px rgba(0,0,0,.28)';
      }
      row.style.boxSizing = 'border-box';
      row.style.cursor = 'pointer';
      row.style.font = "500 12px 'Segoe UI', sans-serif";
      row.style.position = 'relative';
      row.style.overflow = 'visible';

      const left = document.createElement('span');
      left.style.display = 'inline-flex';
      left.style.alignItems = 'center';
      left.style.gap = '0';
      left.style.flex = '1 1 auto';
      left.style.minWidth = '0';

      const prefix = document.createElement('span');
      prefix.style.display = 'inline-flex';
      prefix.style.alignItems = 'center';
      prefix.style.justifyContent = 'center';
      prefix.style.width = '34px';
      prefix.style.minWidth = '34px';
      prefix.style.flex = '0 0 34px';
      prefix.style.cursor = 'pointer';

      const iconSlot = document.createElement('span');
      iconSlot.style.display = 'inline-flex';
      iconSlot.style.alignItems = 'center';
      iconSlot.style.justifyContent = 'center';
      iconSlot.style.width = '30px';
      iconSlot.style.minWidth = '30px';
      iconSlot.style.flex = '0 0 30px';
      iconSlot.style.overflow = 'visible';

      const icon = createFolderIconSvg(isOpen, darkBg);
      icon.style.width = '30px';
      icon.style.height = '30px';
      icon.style.opacity = '0.92';
      icon.style.filter = 'brightness(0.95)';
      icon.style.cursor = 'pointer';
      icon.style.pointerEvents = 'none';
      icon.style.userSelect = 'none';
      row.__fjIcon = icon;
      row.dataset.folderDarkBg = darkBg ? '1' : '0';
      iconSlot.appendChild(icon);
      prefix.appendChild(iconSlot);
      left.appendChild(prefix);

      const name = document.createElement('span');
      name.textContent = entry.name;
      name.style.whiteSpace = 'nowrap';
      name.style.overflow = 'hidden';
      name.style.textOverflow = 'ellipsis';
      name.style.marginLeft = '2px';
      name.style.color = rowTextColor;
      left.appendChild(name);

      const right = document.createElement('span');
      right.style.flex = '0 0 20px';
      right.style.minWidth = '20px';
      right.style.width = '20px';
      right.style.height = '18px';
      right.style.position = 'relative';
      right.style.display = 'inline-flex';
      right.style.alignItems = 'center';
      right.style.justifyContent = 'center';

      const countText = document.createElement('span');
      countText.textContent = toCountText(entry.count);
      countText.style.position = 'absolute';
      countText.style.inset = '0';
      countText.style.display = 'inline-flex';
      countText.style.alignItems = 'center';
      countText.style.justifyContent = 'center';
      countText.style.color = rowTextColor;
      countText.style.opacity = '0.78';
      countText.style.font = "600 11px 'Segoe UI', sans-serif";

      const actionBtn = document.createElement('button');
      actionBtn.type = 'button';
      actionBtn.textContent = '⋮';
      actionBtn.style.position = 'absolute';
      actionBtn.style.inset = '0';
      actionBtn.style.display = 'inline-flex';
      actionBtn.style.alignItems = 'center';
      actionBtn.style.justifyContent = 'center';
      actionBtn.style.border = 'none';
      actionBtn.style.background = 'transparent';
      actionBtn.style.color = actionBaseColor;
      actionBtn.style.font = "700 15px 'Segoe UI', sans-serif";
      actionBtn.style.cursor = 'pointer';
      actionBtn.style.opacity = '0';
      actionBtn.style.pointerEvents = 'none';
      actionBtn.style.transition = 'opacity .12s ease,color .12s ease,filter .12s ease';

      const menu = document.createElement('div');
      menu.style.position = 'absolute';
      menu.style.top = 'calc(100% + 6px)';
      menu.style.right = '0';
      menu.style.width = '236px';
      menu.style.padding = '10px';
      menu.style.border = '1px solid #343434';
      menu.style.borderRadius = '8px';
      menu.style.background = 'linear-gradient(180deg,#1a1a1a 0%,#131313 100%)';
      menu.style.boxShadow = '0 10px 22px rgba(0,0,0,.45)';
      menu.style.zIndex = '25';
      menu.style.display = 'none';
      menu.style.flexDirection = 'column';
      menu.style.gap = '8px';

      const header = document.createElement('div');
      header.style.display = 'flex';
      header.style.alignItems = 'center';
      header.style.justifyContent = 'center';
      header.style.gap = '8px';
      header.style.position = 'relative';

      const headerMain = document.createElement('div');
      headerMain.style.display = 'flex';
      headerMain.style.alignItems = 'center';
      headerMain.style.justifyContent = 'center';
      headerMain.style.minWidth = '0';
      headerMain.style.width = '100%';

      const titleInput = document.createElement('input');
      titleInput.type = 'text';
      titleInput.value = String(entry.name || '');
      titleInput.style.width = '140px';
      titleInput.style.height = '22px';
      titleInput.style.padding = '0 6px';
      titleInput.style.border = '1px solid #3a3a3a';
      titleInput.style.background = '#101010';
      titleInput.style.color = '#dddddd';
      titleInput.style.font = "700 11px 'Segoe UI', sans-serif";
      titleInput.style.minWidth = '0';

      const closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.textContent = 'X';
      closeBtn.style.height = '22px';
      closeBtn.style.minWidth = '22px';
      closeBtn.style.border = '1px solid #7f2b2b';
      closeBtn.style.background = '#5a1e1e';
      closeBtn.style.color = '#ffe8e8';
      closeBtn.style.font = "700 11px 'Segoe UI', sans-serif";
      closeBtn.style.cursor = 'pointer';
      closeBtn.style.position = 'absolute';
      closeBtn.style.right = '0';
      closeBtn.style.top = '0';

      const toValidHex = (value, fallback) => {
        const text = String(value || '').trim();
        const normalized = text.startsWith('#') ? text : `#${text}`;
        return /^#[0-9a-f]{6}$/i.test(normalized) ? normalized.toLowerCase() : fallback;
      };

      const buildColorEditor = (labelText, initialColor, resetColor) => {
        const fallback = toValidHex(initialColor, '#1a1a1a');
        const resetTo = toValidHex(resetColor, fallback);
        const wrap = document.createElement('div');
        wrap.style.display = 'flex';
        wrap.style.alignItems = 'flex-start';
        wrap.style.justifyContent = 'space-between';
        wrap.style.gap = '8px';

        const label = document.createElement('label');
        label.textContent = labelText;
        label.style.color = '#bdbdbd';
        label.style.font = "600 11px 'Segoe UI', sans-serif";
        label.style.paddingTop = '4px';

        const editor = document.createElement('div');
        editor.style.display = 'flex';
        editor.style.alignItems = 'center';
        editor.style.gap = '6px';

        const resetBtn = document.createElement('button');
        resetBtn.type = 'button';
        resetBtn.title = 'Reset color';
        resetBtn.style.width = '24px';
        resetBtn.style.height = '24px';
        resetBtn.style.minWidth = '24px';
        resetBtn.style.border = '1px solid #7f2b2b';
        resetBtn.style.background = '#5a1e1e';
        resetBtn.style.borderRadius = '4px';
        resetBtn.style.display = 'inline-flex';
        resetBtn.style.alignItems = 'center';
        resetBtn.style.justifyContent = 'center';
        resetBtn.style.cursor = 'pointer';
        resetBtn.style.padding = '0';

        const resetIcon = document.createElement('img');
        resetIcon.alt = '';
        resetIcon.decoding = 'async';
        resetIcon.draggable = false;
        resetIcon.src = RESET_ICON_URL;
        resetIcon.style.width = '13px';
        resetIcon.style.height = '13px';
        resetIcon.style.pointerEvents = 'none';
        resetBtn.appendChild(resetIcon);

        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.value = fallback;
        colorInput.style.width = '38px';
        colorInput.style.height = '24px';
        colorInput.style.border = '1px solid #3a3a3a';
        colorInput.style.background = '#101010';

        const hexInput = document.createElement('input');
        hexInput.type = 'text';
        hexInput.value = fallback;
        hexInput.maxLength = 7;
        hexInput.style.width = '64px';
        hexInput.style.height = '24px';
        hexInput.style.padding = '0 6px';
        hexInput.style.border = '1px solid #3a3a3a';
        hexInput.style.background = '#101010';
        hexInput.style.color = '#dddddd';
        hexInput.style.font = "600 11px 'Consolas', monospace";

        let current = fallback;

        const syncToUi = () => {
          colorInput.value = current;
          hexInput.value = current;
          hexInput.style.borderColor = '#3a3a3a';
        };

        colorInput.addEventListener('input', () => {
          current = toValidHex(colorInput.value, current);
          syncToUi();
        });
        hexInput.addEventListener('input', () => {
          const normalized = toValidHex(hexInput.value, '');
          if (!normalized) {
            hexInput.style.borderColor = '#8a3a3a';
            return;
          }
          current = normalized;
          syncToUi();
        });

        resetBtn.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();
          current = resetTo;
          syncToUi();
        });

        editor.append(resetBtn, colorInput, hexInput);
        wrap.append(label, editor);

        return {
          wrap,
          getColor: () => current
        };
      };

      const entryColorPair = normalizeFolderColorPair(entry && entry.color1, entry && entry.color2);
      const folderColorEditor = buildColorEditor('Folder Color', toValidHex(entryColorPair.bg, DEFAULT_FOLDER_BG_COLOR), DEFAULT_FOLDER_BG_COLOR);
      const textColorEditor = buildColorEditor('Text Color', toValidHex(entryColorPair.text, DEFAULT_FOLDER_TEXT_COLOR), DEFAULT_FOLDER_TEXT_COLOR);

      const actions = document.createElement('div');
      actions.style.display = 'flex';
      actions.style.gap = '8px';
      actions.style.marginTop = '2px';

      const saveBtn = document.createElement('button');
      saveBtn.type = 'button';
      saveBtn.textContent = 'Save';
      saveBtn.style.flex = '1 1 auto';
      saveBtn.style.height = '26px';
      saveBtn.style.border = '1px solid #2f5a35';
      saveBtn.style.background = '#1f3a23';
      saveBtn.style.color = '#d8f5dd';
      saveBtn.style.font = "700 11px 'Segoe UI', sans-serif";
      saveBtn.style.cursor = 'pointer';

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.textContent = 'Delete Folder';
      deleteBtn.style.flex = '1 1 auto';
      deleteBtn.style.height = '26px';
      deleteBtn.style.border = '1px solid #6b2d2d';
      deleteBtn.style.background = '#3f1f1f';
      deleteBtn.style.color = '#ffdcdc';
      deleteBtn.style.font = "700 11px 'Segoe UI', sans-serif";
      deleteBtn.style.cursor = 'pointer';

      headerMain.append(titleInput);
      header.append(headerMain, closeBtn);
      actions.append(saveBtn, deleteBtn);
      menu.append(header, folderColorEditor.wrap, textColorEditor.wrap, actions);

      const setOverflowVisible = (visible) => {
        const nextVisible = Boolean(visible);
        countText.style.opacity = nextVisible ? '0' : '1';
        actionBtn.style.opacity = nextVisible ? '1' : '0';
        actionBtn.style.pointerEvents = nextVisible ? 'auto' : 'none';
      };
      setOverflowVisible(false);

      let isMenuOpen = false;
      const closeMenu = () => {
        isMenuOpen = false;
        menu.style.display = 'none';
        setOverflowVisible(false);
      };
      const openMenu = () => {
        isMenuOpen = true;
        menu.style.display = 'flex';
        setOverflowVisible(true);
      };

      const handleOutsideMenuPointerDown = (event) => {
        if (!isMenuOpen) {
          return;
        }
        const target = event.target;
        if (target instanceof Element && row.contains(target)) {
          return;
        }
        closeMenu();
      };
      window.addEventListener('pointerdown', handleOutsideMenuPointerDown, true);
      row.addEventListener('DOMNodeRemoved', () => {
        window.removeEventListener('pointerdown', handleOutsideMenuPointerDown, true);
      }, { once: true });

      actionBtn.addEventListener('mouseenter', () => {
        actionBtn.style.color = actionHoverColor;
        actionBtn.style.filter = 'brightness(1.2)';
      });
      actionBtn.addEventListener('mouseleave', () => {
        actionBtn.style.color = actionBaseColor;
        actionBtn.style.filter = 'none';
      });
      const swallowOverflowClick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
      };
      actionBtn.addEventListener('pointerdown', swallowOverflowClick);
      actionBtn.addEventListener('mousedown', swallowOverflowClick);
      actionBtn.addEventListener('click', (event) => {
        swallowOverflowClick(event);
        if (isMenuOpen) {
          closeMenu();
          return;
        }
        openMenu();
      });

      const swallowMenuEvent = (event) => {
        event.stopPropagation();
        event.stopImmediatePropagation();
      };
      menu.addEventListener('pointerdown', swallowMenuEvent);
      menu.addEventListener('mousedown', swallowMenuEvent);
      menu.addEventListener('click', swallowMenuEvent);
      closeBtn.addEventListener('click', (event) => {
        swallowOverflowClick(event);
        closeMenu();
      });
      saveBtn.addEventListener('click', (event) => {
        swallowOverflowClick(event);
        const ok = window.confirm('Are you sure you want to save these changes?');
        if (!ok) {
          return;
        }
        const folderId = normalizeId(entry && entry.id);
        const nextName = String(titleInput.value || '').trim();
        if (!folderId || !nextName) {
          return;
        }

        const preservedPage = favoritesCurrentPage;
        const preservedSelectionId = activeFolderSelectionId;
        const preservedExpectedCount = activeFolderExpectedCount;

        const parentRaw = entry && (entry.parent_id != null ? entry.parent_id : entry.parentId);
        const parentId = normalizeId(parentRaw);
        const body = new URLSearchParams();
        body.set('folderId', folderId);
        body.set('editFolderId', folderId);
        body.set('fname', nextName);
        body.set('bgColor', folderColorEditor.getColor());
        body.set('textColor', textColorEditor.getColor());
        body.set('parentId', parentId && parentId !== '0' ? parentId : '');
        body.set('nsfw', '0');
        body.set('folderFont', String(entry && (entry.folder_font ?? entry.folderFont ?? 0)));
        body.set('folderSize', String(entry && (entry.folder_size ?? entry.folderSize ?? 0)));

        saveBtn.disabled = true;
        saveBtn.style.opacity = '0.7';

        fetch('/favorites/addFavFolder', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            Accept: 'application/json, text/javascript, */*; q=0.01',
            'X-Requested-With': 'XMLHttpRequest'
          },
          body: body.toString()
        })
          .then((response) => response.text())
          .then((text) => parseJsonSafe(text))
          .then((parsed) => {
            if (!parsed || parsed.success !== true) {
              throw new Error('update folder failed');
            }
            if (Array.isArray(parsed.folders)) {
              favoritesPayloadCache = {
                ...(favoritesPayloadCache || {}),
                ...parsed,
                folders: parsed.folders
              };
              favoritesPayloadVersion += 1;
              notifyFavoritesPayloadSubscribers();
            }
            return refreshFavoritesPayload(true);
          })
          .then(() => {
            favoritesCurrentPage = preservedPage;
            setActiveFolderSelectionId(preservedSelectionId || folderId);
            setActiveFolderExpectedCount(preservedExpectedCount);
            scheduleFavoritesTileLayout(true);
            renderFolders();
            closeMenu();
          })
          .catch((error) => {
            folderRuntimeDebug('folder edit save failed', {
              error: String(error),
              id: folderId,
              name: nextName
            });
          })
          .finally(() => {
            saveBtn.disabled = false;
            saveBtn.style.opacity = '1';
          });
      });
      deleteBtn.addEventListener('click', (event) => {
        swallowOverflowClick(event);
        const ok = window.confirm('Are you sure you want to delete this folder?');
        if (!ok) {
          return;
        }
        const folderId = normalizeId(entry && entry.id);
        if (!folderId) {
          return;
        }

        const preservedPage = favoritesCurrentPage;
        const preservedSelectionId = activeFolderSelectionId;
        const preservedExpectedCount = activeFolderExpectedCount;

        const body = new URLSearchParams();
        body.set('folderId', folderId);
        body.set('nsfw', '0');

        deleteBtn.disabled = true;
        deleteBtn.style.opacity = '0.7';

        fetch('/favorites/delFavFolder', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            Accept: 'application/json, text/javascript, */*; q=0.01',
            'X-Requested-With': 'XMLHttpRequest'
          },
          body: body.toString()
        })
          .then((response) => response.text())
          .then((text) => parseJsonSafe(text))
          .then((parsed) => {
            if (!parsed || parsed.success !== true) {
              throw new Error('delete folder failed');
            }
            if (Array.isArray(parsed.folders)) {
              favoritesPayloadCache = {
                ...(favoritesPayloadCache || {}),
                ...parsed,
                folders: parsed.folders
              };
              favoritesPayloadVersion += 1;
              notifyFavoritesPayloadSubscribers();
            }
            return refreshFavoritesPayload(true);
          })
          .then(() => {
            favoritesCurrentPage = preservedPage;
            const deletedWasSelected = normalizeId(preservedSelectionId) === folderId;
            setActiveFolderSelectionId(deletedWasSelected ? '' : preservedSelectionId);
            setActiveFolderExpectedCount(deletedWasSelected ? 0 : preservedExpectedCount);
            scheduleFavoritesTileLayout(true);
            renderFolders();
            closeMenu();
          })
          .catch((error) => {
            folderRuntimeDebug('folder edit delete failed', {
              error: String(error),
              id: folderId,
              name: String(titleInput.value || '').trim()
            });
          })
          .finally(() => {
            deleteBtn.disabled = false;
            deleteBtn.style.opacity = '1';
          });
      });

      right.append(countText, actionBtn);

      row.append(left, right, menu);
      const toggleOpen = (event) => {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        const id = normalizeId(entry.id);
        if (openParentIds.has(id)) {
          openParentIds.delete(id);
          openParentFolderIdsState.delete(id);
        } else {
          openParentIds.add(id);
          openParentFolderIdsState.add(id);
        }
        renderFolders();
      };
      if (level === 0) {
        prefix.addEventListener('click', toggleOpen);
        prefix.addEventListener('mouseenter', () => {
          icon.style.filter = 'brightness(1.2)';
          icon.style.opacity = '1';
        });
        prefix.addEventListener('mouseleave', () => {
          icon.style.filter = 'brightness(0.95)';
          icon.style.opacity = '0.92';
        });
      }
      row.addEventListener('mouseenter', () => setOverflowVisible(true));
      row.addEventListener('mouseleave', () => {
        if (!isMenuOpen) {
          setOverflowVisible(false);
        }
      });
      const activateFolderRow = (event) => {
        if (suppressNextRowClick) {
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        const rowRect = row.getBoundingClientRect();
        const nameRect = name.getBoundingClientRect();
        const x = event.clientX;
        const isLeftOfText = level === 0 && x < Math.max(rowRect.left, nameRect.left);
        if (isLeftOfText) {
          toggleOpen(event);
          return;
        }
        const id = normalizeId(entry.id);
        if (id && id === activeFolderSelectionId) {
          // Prevent redundant native re-load attempts for the currently loaded folder.
          renderFolders();
          return;
        }
        setActiveFolderSelectionId(id);
        setActiveFolderExpectedCount(entry && entry.count);
        renderFolders();
        loadFolderTiles(entry);
      };
      row.addEventListener('pointerdown', (event) => {
        // Do not prevent default on pointerdown so native dragstart can fire.
        if (event.target instanceof Element && event.target.closest('button,input,select,textarea')) {
          return;
        }
        event.stopPropagation();
      });
      row.addEventListener('click', activateFolderRow);
      row.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          activateFolderRow(event);
        }
      });
      return row;
    };

    const renderNewFolderRow = () => {
      const row = document.createElement('div');
      row.className = 'fjBettermentsFolderRow fjBettermentsFolderNewRow';
      row.style.display = 'flex';
      row.style.alignItems = 'center';
      row.style.justifyContent = 'space-between';
      row.style.gap = '8px';
      row.style.width = '100%';
      row.style.height = `${FOLDER_BUTTON_HEIGHT_PX}px`;
      row.style.minHeight = `${FOLDER_BUTTON_HEIGHT_PX}px`;
      row.style.padding = '0 8px 0 4px';
      row.style.border = '1px solid #2a2a2a';
      row.style.borderRadius = '0';
      row.style.background = '#202020';
      row.style.color = '#dddddd';
      row.style.boxSizing = 'border-box';
      row.style.cursor = 'default';
      row.style.font = "600 12px 'Segoe UI', sans-serif";
      row.style.userSelect = 'none';

      const left = document.createElement('span');
      left.style.display = 'inline-flex';
      left.style.alignItems = 'center';
      left.style.gap = '0';
      left.style.flex = '1 1 auto';
      left.style.minWidth = '0';

      const prefix = document.createElement('span');
      prefix.style.display = 'inline-flex';
      prefix.style.alignItems = 'center';
      prefix.style.justifyContent = 'center';
      prefix.style.width = '34px';
      prefix.style.minWidth = '34px';
      prefix.style.flex = '0 0 34px';

      const iconSlot = document.createElement('span');
      iconSlot.style.display = 'inline-flex';
      iconSlot.style.alignItems = 'center';
      iconSlot.style.justifyContent = 'center';
      iconSlot.style.width = '30px';
      iconSlot.style.minWidth = '30px';
      iconSlot.style.flex = '0 0 30px';
      iconSlot.style.position = 'relative';

      const icon = createFolderIconSvg(false, true);
      icon.style.width = '30px';
      icon.style.height = '30px';
      icon.style.opacity = '0.92';
      icon.style.filter = 'brightness(0.95)';
      icon.style.pointerEvents = 'none';
      icon.style.userSelect = 'none';

      const plus = document.createElement('span');
      plus.textContent = '+';
      plus.style.position = 'absolute';
      plus.style.left = '50%';
      plus.style.top = '48%';
      plus.style.transform = 'translate(-50%, -50%)';
      plus.style.font = "900 18px 'Segoe UI', sans-serif";
      plus.style.color = '#202020';
      plus.style.lineHeight = '1';
      plus.style.pointerEvents = 'none';

      iconSlot.append(icon, plus);
      prefix.appendChild(iconSlot);
      left.appendChild(prefix);

      const name = document.createElement('span');
      name.textContent = 'New Folder';
      name.style.whiteSpace = 'nowrap';
      name.style.overflow = 'hidden';
      name.style.textOverflow = 'ellipsis';
      name.style.marginLeft = '2px';
      left.appendChild(name);

      const right = document.createElement('span');
      right.textContent = '';
      right.style.flex = '0 0 auto';

      row.append(left, right);
      const startEvent = (event) => {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        startLocalFolderDraft();
      };
      row.addEventListener('pointerdown', startEvent);
      row.addEventListener('mousedown', startEvent);
      row.addEventListener('click', startEvent);
      return row;
    };

    const renderLocalFolderRow = (entry) => {
      const row = document.createElement('div');
      row.className = 'fjBettermentsFolderRow fjBettermentsFolderLocalRow';
      row.style.display = 'flex';
      row.style.alignItems = 'center';
      row.style.justifyContent = 'space-between';
      row.style.gap = '8px';
      row.style.width = '100%';
      row.style.height = `${FOLDER_BUTTON_HEIGHT_PX}px`;
      row.style.minHeight = `${FOLDER_BUTTON_HEIGHT_PX}px`;
      row.style.padding = '0 8px 0 4px';
      row.style.border = '1px solid #2a2a2a';
      row.style.borderRadius = '6px';
      const isSelected = normalizeId(entry && entry.id) === localFolderSelectionId;
      row.style.background = isSelected ? '#232323' : '#1a1a1a';
      row.style.color = '#dddddd';
      row.style.boxSizing = 'border-box';
      row.style.cursor = entry && entry.isDraft ? 'text' : 'pointer';
      row.style.font = "500 12px 'Segoe UI', sans-serif";

      const left = document.createElement('span');
      left.style.display = 'inline-flex';
      left.style.alignItems = 'center';
      left.style.gap = '0';
      left.style.flex = '1 1 auto';
      left.style.minWidth = '0';

      const prefix = document.createElement('span');
      prefix.style.display = 'inline-flex';
      prefix.style.alignItems = 'center';
      prefix.style.justifyContent = 'center';
      prefix.style.width = '34px';
      prefix.style.minWidth = '34px';
      prefix.style.flex = '0 0 34px';

      const iconSlot = document.createElement('span');
      iconSlot.style.display = 'inline-flex';
      iconSlot.style.alignItems = 'center';
      iconSlot.style.justifyContent = 'center';
      iconSlot.style.width = '30px';
      iconSlot.style.minWidth = '30px';
      iconSlot.style.flex = '0 0 30px';

      const icon = createFolderIconSvg(false, true);
      icon.style.width = '30px';
      icon.style.height = '30px';
      icon.style.opacity = '0.92';
      icon.style.filter = 'brightness(0.95)';
      icon.style.pointerEvents = 'none';
      icon.style.userSelect = 'none';
      iconSlot.appendChild(icon);
      prefix.appendChild(iconSlot);
      left.appendChild(prefix);

      const right = document.createElement('span');
      right.textContent = '';
      right.style.flex = '0 0 auto';

      const stopBubble = (event) => {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
      };

      if (entry && entry.isDraft) {
        const input = document.createElement('input');
        input.type = 'text';
        input.maxLength = 48;
        input.placeholder = 'Folder name';
        input.value = String(entry && entry.name ? entry.name : '');
        input.style.flex = '1 1 auto';
        input.style.minWidth = '0';
        input.style.height = '20px';
        input.style.padding = '0 4px';
        input.style.border = 'none';
        input.style.outline = 'none';
        input.style.background = 'transparent';
        input.style.color = '#dddddd';
        input.style.font = "600 12px 'Segoe UI', sans-serif";

        let done = false;
        let outsideListenerArmed = false;
        const handleOutsidePointerDown = (event) => {
          if (!outsideListenerArmed || done) {
            return;
          }
          const target = event.target;
          if (target instanceof Element && row.contains(target)) {
            return;
          }
          finish(true);
        };
        const disposeOutsideListener = () => {
          window.removeEventListener('pointerdown', handleOutsidePointerDown, true);
          outsideListenerArmed = false;
        };
        const finish = (commit) => {
          if (done) {
            return;
          }
          done = true;
          disposeOutsideListener();
          finalizeLocalFolderDraft(entry.id, commit ? input.value : '');
        };

        input.addEventListener('keydown', (event) => {
          event.stopPropagation();
          if (event.key === 'Enter') {
            event.preventDefault();
            finish(true);
            return;
          }
          if (event.key === 'Escape') {
            event.preventDefault();
            finish(false);
          }
        });
        input.addEventListener('blur', () => {
          finish(true);
        }, { once: true });
        input.addEventListener('click', (event) => event.stopPropagation());

        left.appendChild(input);
        row.append(left, right);
        const stopBubbleDraft = (event) => {
          event.stopPropagation();
          event.stopImmediatePropagation();
        };
        row.addEventListener('pointerdown', stopBubbleDraft);
        row.addEventListener('mousedown', stopBubbleDraft);
        row.addEventListener('click', stopBubbleDraft);

        window.setTimeout(() => {
          if (done) {
            return;
          }
          outsideListenerArmed = true;
          window.addEventListener('pointerdown', handleOutsidePointerDown, true);
        }, 0);

        if (pendingDraftFocusId === normalizeId(entry.id)) {
          window.setTimeout(() => {
            try {
              input.focus();
              input.select();
            } catch (_) {}
          }, 0);
        }
        return row;
      }

      const name = document.createElement('span');
      name.textContent = String(entry && entry.name ? entry.name : 'Untitled');
      name.style.whiteSpace = 'nowrap';
      name.style.overflow = 'hidden';
      name.style.textOverflow = 'ellipsis';
      name.style.marginLeft = '2px';
      left.appendChild(name);

      row.append(left, right);
      row.addEventListener('pointerdown', (event) => {
        stopBubble(event);
        localFolderSelectionId = normalizeId(entry.id);
        renderFolders();
      });
      row.addEventListener('mousedown', stopBubble);
      row.addEventListener('click', stopBubble);
      return row;
    };

    const renderFolders = () => {
      listWrap.textContent = '';
      selectedFolderId = activeFolderSelectionId;
      syncUncategorizedButtonState();
      const tree = getFolderTree(favoritesPayloadCache);
      if (!tree.length) {
        const empty = document.createElement('div');
        empty.textContent = 'No folder data yet.';
        empty.style.color = '#9d9d9d';
        empty.style.font = "500 12px 'Segoe UI', sans-serif";
        empty.style.padding = '4px 2px';
        listWrap.appendChild(empty);
        localFolders.forEach((localFolder) => {
          listWrap.appendChild(renderLocalFolderRow(localFolder));
        });
        listWrap.appendChild(renderNewFolderRow());
        return;
      }

      tree.forEach((parent) => {
        const children = Array.isArray(parent.children) ? parent.children : [];
        const hasChildren = children.length > 0 || parent.childCount > 0;
        const isOpen = openParentIds.has(parent.id);
        const parentRow = renderFolderRow(parent, 0, hasChildren, isOpen);
        attachFolderDragHandlers(parentRow, parent, 0);
        listWrap.appendChild(parentRow);
        if (hasChildren && isOpen) {
          children.forEach((child) => {
            const childHasChildren = Number(child.childCount || 0) > 0;
            const childIsOpen = openParentIds.has(child.id);
            const childRow = renderFolderRow(child, 1, childHasChildren, childIsOpen);
            attachFolderDragHandlers(childRow, child, 1);
            listWrap.appendChild(childRow);
          });
        }
      });

      localFolders.forEach((localFolder) => {
        listWrap.appendChild(renderLocalFolderRow(localFolder));
      });

      listWrap.appendChild(renderNewFolderRow());
    };

    const subscriber = () => {
      renderFolders();
    };
    const selectionSubscriber = () => {
      renderFolders();
    };
    favoritesPayloadSubscribers.add(subscriber);
    folderSelectionSubscribers.add(selectionSubscriber);
    column.addEventListener('DOMNodeRemoved', () => {
      favoritesPayloadSubscribers.delete(subscriber);
      folderSelectionSubscribers.delete(selectionSubscriber);
    }, { once: true });

    // Keep native folder controls hidden so their click handlers can still drive tile loading.
    const nativeFolderRoot = document.querySelector('#rFolder');
    if (nativeFolderRoot) {
      nativeFolderRoot.style.setProperty('position', 'absolute', 'important');
      nativeFolderRoot.style.setProperty('left', '-100000px', 'important');
      nativeFolderRoot.style.setProperty('top', '0', 'important');
      nativeFolderRoot.style.setProperty('width', '320px', 'important');
      nativeFolderRoot.style.setProperty('height', 'auto', 'important');
      nativeFolderRoot.style.setProperty('overflow', 'visible', 'important');
      nativeFolderRoot.style.setProperty('opacity', '0', 'important');
      nativeFolderRoot.style.setProperty('pointer-events', 'none', 'important');
    }

    renderFolders();
    if (!favoritesPayloadCache && !favoritesBootstrapRequested) {
      favoritesBootstrapRequested = true;
      refreshFavoritesPayload();
    }
    return column;
  };

  const applyFavoritesTileColumns = (targetColumns) => {
    if (!enabled || applyingTilesLayout) {
      return;
    }

    const container = document.querySelector(TILE_CONTAINER_SELECTOR);
    if (!container) {
      return;
    }

    const currentOrderKey = `${getRequestKeyWithoutCursor()}::${String(activeFolderSelectionId || '')}`;
    if (paginationOrderKey !== currentOrderKey) {
      paginationOrderKey = currentOrderKey;
      paginationRowOrder = [];
      favoritesCurrentPage = 1;
      resetNativePreloadState(currentOrderKey);
      resetDetachedTileRows(currentOrderKey);
    }
    if (detachedTileRowsContextKey !== currentOrderKey) {
      resetDetachedTileRows(currentOrderKey);
    }

    const rows = collectTileRows(container);
    const columns = Math.max(1, Number(targetColumns) || TILE_COLUMNS_ENABLED);
    const pageSize = getTilesPerPage(columns);
    const payloadTotalRows = getPayloadTotalCount(favoritesPayloadCache);
    const folderScopedTotal = activeFolderSelectionId
      ? Math.max(activeFolderExpectedCount, rows.length)
      : Math.max(payloadTotalRows, rows.length);
    const knownTotalRows = Math.max(1, folderScopedTotal);
    const totalPages = Math.max(1, Math.ceil(knownTotalRows / pageSize));
    favoritesCurrentPage = Math.min(totalPages, Math.max(1, favoritesCurrentPage));

    const retainedPagePadding = 2;
    const windowStartPage = Math.max(1, favoritesCurrentPage - retainedPagePadding);
    const windowEndPage = Math.min(totalPages, favoritesCurrentPage + retainedPagePadding);
    const preloadSet = getRequiredFetchSetForPage(windowEndPage, columns);
    const preloadTargetRows = getTargetRowCountForFetchSet(preloadSet, knownTotalRows);
    if (rows.length > 0 && rows.length < preloadTargetRows) {
      ensureNativeTilesLoadedThrough(preloadTargetRows);
    }

    const containerWidth = container.clientWidth || container.getBoundingClientRect().width || 0;
    const totalSlots = columns + 1; // left side column + tile columns
    const columnWidth = containerWidth > 0
      ? (containerWidth - (totalSlots - 1) * TILE_GAP_PX) / totalSlots
      : null;
    const tileAreaWidth = Number.isFinite(columnWidth) && columnWidth > 0
      ? (columnWidth * columns) + (TILE_GAP_PX * (columns - 1))
      : null;

    const resumeObserver = () => {
      if (bodyObserver && enabled && document.body) {
        bodyObserver.observe(document.body, { childList: true, subtree: true });
      }
    };

    applyingTilesLayout = true;
    try {
      if (bodyObserver) {
        bodyObserver.disconnect();
      }

      container.style.display = 'flex';
      container.style.justifyContent = 'center';
      container.style.alignItems = 'flex-start';
      container.style.gap = `${TILE_GAP_PX}px`;
      container.style.transform = 'translateX(-1px)';

      const sideColumn = buildSideColumn(columnWidth);
      const newColumns = Array.from({ length: columns }, () => buildTileColumn(columnWidth));
      rows.forEach((row, index) => {
        const rowKey = getRowStableKey(row);
        const pageForRow = Math.floor(index / pageSize) + 1;
        const keepMounted = pageForRow >= windowStartPage && pageForRow <= windowEndPage;

        if (!keepMounted) {
          detachedTileRowsByKey.set(rowKey, row);
          if (row.parentNode) {
            row.parentNode.removeChild(row);
          }
          return;
        }

        detachedTileRowsByKey.delete(rowKey);
        if (typeof row.dataset.fjOrigDisplay === 'undefined') {
          row.dataset.fjOrigDisplay = row.style.display || '';
        }
        const isVisibleOnPage = pageForRow === favoritesCurrentPage;
        row.style.display = isVisibleOnPage ? row.dataset.fjOrigDisplay : 'none';
        newColumns[index % columns].appendChild(row);
      });

      const existingColumns = Array.from(container.querySelectorAll(`.${TILE_COLUMN_CLASS}`));
      existingColumns.forEach((column) => column.remove());
      const existingSideColumns = Array.from(container.querySelectorAll(`.${TILE_SIDE_COLUMN_CLASS}`));
      existingSideColumns.forEach((column) => column.remove());
      const existingMainAreas = Array.from(container.querySelectorAll(`.${TILE_MAIN_AREA_CLASS}`));
      existingMainAreas.forEach((node) => node.remove());
      const existingEmpty = Array.from(container.querySelectorAll('.fjBettermentsTilesEmpty'));
      existingEmpty.forEach((node) => node.remove());

      const mainArea = document.createElement('div');
      mainArea.className = TILE_MAIN_AREA_CLASS;
      mainArea.style.display = 'flex';
      mainArea.style.flexDirection = 'column';
      mainArea.style.gap = `${TILE_GAP_PX}px`;
      if (Number.isFinite(tileAreaWidth) && tileAreaWidth > 0) {
        mainArea.style.width = `${tileAreaWidth}px`;
        mainArea.style.minWidth = `${tileAreaWidth}px`;
      }

      const topBar = buildTileTopBar({
        currentPage: favoritesCurrentPage,
        totalPages,
        onPageChange: (nextPage) => {
          const clamped = Math.min(totalPages, Math.max(1, Number(nextPage) || 1));
          if (clamped === favoritesCurrentPage) {
            return;
          }
          favoritesCurrentPage = clamped;
          const jumpWindowEndPage = Math.min(totalPages, clamped + retainedPagePadding);
          const jumpTargetSet = getRequiredFetchSetForPage(jumpWindowEndPage, columns);
          const jumpTargetRows = getTargetRowCountForFetchSet(jumpTargetSet, knownTotalRows);
          ensureNativeTilesLoadedThrough(jumpTargetRows);
          scheduleFavoritesTileLayout(true);
        }
      });

      const columnsRow = document.createElement('div');
      columnsRow.className = TILE_COLUMNS_ROW_CLASS;
      columnsRow.style.display = 'flex';
      columnsRow.style.alignItems = 'flex-start';
      columnsRow.style.gap = `${TILE_GAP_PX}px`;
      newColumns.forEach((column) => columnsRow.appendChild(column));

      if (!rows.length) {
        const emptyHost = newColumns[0] || columnsRow;
        const empty = document.createElement('div');
        empty.className = 'fjBettermentsNothingHere';
        empty.textContent = 'Nothing here!';
        empty.style.padding = '14px';
        empty.style.color = '#a5a5a5';
        empty.style.font = "600 13px 'Segoe UI', sans-serif";
        emptyHost.appendChild(empty);
      }

      mainArea.append(topBar, columnsRow);

      container.appendChild(sideColumn);
      container.appendChild(mainArea);

      const maxColumnHeight = newColumns.reduce((maxHeight, column) => {
        const nextHeight = column.getBoundingClientRect().height;
        return nextHeight > maxHeight ? nextHeight : maxHeight;
      }, 0);
      const minimumSideHeight = TILE_TOP_BAR_HEIGHT_PX + TILE_GAP_PX + 64;
      sideColumn.style.minHeight = `${Math.ceil(Math.max(minimumSideHeight, maxColumnHeight + TILE_TOP_BAR_HEIGHT_PX + TILE_GAP_PX))}px`;
    } finally {
      resumeObserver();
      applyingTilesLayout = false;
    }
  };

  const scheduleFavoritesTileLayout = (force = false) => {
    if (!enabled || layoutFrame) {
      return;
    }

    if (!force) {
      const now = Date.now();
      if (now - lastLayoutRunAt < LAYOUT_COOLDOWN_MS) {
        return;
      }
    }

    layoutFrame = window.requestAnimationFrame(() => {
      layoutFrame = 0;
      lastLayoutRunAt = Date.now();
      applyFavoritesTileColumns(TILE_COLUMNS_ENABLED);
    });
  };

  const hasBrokenTileLayout = () => {
    const container = document.querySelector(TILE_CONTAINER_SELECTOR);
    if (!container) {
      return false;
    }

    const directChildren = Array.from(container.children || []);
    const hasDirectMasonryColumns = directChildren.some((node) =>
      node.classList && node.classList.contains(TILE_COLUMN_CLASS)
    );
    if (hasDirectMasonryColumns) {
      return true;
    }

    const mainArea = directChildren.find((node) =>
      node.classList && node.classList.contains(TILE_MAIN_AREA_CLASS)
    );
    if (!mainArea) {
      return false;
    }

    const columnsRow = mainArea.querySelector(`:scope > .${TILE_COLUMNS_ROW_CLASS}`);
    const hasColumnsInMainArea = Boolean(columnsRow && columnsRow.querySelector(`.${TILE_COLUMN_CLASS}`));
    const hasVisibleTiles = container.querySelectorAll(TILE_ROW_SELECTOR).length > 0;

    return hasVisibleTiles && !hasColumnsInMainArea;
  };

  const applyGalleryWidth = () => {
    const gallery = document.querySelector(GALLERY_SELECTOR);
    if (!gallery) {
      return;
    }

    const rect = gallery.getBoundingClientRect();
    const measuredWidth = rect.width || gallery.clientWidth || 0;
    if (!measuredWidth) {
      return;
    }

    if (!gallery.dataset.fjBettermentsBaseWidth) {
      gallery.dataset.fjBettermentsBaseWidth = String(measuredWidth);
      gallery.dataset.fjBettermentsOriginalLeft = gallery.style.left || '';
      gallery.dataset.fjBettermentsOriginalTransform = gallery.style.transform || '';
      gallery.dataset.fjBettermentsOriginalWidth = gallery.style.width || '';
      gallery.dataset.fjBettermentsOriginalMaxWidth = gallery.style.maxWidth || '';
    }

    const baseWidth = Number(gallery.dataset.fjBettermentsBaseWidth) || measuredWidth;
    const targetWidth = Math.max(baseWidth, baseWidth * GALLERY_WIDTH_MULTIPLIER);
    const roundedWidth = Math.round(targetWidth);

    gallery.style.width = `${roundedWidth}px`;
    gallery.style.maxWidth = 'none';
    gallery.style.left = '50%';
    gallery.style.transform = 'translateX(-50%)';
  };

  const restoreGalleryWidth = () => {
    const gallery = document.querySelector(GALLERY_SELECTOR);
    if (!gallery) {
      return;
    }

    if (Object.prototype.hasOwnProperty.call(gallery.dataset, 'fjBettermentsOriginalLeft')) {
      gallery.style.left = gallery.dataset.fjBettermentsOriginalLeft || '';
    }
    if (Object.prototype.hasOwnProperty.call(gallery.dataset, 'fjBettermentsOriginalTransform')) {
      gallery.style.transform = gallery.dataset.fjBettermentsOriginalTransform || '';
    }
    if (Object.prototype.hasOwnProperty.call(gallery.dataset, 'fjBettermentsOriginalWidth')) {
      gallery.style.width = gallery.dataset.fjBettermentsOriginalWidth || '';
    }
    if (Object.prototype.hasOwnProperty.call(gallery.dataset, 'fjBettermentsOriginalMaxWidth')) {
      gallery.style.maxWidth = gallery.dataset.fjBettermentsOriginalMaxWidth || '';
    }

    delete gallery.dataset.fjBettermentsBaseWidth;
    delete gallery.dataset.fjBettermentsOriginalLeft;
    delete gallery.dataset.fjBettermentsOriginalTransform;
    delete gallery.dataset.fjBettermentsOriginalWidth;
    delete gallery.dataset.fjBettermentsOriginalMaxWidth;
  };

  const scheduleGalleryResize = () => {
    if (!enabled || galleryFrame) {
      return;
    }
    galleryFrame = window.requestAnimationFrame(() => {
      galleryFrame = 0;
      applyGalleryWidth();
      scheduleFavoritesTileLayout();
    });
  };

  const handleWindowResize = () => {
    scheduleGalleryResize();
    scheduleFavoritesTileLayout(true);
  };

  const startObserver = () => {
    if (bodyObserver || !document.body) {
      return;
    }
    bodyObserver = new MutationObserver((mutations) => {
      if (!enabled) {
        return;
      }

      let shouldResize = false;
      let shouldRelayout = false;
      let forceRelayout = false;

      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => removeBlockedMenus(node));
        mutation.addedNodes.forEach((node) => removeProgressWrap(node));
        mutation.addedNodes.forEach((node) => removeEmptyGalleryHint(node));
        mutation.addedNodes.forEach((node) => removeStatusTip(node));
        mutation.addedNodes.forEach((node) => removeFolderExtras(node));
        mutation.addedNodes.forEach((node) => replaceObsoleteTopControls(node));

        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) {
            return;
          }
          if (node.matches(GALLERY_SELECTOR) || node.querySelector(GALLERY_SELECTOR)) {
            shouldResize = true;
            shouldRelayout = true;
            return;
          }
          if (
            node.matches(TILE_CONTAINER_SELECTOR) ||
            node.querySelector(TILE_CONTAINER_SELECTOR) ||
            node.matches(`.${TILE_COLUMN_CLASS}`) ||
            node.querySelector(`.${TILE_COLUMN_CLASS}`) ||
            node.matches(TILE_ROW_SELECTOR) ||
            node.querySelector(TILE_ROW_SELECTOR)
          ) {
            shouldRelayout = true;
            if (node.matches(`.${TILE_COLUMN_CLASS}`) || node.querySelector(`.${TILE_COLUMN_CLASS}`)) {
              forceRelayout = true;
            }
          }
        });
      });

      removeBlockedMenus(document);
      removeProgressWrap(document);
      removeEmptyGalleryHint(document);
      removeStatusTip(document);
      removeFolderExtras(document);
      replaceObsoleteTopControls(document);
      protectRecentPicsInteractions();
      installNativeGalleryLoadGate();
      installNativeScrollGate();

      if (shouldResize) {
        scheduleGalleryResize();
      }
      if (hasBrokenTileLayout()) {
        forceRelayout = true;
        shouldRelayout = true;
      }
      if (shouldRelayout) {
        scheduleFavoritesTileLayout(forceRelayout);
      }
    });
    bodyObserver.observe(document.body, { childList: true, subtree: true });
  };

  const stopObserver = () => {
    if (!bodyObserver) {
      return;
    }
    bodyObserver.disconnect();
    bodyObserver = null;
  };

  const applySetting = (nextEnabled) => {
    enabled = Boolean(nextEnabled);

    if (enabled) {
      nsfwToggleInFlight = false;
      nsfwMinLockUntil = 0;
      setFavoritesUiInteractionLock(false);
      setNativePreloadActive(false);
      installFavoritesPayloadCapture();
      installNativeGalleryLoadGate();
      installNativeScrollGate();
      ensureBlockStyle();
      ensureLayoutGuardStyles();
      removeBlockedMenus(document);
      removeProgressWrap(document);
      removeEmptyGalleryHint(document);
      removeStatusTip(document);
      removeFolderExtras(document);
      replaceObsoleteTopControls(document);
      protectRecentPicsInteractions();
      startObserver();
      scheduleGalleryResize();
      scheduleFavoritesTileLayout(true);
      window.addEventListener('resize', handleWindowResize);
      return;
    }

    if (layoutFrame) {
      window.cancelAnimationFrame(layoutFrame);
      layoutFrame = 0;
    }
    if (galleryFrame) {
      window.cancelAnimationFrame(galleryFrame);
      galleryFrame = 0;
    }
    stopObserver();
    nsfwToggleInFlight = false;
    nsfwMinLockUntil = 0;
    setFavoritesUiInteractionLock(false);
    setNativePreloadActive(false);
    favoritesBootstrapRequested = false;
    paginationOrderKey = '';
    paginationRowOrder = [];
    resetNativePreloadState();
    resetDetachedTileRows();
    restoreNativeGalleryLoadGate();
    window.removeEventListener('resize', handleWindowResize);
    restoreGalleryWidth();
    const tileContainer = document.querySelector(TILE_CONTAINER_SELECTOR);
    if (tileContainer) {
      tileContainer.style.transform = '';
      const existingSideColumns = Array.from(tileContainer.querySelectorAll(`:scope > .${TILE_SIDE_COLUMN_CLASS}`));
      existingSideColumns.forEach((column) => column.remove());
      const existingMainAreas = Array.from(tileContainer.querySelectorAll(`:scope > .${TILE_MAIN_AREA_CLASS}`));
      existingMainAreas.forEach((node) => node.remove());
    }
    removeBlockStyle();
  };

  const handleSettingsChanged = (event) => {
    const detail = event?.detail || {};
    applySetting(detail[SETTING_FLAG]);
  };

  const init = () => {
    if (!isTargetHost()) return;
    const initial = (window.fjTweakerSettings || getStoredSettings() || {})[SETTING_FLAG];
    applySetting(initial);
    document.addEventListener('fjTweakerSettingsChanged', handleSettingsChanged);
  };

  if (!window.fjTweakerModules) {
    window.fjTweakerModules = {};
  }

  window.fjTweakerModules[MODULE_KEY] = { init };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
