(() => {
  /*
   * Prank module that makes the "Next" button dodge the cursor.
   * Used mostly as a sanity check that pro modules loaded.
   */
  const targetHost = 'funnyjunk.com';
  const MODULE_KEY = 'nextMove';
  const SETTING_KEY = 'avoidNext';

  let observer = null;
  let currentButton = null;
  let pointerHandler = null;
  let featureEnabled = true;

  // Defaults to on unless fjTweaker toggles it explicitly
  const getSettings = () => {
    const settings = window.fjTweakerSettings || {};
    if (typeof settings[SETTING_KEY] === 'undefined') {
      return true;
    }
    return Boolean(settings[SETTING_KEY]);
  };

  // Slide the button to a random viewport position while remembering its original CSS.
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

  // Returns the button to its prior inline style once the prank ends
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

  // Stops listening to the current Next button and restores its CSS
  const detachButton = () => {
    if (currentButton && pointerHandler) {
      currentButton.removeEventListener('pointerenter', pointerHandler);
    }
    restoreStyle(currentButton);
    currentButton = null;
    pointerHandler = null;
  };

  // Reacquires the Next button (DOM churn happens often) and wires hover logic
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

  // MutationObserver keeps the prank alive as the site hot-swaps markup
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

  // Toggling from settings either arms the prank or cleans up instantly
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

  // Runs once per page on funnyjunk to kick things off
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
