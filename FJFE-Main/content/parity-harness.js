(() => {
  const canLog = () => {
    try {
      if (!window.fjfeRuntimeFlags || typeof window.fjfeRuntimeFlags.isEnabled !== 'function') {
        return false;
      }
      return window.fjfeRuntimeFlags.isEnabled('parityHarness', false);
    } catch (_) {
      return false;
    }
  };

  const log = (eventName, detail = {}) => {
    if (!canLog()) {
      return;
    }
    try {
      const payload = {
        ts: Date.now(),
        event: eventName,
        detail
      };
      console.info('[FJFE Parity]', payload);
      document.dispatchEvent(new CustomEvent('fjfeParityEvent', { detail: payload }));
    } catch (_) {}
  };

  const logError = (eventName, error) => {
    if (!canLog()) {
      return;
    }
    try {
      console.warn('[FJFE Parity][Error]', {
        ts: Date.now(),
        event: eventName,
        message: error?.message || String(error || '')
      });
    } catch (_) {}
  };

  window.fjfeParity = {
    log,
    logError
  };
})();

