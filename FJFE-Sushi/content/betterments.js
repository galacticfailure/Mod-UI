(() => {
  const targetHost = 'funnyjunk.com';
  const MODULE_KEY = 'betterments';
  const SETTINGS_KEY = 'fjTweakerSettings';
  const SETTING_FLAG = 'betterments';

  let enabled = false;

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

  const applySetting = (nextEnabled) => {
    enabled = Boolean(nextEnabled);
    // Placeholder module: UI changes will be implemented in a future update.
    void enabled;
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
