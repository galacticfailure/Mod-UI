(() => {
  const targetHost = 'funnyjunk.com';
  const MODULE_KEY = 'nextMove';
  const SETTING_KEY = 'avoidNext';

  let observer = null;
  let currentButton = null;
  let pointerHandler = null;
  let featureEnabled = true;

  const getSettings = () => {
    const settings = window.fjTweakerSettings || {};
    if (typeof settings[SETTING_KEY] === 'undefined') {
      return true;
    }
    return Boolean(settings[SETTING_KEY]);
  };

  const relocateRandomly = (element) => {
    if (!element) {
      return;
    }

    if (!element.dataset.fjOriginalStyleSaved) {
      element.dataset.fjOriginalStyle = element.getAttribute('style') || '';
      element.dataset.fjOriginalStyleSaved = '1';
    }

    const rect = element.getBoundingClientRect();
    const width = rect.width || element.offsetWidth || 0;
    const height = rect.height || element.offsetHeight || 0;
    const maxLeft = Math.max(0, window.innerWidth - width);
    const maxTop = Math.max(0, window.innerHeight - height);
    const nextLeft = Math.floor(Math.random() * (maxLeft || window.innerWidth));
    const nextTop = Math.floor(Math.random() * (maxTop || window.innerHeight));


    const slickModule = window.fjTweakerModules && window.fjTweakerModules.slick;
    
    if (slickModule && slickModule.slideElementTo) {

      if (element.style.position !== 'fixed') {
        Object.assign(element.style, {
          position: 'fixed',
          zIndex: '2147483646'
        });
      }
      slickModule.slideElementTo(element, nextLeft, nextTop);
    } else {

      Object.assign(element.style, {
        position: 'fixed',
        top: `${nextTop}px`,
        left: `${nextLeft}px`,
        zIndex: '2147483646'
      });
    }
  };

  const restoreStyle = (element) => {
    if (!element) {
      return;
    }

    if (element.dataset.fjOriginalStyleSaved) {
      const original = element.dataset.fjOriginalStyle || '';
      if (original) {
        element.setAttribute('style', original);
      } else {
        element.removeAttribute('style');
      }
      delete element.dataset.fjOriginalStyleSaved;
      delete element.dataset.fjOriginalStyle;
    }
  };

  const detachButton = () => {
    if (currentButton && pointerHandler) {
      currentButton.removeEventListener('pointerenter', pointerHandler);
    }
    restoreStyle(currentButton);
    currentButton = null;
    pointerHandler = null;
  };

  const bindButton = () => {
    if (!featureEnabled) {
      return;
    }

    const button = document.querySelector('#contentNoChannel #vvr a#cFN');

    if (!button) {
      detachButton();
      return;
    }

    if (button === currentButton && pointerHandler) {
      return;
    }

    detachButton();

    currentButton = button;
    pointerHandler = () => {
      relocateRandomly(currentButton);
    };

    currentButton.addEventListener('pointerenter', pointerHandler, { passive: true });
  };

  const startObserver = () => {
    if (observer || !document.body) {
      return;
    }

    observer = new MutationObserver(() => {
      bindButton();
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
      bindButton();
      startObserver();
    } else {
      stopObserver();
      detachButton();
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
