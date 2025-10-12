(() => {
  const targetHost = 'funnyjunk.com';
  const MODULE_KEY = 'sel';
  const SETTINGS_KEY = 'fjTweakerSettings';
  const DEFAULT_SETTINGS = {
    avoidNext: false,
    removeTwilight: true,
    hideRateShortcuts: true,
    stopUsernamePopups: true,
    trackRates: false,
    modJSExtras: true
  };
  const MANAGE_ENTRY_SELECTOR = '#topME .sideEditButt[onclick*="manageAll()"]';
  let manageEntryObserver = null;

  const loadStoredSettings = () => {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) {
        return { ...DEFAULT_SETTINGS };
      }
      const parsed = JSON.parse(raw);
      const normalized = { ...parsed };
      if (typeof normalized.modJSExtras === 'undefined' && typeof normalized.modJSRecall !== 'undefined') {
        normalized.modJSExtras = Boolean(normalized.modJSRecall);
        delete normalized.modJSRecall;
      }
      return { ...DEFAULT_SETTINGS, ...normalized };
    } catch (error) {
      return { ...DEFAULT_SETTINGS };
    }
  };

  const persistSettings = (settings) => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
    }
  };

  const dispatchSettings = (settings) => {
    document.dispatchEvent(
      new CustomEvent('fjTweakerSettingsChanged', {
        detail: { ...settings }
      })
    );
  };

  const getLocalVersion = () => {
    try {
      return chrome?.runtime?.getManifest?.().version || '0.0.0';
    } catch (error) {
      return '0.0.0';
    }
  };


  const createUI = (settings) => {
    try {
      console.debug('fjTweaker(sel): createUI called');
    } catch (e) {}
    if (document.querySelector('#fj-sel-menu')) {
      return;
    }

    const manageEntry = document.querySelector(MANAGE_ENTRY_SELECTOR);
    if (!manageEntry) {
      if (!manageEntryObserver && typeof MutationObserver !== 'undefined') {
        manageEntryObserver = new MutationObserver(() => {
          const resolvedEntry = document.querySelector(MANAGE_ENTRY_SELECTOR);
          if (resolvedEntry) {
            manageEntryObserver.disconnect();
            manageEntryObserver = null;
            createUI(window.fjTweakerSettings || settings || DEFAULT_SETTINGS);
          }
        });

        if (document.body) {
          manageEntryObserver.observe(document.body, { childList: true, subtree: true });
        }
      }
      return;
    }

    if (manageEntryObserver) {
      manageEntryObserver.disconnect();
      manageEntryObserver = null;
    }

    let wrapper = document.getElementById('fj-sel-toggle-wrapper');
    if (!wrapper) {
      wrapper = document.createElement('div');
      wrapper.id = 'fj-sel-toggle-wrapper';
    } else {
      wrapper.textContent = '';
    }

    const manageEntryPosition = window.getComputedStyle(manageEntry).position;
    if (manageEntryPosition === 'static') {
      manageEntry.style.position = 'relative';
    }

    Object.assign(wrapper.style, {
      position: 'absolute',
      top: '50%',
      left: '100%',
      marginLeft: '8px',
      transform: 'translateY(-50%)',
      display: 'flex',
      alignItems: 'center',
      zIndex: '900'
    });

    manageEntry.append(wrapper);

    const toggleButton = document.createElement('button');
    toggleButton.id = 'fj-sel-toggle';
    toggleButton.type = 'button';
  toggleButton.textContent = 'MOD UI';
    Object.assign(toggleButton.style, {
      padding: '5px 9px',
      font: "500 12px 'Segoe UI', sans-serif",
      color: '#f8f8f8',
      background: '#303030',
      border: '1px solid #555',
      borderRadius: '4px',
      cursor: 'pointer',
      lineHeight: '1.2',
      minWidth: '74px'
    });
    toggleButton.setAttribute('aria-haspopup', 'true');
    toggleButton.setAttribute('aria-expanded', 'false');
    toggleButton.setAttribute('aria-controls', 'fj-sel-menu');

    wrapper.append(toggleButton);

    let host = document.getElementById('fj-sel-host');
    if (!host) {
      host = document.createElement('div');
      host.id = 'fj-sel-host';
    } else {
      host.textContent = '';
    }

  Object.assign(host.style, {
   display: 'none',
   
   position: 'absolute',
   top: '0px',
   left: '0px',
   zIndex: '999999',
      width: 'min(320px, 92vw)',
      maxHeight: 'min(70vh, 420px)',
      padding: '12px 14px',
      background: '#111',
      color: '#f0f0f0',
      border: '1px solid #333',
      borderRadius: '6px',
      boxShadow: '0 12px 28px rgba(0, 0, 0, 0.45)',
      font: "500 13px 'Segoe UI', sans-serif",
      overflowY: 'auto',
      overflowX: 'visible'
    });
    host.setAttribute('aria-hidden', 'true');

  document.body.append(host);

    const stopPropagation = (event) => {
      event.stopPropagation();
    };

    ['pointerdown', 'mousedown', 'click'].forEach((eventName) => {
      host.addEventListener(eventName, stopPropagation);
    });

    const menu = document.createElement('div');
    menu.id = 'fj-sel-menu';
    Object.assign(menu.style, {
      display: 'flex',
      flexDirection: 'column',
      gap: '10px'
    });


    const style = document.createElement('style');
    style.textContent = `
      #fj-sel-menu input[type=checkbox] {
        accent-color: #822ef6;
      }
    `;
    menu.appendChild(style);
    host.append(menu);

    const header = document.createElement('div');
  header.textContent = 'MOD UI Options';
    Object.assign(header.style, {
      fontSize: '14px',
      fontWeight: '600'
    });
    menu.append(header);

    const checkboxContainer = document.createElement('div');
    checkboxContainer.style.display = 'flex';
    checkboxContainer.style.flexDirection = 'column';
    checkboxContainer.style.gap = '8px';
    checkboxContainer.style.width = '100%';

const createInfoButtonElement = (labelText) => {
  const resolvedLabel = (labelText || '').trim();
  const button = window.fjTweakerInfo?.createInfoButton
    ? window.fjTweakerInfo.createInfoButton({ text: '', size: 20, placement: 'right' })
    : (() => {
        const fallback = document.createElement('button');
        fallback.type = 'button';
        fallback.textContent = 'i';
        Object.assign(fallback.style, {
          width: '20px',
          height: '20px',
          font: "600 12px 'Segoe UI', sans-serif",
          color: '#f8f8f8',
          background: '#202020',
          border: '1px solid #555',
          borderRadius: '50%',
          cursor: 'pointer',
          flexShrink: '0'
        });
        fallback.addEventListener('click', (event) => {
          event.stopPropagation();
        });
        return fallback;
      })();

  button.dataset.fjInfoTitle = resolvedLabel;
  button.dataset.fjInfoText = '';
  button.dataset.fjInfoImage = '';
  button.title = '';
  return button;
};

const createCheckboxRow = (id, label, checked, onChange) => {
  const row = document.createElement('div');
  row.style.display = 'flex';
  row.style.alignItems = 'center';
  row.style.gap = '8px';
  row.style.width = '100%';
  row.style.overflow = 'visible';

  const innerLabel = document.createElement('label');
  innerLabel.htmlFor = id;
  innerLabel.style.display = 'flex';
  innerLabel.style.alignItems = 'center';
  innerLabel.style.gap = '8px';
  innerLabel.style.flex = '1 1 auto';
  innerLabel.style.cursor = 'pointer';

  const input = document.createElement('input');
  input.type = 'checkbox';
  input.id = id;
  input.checked = checked;

  if (onChange) {
    input.addEventListener('change', onChange);
  }

  const span = document.createElement('span');
  span.textContent = label;
  span.style.flex = '1 1 auto';

  innerLabel.append(input, span);

  const infoButton = createInfoButtonElement(label);
  infoButton.style.alignSelf = 'center';
  infoButton.style.flexShrink = '0';
  infoButton.style.marginLeft = '4px';
  infoButton.dataset.fjInfoTarget = id;

  infoButton.addEventListener('click', (event) => {
    event.stopPropagation();
  });

  row.append(innerLabel, infoButton);

  return { wrapper: row, input, infoButton };
};

const saveSettingsLive = (avoidNextRow, removeTwilightRow, hideRateRow, stopUserPopupRow, trackRatesRow, modJSExtrasRow) => {
  const nextSettings = {
    avoidNext: avoidNextRow.input.checked,
    removeTwilight: removeTwilightRow.input.checked,
    hideRateShortcuts: hideRateRow.input.checked,
    stopUsernamePopups: stopUserPopupRow.input.checked,
    trackRates: trackRatesRow.input.checked,
    modJSExtras: modJSExtrasRow.input.checked
  };

  persistSettings(nextSettings);
  window.fjTweakerSettings = { ...DEFAULT_SETTINGS, ...nextSettings };
  dispatchSettings(window.fjTweakerSettings);
};

const avoidNextRow = createCheckboxRow('fj-sel-avoid-next', 'Avoid Next', settings.avoidNext);
const removeTwilightRow = createCheckboxRow('fj-sel-remove-twilight', 'Remove Twilight Zone', settings.removeTwilight);
const hideRateRow = createCheckboxRow('fj-sel-hide-rate', 'Hide Rate Shortcuts', settings.hideRateShortcuts);
const stopUserPopupRow = createCheckboxRow('fj-sel-stop-userpop', 'Stop Username Popups', settings.stopUsernamePopups);
const trackRatesRow = createCheckboxRow('fj-sel-track-rates', 'Track Rates', settings.trackRates);
const modJSExtrasRow = createCheckboxRow('fj-sel-modjs', 'ModJS Extras', settings.modJSExtras);


const addLiveChangeHandlers = () => {
  const saveHandler = () => saveSettingsLive(avoidNextRow, removeTwilightRow, hideRateRow, stopUserPopupRow, trackRatesRow, modJSExtrasRow);
  
  avoidNextRow.input.addEventListener('change', saveHandler);
  removeTwilightRow.input.addEventListener('change', saveHandler);
  hideRateRow.input.addEventListener('change', saveHandler);
  stopUserPopupRow.input.addEventListener('change', saveHandler);
  trackRatesRow.input.addEventListener('change', saveHandler);
  modJSExtrasRow.input.addEventListener('change', saveHandler);
};

addLiveChangeHandlers();

const resolveAssetUrl = (relativePath) => {
  if (!relativePath) {
    return '';
  }
  try {
    if (typeof chrome !== 'undefined' && chrome?.runtime?.getURL) {
      return chrome.runtime.getURL(relativePath);
    }
  } catch (error) {
  }
  return relativePath;
};

const setInfoContent = (button, message, imagePath) => {
  if (!button) {
    return;
  }
  const label = button.dataset.fjInfoTitle || '';
  const resolvedMessage = typeof message === 'string' ? message : '';
  const resolvedImage = imagePath ? resolveAssetUrl(imagePath) : '';

  if (window.fjTweakerInfo?.updateTooltip) {
    window.fjTweakerInfo.updateTooltip(button, resolvedMessage, resolvedImage);
  }

  button.dataset.fjInfoText = resolvedMessage;
  if (resolvedImage) {
    button.dataset.fjInfoImage = resolvedImage;
  } else {
    delete button.dataset.fjInfoImage;
  }
  button.title = '';
};

setInfoContent(avoidNextRow.infoButton, '', 'icons/hehe.png');
setInfoContent(removeTwilightRow.infoButton, 'Removes the Twilight Zone lyrics from user profiles.');
setInfoContent(hideRateRow.infoButton, 'Hides the rating shortcuts in the toggle menu.');
setInfoContent(stopUserPopupRow.infoButton, 'Stops the profile menu from popping up when mousing over a user. User must now be clicked to bring up menu.');
setInfoContent(trackRatesRow.infoButton, 'Keeps count of rated content.');
setInfoContent(modJSExtrasRow.infoButton, 'Provides some extra buttons on the ModJS menu to quickly reapply/swap ModJS settings. Recall will reapply last-submitted settings (even after clearing cache), Import provides a code to copy that reflects last-submitted settings, Export takes that code and uses it to apply settings. Also provides info on what ModJS settings do.');


    checkboxContainer.append(
      modJSExtrasRow.wrapper,
      hideRateRow.wrapper,
      trackRatesRow.wrapper,
      stopUserPopupRow.wrapper,
      removeTwilightRow.wrapper,
      avoidNextRow.wrapper
    );

    menu.append(checkboxContainer);

    const versionLabel = document.createElement('div');
    versionLabel.style.fontSize = '12px';
    versionLabel.style.color = '#cccccc';
    versionLabel.textContent = 'Local version: v' + getLocalVersion();
    menu.append(versionLabel);

    let menuVisible = false;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        hideMenu();
      }
    };

    const handleDocumentClick = (event) => {
      if (!wrapper.contains(event.target) && !host.contains(event.target)) {
        hideMenu();
      }
    };

    const showMenu = () => {
      try {
        console.debug('fjTweaker(sel): showMenu called, menuVisible=', menuVisible);
      } catch (e) {}
      if (menuVisible) {
        return;
      }

      let transitionFallbackTimer = null;

      try {
        const rect = toggleButton.getBoundingClientRect();
        host.style.display = 'block';
        host.style.visibility = 'hidden';

        host.style.transition = 'transform 220ms cubic-bezier(.2,.9,.2,1), opacity 180ms ease';
        host.style.willChange = 'transform, opacity';
        host.style.transform = 'translateY(-6px)';
        host.style.opacity = '0';

        const hostW = host.offsetWidth || 320;
        const hostH = host.offsetHeight || 200;

        const docScrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
        const docScrollX = window.scrollX || window.pageXOffset || document.documentElement.scrollLeft || 0;

        const spaceBelow = window.innerHeight - rect.bottom;
        const topDocPos = (spaceBelow >= hostH + 8)
          ? (docScrollY + rect.bottom + 6)
          : Math.max(docScrollY + 8, docScrollY + rect.top - hostH - 6);

        let leftDocPos = docScrollX + rect.left;
        const maxLeft = docScrollX + Math.max(8, window.innerWidth - hostW - 8);
        if (leftDocPos > maxLeft) {
          leftDocPos = maxLeft;
        }

        host.style.top = topDocPos + 'px';
        host.style.left = leftDocPos + 'px';
        host.style.visibility = '';

        menuVisible = true;

        host.style.display = 'block';
        host.setAttribute('aria-hidden', 'false');
        const slickModule = window.fjTweakerModules && window.fjTweakerModules.slick;
        if (slickModule && typeof slickModule.openTweakerMenu === 'function') {
          try {
            slickModule.openTweakerMenu(host).catch(() => {});
          } catch (e) {}
        } else {
          host.offsetHeight;
          host.style.transform = 'translateY(0)';
          host.style.opacity = '1';
          transitionFallbackTimer = setTimeout(() => {
            host.style.transition = '';
            host.style.willChange = '';
            transitionFallbackTimer = null;
          }, 400);
        }

        toggleButton.setAttribute('aria-expanded', 'true');
        document.addEventListener('click', handleDocumentClick, true);
        document.addEventListener('keydown', handleKeyDown, true);
      } catch (error) {
        try {
          console.warn('fjTweaker(sel): showMenu caught', error);
        } catch (e) {}
        try {
          host.style.display = 'block';
          host.style.visibility = '';
          host.setAttribute('aria-hidden', 'false');
          toggleButton.setAttribute('aria-expanded', 'true');
          document.addEventListener('click', handleDocumentClick, true);
          document.addEventListener('keydown', handleKeyDown, true);
          menuVisible = true;
        } catch (err) {
          try {
            console.warn('fjTweaker(sel): failed to show menu', err);
          }
 catch(e) {}
        }
        if (transitionFallbackTimer) {
          clearTimeout(transitionFallbackTimer);
        }
      }

      try {
        const rects = host.getClientRects && host.getClientRects();
        if ((!rects || rects.length === 0) && host.style.display !== 'none') {
          host.style.transition = '';
          host.style.willChange = '';
          host.style.transform = '';
          host.style.opacity = '';
          host.style.display = 'block';
          host.style.visibility = '';
          host.setAttribute('aria-hidden', 'false');
        }
      } catch (err) {
      }
    };

    const hideMenu = () => {
      try {
        console.debug('fjTweaker(sel): hideMenu called, menuVisible=', menuVisible);
      }
 catch(e) {}
      if (!menuVisible) {
        return;
      }

      host.setAttribute('aria-expanded', 'false');
      const slickModule = window.fjTweakerModules && window.fjTweakerModules.slick;
      if (slickModule && typeof slickModule.closeTweakerMenu === 'function') {
        try {
          slickModule.closeTweakerMenu(host).then(() => {
            try {
              menuVisible = false;
              host.style.display = 'none';
              host.setAttribute('aria-hidden', 'true');
            } catch (e) {}
            toggleButton.setAttribute('aria-expanded', 'false');
            document.removeEventListener('click', handleDocumentClick, true);
            document.removeEventListener('keydown', handleKeyDown, true);
          }).catch(() => {
            menuVisible = false;
            host.style.display = 'none';
            host.setAttribute('aria-hidden', 'true');
            toggleButton.setAttribute('aria-expanded', 'false');
            document.removeEventListener('click', handleDocumentClick, true);
            document.removeEventListener('keydown', handleKeyDown, true);
          });
        } catch (e) {
          menuVisible = false;
          host.style.display = 'none';
          host.setAttribute('aria-hidden', 'true');
          toggleButton.setAttribute('aria-expanded', 'false');
          document.removeEventListener('click', handleDocumentClick, true);
          document.removeEventListener('keydown', handleKeyDown, true);
        }
      } else {
        try {
          console.debug('fjTweaker(sel): running inline close animation fallback');
        }
 catch(e) {}
        try {
          if (host.style.display === 'none') host.style.display = 'block';
          host.style.visibility = '';
        } catch (e) {}

        try {
          host.style.transition = 'transform 220ms cubic-bezier(.2,.9,.2,1), opacity 180ms ease';
          host.style.willChange = 'transform, opacity';
          host.style.transform = 'translateY(0)';
          host.style.opacity = '1';
          host.offsetHeight;
        } catch (e) {}

        let finishedInline = false;
        const clearInline = () => {
          if (finishedInline) return;
          finishedInline = true;
          try {
            host.removeEventListener('transitionend', onInlineEnd);
          }
 catch (e) {}
          try {
            host.style.transition = ''; host.style.willChange = '';
          }
 catch (e) {}
          try {
            menuVisible = false; host.style.display = 'none'; host.setAttribute('aria-hidden', 'true');
          }
 catch (e) {}
          try {
            toggleButton.setAttribute('aria-expanded', 'false');
          }
 catch (e) {}
          try {
            document.removeEventListener('click', handleDocumentClick, true);
          }
 catch (e) {}
          try {
            document.removeEventListener('keydown', handleKeyDown, true);
          }
 catch (e) {}
        };

        const onInlineEnd = (ev) => {
          if (ev.target !== host) return;
          clearInline();
        };

        try {
          host.addEventListener('transitionend', onInlineEnd);
          host.style.transform = 'translateY(-6px)';
          host.style.opacity = '0';
          setTimeout(clearInline, 420);
        } catch (e) {
          clearInline();
        }
      }
    };

    toggleButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (menuVisible) {
        hideMenu();
      } else {
        showMenu();
      }
    });
  };

  const init = () => {
    if (window.location.hostname !== targetHost) {
      return;
    }

    const currentSettings = loadStoredSettings();
    window.fjTweakerSettings = { ...DEFAULT_SETTINGS, ...currentSettings };
    dispatchSettings(window.fjTweakerSettings);
    createUI(window.fjTweakerSettings);
  };

  if (!window.fjTweakerModules) {
    window.fjTweakerModules = {};
  }

  window.fjTweakerModules[MODULE_KEY] = { init };
})();


