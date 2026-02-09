(() => {
  'use strict';

  const MODULE_KEY = 'reviewAssist';
  const QUEUE_STORAGE_KEY = 'fjReviewAssistQueue';
  const SEND_INTERVAL_MS = 6000;
  const MAX_RETRY_DELAY_SECONDS = 30;

  let enabled = false;
  let queue = [];
  let lastSentAt = 0;
  let intervalId = null;
  let clickHandlerBound = false;
  let backendError = false;
  let statusWrap = null;
  let statusText = null;
  let statusSpinner = null;
  let statusObserver = null;

  const storageGet = (key) => new Promise((resolve) => {
    try {
      if (typeof chrome !== 'undefined' && chrome?.storage?.local) {
        chrome.storage.local.get([key], (result) => {
          resolve(result ? result[key] : undefined);
        });
        return;
      }
    } catch (_) {}
    try {
      const raw = localStorage.getItem(key);
      resolve(raw ? JSON.parse(raw) : undefined);
    } catch (_) {
      resolve(undefined);
    }
  });

  const storageSet = (key, value) => {
    try {
      if (typeof chrome !== 'undefined' && chrome?.storage?.local) {
        chrome.storage.local.set({ [key]: value });
        return;
      }
    } catch (_) {}
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (_) {}
  };

  const loadQueue = async () => {
    const stored = await storageGet(QUEUE_STORAGE_KEY);
    if (Array.isArray(stored)) {
      queue = stored.slice();
    } else {
      queue = [];
    }
  };

  const persistQueue = () => {
    storageSet(QUEUE_STORAGE_KEY, queue.slice());
  };

  const enqueue = (item) => {
    queue.push(item);
    persistQueue();
    updateStatusUI();
  };

  const ensureStatusStyles = () => {
    if (document.getElementById('fj-review-assist-style')) return;
    const style = document.createElement('style');
    style.id = 'fj-review-assist-style';
    style.textContent = `
      .nextButts { display: flex; align-items: center; gap: 8px; }
      .nextButts .fPage { flex: 0 0 auto; }
      .fj-review-assist-status { display: flex; align-items: center; justify-content: center; gap: 6px; flex: 1 1 auto; color: #f8f8f8; font: 500 12px 'Segoe UI', sans-serif; }
      .fj-review-assist-spinner { width: 12px; height: 12px; border: 2px solid rgba(255,255,255,0.35); border-top-color: #fff; border-radius: 50%; animation: fj-review-assist-spin 0.9s linear infinite; }
      @keyframes fj-review-assist-spin { to { transform: rotate(360deg); } }
    `;
    document.head.appendChild(style);
  };

  const findNextButton = () => {
    return document.querySelector('.nextButts .chanNext') || null;
  };

  const ensureStatusUI = () => {
    if (statusWrap && statusWrap.isConnected) return;
    const nextButton = findNextButton();
    if (!nextButton) return;
    ensureStatusStyles();

    const container = nextButton.closest('.nextButts') || nextButton.parentElement;
    if (!container) return;
    if (!container.style.display || container.style.display === 'block') {
      container.style.display = 'flex';
      container.style.alignItems = 'center';
      container.style.gap = '8px';
    }

    statusWrap = document.createElement('div');
    statusWrap.className = 'fj-review-assist-status';
    statusSpinner = document.createElement('span');
    statusSpinner.className = 'fj-review-assist-spinner';
    statusText = document.createElement('span');
    statusText.textContent = 'Submitting reviews (0 in queue)';
    statusWrap.append(statusSpinner, statusText);
    const prevButton = container.querySelector('.chanPrev');
    const nextButtonEl = container.querySelector('.chanNext');
    if (prevButton && prevButton.nextSibling) {
      container.insertBefore(statusWrap, nextButtonEl || prevButton.nextSibling);
    } else {
      container.appendChild(statusWrap);
    }
    updateStatusUI();
  };

  const startStatusObserver = () => {
    if (statusObserver || !document.body) return;
    statusObserver = new MutationObserver(() => {
      ensureStatusUI();
    });
    statusObserver.observe(document.body, { childList: true, subtree: true });
  };

  const stopStatusObserver = () => {
    if (!statusObserver) return;
    statusObserver.disconnect();
    statusObserver = null;
  };

  const updateStatusUI = () => {
    if (!statusWrap || !statusText) return;
    if (backendError) {
      statusSpinner?.remove();
      statusText.textContent = 'BACKEND ERROR';
      statusWrap.style.display = 'inline-flex';
      return;
    }
    const count = queue.length;
    if (count === 0) {
      statusWrap.style.display = 'none';
      return;
    }
    statusWrap.style.display = 'inline-flex';
    statusText.textContent = `Submitting reviews (${count} in queue)`;
    if (!statusSpinner || !statusSpinner.isConnected) {
      statusSpinner = document.createElement('span');
      statusSpinner.className = 'fj-review-assist-spinner';
      statusWrap.insertBefore(statusSpinner, statusText);
    }
  };

  const resolveReviewButton = (target) => {
    if (!target) return null;
    if (target.matches?.('.modEventChangeStatus > div[data-id="1"]')) {
      return target;
    }
    return target.closest?.('.modEventChangeStatus > div[data-id="1"]') || null;
  };

  const markReviewedUI = (button) => {
    try {
      const row = button.closest('.modEventChangeStatus');
      if (!row) return;
      const unreviewed = row.querySelector('div[data-id="0"]');
      if (unreviewed) unreviewed.classList.remove('sel');
      button.classList.add('sel');
      const linkRow = row.closest('.linkRow');
      if (linkRow) {
        linkRow.style.background = '';
        if (!linkRow.getAttribute('style')) {
          linkRow.removeAttribute('style');
        }
      }
    } catch (_) {}
  };

  const sendQueuedItem = async (item) => {
    if (!item || !item.eventId) return false;
    const params = new URLSearchParams();
    params.set('status', String(item.status));
    params.set('eventId', String(item.eventId));
    try {
      const response = await fetch('/mods/changeModEventStatus/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'Accept': 'application/json, text/javascript, */*; q=0.01',
          'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'include',
        body: params.toString()
      });
      if (!response.ok) return false;
      const data = await response.json().catch(() => null);
      if (data && typeof data.success === 'boolean') {
        return data.success;
      }
      return true;
    } catch (_) {
      return false;
    }
  };

  const processQueue = async () => {
    if (!enabled || backendError || queue.length === 0) return;
    const now = Date.now();
    if (lastSentAt && now - lastSentAt < SEND_INTERVAL_MS) {
      return;
    }
    const next = queue[0];
    if (next?.nextAttemptAt && now < next.nextAttemptAt) {
      return;
    }
    const ok = await sendQueuedItem(next);
    if (ok) {
      queue.shift();
      persistQueue();
      lastSentAt = Date.now();
      if (next) {
        delete next.retryDelaySeconds;
        delete next.nextAttemptAt;
      }
      updateStatusUI();
      return;
    }
    const currentDelay = typeof next.retryDelaySeconds === 'number' ? next.retryDelaySeconds : 6;
    if (currentDelay >= MAX_RETRY_DELAY_SECONDS) {
      backendError = true;
      stopInterval();
      updateStatusUI();
      return;
    }
    const nextDelay = Math.min(currentDelay + 1, MAX_RETRY_DELAY_SECONDS);
    next.retryDelaySeconds = nextDelay;
    next.nextAttemptAt = Date.now() + nextDelay * 1000;
    persistQueue();
  };

  const startInterval = () => {
    if (intervalId) return;
    intervalId = setInterval(() => {
      processQueue();
    }, 1000);
    processQueue();
  };

  const stopInterval = () => {
    if (!intervalId) return;
    clearInterval(intervalId);
    intervalId = null;
  };

  const handleClickCapture = (event) => {
    if (!enabled) return;
    const button = resolveReviewButton(event.target);
    if (!button) return;
    const eventId = button.dataset?.eventId;
    if (!eventId) return;
    event.stopPropagation();
    event.preventDefault();
    if (event.stopImmediatePropagation) {
      event.stopImmediatePropagation();
    }
    markReviewedUI(button);
    enqueue({ status: 1, eventId, createdAt: Date.now(), retryDelaySeconds: 6, nextAttemptAt: 0 });
  };

  const bindClickHandler = () => {
    if (clickHandlerBound) return;
    document.addEventListener('click', handleClickCapture, true);
    clickHandlerBound = true;
  };

  const unbindClickHandler = () => {
    if (!clickHandlerBound) return;
    document.removeEventListener('click', handleClickCapture, true);
    clickHandlerBound = false;
  };

  const applySettings = async (settings) => {
    if (!settings || typeof settings[MODULE_KEY] === 'undefined') {
      return;
    }
    enabled = Boolean(settings[MODULE_KEY]);
    if (enabled) {
      backendError = false;
      await loadQueue();
      ensureStatusUI();
      startStatusObserver();
      bindClickHandler();
      startInterval();
      updateStatusUI();
    } else {
      unbindClickHandler();
      stopInterval();
      stopStatusObserver();
    }
  };

  document.addEventListener('fjTweakerSettingsChanged', (event) => {
    applySettings(event?.detail);
  });

  try {
    if (window.fjTweakerSettings) {
      applySettings(window.fjTweakerSettings);
    }
  } catch (_) {}
})();
