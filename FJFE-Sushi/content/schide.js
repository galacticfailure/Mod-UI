(() => {
  const targetHost = 'funnyjunk.com';
  const MODULE_KEY = 'schide';
  const SETTING_KEY = 'hideRateShortcuts';

  let observer = null;
  let featureEnabled = true;

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
  };

  const showQuickMenu = () => {
    const quickMenu = document.getElementById('quickM');
    if (!quickMenu) {
      return;
    }

    restoreOriginalStyles(quickMenu);
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
      startObserver();
    } else {
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
