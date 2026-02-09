(() => {
  // === Module metadata and configuration ===
  const TARGET_HOST = 'funnyjunk.com';
  const MODULE_KEY = 'bs';
  const BS_USERNAMES = [''];
  const BUTTON_SELECTORS = {
    upload: '.userbarBttn .uploadBttn',
    next: 'a#cFN.nextL, a#cFN'
  };

  // Exit early if we're not on the expected host.
  if (!window.location.hostname.endsWith(TARGET_HOST)) {
    return;
  }

  // Resolve the button image from the extension bundle.
  const buttonImage = (() => {
    try {
      if (typeof chrome !== 'undefined' && chrome?.runtime?.getURL) {
        return chrome.runtime.getURL('icons/upload.png');
      }
    } catch (_) {}
    return null;
  })();

  // Without a valid image, skip this module entirely.
  if (!buttonImage) {
    return;
  }

  // Normalize username values for comparison.
  const normalize = (value) => (typeof value === 'string' ? value.trim().toLowerCase() : '');
  // Check whether the current username is allowed to activate this module.
  const matchesUser = (username) => {
    const normalized = normalize(username);
    if (!normalized) return false;
    return BS_USERNAMES.some((entry) => normalize(entry) === normalized);
  };

  // Observer state and activation guard.
  let observer = null;
  let armed = false;

  // Apply the visual skin to the target button element once.
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

  // Find buttons and skin them; stop observing once both are ready.
  const applySkins = () => {
    const uploadBtn = document.querySelector(BUTTON_SELECTORS.upload);
    const nextBtn = document.querySelector(BUTTON_SELECTORS.next);
    const uploadReady = skinButton(uploadBtn);
    const nextReady = skinButton(nextBtn);

    if (uploadReady && nextReady) {
      stopObserver();
    }
  };

  // Disconnect the mutation observer.
  const stopObserver = () => {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  };

  // Watch DOM changes until both buttons are skinned.
  const startObserver = () => {
    if (observer || !document.body) {
      return;
    }
    observer = new MutationObserver(() => applySkins());
    observer.observe(document.body, { childList: true, subtree: true });
  };

  // Activate once, then try to skin immediately and on DOM changes.
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

  // React to the API status payload and activate for matching users.
  const handleStatus = (payload) => {
    if (armed || !payload) {
      return;
    }
    if (matchesUser(payload.username)) {
      activate();
    }
  };

  // Listen for API status updates emitted by the site.
  document.addEventListener('fjApichkStatus', (event) => handleStatus(event.detail), { passive: true });

  // Use cached API status when available.
  const cached = window.fjApichk?.getCached?.();
  if (cached) {
    handleStatus(cached);
  }

  // Register this module for the global tweaker registry.
  window.fjTweakerModules = window.fjTweakerModules || {};
  window.fjTweakerModules[MODULE_KEY] = window.fjTweakerModules[MODULE_KEY] || { init: () => {} };
})();
