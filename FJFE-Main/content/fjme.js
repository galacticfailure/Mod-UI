(() => {
  const targetHost = 'fjme.me';
  const RATINGS_PATH = /^\/mods\/ratings\//i;
  const BUTTON_ID = 'fjfe-fjme-batch-assist';
  const QUEUE_ACTIONS_ID = 'fjfe-fjme-batch-assist-actions';
  const TOAST_ID = 'fjfe-fjme-batch-assist-toast';
  const STORAGE_KEY = 'batchAssist';
  const STORAGE_META_KEY = 'batchAssistMeta';
  const SETTINGS_KEY = 'fjTweakerSettings';
  const FALLBACK_QUEUE_TITLE = 'Untitled import';
  const QUEUE_STATUS = {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    ACKNOWLEDGED: 'acknowledged'
  };
  const CONTENT_INFO_PATH = /\/mods\/contentInfo\/(\d+)/i;

  const normalizeQueueUrl = (value) => {
    if (typeof value !== 'string') {
      return '';
    }
    const trimmed = value.trim();
    if (!trimmed) {
      return '';
    }
    try {
      const parsed = new URL(trimmed);
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

  const extractRateIdFromHref = (href) => {
    if (typeof href !== 'string') {
      return '';
    }
    const trimmed = href.trim();
    if (!trimmed) {
      return '';
    }
    try {
      const parsed = new URL(trimmed, window.location.origin);
      const match = parsed.pathname.match(CONTENT_INFO_PATH);
      if (match) {
        return normalizeRateId(match[1]);
      }
    } catch (_) {}
    const fallbackMatch = trimmed.match(CONTENT_INFO_PATH);
    return fallbackMatch ? normalizeRateId(fallbackMatch[1]) : '';
  };

  const extractPanelRateId = (panel, headingElement) => {
    if (!panel) {
      return '';
    }
    const heading = headingElement || panel.querySelector('.panel-heading');
    if (!heading) {
      return '';
    }
    const headingAnchor = heading.querySelector('a[href*="/mods/contentInfo/"]');
    if (headingAnchor) {
      const href = headingAnchor.getAttribute('href') || headingAnchor.href || '';
      const idFromHref = extractRateIdFromHref(href);
      if (idFromHref) {
        return idFromHref;
      }
    }
    const anyAnchor = panel.querySelector('a[href*="/mods/contentInfo/"]');
    if (anyAnchor) {
      const href = anyAnchor.getAttribute('href') || anyAnchor.href || '';
      const idFromHref = extractRateIdFromHref(href);
      if (idFromHref) {
        return idFromHref;
      }
    }
    const datasetSources = [panel, heading, headingAnchor, anyAnchor];
    for (const source of datasetSources) {
      if (!source) {
        continue;
      }
      const dataset = source.dataset;
      if (dataset) {
        const datasetCandidate = normalizeRateId(dataset.contentId || dataset.rateId);
        if (datasetCandidate) {
          return datasetCandidate;
        }
      }
      if (typeof source.getAttribute === 'function') {
        const attrCandidate = normalizeRateId(
          source.getAttribute('data-content-id') || source.getAttribute('data-rate-id')
        );
        if (attrCandidate) {
          return attrCandidate;
        }
      }
    }
    const dataElement = panel.querySelector('[data-content-id], [data-rate-id]');
    if (dataElement) {
      const attrCandidate = normalizeRateId(
        dataElement.getAttribute('data-content-id') || dataElement.getAttribute('data-rate-id')
      );
      if (attrCandidate) {
        return attrCandidate;
      }
    }
    try {
      const htmlMatch = (panel.innerHTML || '').match(CONTENT_INFO_PATH);
      if (htmlMatch) {
        return normalizeRateId(htmlMatch[1]);
      }
    } catch (_) {}
    return '';
  };

  const normalizeEntryStatus = (value) => (
    value === QUEUE_STATUS.APPROVED || value === QUEUE_STATUS.REJECTED || value === QUEUE_STATUS.ACKNOWLEDGED
      ? value
      : QUEUE_STATUS.PENDING
  );

  if (window.location.hostname !== targetHost) {
    return;
  }

  let observer = null;
  let toastTimer = null;
  let toastElement = null;
  let featureEnabled = false;
  let storageListenerBound = false;
  let navListenersBound = false;
  let queueActionWrapper = null;
  let observerRefreshScheduled = false;
  const isRuntimeFlagEnabled = (flagName, fallback = true) => {
    try {
      return window.fjfeRuntimeFlags?.isEnabled
        ? window.fjfeRuntimeFlags.isEnabled(flagName, fallback)
        : fallback;
    } catch (_) {
      return fallback;
    }
  };

  const normalizeEntries = (entries) => {
    if (!Array.isArray(entries)) {
      return [];
    }
    const normalized = [];
    entries.forEach((entry) => {
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
      const status = normalizeEntryStatus(entry.status);
      const rateId = normalizeRateId(entry.rateId);
      const approveNote = typeof entry.approveNote === 'string' ? entry.approveNote.trim() : '';
      const rejectDetails = entry.rejectDetails && typeof entry.rejectDetails === 'object' ? entry.rejectDetails : null;
      const payload = { url, title: title || FALLBACK_QUEUE_TITLE, status };
      if (rateId) {
        payload.rateId = rateId;
      }
      if (approveNote && (status === QUEUE_STATUS.APPROVED || status === QUEUE_STATUS.ACKNOWLEDGED)) {
        payload.approveNote = approveNote;
      }
      if (rejectDetails && status === QUEUE_STATUS.REJECTED) {
        payload.rejectDetails = rejectDetails;
      }
      normalized.push(payload);
    });
    return normalized;
  };

  const resolveAssetUrl = (relativePath) => {
    if (!relativePath) return '';
    try {
      if (typeof chrome !== 'undefined' && chrome?.runtime?.getURL) {
        return chrome.runtime.getURL(relativePath);
      }
    } catch (_) {}
    return relativePath;
  };

  const cleanupToast = (options = {}) => {
    const animate = Boolean(options.animate);
    if (toastTimer) {
      clearTimeout(toastTimer);
      toastTimer = null;
    }
    if (!toastElement) {
      return;
    }
    const current = toastElement;
    const dispose = () => {
      if (toastElement === current) {
        toastElement = null;
      }
      current.remove();
    };
    if (!animate) {
      dispose();
      return;
    }
    const onTransitionEnd = () => {
      current.removeEventListener('transitionend', onTransitionEnd);
      dispose();
    };
    current.addEventListener('transitionend', onTransitionEnd);
    requestAnimationFrame(() => {
      current.style.opacity = '0';
      current.style.transform = 'translateY(-6px)';
    });
  };

  const showToast = (button, message = 'Exported to Batch Assist') => {
    cleanupToast();
    const toast = document.createElement('span');
    toast.id = TOAST_ID;
    toast.textContent = message;
    Object.assign(toast.style, {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: '8px',
      padding: '4px 8px',
      fontSize: '12px',
      fontWeight: '600',
      color: '#ffffff',
      background: '#222',
      border: '1px solid #444',
      borderRadius: '6px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
      zIndex: '9999',
      opacity: '0',
      transform: 'translateY(6px)',
      transition: 'opacity 0.18s ease, transform 0.18s ease'
    });
    toastElement = toast;
    button.insertAdjacentElement('afterend', toast);
    requestAnimationFrame(() => {
      if (toastElement === toast) {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
      }
    });
    toastTimer = window.setTimeout(() => {
      toastTimer = null;
      cleanupToast({ animate: true });
    }, 3000);
  };

  const persistBatchAssistLinks = (links) => {
    return new Promise((resolve) => {
      const normalized = normalizeEntries(links);
      const payload = { [STORAGE_KEY]: normalized };
      try {
        if (typeof chrome !== 'undefined' && chrome?.storage?.local) {
          chrome.storage.local.set(payload, () => resolve(true));
          return;
        }
      } catch (_) {}
      try {
        localStorage.setItem(`fjfe:${STORAGE_KEY}`, JSON.stringify(normalized));
        resolve(true);
      } catch (_) {
        resolve(false);
      }
    });
  };

  const sanitizeMetadata = (value) => {
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

  const persistBatchAssistMetadata = (metadata) => {
    return new Promise((resolve) => {
      const payload = sanitizeMetadata(metadata);
      const hasPayload = Object.keys(payload).length > 0;
      try {
        if (typeof chrome !== 'undefined' && chrome?.storage?.local) {
          if (hasPayload) {
            chrome.storage.local.set({ [STORAGE_META_KEY]: payload }, () => resolve(true));
          } else {
            chrome.storage.local.remove(STORAGE_META_KEY, () => resolve(true));
          }
          return;
        }
      } catch (_) {}
      try {
        if (hasPayload) {
          localStorage.setItem(`fjfe:${STORAGE_META_KEY}`, JSON.stringify(payload));
        } else {
          localStorage.removeItem(`fjfe:${STORAGE_META_KEY}`);
        }
        resolve(true);
      } catch (_) {
        resolve(false);
      }
    });
  };

  const readBatchAssistLinks = () => {
    return new Promise((resolve) => {
      const finish = (value) => {
        resolve(normalizeEntries(value));
      };
      try {
        if (typeof chrome !== 'undefined' && chrome?.storage?.local) {
          chrome.storage.local.get(STORAGE_KEY, (result = {}) => {
            finish(result?.[STORAGE_KEY]);
          });
          return;
        }
      } catch (_) {}
      try {
        const raw = localStorage.getItem(`fjfe:${STORAGE_KEY}`);
        finish(raw ? JSON.parse(raw) : []);
      } catch (_) {
        finish([]);
      }
    });
  };

  const isAcknowledgedPanel = (panel) => Boolean(panel?.querySelector?.('tr.success'));

  const collectPanelLinks = () => {
    if (!featureEnabled) {
      return [];
    }
    const panels = document.querySelectorAll('.panel.panel-default');
    const seen = new Set();
    const pendingEntries = [];
    const acknowledgedEntries = [];
    panels.forEach((panel) => {
      const heading = panel.querySelector('.panel-heading');
      if (!heading) return;
      const anchor = heading.querySelector('a[href^="https://funnyjunk.com/"]');
      if (!anchor) return;
      const normalizedUrl = normalizeQueueUrl(anchor.href || '');
      if (!normalizedUrl || seen.has(normalizedUrl)) return;
      seen.add(normalizedUrl);
      const title = (anchor.textContent || '').trim() || FALLBACK_QUEUE_TITLE;
      const acknowledged = isAcknowledgedPanel(panel);
      const rateId = extractPanelRateId(panel, heading);
      const targetCollection = acknowledged ? acknowledgedEntries : pendingEntries;
      const entry = {
        url: normalizedUrl,
        title,
        status: acknowledged ? QUEUE_STATUS.ACKNOWLEDGED : QUEUE_STATUS.PENDING
      };
      if (rateId) {
        entry.rateId = rateId;
      }
      targetCollection.push(entry);
    });
    return normalizeEntries([...pendingEntries, ...acknowledgedEntries]);
  };

  const sortAcknowledgedLast = (entries) => {
    const normalized = normalizeEntries(entries);
    const active = [];
    const acknowledged = [];
    normalized.forEach((entry) => {
      if (entry.status === QUEUE_STATUS.ACKNOWLEDGED) {
        acknowledged.push(entry);
      } else {
        active.push(entry);
      }
    });
    return active.concat(acknowledged);
  };

  const buildQueueMetadata = (links) => ({
    username: getCurrentModeratorUsername(),
    exportedAt: Date.now(),
    total: Array.isArray(links) ? links.length : 0
  });

  const reconcileQueueLinks = (existing, detected) => {
    const normalizedExisting = normalizeEntries(existing);
    const normalizedDetected = normalizeEntries(detected);
    const detectedMap = new Map();
    normalizedDetected.forEach((entry) => {
      if (entry?.url) {
        detectedMap.set(entry.url, entry);
      }
    });
    const merged = [];
    normalizedExisting.forEach((entry) => {
      if (!entry?.url) {
        return;
      }
      const nextEntry = { ...entry };
      const detectedEntry = detectedMap.get(entry.url);
      if (detectedEntry) {
        if (!nextEntry.rateId && detectedEntry?.rateId) {
          nextEntry.rateId = detectedEntry.rateId;
        }
        if ((!nextEntry.title || nextEntry.title === FALLBACK_QUEUE_TITLE) && detectedEntry?.title) {
          nextEntry.title = detectedEntry.title;
        }
        if (detectedEntry.status === QUEUE_STATUS.ACKNOWLEDGED) {
          nextEntry.status = QUEUE_STATUS.ACKNOWLEDGED;
          delete nextEntry.rejectDetails;
          if (entry.status === QUEUE_STATUS.REJECTED) {
            delete nextEntry.approveNote;
          }
        }
        detectedMap.delete(entry.url);
      }
      merged.push(nextEntry);
    });
    detectedMap.forEach((entry) => merged.push(entry));
    return merged;
  };

  const restoreExportButton = (button) => {
    if (queueActionWrapper && queueActionWrapper.isConnected) {
      queueActionWrapper.replaceWith(button);
    }
    queueActionWrapper = null;
  };

  const createQueueActionButton = (label, styleOverrides = {}) => {
    const actionButton = document.createElement('button');
    actionButton.type = 'button';
    actionButton.textContent = label;
    Object.assign(actionButton.style, {
      padding: '6px 10px',
      borderRadius: '6px',
      border: '1px solid #333',
      background: '#222',
      color: '#f5f5f5',
      fontSize: '12px',
      fontWeight: '700',
      cursor: 'pointer',
      minWidth: '78px'
    }, styleOverrides);
    return actionButton;
  };

  const showQueueOccupiedActions = (button) => {
    if (!button || queueActionWrapper?.isConnected) {
      return;
    }
    cleanupToast();
    const wrapper = document.createElement('div');
    wrapper.id = QUEUE_ACTIONS_ID;
    Object.assign(wrapper.style, {
      display: 'inline-flex',
      alignItems: 'center',
      position: 'relative',
      marginLeft: '8px'
    });

    const label = document.createElement('div');
    label.textContent = 'Queue in progress!';
    Object.assign(label.style, {
      fontSize: '12px',
      fontWeight: '700',
      color: '#9d9d9d',
      textAlign: 'center',
      position: 'absolute',
      left: '0',
      right: '0',
      bottom: '100%',
      marginBottom: '6px',
      pointerEvents: 'none'
    });

    const row = document.createElement('div');
    Object.assign(row.style, {
      display: 'inline-flex',
      gap: '6px',
      alignItems: 'center'
    });

    const replaceButton = createQueueActionButton('Replace', {
      background: '#3b1515',
      borderColor: '#6b2a2a',
      color: '#ffd6d6'
    });
    const updateButton = createQueueActionButton('Update', {
      background: '#15313b',
      borderColor: '#2a5b6b',
      color: '#cfeeff'
    });
    const cancelButton = createQueueActionButton('Cancel', {
      background: '#1a1a1a',
      borderColor: '#333',
      color: '#e0e0e0'
    });

    const setDisabled = (disabled) => {
      [replaceButton, updateButton, cancelButton].forEach((btn) => {
        btn.disabled = disabled;
        btn.style.opacity = disabled ? '0.6' : '';
        btn.style.cursor = disabled ? 'default' : 'pointer';
      });
    };

    replaceButton.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();
      setDisabled(true);
      try {
        const links = sortAcknowledgedLast(collectPanelLinks());
        if (!links.length) {
          restoreExportButton(button);
          showToast(button, 'No pending items found.');
          return;
        }
        await Promise.all([persistBatchAssistLinks(links), persistBatchAssistMetadata(buildQueueMetadata(links))]);
        restoreExportButton(button);
        showToast(button);
      } catch (_) {
        restoreExportButton(button);
        showToast(button, 'Export failed');
      }
    });

    updateButton.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();
      setDisabled(true);
      try {
        const [existing, detected] = await Promise.all([readBatchAssistLinks(), Promise.resolve(collectPanelLinks())]);
        const nextLinks = sortAcknowledgedLast(reconcileQueueLinks(existing, detected));
        await Promise.all([persistBatchAssistLinks(nextLinks), persistBatchAssistMetadata(buildQueueMetadata(nextLinks))]);
        restoreExportButton(button);
        showToast(button, 'Queue updated.');
      } catch (_) {
        restoreExportButton(button);
        showToast(button, 'Update failed');
      }
    });

    cancelButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      restoreExportButton(button);
    });

    row.append(replaceButton, updateButton, cancelButton);
    wrapper.append(label, row);
    queueActionWrapper = wrapper;
    button.replaceWith(wrapper);
  };

  const handleButtonClick = async (event, button) => {
    event.preventDefault();
    event.stopPropagation();
    if (!featureEnabled) {
      removeExistingButton();
      return;
    }
    const existing = await readBatchAssistLinks();
    if (existing.length) {
      showQueueOccupiedActions(button);
      return;
    }
    const links = sortAcknowledgedLast(collectPanelLinks());
    if (!links.length) {
      showToast(button, 'No pending items found.');
      return;
    }
    try {
      const metadata = {
        username: getCurrentModeratorUsername(),
        exportedAt: Date.now(),
        total: links.length
      };
      await Promise.all([persistBatchAssistLinks(links), persistBatchAssistMetadata(metadata)]);
      showToast(button);
    } catch (error) {
      showToast(button, 'Export failed');
    }
  };

  const removeExistingButton = () => {
    cleanupToast();
    const existingActions = document.getElementById(QUEUE_ACTIONS_ID);
    if (existingActions) {
      existingActions.remove();
    }
    const existing = document.getElementById(BUTTON_ID);
    if (existing) {
      existing.remove();
    }
  };

  const createButton = (anchor) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.id = BUTTON_ID;
    button.className = anchor.className || 'btn btn-default';
    button.textContent = '';
    button.setAttribute('aria-label', 'Import to Batch Assist');
    const iconUrl = resolveAssetUrl('icons/import.png');
    Object.assign(button.style, {
      marginLeft: '8px',
      width: '34px',
      height: '34px',
      minWidth: '34px',
      padding: '0',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundImage: iconUrl ? `url(${iconUrl})` : 'none',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center',
      backgroundSize: '70% 70%'
    });
    button.addEventListener('click', (event) => handleButtonClick(event, button));
    anchor.insertAdjacentElement('afterend', button);
  };

  const getCurrentModeratorUsername = () => {
    const button = document.getElementById('userList');
    if (!button) {
      return '';
    }
    const TEXT_NODE = typeof Node !== 'undefined' && Number.isInteger(Node.TEXT_NODE) ? Node.TEXT_NODE : 3;
    const text = Array.from(button.childNodes || [])
      .map((node) => (node.nodeType === TEXT_NODE ? node.textContent : ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (text) {
      return text.split(/\s+/).filter(Boolean)[0] || '';
    }
    const fallback = (button.textContent || '').trim();
    return fallback.split(/\s+/).filter(Boolean)[0] || '';
  };

  const ensureButton = () => {
    if (!featureEnabled || !RATINGS_PATH.test(window.location.pathname)) {
      removeExistingButton();
      return false;
    }

    const anchor = document.getElementById('userList');
    if (!anchor) {
      return false;
    }

    if (document.getElementById(BUTTON_ID) || document.getElementById(QUEUE_ACTIONS_ID)) {
      return true;
    }

    createButton(anchor);
    return true;
  };

  const bindObserver = () => {
    if (observer || !document.body) {
      return;
    }
    const scheduleEnsureButton = () => {
      if (!isRuntimeFlagEnabled('observerCoalescing', true)) {
        ensureButton();
        return;
      }
      if (observerRefreshScheduled) {
        return;
      }
      observerRefreshScheduled = true;
      requestAnimationFrame(() => {
        observerRefreshScheduled = false;
        ensureButton();
      });
    };
    observer = new MutationObserver(() => {
      scheduleEnsureButton();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  };

  const updateFeatureState = (enabled) => {
    const next = Boolean(enabled);
    if (next === featureEnabled) {
      return;
    }
    featureEnabled = next;
    if (!featureEnabled) {
      removeExistingButton();
    } else {
      ensureButton();
    }
  };

  const loadFeatureState = () => {
    return new Promise((resolve) => {
      try {
        if (typeof chrome !== 'undefined' && chrome?.storage?.local) {
          chrome.storage.local.get(SETTINGS_KEY, (result = {}) => {
            const stored = result?.[SETTINGS_KEY];
            updateFeatureState(Boolean(stored?.batchAssist));
            resolve();
          });
          return;
        }
      } catch (_) {}
      updateFeatureState(false);
      resolve();
    });
  };

  const bindStorageListener = () => {
    if (storageListenerBound) {
      return;
    }
    try {
      if (typeof chrome === 'undefined' || !chrome?.storage?.onChanged) {
        return;
      }
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName !== 'local' || !changes?.[SETTINGS_KEY]) {
          return;
        }
        const nextValue = changes[SETTINGS_KEY].newValue;
        updateFeatureState(Boolean(nextValue?.batchAssist));
      });
      storageListenerBound = true;
    } catch (_) {}
  };

  const bindNavigationListeners = () => {
    if (navListenersBound) {
      return;
    }
    window.addEventListener('popstate', ensureButton);
    window.addEventListener('hashchange', ensureButton);
    navListenersBound = true;
  };

  const boot = () => {
    bindStorageListener();
    ensureButton();
    bindObserver();
    bindNavigationListeners();
  };

  const start = () => {
    loadFeatureState().finally(boot);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
