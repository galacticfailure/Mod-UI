(() => {
  /*
   * Runtime feature toggles used for safe phased rollouts.
   * Overrides can be written to localStorage key: fjfeRuntimeFlags
   */
  const STORAGE_KEY = 'fjfeRuntimeFlags';
  const DEFAULT_FLAGS = Object.freeze({
    parityHarness: false,
    loaderBridge: true,
    assistSharedHelpers: true,
    debouncedStorage: true,
    gifBinaryBridge: true,
    mobiconFetchLightweight: true,
    observerCoalescing: true,
    timerHardening: true
  });

  const parseOverrideFlags = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return {};
      }
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') {
        return {};
      }
      return parsed;
    } catch (_) {
      return {};
    }
  };

  const getFlagsSnapshot = () => {
    const overrides = parseOverrideFlags();
    return { ...DEFAULT_FLAGS, ...overrides };
  };

  const isEnabled = (flagName, fallback = false) => {
    if (typeof flagName !== 'string' || !flagName) {
      return Boolean(fallback);
    }
    const flags = getFlagsSnapshot();
    if (typeof flags[flagName] === 'undefined') {
      return Boolean(fallback);
    }
    return Boolean(flags[flagName]);
  };

  const setFlag = (flagName, value) => {
    if (typeof flagName !== 'string' || !flagName) {
      return false;
    }
    try {
      const next = parseOverrideFlags();
      next[flagName] = Boolean(value);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return true;
    } catch (_) {
      return false;
    }
  };

  const clearFlag = (flagName) => {
    if (typeof flagName !== 'string' || !flagName) {
      return false;
    }
    try {
      const next = parseOverrideFlags();
      delete next[flagName];
      if (!Object.keys(next).length) {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      }
      return true;
    } catch (_) {
      return false;
    }
  };

  window.fjfeRuntimeFlags = {
    key: STORAGE_KEY,
    defaults: DEFAULT_FLAGS,
    getAll: getFlagsSnapshot,
    isEnabled,
    setFlag,
    clearFlag
  };
})();

