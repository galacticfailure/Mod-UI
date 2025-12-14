(() => {
  const targetHost = 'funnyjunk.com';
  const MODULE_KEY = 'schide';
  const SETTING_KEY = 'hideRateShortcuts';
  // This module suppresses the standard rate shortcut overlay and numpad bindings
  // so users only see the Mod UI shortcuts when the "Hide Shortcuts" toggle is set.

  let observer = null;
  let featureEnabled = true;
  let numpadHandler = null;

  const getSettings = () => {
    const settings = window.fjTweakerSettings || {};
    if (typeof settings[SETTING_KEY] === 'undefined') {
      return true;
    }
    return Boolean(settings[SETTING_KEY]);
  };

  const rememberInlineStyle = (element, property, key) => {
    const value = element.style.getPropertyValue(property) || '';
    const priority = element.style.getPropertyPriority(property) || '';
    element.dataset[`fjQuick${key}Value`] = value;
    element.dataset[`fjQuick${key}Priority`] = priority;
  };

  const restoreInlineStyle = (element, property, key) => {
    const valueKey = `fjQuick${key}Value`;
    const priorityKey = `fjQuick${key}Priority`;

    if (Object.prototype.hasOwnProperty.call(element.dataset, valueKey)) {
      const value = element.dataset[valueKey];
      const priority = element.dataset[priorityKey] || '';

      if (value) {
        element.style.setProperty(property, value, priority);
      } else {
        element.style.removeProperty(property);
      }

      delete element.dataset[valueKey];
      delete element.dataset[priorityKey];
    } else {
      element.style.removeProperty(property);
    }
  };

  const markOriginalStyles = (element) => {
    if (!element || element.dataset.fjQuickOriginalStylesSaved === '1') {
      return;
    }

    rememberInlineStyle(element, 'display', 'Display');
    rememberInlineStyle(element, 'visibility', 'Visibility');
    rememberInlineStyle(element, 'pointer-events', 'PointerEvents');
    rememberInlineStyle(element, 'opacity', 'Opacity');
    rememberInlineStyle(element, 'margin-top', 'MarginTop');

    element.dataset.fjQuickOriginalStylesSaved = '1';
  };

  const restoreOriginalStyles = (element) => {
    if (!element) {
      return;
    }

    restoreInlineStyle(element, 'display', 'Display');
    restoreInlineStyle(element, 'visibility', 'Visibility');
    restoreInlineStyle(element, 'pointer-events', 'PointerEvents');
    restoreInlineStyle(element, 'opacity', 'Opacity');
    restoreInlineStyle(element, 'margin-top', 'MarginTop');

    delete element.dataset.fjQuickOriginalStylesSaved;
  };

  const hideQuickMenu = () => {
    if (!featureEnabled) {
      return;
    }

    const quickMenu = document.getElementById('quickM');
    if (!quickMenu) {
      return;
    }

    markOriginalStyles(quickMenu);
    quickMenu.style.removeProperty('display');
    quickMenu.style.setProperty('visibility', 'hidden', 'important');
    quickMenu.style.setProperty('pointer-events', 'none', 'important');
    quickMenu.style.setProperty('opacity', '0', 'important');

    
    const html1 = document.querySelector('.modCC.modF.modF1');
    const replaceModCC = document.querySelector('.replaceModCC');
    const html2 = document.getElementById('cControlsCon');

    if ((html1 || replaceModCC) && html2) {
      markOriginalStyles(html2);
      // Pull the control bar up so the missing quick menu does not leave a gap.
      html2.style.setProperty('margin-top', '-60px', 'important');
    }
  };

  const showQuickMenu = () => {
    const quickMenu = document.getElementById('quickM');
    if (!quickMenu) {
      return;
    }

    restoreOriginalStyles(quickMenu);

    
    const html2 = document.getElementById('cControlsCon');

    if (html2) {
      restoreOriginalStyles(html2);
    }
  };

  const startObserver = () => {
    if (observer || !document.body || !featureEnabled) {
      return;
    }

    observer = new MutationObserver(() => {
      hideQuickMenu();
    });

    observer.observe(document.body, { childList: true, subtree: true });
  };

  const isTypingElement = (el) => {
    if (!el) return false;
    const tag = (el.tagName || '').toUpperCase();
    if (tag === 'TEXTAREA') return true;
    if (tag === 'INPUT') {
      const t = (el.type || '').toLowerCase();
      return ['text', 'search', 'tel', 'url', 'email', 'password', 'number'].indexOf(t) !== -1;
    }
    if (el.isContentEditable) return true;
    return false;
  };

  const handleNumpadKeyDown = (e) => {
    if (!featureEnabled) return;

    try {
      if (isTypingElement(document.activeElement)) {
        return;
      }
    } catch (err) {
    }

    const isNumpadCode = e.code && /^Numpad[1-9]$/.test(e.code);
    const isNumpadLocation = (e.location === (KeyboardEvent && KeyboardEvent.DOM_KEY_LOCATION_NUMPAD ? KeyboardEvent.DOM_KEY_LOCATION_NUMPAD : 3)) && /^[1-9]$/.test(e.key);

    if (isNumpadCode || isNumpadLocation) {
      // Cancel FunnyJunk's built-in quick rate bindings so hidden shortcuts stay hidden.
      e.preventDefault();
      e.stopImmediatePropagation();
      return;
    }
  };

  const addNumpadListener = () => {
    if (numpadHandler) return;
    numpadHandler = handleNumpadKeyDown;
    document.addEventListener('keydown', numpadHandler, true);
  };

  const removeNumpadListener = () => {
    if (!numpadHandler) return;
    document.removeEventListener('keydown', numpadHandler, true);
    numpadHandler = null;
  };

  const stopObserver = () => {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  };

  const applySetting = (enabled) => {
    featureEnabled = enabled;

    if (featureEnabled) {
      hideQuickMenu();
      addNumpadListener();
      startObserver();
    } else {
      removeNumpadListener();
      stopObserver();
      showQuickMenu();
    }
  };

  const handleSettingsChanged = (event) => {
    const detail = event.detail || {};
    if (typeof detail[SETTING_KEY] === 'undefined') {
      return;
    }

    applySetting(Boolean(detail[SETTING_KEY]));
  };

  const init = () => {
    if (window.location.hostname !== targetHost) {
      return;
    }

    applySetting(getSettings());
    document.addEventListener('fjTweakerSettingsChanged', handleSettingsChanged);
  };

  if (!window.fjTweakerModules) {
    window.fjTweakerModules = {};
  }

  window.fjTweakerModules[MODULE_KEY] = { init };
})();
