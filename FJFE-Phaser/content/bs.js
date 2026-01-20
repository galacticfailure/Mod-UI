(() => {
  const TARGET_HOST = 'funnyjunk.com';
  const MODULE_KEY = 'bs';
  const BS_USERNAMES = [''];
  const BUTTON_SELECTORS = {
    upload: '.userbarBttn .uploadBttn',
    next: 'a#cFN.nextL, a#cFN'
  };

  if (!window.location.hostname.endsWith(TARGET_HOST)) {
    return;
  }

  const buttonImage = (() => {
    try {
      if (typeof chrome !== 'undefined' && chrome?.runtime?.getURL) {
        return chrome.runtime.getURL('icons/upload.png');
      }
    } catch (_) {}
    return null;
  })();

  if (!buttonImage) {
    return;
  }

  const normalize = (value) => (typeof value === 'string' ? value.trim().toLowerCase() : '');
  const matchesUser = (username) => {
    const normalized = normalize(username);
    if (!normalized) return false;
    return BS_USERNAMES.some((entry) => normalize(entry) === normalized);
  };

  let observer = null;
  let armed = false;

  const skinButton = (element) => {
    if (!element) {
      return false;
    }
    if (element.dataset.bsSkinned === '1') {
      return true;
    }

    element.dataset.bsSkinned = '1';
    element.style.backgroundImage = `url("${buttonImage}")`;
    element.style.backgroundSize = '100% 100%';
    element.style.backgroundPosition = 'center center';
    element.style.backgroundRepeat = 'no-repeat';
    element.style.backgroundColor = 'transparent';
    element.style.color = '#fff';
    element.style.textShadow = '0 0 4px rgba(0, 0, 0, 0.65)';
    element.style.display = 'inline-flex';
    element.style.alignItems = 'center';
    element.style.justifyContent = 'center';

    return true;
  };

  const applySkins = () => {
    const uploadBtn = document.querySelector(BUTTON_SELECTORS.upload);
    const nextBtn = document.querySelector(BUTTON_SELECTORS.next);
    const uploadReady = skinButton(uploadBtn);
    const nextReady = skinButton(nextBtn);

    if (uploadReady && nextReady) {
      stopObserver();
    }
  };

  const stopObserver = () => {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  };

  const startObserver = () => {
    if (observer || !document.body) {
      return;
    }
    observer = new MutationObserver(() => applySkins());
    observer.observe(document.body, { childList: true, subtree: true });
  };

  const activate = () => {
    if (armed) {
      return;
    }
    armed = true;

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => applySkins(), { once: true });
    } else {
      applySkins();
    }

    startObserver();
  };

  const handleStatus = (payload) => {
    if (armed || !payload) {
      return;
    }
    if (matchesUser(payload.username)) {
      activate();
    }
  };

  document.addEventListener('fjApichkStatus', (event) => handleStatus(event.detail), { passive: true });

  const cached = window.fjApichk?.getCached?.();
  if (cached) {
    handleStatus(cached);
  }

  window.fjTweakerModules = window.fjTweakerModules || {};
  window.fjTweakerModules[MODULE_KEY] = window.fjTweakerModules[MODULE_KEY] || { init: () => {} };
})();
