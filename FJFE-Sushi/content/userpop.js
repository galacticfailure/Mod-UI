(() => {
  const targetHost = 'funnyjunk.com';
  const MODULE_KEY = 'userpop';
  const SETTING_KEY = 'stopUsernamePopups';

  let featureEnabled = true;
  let suppressPointerEnterHandler = null;
  let suppressMouseOverHandler = null;
  let clickHandler = null;

  const getSettings = () => {
    const settings = window.fjTweakerSettings || {};
    if (typeof settings[SETTING_KEY] === 'undefined') {
      return true;
    }
    return Boolean(settings[SETTING_KEY]);
  };

  const isInsideUserPopup = (element) => {
    return Boolean(element.closest('#uPop'));
  };

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

  const runWithUnlockedHover = (link, callback) => {
    link.dataset.fjUserPopUnlocked = '1';
    try {
      callback();
    } finally {
      delete link.dataset.fjUserPopUnlocked;
    }
  };

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

  const applySetting = (enabled) => {
    featureEnabled = enabled;

    if (featureEnabled) {
      attachListeners();
    } else {
      detachListeners();
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
