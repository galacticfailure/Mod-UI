(() => {
  try {
    const markerKey = '__fjfeRateLimitBridgeInstalled';
    if (window[markerKey]) {
      return;
    }
    const current = document.currentScript;
    if (!current) {
      return;
    }
    const dataset = current.dataset || {};
    const encoded = dataset.fjfeRateLimitConfig || dataset.rateLimitConfig || '';
    if (!encoded) {
      return;
    }
    const config = JSON.parse(decodeURIComponent(encoded));
    if (!config || window[markerKey]) {
      return;
    }
    if (typeof console === 'undefined') {
      return;
    }
    const patterns = Array.isArray(config.patterns) ? config.patterns : [];
    const methods = Array.isArray(config.methods) ? config.methods : [];
    const messageType = config.messageType;
    const domEventName = config.domEventName;
    const domEventOrigin = config.domEventOrigin || 'page';
    if (!messageType || !methods.length || !patterns.length) {
      return;
    }
    window[markerKey] = true;

    const hasMatch = (values) => {
      if (!Array.isArray(values) || values.length === 0) {
        return false;
      }
      for (const raw of values) {
        let text = raw;
        if (typeof text !== 'string') {
          try {
            text = String(text ?? '');
          } catch (_) {
            continue;
          }
        }
        const lower = text.toLowerCase();
        for (const needle of patterns) {
          if (needle && lower.includes(needle)) {
            return true;
          }
        }
      }
      return false;
    };

    const emit = () => {
      const ts = Date.now();
      const signalId = `${ts}-${Math.random().toString(16).slice(2)}`;
      const payload = { type: messageType, ts, signalId };
      try {
        window.postMessage(payload, '*');
      } catch (_) {}
      if (domEventName) {
        try {
          window.dispatchEvent(new CustomEvent(domEventName, {
            detail: { timestamp: ts, origin: domEventOrigin, signalId }
          }));
        } catch (_) {}
      }
    };

    methods.forEach((method) => {
      const original = (console && console[method]);
      if (typeof original !== 'function') {
        return;
      }
      if (original.__fjfeRateLimitPatched) {
        return;
      }
      const wrapped = function fjfeRateLimitPatchedConsole(...args) {
        try {
          if (hasMatch(args)) {
            emit();
          }
        } catch (_) {}
        return original.apply(this, args);
      };
      try {
        wrapped.__fjfeRateLimitPatched = true;
        wrapped.__fjfeRateLimitOriginal = original;
      } catch (_) {}
      try {
        console[method] = wrapped;
      } catch (_) {}
    });
  } catch (_) {}
})();
