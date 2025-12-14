(() => {
  const targetHost = 'funnyjunk.com';
  const MODULE_KEY = 'userpop';
  const SETTING_KEY = 'stopUsernamePopups';

  let featureEnabled = true;
  let suppressPointerEnterHandler = null;
  let suppressMouseOverHandler = null;
  let clickHandler = null;

  // Defaults to enabled unless the fjTweaker toggle explicitly disables it
  const getSettings = () => {
    const settings = window.fjTweakerSettings || {};
    if (typeof settings[SETTING_KEY] === 'undefined') {
      return true;
    }
    return Boolean(settings[SETTING_KEY]);
  };

  // Ignore events that originate inside the already-open popup container
  const isInsideUserPopup = (element) => {
    return Boolean(element.closest('#uPop'));
  };

  // Finds the nearest username anchor for hover suppression
  const targetLinkFromEvent = (event) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return null;
    }
    if (isInsideUserPopup(target)) {
      return null;
    }
    return target.closest('a.uName');
  };

  // Stops pointerenter/mouseover from reaching FunnyJunk's popup code unless unlocked
  const suppressHover = (event) => {
    if (!featureEnabled) {
      return;
    }
    const link = targetLinkFromEvent(event);
    if (!link) {
      return;
    }
    if (link.dataset.fjUserPopUnlocked === '1') {
      return;
    }

    event.stopImmediatePropagation();
    event.stopPropagation();
  };

  // Temporarily marks a link as "safe" so the original handlers may run once
  const runWithUnlockedHover = (link, callback) => {
    link.dataset.fjUserPopUnlocked = '1';
    try {
      callback();
    } finally {
      delete link.dataset.fjUserPopUnlocked;
    }
  };

  // Cancels mapp.timer so queued popups do not fire after we suppress hover
  const clearQueuedPopup = () => {
    const mapp = window.mapp;
    if (!mapp || typeof mapp !== 'object') {
      return;
    }
    const { timer } = mapp;
    if (typeof timer === 'undefined' || timer === null) {
      return;
    }
    try {
      clearTimeout(timer);
    } catch (error) {
    }
    mapp.timer = null;
  };

  // Replays the pointerenter/mouseover sequence the site expects
  const replayHoverEvents = (link) => {
    const pointerEvent = new PointerEvent('pointerenter', {
      bubbles: false,
      cancelable: true
    });
    link.dispatchEvent(pointerEvent);

    const mouseEvent = new MouseEvent('mouseover', {
      bubbles: true,
      cancelable: true
    });
    link.dispatchEvent(mouseEvent);
  };

  // On click we momentarily allow hover logic so users can still see info on demand
  const handleClick = (event) => {
    if (!featureEnabled) {
      return;
    }
    const link = targetLinkFromEvent(event);
    if (!link) {
      return;
    }

    runWithUnlockedHover(link, () => {
      replayHoverEvents(link);
    });

    setTimeout(() => {
      clearQueuedPopup();
    }, 0);
  };

  // Wires up capture listeners once so we can swallow hover events globally
  const attachListeners = () => {
    if (suppressPointerEnterHandler || suppressMouseOverHandler || clickHandler) {
      return;
    }

    suppressPointerEnterHandler = (event) => {
      suppressHover(event);
    };

    suppressMouseOverHandler = (event) => {
      suppressHover(event);
    };

    clickHandler = (event) => {
      handleClick(event);
    };

    document.addEventListener('pointerenter', suppressPointerEnterHandler, true);
    document.addEventListener('mouseover', suppressMouseOverHandler, true);
    document.addEventListener('click', clickHandler, true);
  };

  // Undo listeners when the toggle is off to avoid unnecessary work
  const detachListeners = () => {
    if (suppressPointerEnterHandler) {
      document.removeEventListener('pointerenter', suppressPointerEnterHandler, true);
      suppressPointerEnterHandler = null;
    }

    if (suppressMouseOverHandler) {
      document.removeEventListener('mouseover', suppressMouseOverHandler, true);
      suppressMouseOverHandler = null;
    }

    if (clickHandler) {
      document.removeEventListener('click', clickHandler, true);
      clickHandler = null;
    }
  };

  // Central toggle that attaches/detaches listeners
  const applySetting = (enabled) => {
    featureEnabled = enabled;

    if (featureEnabled) {
      attachListeners();
    } else {
      detachListeners();
    }
  };

  // Responds to global fjTweaker setting broadcasts
  const handleSettingsChanged = (event) => {
    const detail = event.detail || {};
    if (typeof detail[SETTING_KEY] === 'undefined') {
      return;
    }
    applySetting(Boolean(detail[SETTING_KEY]));
  };

  // Bootstraps the module when on funnyjunk.com only
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
